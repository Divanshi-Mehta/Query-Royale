import pytest
import uuid
from datetime import datetime

from dbms.lock_manager import (
    LockType,
    LockState,
    can_acquire,
    acquire_lock,
    release_lock,
    release_locks_by_transaction,
    get_active_locks,
    get_waiting_locks
)
from dbms.transaction_database import begin_transaction, get_transaction
from os_engine.os_database import create_query, create_process
from os_engine.process import Process
from database import get_db_connection


def setup_test_transactions():
    # Helper to set up test query, process, and 2 transactions
    query_id = create_query(
        query_text="SELECT * FROM accounts;",
        algorithm="FCFS",
        priority=1
    )
    p1 = Process(process_id=301, arrival_time=0, burst_time=5)
    p2 = Process(process_id=302, arrival_time=0, burst_time=5)

    p1_db_id = create_process(query_id=query_id, process=p1, base_time=datetime.now())
    p2_db_id = create_process(query_id=query_id, process=p2, base_time=datetime.now())

    tx1 = begin_transaction(process_id=p1_db_id)
    tx2 = begin_transaction(process_id=p2_db_id)
    return tx1, tx2


def test_shared_locks_concurrent():
    tx1, tx2 = setup_test_transactions()
    resource = f"account_table_{uuid.uuid4().hex[:6]}"

    # T1 acquires SHARED lock
    l1 = acquire_lock(tx1.transaction_id, resource, LockType.SHARED)
    assert l1["lock_state"] == LockState.GRANTED

    # T2 can also acquire SHARED lock concurrently
    assert can_acquire(tx2.transaction_id, resource, LockType.SHARED) is True
    l2 = acquire_lock(tx2.transaction_id, resource, LockType.SHARED)
    assert l2["lock_state"] == LockState.GRANTED


def test_exclusive_lock_conflict_and_promotion():
    tx1, tx2 = setup_test_transactions()
    resource = f"user_balance_{uuid.uuid4().hex[:6]}"

    # T1 acquires EXCLUSIVE lock
    l1 = acquire_lock(tx1.transaction_id, resource, LockType.EXCLUSIVE)
    assert l1["lock_state"] == LockState.GRANTED

    # T2 attempts to acquire EXCLUSIVE lock -> must WAIT
    assert can_acquire(tx2.transaction_id, resource, LockType.EXCLUSIVE) is False
    l2 = acquire_lock(tx2.transaction_id, resource, LockType.EXCLUSIVE)
    assert l2["lock_state"] == LockState.WAITING

    # T2 transaction state should now be WAITING
    db_tx2 = get_transaction(tx2.transaction_id)
    assert db_tx2.state == "WAITING"

    # Releasing T1 lock should promote T2 lock to GRANTED and activate T2 transaction
    released = release_lock(l1["lock_id"])
    assert released is True

    db_tx2_after = get_transaction(tx2.transaction_id)
    assert db_tx2_after.state == "ACTIVE"


def fetch_lock_row(lock_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM locks WHERE lock_id = %s", (lock_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def test_lock_waiting_and_timestamp_lifecycle():
    tx1, tx2 = setup_test_transactions()
    resource = f"Resource_A_{uuid.uuid4().hex[:6]}"

    # 1. T1 acquires Resource A -> GRANTED
    l1 = acquire_lock(tx1.transaction_id, resource, LockType.EXCLUSIVE)
    assert l1["lock_state"] == LockState.GRANTED
    assert l1["requested_at"] is not None

    row1 = fetch_lock_row(l1["lock_id"])
    assert row1 is not None
    assert row1["lock_state"] == "GRANTED"
    assert row1["requested_at"] is not None
    assert row1["released_at"] is None

    # 2. T2 requests Resource A -> WAITING
    l2 = acquire_lock(tx2.transaction_id, resource, LockType.EXCLUSIVE)
    assert l2["lock_state"] == LockState.WAITING
    assert l2["requested_at"] is not None

    row2 = fetch_lock_row(l2["lock_id"])
    assert row2 is not None
    assert row2["lock_state"] == "WAITING"
    assert row2["requested_at"] is not None
    assert row2["released_at"] is None

    # 3. T1 releases Resource A -> T1 lock RELEASED with released_at, T2 lock promoted to GRANTED
    released = release_lock(l1["lock_id"])
    assert released is True

    row1_after = fetch_lock_row(l1["lock_id"])
    assert row1_after["lock_state"] == "RELEASED"
    assert row1_after["released_at"] is not None

    row2_promoted = fetch_lock_row(l2["lock_id"])
    assert row2_promoted["lock_state"] == "GRANTED"
    assert row2_promoted["released_at"] is None

    # 4. T2 releases Resource A -> T2 lock RELEASED with released_at
    released2 = release_lock(l2["lock_id"])
    assert released2 is True

    row2_final = fetch_lock_row(l2["lock_id"])
    assert row2_final["lock_state"] == "RELEASED"
    assert row2_final["released_at"] is not None


def test_release_locks_by_transaction():
    tx1, tx2 = setup_test_transactions()
    r1 = f"resource_x_{uuid.uuid4().hex[:6]}"
    r2 = f"resource_y_{uuid.uuid4().hex[:6]}"

    acquire_lock(tx1.transaction_id, r1, LockType.EXCLUSIVE)
    acquire_lock(tx1.transaction_id, r2, LockType.SHARED)

    count = release_locks_by_transaction(tx1.transaction_id)
    assert count == 2
