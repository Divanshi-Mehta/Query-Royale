import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_live_api_fcfs():
    payload = {
        "query_text": "SELECT * FROM users;",
        "algorithm": "FCFS",
        "processes": [
            {"process_id": 1, "arrival_time": 0, "burst_time": 5, "priority": 1},
            {"process_id": 2, "arrival_time": 1, "burst_time": 3, "priority": 2}
        ],
        "priority": 1
    }
    r = client.post("/schedule/", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["algorithm"] == "FCFS"
    assert len(data["results"]) == 2


def test_live_api_sjf():
    payload = {
        "query_text": "SELECT * FROM orders;",
        "algorithm": "SJF",
        "processes": [
            {"process_id": 1, "arrival_time": 0, "burst_time": 6, "priority": 1},
            {"process_id": 2, "arrival_time": 0, "burst_time": 2, "priority": 2}
        ],
        "priority": 1
    }
    r = client.post("/schedule/", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["algorithm"] == "SJF"
    assert data["results"][0]["process_id"] == 2


def test_live_api_priority():
    payload = {
        "query_text": "UPDATE accounts SET balance = 100;",
        "algorithm": "PRIORITY",
        "processes": [
            {"process_id": 1, "arrival_time": 0, "burst_time": 4, "priority": 2},
            {"process_id": 2, "arrival_time": 0, "burst_time": 4, "priority": 1}
        ],
        "priority": 1
    }
    r = client.post("/schedule/", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["algorithm"] == "PRIORITY"
    assert data["results"][0]["process_id"] == 2


def test_live_api_round_robin():
    payload = {
        "query_text": "DELETE FROM logs WHERE id < 10;",
        "algorithm": "ROUND_ROBIN",
        "processes": [
            {"process_id": 1, "arrival_time": 0, "burst_time": 5, "priority": 1},
            {"process_id": 2, "arrival_time": 0, "burst_time": 4, "priority": 2}
        ],
        "priority": 1,
        "time_quantum": 2
    }
    r = client.post("/schedule/", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["algorithm"] == "ROUND_ROBIN"
