from datetime import datetime
from os_engine.process import Process
from os_engine.os_database import (
    create_query,
    create_process,
    save_scheduling_result
)


def test_os_database():
    # 1. Create a query
    query_id = create_query(
        query_text="Test scheduling query",
        algorithm="FCFS",
        priority=1
    )
    assert query_id > 0

    # 2. Create a process
    process = Process(
        process_id=1,
        arrival_time=0,
        burst_time=5,
        priority=1
    )
    process.state = "NEW"
    base_time = datetime.now()

    database_process_id = create_process(
        query_id=query_id,
        process=process,
        base_time=base_time
    )
    assert database_process_id > 0

    # 3. Simulate scheduling result
    process.waiting_time = 0
    process.turnaround_time = 5
    process.response_time = 0
    process.completion_time = 5

    save_scheduling_result(
        database_process_id=database_process_id,
        process=process,
        algorithm="FCFS",
        base_time=base_time
    )