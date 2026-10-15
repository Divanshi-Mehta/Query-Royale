
from statistics import mean

from backend.os_engine.process import Process
from backend.os_engine.scheduler import get_scheduler


def compare_algorithms(processes, time_quantum=2):
    """
    Run each supported scheduler on an independent copy
    of the same workload and compare scheduling metrics.
    """

    if not processes:
        raise ValueError("At least one process is required.")

    
    process_ids = [process.process_id for process in processes]

    if len(process_ids) != len(set(process_ids)):
        raise ValueError("Process IDs must be unique.")

    for process in processes:
        if process.burst_time <= 0:
            raise ValueError("Burst time must be greater than zero.")

        if process.arrival_time < 0:
            raise ValueError("Arrival time cannot be negative.")

        if process.priority < 0:
            raise ValueError("Priority cannot be negative.")


    if time_quantum <= 0:
        raise ValueError("Time quantum must be greater than zero.")

    algorithms = ["FCFS", "SJF", "PRIORITY", "ROUND_ROBIN"]
    comparisons = []

    for algorithm in algorithms:
        
        process_copies = [
            Process(
                process_id=p.process_id,
                arrival_time=p.arrival_time,
                burst_time=p.burst_time,
                priority=p.priority,
            )
            for p in processes
        ]

        scheduler = get_scheduler(
            algorithm,
            time_quantum=time_quantum
            if algorithm == "ROUND_ROBIN"
            else None,
        )

        results = scheduler.schedule(process_copies)

        comparisons.append({
            "algorithm": algorithm,
            "average_waiting_time": round(
                mean(p.waiting_time for p in results), 2
            ),
            "average_turnaround_time": round(
                mean(p.turnaround_time for p in results), 2
            ),
            "average_response_time": round(
                mean(p.response_time for p in results), 2
            ),
        })

    best = min(
        comparisons,
        key=lambda item: item["average_waiting_time"],
    )

    return {
        "recommended_algorithm": best["algorithm"],
        "selection_criterion": "lowest_average_waiting_time",
        "time_quantum": time_quantum,
        "comparisons": comparisons,
        "recommendation_type": "metric_based",
    }
