from datetime import datetime, timedelta

from database import get_db_connection


def create_query(query_text, algorithm, priority=0):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        query = """
        INSERT INTO queries
        (
            query_text,
            scheduling_algorithm,
            priority,
            status
        )
        VALUES (%s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                query_text,
                algorithm,
                priority,
                "SUBMITTED"
            )
        )

        query_id = cursor.lastrowid

        connection.commit()

        return query_id

    finally:
        cursor.close()
        connection.close()


def create_process(query_id, process, base_time):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        arrival_datetime = (
            base_time
            + timedelta(seconds=process.arrival_time)
        )

        query = """
        INSERT INTO processes
        (
            query_id,
            process_state,
            arrival_time,
            burst_time,
            priority
        )
        VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                query_id,
                process.state,
                arrival_datetime,
                process.burst_time,
                process.priority
            )
        )

        database_process_id = cursor.lastrowid

        connection.commit()

        return database_process_id

    finally:
        cursor.close()
        connection.close()


def update_process_result(
    database_process_id,
    process,
    base_time
):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        completion_datetime = (
            base_time
            + timedelta(seconds=process.completion_time)
        )

        query = """
        UPDATE processes
        SET
            process_state = %s,
            completion_time = %s,
            waiting_time = %s,
            turnaround_time = %s,
            response_time = %s
        WHERE process_id = %s
        """

        cursor.execute(
            query,
            (
                process.state,
                completion_datetime,
                process.waiting_time,
                process.turnaround_time,
                process.response_time,
                database_process_id
            )
        )

        connection.commit()

    finally:
        cursor.close()
        connection.close()


def save_scheduling_result(
    database_process_id,
    process,
    algorithm,
    base_time
):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        completion_datetime = (
            base_time
            + timedelta(seconds=process.completion_time)
        )

        query = """
        INSERT INTO scheduling_results
        (
            process_id,
            algorithm,
            waiting_time,
            turnaround_time,
            response_time,
            completion_time
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                database_process_id,
                algorithm,
                process.waiting_time,
                process.turnaround_time,
                process.response_time,
                completion_datetime
            )
        )

        connection.commit()

    finally:
        cursor.close()
        connection.close()