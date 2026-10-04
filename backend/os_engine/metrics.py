from database import get_db_connection


def calculate_cpu_utilization(processes):

    if not processes:
        return 0.0

    total_burst_time = sum(
        process.burst_time
        for process in processes
    )

    total_completion_time = max(
        process.completion_time
        for process in processes
    )

    if total_completion_time <= 0:
        return 0.0

    utilization = (
        total_burst_time / total_completion_time
    ) * 100

    return min(utilization, 100.0)


def save_system_metrics(
    processes,
    active_transactions=0,
    waiting_transactions=0,
    active_locks=0,
    lock_waits=0,
    deadlock_count=0
):

    cpu_utilization = calculate_cpu_utilization(processes)

    active_processes = len(processes)

    waiting_processes = sum(
        1
        for process in processes
        if process.waiting_time > 0
    )

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        query = """
        INSERT INTO system_metrics
        (
            cpu_utilization,
            active_processes,
            waiting_processes,
            active_transactions,
            waiting_transactions,
            active_locks,
            lock_waits,
            deadlock_count
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                cpu_utilization,
                active_processes,
                waiting_processes,
                active_transactions,
                waiting_transactions,
                active_locks,
                lock_waits,
                deadlock_count
            )
        )

        connection.commit()

        return {
            "cpu_utilization": round(
                cpu_utilization, 2
            ),
            "active_processes": active_processes,
            "waiting_processes": waiting_processes,
            "active_transactions": active_transactions,
            "waiting_transactions": waiting_transactions,
            "active_locks": active_locks,
            "lock_waits": lock_waits,
            "deadlock_count": deadlock_count
        }

    finally:

        cursor.close()
        connection.close()