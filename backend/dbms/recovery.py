from datetime import datetime
from typing import Dict, List, Any, Set, Optional

from backend.database import get_db_connection
from .transaction import TransactionState
from .transaction_database import update_transaction_state, rollback_transaction
from .wal_logger import WALStatus, rollback_wal_records, get_all_wal_logs, get_wal_logs_by_transaction


def redo_transaction(transaction_id: int) -> List[Dict[str, Any]]:
    """
    REDO all operations for a committed transaction using
    new_value from WAL logs.
    """

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    redone_records = []

    try:
        query = """
        SELECT *
        FROM wal_logs
        WHERE transaction_id = %s
        AND log_status = %s
        ORDER BY log_id ASC
        """

        cursor.execute(
            query,
            (transaction_id, WALStatus.COMMITTED)
        )

        logs = cursor.fetchall()

        for log in logs:

            # Currently recovery supports UPDATE
            # operations on recovery_demo.
            if (
                log["table_name"] == "recovery_demo"
                and log["operation_type"] == "UPDATE"
            ):
                update_query = """
                UPDATE recovery_demo
                SET value = %s
                WHERE record_id = %s
                """

                cursor.execute(
                    update_query,
                    (
                        int(log["new_value"]),
                        int(log["record_identifier"])
                    )
                )

            redone_records.append({
                "log_id": log["log_id"],
                "transaction_id": transaction_id,
                "operation": log["operation_type"],
                "table_name": log["table_name"],
                "record_identifier": log["record_identifier"],
                "reapplied_value": log["new_value"],
                "action": "REDO"
            })

        connection.commit()

        return redone_records

    finally:
        cursor.close()
        connection.close()


def undo_transaction(transaction_id: int) -> List[Dict[str, Any]]:
    """
    UNDO all operations for an uncommitted transaction
    using old_value from WAL logs.
    """

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    undone_records = []

    try:
        query = """
        SELECT *
        FROM wal_logs
        WHERE transaction_id = %s
          AND log_status = %s
        ORDER BY log_id DESC
        """

        cursor.execute(
            query,
            (transaction_id, WALStatus.PENDING)
        )

        logs = cursor.fetchall()

        for log in logs:

            # Currently recovery supports UPDATE
            # operations on recovery_demo.
            if (
                log["table_name"] == "recovery_demo"
                and log["operation_type"] == "UPDATE"
            ):
                update_query = """
                UPDATE recovery_demo
                SET value = %s
                WHERE record_id = %s
                """

                cursor.execute(
                    update_query,
                    (
                        int(log["old_value"]),
                        int(log["record_identifier"])
                    )
                )

            undone_records.append({
                "log_id": log["log_id"],
                "transaction_id": transaction_id,
                "operation": log["operation_type"],
                "table_name": log["table_name"],
                "record_identifier": log["record_identifier"],
                "reverted_value": log["old_value"],
                "action": "UNDO"
            })

        connection.commit()

        # Now mark transaction as rolled back.
        rollback_transaction(transaction_id)

        return undone_records

    finally:
        cursor.close()
        connection.close()

def perform_recovery(
    transaction_ids: Optional[Set[int]] = None
) -> Dict[str, Any]:
    """
    Perform ARIES-style crash recovery:
    1. Scan active transactions and WAL logs.
    2. REDO committed transactions to guarantee Durability.
    3. UNDO active/uncommitted transactions to guarantee Atomicity.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    redo_tx_ids: Set[int] = set()
    undo_tx_ids: Set[int] = set()

    try:
        # Find all COMMITTED transactions
        cursor.execute(
            "SELECT transaction_id FROM transactions WHERE transaction_state = %s",
            (TransactionState.COMMITTED,)
        )

        for row in cursor.fetchall():
            transaction_id = row["transaction_id"]

            if transaction_ids is None or transaction_id in transaction_ids:
                redo_tx_ids.add(transaction_id)

        # Find all UNCOMMITTED (ACTIVE, WAITING, DEADLOCK) transactions
        cursor.execute(
            """
            SELECT transaction_id
            FROM transactions
            WHERE transaction_state IN (%s, %s, %s)
            """,
            (
                TransactionState.ACTIVE,
                TransactionState.WAITING,
                TransactionState.DEADLOCK
            )
        )

        for row in cursor.fetchall():
            transaction_id = row["transaction_id"]

            if transaction_ids is None or transaction_id in transaction_ids:
                undo_tx_ids.add(transaction_id)

        # Execute REDO phase
        all_redo_records = []
        for tx_id in redo_tx_ids:
            records = redo_transaction(tx_id)
            all_redo_records.extend(records)

        # Execute UNDO phase
        all_undo_records = []
        for tx_id in undo_tx_ids:
            records = undo_transaction(tx_id)
            all_undo_records.extend(records)

        return {
            "status": "SUCCESS",
            "recovered_at": datetime.now(),
            "redo_transaction_count": len(redo_tx_ids),
            "undo_transaction_count": len(undo_tx_ids),
            "redo_transactions": list(redo_tx_ids),
            "undo_transactions": list(undo_tx_ids),
            "redo_logs_processed": len(all_redo_records),
            "undo_logs_processed": len(all_undo_records),
            "redo_details": all_redo_records,
            "undo_details": all_undo_records
        }

    finally:
        cursor.close()
        connection.close()
