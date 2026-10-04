from datetime import datetime
from typing import Optional, List, Union

from database import get_db_connection
from .transaction import Transaction, TransactionState
from .wal_logger import commit_wal_records, rollback_wal_records


def begin_transaction(
    process_id: int,
    state: str = TransactionState.ACTIVE,
    start_time: Optional[datetime] = None
) -> Transaction:
    """
    BEGIN transaction when a process starts database operations.
    Creates a new row in the transactions database table with state ACTIVE
    and returns the created Transaction object.
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

        return Transaction(
            process_id=process_id,
            transaction_id=transaction_id,
            state=state,
            start_time=start_datetime
        )

    finally:
        cursor.close()
        connection.close()


def create_transaction(
    process_id: int,
    state: str = TransactionState.ACTIVE,
    start_time: Optional[datetime] = None
) -> int:
    """
    Helper function that begins a transaction and returns the integer transaction_id.
    """
    tx = begin_transaction(process_id=process_id, state=state, start_time=start_time)
    return tx.transaction_id


def update_transaction_state(
    transaction_id: int,
    state: str
) -> bool:
    """
    Update the transaction_state of an existing transaction in the database.
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
    transaction: Union[int, Transaction],
    commit_time: Optional[datetime] = None
) -> bool:
    """
    COMMIT transaction when operations succeed.
    Updates transaction_state to COMMITTED and sets commit_time in the database.
    Also updates associated PENDING WAL log records to COMMITTED.
    Accepts either an integer transaction_id or a Transaction object.
    """
    transaction_id = (
        transaction.transaction_id
        if isinstance(transaction, Transaction)
        else transaction
    )

    if isinstance(transaction, Transaction):
        transaction.commit(commit_time)

    commit_datetime = (
        commit_time
        or (transaction.commit_time if isinstance(transaction, Transaction) else None)
        or datetime.now()
    )

    connection = get_db_connection()
    cursor = connection.cursor()

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

        # Update associated WAL log records from PENDING to COMMITTED
        commit_wal_records(transaction_id)
        return cursor.rowcount > 0

    finally:
        cursor.close()
        connection.close()


def rollback_transaction(
    transaction: Union[int, Transaction],
    rollback_time: Optional[datetime] = None
) -> bool:
    """
    ROLLBACK transaction if something goes wrong.
    Updates transaction_state to ROLLEDBACK and sets rollback_time in the database.
    Also updates associated PENDING WAL log records to ROLLEDBACK.
    Accepts either an integer transaction_id or a Transaction object.
    """
    transaction_id = (
        transaction.transaction_id
        if isinstance(transaction, Transaction)
        else transaction
    )

    if isinstance(transaction, Transaction):
        transaction.rollback(rollback_time)

    rollback_datetime = (
        rollback_time
        or (transaction.rollback_time if isinstance(transaction, Transaction) else None)
        or datetime.now()
    )

    connection = get_db_connection()
    cursor = connection.cursor()

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

        # Update associated WAL log records from PENDING to ROLLEDBACK
        rollback_wal_records(transaction_id)
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
