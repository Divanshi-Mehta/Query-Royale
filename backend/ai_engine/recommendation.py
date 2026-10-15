
from typing import Any


SUPPORTED_ALGORITHMS = [
    "FCFS",
    "SJF",
    "PRIORITY",
    "ROUND_ROBIN",
]


def recommend_algorithm(
    processes: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Recommend a scheduling algorithm using simple rules.

    This is an initial rule-based recommender, not a trained
    machine-learning model.
    """

    if not processes:
        raise ValueError("At least one process is required.")

    
    process_ids = [process.get("process_id") for process in processes]

    if any(process_id is None for process_id in process_ids):
        raise ValueError("Every process must have a process_id.")

    if len(process_ids) != len(set(process_ids)):
        raise ValueError("Process IDs must be unique.")

    for process in processes:
        burst_time = process.get("burst_time")
        arrival_time = process.get("arrival_time")
        priority = process.get("priority", 0)

        if not isinstance(burst_time, int) or isinstance(burst_time, bool):
            raise ValueError("Burst time must be an integer.")

        if burst_time <= 0:
            raise ValueError("Burst time must be greater than zero.")

        if not isinstance(arrival_time, int) or isinstance(arrival_time, bool):
            raise ValueError("Arrival time must be an integer.")

        if arrival_time < 0:
            raise ValueError("Arrival time cannot be negative.")

        if not isinstance(priority, int) or isinstance(priority, bool):
            raise ValueError("Priority must be an integer.")

        if priority < 0:
            raise ValueError("Priority cannot be negative.")


    burst_times = [p["burst_time"] for p in processes]
    arrival_times = [p["arrival_time"] for p in processes]
    priorities = [p.get("priority", 0) for p in processes]

    process_count = len(processes)
    burst_spread = max(burst_times) - min(burst_times)
    arrivals_vary = len(set(arrival_times)) > 1
    priorities_vary = len(set(priorities)) > 1

    if process_count >= 5:
        algorithm = "ROUND_ROBIN"
        reason = (
            "There are many processes, so Round Robin can provide "
            "each process with regular CPU time."
        )

    elif priorities_vary:
        algorithm = "PRIORITY"
        reason = (
            "Processes have different priority values, so "
            "Priority scheduling is worth considering."
        )

    elif burst_spread > 5:
        algorithm = "SJF"
        reason = (
            "Burst times vary substantially, so SJF may reduce "
            "average waiting time when shorter jobs run first."
        )

    elif arrivals_vary:
        algorithm = "FCFS"
        reason = (
            "Processes arrive at different times, so FCFS provides "
            "a straightforward arrival-order scheduling policy."
        )

    else:
        algorithm = "FCFS"
        reason = (
            "The workload is relatively simple, so FCFS is a "
            "straightforward baseline choice."
        )

    return {
        "recommended_algorithm": algorithm,
        "reason": reason,
        "process_count": process_count,
        "burst_time_range": {
            "minimum": min(burst_times),
            "maximum": max(burst_times),
        },
        "supported_algorithms": SUPPORTED_ALGORITHMS,
        "recommendation_type": "rule_based",
    }
