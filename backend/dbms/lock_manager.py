from datetime import datetime
from typing import Optional, List, Dict, Any

from database import get_db_connection
from .transaction_database import update_transaction_state
from .transaction import TransactionState


class LockType:
    SHARED = "SHARED"
    EXCLUSIVE = "EXCLUSIVE"


class LockState:
    GRANTED = "GRANTED"
    WAITING = "WAITING"
    RELEASED = "RELEASED"


def can_acquire(
    transaction_id: int,
    resource_name: str,
    lock_type: str
) -> bool:
    """
    Check if a transaction can acquire the specified lock on a resource.
    - Multiple transactions can hold SHARED locks simultaneously on the same resource.
    - EXCLUSIVE locks require no other transaction to hold any GRANTED lock on the resource.
    """
    lock_type = lock_type.upper()
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
        SELECT lock_id, transaction_id, lock_type
        FROM locks
        WHERE resource_name = %s
          AND lock_state = %s
          AND released_at IS NULL
          AND transaction_id != %s
        """
        cursor.execute(query, (resource_name, LockState.GRANTED, transaction_id))
        active_locks = cursor.fetchall()

        if not active_locks:
            return True

        if lock_type == LockType.SHARED:
            # Can acquire SHARED if all existing locks held by others are also SHARED
            return all(l["lock_type"].upper() == LockType.SHARED for l in active_locks)

        # Requesting EXCLUSIVE, but other transactions hold active locks
        return False

    finally:
        cursor.close()
        connection.close()


def acquire_lock(
    transaction_id: int,
    resource_name: str,
    lock_type: str
) -> Dict[str, Any]:
    """
    Attempt to acquire a lock for a transaction on a resource.
    Inserts a record into the locks table.
    If granted -> lock_state='GRANTED'
    If blocked -> lock_state='WAITING' (and updates transaction_state to WAITING)
    Returns a dict with lock metadata.
    """
    lock_type = lock_type.upper()
    granted = can_acquire(transaction_id, resource_name, lock_type)
    state = LockState.GRANTED if granted else LockState.WAITING
    requested_at = datetime.now()

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        query = """
        INSERT INTO locks
        (
            transaction_id,
            resource_name,
            lock_type,
            lock_state,
            requested_at
        )
        VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                transaction_id,
                resource_name,
                lock_type,
                state,
                requested_at
            )
        )

        lock_id = cursor.lastrowid
        connection.commit()

        # If lock is WAITING, update transaction state in DB to WAITING
        if state == LockState.WAITING:
            update_transaction_state(transaction_id, TransactionState.WAITING)

        return {
            "lock_id": lock_id,
            "transaction_id": transaction_id,
            "resource_name": resource_name,
            "lock_type": lock_type,
            "lock_state": state,
            "requested_at": requested_at
        }

    finally:
        cursor.close()
        connection.close()


def release_lock(lock_id: int) -> bool:
    """
    Release a specific lock by lock_id.
    Sets lock_state='RELEASED' and released_at timestamp.
    Promotes waiting locks on the same resource if compatible.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT lock_id, resource_name, transaction_id FROM locks WHERE lock_id = %s"
        cursor.execute(query, (lock_id,))
        lock_info = cursor.fetchone()

        if not lock_info:
            return False

        resource_name = lock_info["resource_name"]
        released_at = datetime.now()

        update_query = """
        UPDATE locks
        SET
            lock_state = %s,
            released_at = %s
        WHERE lock_id = %s
        """
        cursor.execute(update_query, (LockState.RELEASED, released_at, lock_id))
        connection.commit()

        _promote_waiting_locks(resource_name)
        return True

    finally:
        cursor.close()
        connection.close()


def release_locks_by_transaction(transaction_id: int) -> int:
    """
    Release all locks held by a specific transaction.
    Returns the count of released locks.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
        SELECT DISTINCT resource_name
        FROM locks
        WHERE transaction_id = %s AND lock_state IN (%s, %s)
        """
        cursor.execute(query, (transaction_id, LockState.GRANTED, LockState.WAITING))
        resources = [row["resource_name"] for row in cursor.fetchall()]

        released_at = datetime.now()
        update_query = """
        UPDATE locks
        SET
            lock_state = %s,
            released_at = %s
        WHERE transaction_id = %s AND lock_state IN (%s, %s)
        """
        cursor.execute(
            update_query,
            (
                LockState.RELEASED,
                released_at,
                transaction_id,
                LockState.GRANTED,
                LockState.WAITING
            )
        )
        count = cursor.rowcount
        connection.commit()

        for resource in resources:
            _promote_waiting_locks(resource)

        return count

    finally:
        cursor.close()
        connection.close()


def _promote_waiting_locks(resource_name: str):
    """
    Helper function to promote WAITING locks to GRANTED on a resource
    if they have become compatible after a lock release.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = """
        SELECT lock_id, transaction_id, lock_type
        FROM locks
        WHERE resource_name = %s AND lock_state = %s
        ORDER BY lock_id ASC
        """
        cursor.execute(query, (resource_name, LockState.WAITING))
        waiting_locks = cursor.fetchall()

        for w_lock in waiting_locks:
            tx_id = w_lock["transaction_id"]
            l_type = w_lock["lock_type"]

            if can_acquire(tx_id, resource_name, l_type):
                promote_query = "UPDATE locks SET lock_state = %s WHERE lock_id = %s"
                cursor.execute(promote_query, (LockState.GRANTED, w_lock["lock_id"]))
                connection.commit()

                _check_and_activate_transaction(tx_id)

    finally:
        cursor.close()
        connection.close()


def _check_and_activate_transaction(transaction_id: int):
    """
    If a transaction has no remaining WAITING locks, transition its state back to ACTIVE.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT COUNT(*) as wait_count FROM locks WHERE transaction_id = %s AND lock_state = %s"
        cursor.execute(query, (transaction_id, LockState.WAITING))
        row = cursor.fetchone()

        if row and row["wait_count"] == 0:
            update_transaction_state(transaction_id, TransactionState.ACTIVE)

    finally:
        cursor.close()
        connection.close()


def get_active_locks() -> List[Dict[str, Any]]:
    """
    Return all locks that are currently GRANTED.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT * FROM locks WHERE lock_state = %s AND released_at IS NULL"
        cursor.execute(query, (LockState.GRANTED,))
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_waiting_locks() -> List[Dict[str, Any]]:
    """
    Return all locks that are currently WAITING.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT * FROM locks WHERE lock_state = %s"
        cursor.execute(query, (LockState.WAITING,))
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()
