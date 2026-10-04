import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend directory is in sys.path and backend/.env is loaded
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

env_path = backend_path / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

import pytest
from datetime import datetime
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
from os_engine.process import Process
# pyrefly: ignore [missing-import]
from os_engine.metrics import calculate_cpu_utilization, save_system_metrics
from database import get_db_connection
from main import app


def test_calculate_cpu_utilization_full():
    # P1: burst=5, completion=5
    # P2: burst=3, completion=8
    # P3: burst=2, completion=10
    p1 = Process(1, 0, 5)
    p1.completion_time = 5
    p2 = Process(2, 0, 3)
    p2.completion_time = 8
    p3 = Process(3, 0, 2)
    p3.completion_time = 10

    processes = [p1, p2, p3]
    utilization = calculate_cpu_utilization(processes)
    assert round(utilization, 2) == 100.00


def test_calculate_cpu_utilization_with_gaps():
    # P1: burst=5, completion=5
    # P2: burst=3, completion=10
    # P3: burst=2, completion=15
    # Total burst = 10, total completion = 15 => 10/15 * 100 = 66.67%
    p1 = Process(1, 0, 5)
    p1.completion_time = 5
    p2 = Process(2, 7, 3)
    p2.completion_time = 10
    p3 = Process(3, 13, 2)
    p3.completion_time = 15

    processes = [p1, p2, p3]
    utilization = calculate_cpu_utilization(processes)
    assert round(utilization, 2) == 66.67


def test_save_system_metrics():
    p1 = Process(1, 0, 5)
    p1.completion_time = 5
    p1.waiting_time = 0

    p2 = Process(2, 0, 3)
    p2.completion_time = 8
    p2.waiting_time = 5

    p3 = Process(3, 0, 2)
    p3.completion_time = 10
    p3.waiting_time = 8

    processes = [p1, p2, p3]
    metrics = save_system_metrics(processes)

    assert metrics["cpu_utilization"] == 100.0
    assert metrics["active_processes"] == 3
    assert metrics["waiting_processes"] == 2
    assert metrics["active_transactions"] == 0
    assert metrics["waiting_transactions"] == 0
    assert metrics["active_locks"] == 0
    assert metrics["lock_waits"] == 0
    assert metrics["deadlock_count"] == 0

    # Verify database insertion
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM system_metrics ORDER BY metric_id DESC LIMIT 1;")
        row = cursor.fetchone()
        assert row is not None
        assert float(row["cpu_utilization"]) == 100.0
        assert row["active_processes"] == 3
        assert row["waiting_processes"] == 2
        assert row["active_transactions"] == 0
        assert row["waiting_transactions"] == 0
        assert row["active_locks"] == 0
        assert row["lock_waits"] == 0
        assert row["deadlock_count"] == 0
    finally:
        cursor.close()
        conn.close()


def test_schedule_endpoint_e2e():
    client = TestClient(app)
    payload = {
        "query_text": "SELECT * FROM users;",
        "algorithm": "FCFS",
        "processes": [
            {"process_id": 1, "arrival_time": 0, "burst_time": 5, "priority": 1},
            {"process_id": 2, "arrival_time": 0, "burst_time": 3, "priority": 2},
            {"process_id": 3, "arrival_time": 0, "burst_time": 2, "priority": 3}
        ],
        "priority": 1
    }

    response = client.post("/schedule/", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "query_id" in data
    assert data["algorithm"] == "FCFS"
    assert len(data["results"]) == 3
    assert "system_metrics" in data

    metrics = data["system_metrics"]
    assert metrics["active_processes"] == 3
    assert metrics["waiting_processes"] == 2

    # Query DB to verify system_metrics row exists
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM system_metrics ORDER BY metric_id DESC LIMIT 1;")
        row = cursor.fetchone()
        assert row is not None
        assert row["active_processes"] == 3
        assert row["waiting_processes"] == 2
    finally:
        cursor.close()
        conn.close()
