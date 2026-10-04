from datetime import datetime
from typing import Optional, List, Dict, Any

from database import get_db_connection


class WALStatus:
    PENDING = "PENDING"
    COMMITTED = "COMMITTED"
    ROLLEDBACK = "ROLLEDBACK"


class WALOperation:
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


def write_wal_record(
    transaction_id: int,
    operation_type: str,
    table_name: str,
    record_identifier: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    log_status: str = WALStatus.PENDING
) -> Dict[str, Any]:
    """
    Write a Write-Ahead Logging (WAL) record to the wal_logs database table.
    Record is created before actual data modification occurs.
    """
    operation_type = operation_type.upper()
    created_at = datetime.now()

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        query = """
        INSERT INTO wal_logs
        (
            transaction_id,
            operation_type,
            table_name,
            record_identifier,
            old_value,
            new_value,
            log_status,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                transaction_id,
                operation_type,
                table_name,
                record_identifier,
                str(old_value) if old_value is not None else None,
                str(new_value) if new_value is not None else None,
                log_status,
                created_at
            )
        )

        log_id = cursor.lastrowid
        connection.commit()

        return {
            "log_id": log_id,
            "transaction_id": transaction_id,
            "operation_type": operation_type,
            "table_name": table_name,
            "record_identifier": record_identifier,
            "old_value": old_value,
            "new_value": new_value,
            "log_status": log_status,
            "created_at": created_at
        }

    finally:
        cursor.close()
        connection.close()


def commit_wal_records(transaction_id: int) -> int:
    """
    Update all PENDING WAL log records for a transaction to COMMITTED state.
    Returns the number of updated log records.
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        query = """
        UPDATE wal_logs
        SET log_status = %s
        WHERE transaction_id = %s AND log_status = %s
        """
        cursor.execute(query, (WALStatus.COMMITTED, transaction_id, WALStatus.PENDING))
        count = cursor.rowcount
        connection.commit()
        return count

    finally:
        cursor.close()
        connection.close()


def rollback_wal_records(transaction_id: int) -> int:
    """
    Update all PENDING WAL log records for a transaction to ROLLEDBACK state.
    Returns the number of updated log records.
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        query = """
        UPDATE wal_logs
        SET log_status = %s
        WHERE transaction_id = %s AND log_status = %s
        """
        cursor.execute(query, (WALStatus.ROLLEDBACK, transaction_id, WALStatus.PENDING))
        count = cursor.rowcount
        connection.commit()
        return count

    finally:
        cursor.close()
        connection.close()


def get_wal_logs_by_transaction(transaction_id: int) -> List[Dict[str, Any]]:
    """
    Fetch all WAL records for a given transaction_id.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT * FROM wal_logs WHERE transaction_id = %s ORDER BY log_id ASC"
        cursor.execute(query, (transaction_id,))
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_all_wal_logs(log_status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all WAL records, optionally filtered by log_status.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        if log_status:
            query = "SELECT * FROM wal_logs WHERE log_status = %s ORDER BY log_id DESC"
            cursor.execute(query, (log_status,))
        else:
            query = "SELECT * FROM wal_logs ORDER BY log_id DESC"
            cursor.execute(query)

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()
