import pytest
import uuid
import time
from datetime import datetime, timedelta

from dbms.lock_manager import LockType, acquire_lock
from dbms.transaction_database import begin_transaction, get_transaction
from dbms.deadlock_detector import (
    build_wait_for_graph,
    detect_cycles,
    select_deadlock_victim,
    detect_deadlocks,
    resolve_deadlock,
    resolve_all_deadlocks,
    get_deadlocks
)
from os_engine.os_database import create_query, create_process
from os_engine.process import Process
from database import get_db_connection


def test_detect_cycles_unit():
    # 2-node cycle: T1 -> T2 -> T1
    graph2 = {1: [2], 2: [1]}
    cycles2 = detect_cycles(graph2)
    assert len(cycles2) == 1
    assert set(cycles2[0]) == {1, 2}

    # 4-node cycle: T1 -> T2 -> T3 -> T4 -> T1
    graph4 = {1: [2], 2: [3], 3: [4], 4: [1]}
    cycles4 = detect_cycles(graph4)
    assert len(cycles4) == 1
    assert set(cycles4[0]) == {1, 2, 3, 4}

    # Linear graph with no cycle: T1 -> T2 -> T3
    graph_no_cycle = {1: [2], 2: [3]}
    cycles_none = detect_cycles(graph_no_cycle)
    assert len(cycles_none) == 0


def test_deadlock_victim_selection_policy():
    query_id = create_query(
        query_text="UPDATE test SET x=1;",
        algorithm="FCFS",
        priority=1
    )
    p1 = Process(process_id=501, arrival_time=0, burst_time=5)
    p2 = Process(process_id=502, arrival_time=0, burst_time=5)

    p1_db_id = create_process(query_id=query_id, process=p1, base_time=datetime.now())
    p2_db_id = create_process(query_id=query_id, process=p2, base_time=datetime.now())

    # T1 starts earlier (older), T2 starts later (younger)
    t_older = datetime.now() - timedelta(seconds=10)
    t_younger = datetime.now()

    tx1 = begin_transaction(process_id=p1_db_id, start_time=t_older)
    tx2 = begin_transaction(process_id=p2_db_id, start_time=t_younger)

    victim_id = select_deadlock_victim([tx1.transaction_id, tx2.transaction_id], policy="YOUNGEST")
    # Younger transaction (tx2) should be selected as victim
    assert victim_id == tx2.transaction_id


def test_end_to_end_deadlock_detection_and_resolution():
    query_id = create_query(
        query_text="UPDATE inventory SET qty = qty - 1;",
        algorithm="FCFS",
        priority=1
    )
    p1 = Process(process_id=401, arrival_time=0, burst_time=5)
    p2 = Process(process_id=402, arrival_time=0, burst_time=5)

    p1_db_id = create_process(query_id=query_id, process=p1, base_time=datetime.now())
    p2_db_id = create_process(query_id=query_id, process=p2, base_time=datetime.now())

    # T1 is older, T2 is younger
    t1_start = datetime.now() - timedelta(seconds=5)
    t2_start = datetime.now()

    tx1 = begin_transaction(process_id=p1_db_id, start_time=t1_start)
    tx2 = begin_transaction(process_id=p2_db_id, start_time=t2_start)

    res_A = f"res_A_{uuid.uuid4().hex[:6]}"
    res_B = f"res_B_{uuid.uuid4().hex[:6]}"

    # Step 1: T1 acquires A, T2 acquires B
    l1 = acquire_lock(tx1.transaction_id, res_A, LockType.EXCLUSIVE)
    assert l1["lock_state"] == "GRANTED"

    l2 = acquire_lock(tx2.transaction_id, res_B, LockType.EXCLUSIVE)
    assert l2["lock_state"] == "GRANTED"

    # Step 2: T1 requests B (WAITING), T2 requests A (WAITING)
    l1_wait = acquire_lock(tx1.transaction_id, res_B, LockType.EXCLUSIVE)
    assert l1_wait["lock_state"] == "WAITING"

    l2_wait = acquire_lock(tx2.transaction_id, res_A, LockType.EXCLUSIVE)
    assert l2_wait["lock_state"] == "WAITING"

    # Step 3: Detect Deadlock
    detected = detect_deadlocks()
    matching_deadlocks = [
        d for d in detected
        if d["transaction_1_id"] in (tx1.transaction_id, tx2.transaction_id)
           or d["transaction_2_id"] in (tx1.transaction_id, tx2.transaction_id)
    ]
    assert len(matching_deadlocks) >= 1
    d_info = matching_deadlocks[0]
    deadlock_id = d_info["deadlock_id"]

    # Step 4: Resolve Deadlock using YOUNGEST policy
    resolution = resolve_deadlock(deadlock_id, policy="YOUNGEST")
    assert resolution["resolution_status"] == "RESOLVED"
    assert resolution["resolved_transaction_id"] == tx2.transaction_id

    # Verify Victim (tx2) is ROLLEDBACK
    db_tx2 = get_transaction(tx2.transaction_id)
    assert db_tx2.state == "ROLLEDBACK"
    assert db_tx2.rollback_time is not None

    # Verify Survivor (tx1) is reactivated to ACTIVE
    db_tx1 = get_transaction(tx1.transaction_id)
    assert db_tx1.state == "ACTIVE"

    # Verify deadlocks table record updated in DB
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM deadlocks WHERE deadlock_id = %s", (deadlock_id,))
        d_row = cursor.fetchone()
        assert d_row["resolution_status"] == "RESOLVED"
        assert d_row["resolved_transaction_id"] == tx2.transaction_id
    finally:
        cursor.close()
        conn.close()
