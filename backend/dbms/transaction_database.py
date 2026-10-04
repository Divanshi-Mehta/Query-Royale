from datetime import datetime
from typing import Optional, List, Union

from database import get_db_connection
from .transaction import Transaction, TransactionState


def create_transaction(
    process_id: int,
    state: str = TransactionState.ACTIVE,
    start_time: Optional[datetime] = None
) -> int:
    """
    Insert a new transaction into the transactions database table.
    Returns the generated transaction_id.
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    start_datetime = start_time or datetime.now()

    try:
        query = """
        INSERT INTO transactions
        (
            process_id,
            transaction_state,
            start_time
        )
        VALUES (%s, %s, %s)
        """

        cursor.execute(
            query,
            (
                process_id,
                state,
                start_datetime
            )
        )

        transaction_id = cursor.lastrowid
        connection.commit()
        return transaction_id

    finally:
        cursor.close()
        connection.close()


def update_transaction_state(
    transaction_id: int,
    state: str
) -> bool:
    """
    Update the transaction_state of an existing transaction.
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        query = """
        UPDATE transactions
        SET transaction_state = %s
        WHERE transaction_id = %s
        """

        cursor.execute(query, (state, transaction_id))
        connection.commit()
        return cursor.rowcount > 0

    finally:
        cursor.close()
        connection.close()


def commit_transaction(
    transaction_id: int,
    commit_time: Optional[datetime] = None
) -> bool:
    """
    Mark a transaction as COMMITTED and record the commit timestamp.
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    commit_datetime = commit_time or datetime.now()

    try:
        query = """
        UPDATE transactions
        SET
            transaction_state = %s,
            commit_time = %s
        WHERE transaction_id = %s
        """

        cursor.execute(
            query,
            (
                TransactionState.COMMITTED,
                commit_datetime,
                transaction_id
            )
        )

        connection.commit()
        return cursor.rowcount > 0

    finally:
        cursor.close()
        connection.close()


def rollback_transaction(
    transaction_id: int,
    rollback_time: Optional[datetime] = None
) -> bool:
    """
    Mark a transaction as ROLLEDBACK and record the rollback timestamp.
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    rollback_datetime = rollback_time or datetime.now()

    try:
        query = """
        UPDATE transactions
        SET
            transaction_state = %s,
            rollback_time = %s
        WHERE transaction_id = %s
        """

        cursor.execute(
            query,
            (
                TransactionState.ROLLEDBACK,
                rollback_datetime,
                transaction_id
            )
        )

        connection.commit()
        return cursor.rowcount > 0

    finally:
        cursor.close()
        connection.close()


def get_transaction(transaction_id: int) -> Optional[Transaction]:
    """
    Fetch a transaction by transaction_id and return a Transaction object.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
        SELECT
            transaction_id,
            process_id,
            transaction_state,
            start_time,
            commit_time,
            rollback_time
        FROM transactions
        WHERE transaction_id = %s
        """

        cursor.execute(query, (transaction_id,))
        row = cursor.fetchone()

        if not row:
            return None

        return Transaction(
            process_id=row["process_id"],
            transaction_id=row["transaction_id"],
            state=row["transaction_state"],
            start_time=row["start_time"],
            commit_time=row["commit_time"],
            rollback_time=row["rollback_time"]
        )

    finally:
        cursor.close()
        connection.close()


def get_transactions_by_process(process_id: int) -> List[Transaction]:
    """
    Fetch all transactions associated with a given process_id.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
        SELECT
            transaction_id,
            process_id,
            transaction_state,
            start_time,
            commit_time,
            rollback_time
        FROM transactions
        WHERE process_id = %s
        ORDER BY transaction_id ASC
        """

        cursor.execute(query, (process_id,))
        rows = cursor.fetchall()

        return [
            Transaction(
                process_id=row["process_id"],
                transaction_id=row["transaction_id"],
                state=row["transaction_state"],
                start_time=row["start_time"],
                commit_time=row["commit_time"],
                rollback_time=row["rollback_time"]
            )
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()
