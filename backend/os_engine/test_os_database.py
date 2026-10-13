from datetime import datetime

from os_engine.process import Process
from os_engine.os_database import (
    create_query,
    create_process,
    update_process_result,
    save_scheduling_result
)


def test_os_database():

    # -----------------------------------------
    # 1. Create a query
    # -----------------------------------------

    query_id = create_query(
        query_text="Test scheduling query",
        algorithm="FCFS",
        priority=1
    )

    assert query_id > 0

    print("Query created:", query_id)

    # -----------------------------------------
    # 2. Create a process
    # -----------------------------------------

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

    print("Process created:", database_process_id)

    # -----------------------------------------
    # 3. Simulate scheduling
    # -----------------------------------------

    process.state = "TERMINATED"
    process.waiting_time = 0
    process.turnaround_time = 5
    process.response_time = 0
    process.completion_time = 5

    # -----------------------------------------
    # 4. Update process result
    # -----------------------------------------

    update_process_result(
        database_process_id=database_process_id,
        process=process,
        base_time=base_time
    )

    print("Process result updated")

    # -----------------------------------------
    # 5. Save scheduling result
    # -----------------------------------------

    save_scheduling_result(
        database_process_id=database_process_id,
        process=process,
        algorithm="FCFS",
        base_time=base_time
    )

    print("Scheduling result saved")

    print("OS database test passed!")

if __name__ == "__main__":
    test_os_database()