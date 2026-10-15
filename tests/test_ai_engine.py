
import pytest

from backend.ai_engine.comparison import compare_algorithms
from backend.ai_engine.recommendation import recommend_algorithm
from backend.os_engine.process import Process
from pydantic import ValidationError
from backend.api.scheduling import SchedulingRequest
from fastapi.testclient import TestClient
from backend.main import app

def make_processes():
    return [
        Process(
            process_id=1,
            arrival_time=0,
            burst_time=8,
            priority=3,
        ),
        Process(
            process_id=2,
            arrival_time=1,
            burst_time=2,
            priority=1,
        ),
        Process(
            process_id=3,
            arrival_time=2,
            burst_time=4,
            priority=2,
        ),
    ]


def test_comparison_includes_all_algorithms():
    result = compare_algorithms(make_processes(), time_quantum=2)

    algorithms = {
        item["algorithm"] for item in result["comparisons"]
    }

    assert algorithms == {
        "FCFS",
        "SJF",
        "PRIORITY",
        "ROUND_ROBIN",
    }


def test_comparison_recommends_lowest_waiting_time():
    result = compare_algorithms(make_processes(), time_quantum=2)

    lowest_waiting_time = min(
        item["average_waiting_time"]
        for item in result["comparisons"]
    )

    assert result["selection_criterion"] == (
        "lowest_average_waiting_time"
    )

    assert any(
        item["algorithm"] == result["recommended_algorithm"]
        and item["average_waiting_time"] == lowest_waiting_time
        for item in result["comparisons"]
    )


def test_comparison_rejects_empty_workload():
    with pytest.raises(ValueError, match="At least one process"):
        compare_algorithms([])


def test_recommender_selects_sjf_for_varied_burst_times():
    processes = [
        {
            "process_id": 1,
            "arrival_time": 0,
            "burst_time": 2,
            "priority": 1,
        },
        {
            "process_id": 2,
            "arrival_time": 0,
            "burst_time": 12,
            "priority": 1,
        },
    ]

    result = recommend_algorithm(processes)

    assert result["recommended_algorithm"] == "SJF"
    assert result["recommendation_type"] == "rule_based"


def test_recommender_rejects_empty_workload():
    with pytest.raises(ValueError, match="At least one process"):
        recommend_algorithm([])


def test_comparison_rejects_duplicate_process_ids():
    processes = [
        Process(process_id=1, arrival_time=0, burst_time=3, priority=1),
        Process(process_id=1, arrival_time=1, burst_time=2, priority=2),
    ]

    with pytest.raises(ValueError, match="Process IDs must be unique"):
        compare_algorithms(processes)


def test_comparison_rejects_negative_priority():
    processes = [
        Process(process_id=1, arrival_time=0, burst_time=3, priority=-1),
    ]

    with pytest.raises(ValueError, match="Priority cannot be negative"):
        compare_algorithms(processes)


def test_recommender_rejects_duplicate_process_ids():
    processes = [
        {"process_id": 1, "arrival_time": 0, "burst_time": 3, "priority": 1},
        {"process_id": 1, "arrival_time": 1, "burst_time": 2, "priority": 2},
    ]

    with pytest.raises(ValueError, match="Process IDs must be unique"):
        recommend_algorithm(processes)


def test_scheduling_request_rejects_duplicate_process_ids():
    with pytest.raises(ValidationError, match="Process IDs must be unique"):
        SchedulingRequest(
            query_text="Compare scheduling algorithms",
            algorithm="FCFS",
            processes=[
                {
                    "process_id": 1,
                    "arrival_time": 0,
                    "burst_time": 4,
                    "priority": 1,
                },
                {
                    "process_id": 1,
                    "arrival_time": 1,
                    "burst_time": 2,
                    "priority": 2,
                },
            ],
        )


client = TestClient(app)


def test_api_rejects_zero_time_quantum():
    response = client.post(
        "/schedule/compare",
        json={
            "query_text": "Test invalid time quantum",
            "algorithm": "ROUND_ROBIN",
            "processes": [
                {
                    "process_id": 1,
                    "arrival_time": 0,
                    "burst_time": 4,
                    "priority": 1,
                },
                {
                    "process_id": 2,
                    "arrival_time": 1,
                    "burst_time": 2,
                    "priority": 2,
                },
            ],
            "time_quantum": 0,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "time_quantum"]


def test_api_rejects_duplicate_process_ids():
    response = client.post(
        "/schedule/compare",
        json={
            "query_text": "Test duplicate process IDs",
            "algorithm": "FCFS",
            "processes": [
                {
                    "process_id": 1,
                    "arrival_time": 0,
                    "burst_time": 4,
                    "priority": 1,
                },
                {
                    "process_id": 1,
                    "arrival_time": 1,
                    "burst_time": 2,
                    "priority": 2,
                },
            ],
            "time_quantum": 2,
        },
    )

    assert response.status_code == 422
