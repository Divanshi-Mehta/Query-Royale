import pytest
from datetime import datetime

from dbms.transaction_database import (
    begin_transaction,
    commit_transaction,
    rollback_transaction,
    get_transaction
)
from dbms.wal_logger import (
    WALStatus,
    WALOperation,
    write_wal_record,
    get_wal_logs_by_transaction,
    get_all_wal_logs
)
from os_engine.os_database import create_query, create_process
from os_engine.process import Process


def test_write_wal_record_and_commit():
    query_id = create_query(
        query_text="UPDATE users SET balance = 800 WHERE id = 12;",
        algorithm="FCFS",
        priority=1
    )
    p = Process(process_id=601, arrival_time=0, burst_time=3)
    p_db_id = create_process(query_id=query_id, process=p, base_time=datetime.now())

    # 1. Begin transaction
    tx = begin_transaction(process_id=p_db_id)
    assert tx.transaction_id > 0

    # 2. Write WAL record (users.balance: 1000 -> 800) before data modification
    log_rec = write_wal_record(
        transaction_id=tx.transaction_id,
        operation_type=WALOperation.UPDATE,
        table_name="users",
        record_identifier="12",
        old_value="1000",
        new_value="800"
    )

    assert log_rec["log_id"] > 0
    assert log_rec["log_status"] == WALStatus.PENDING
    assert log_rec["operation_type"] == "UPDATE"
    assert log_rec["table_name"] == "users"
    assert log_rec["old_value"] == "1000"
    assert log_rec["new_value"] == "800"

    # Verify PENDING state in DB
    logs_before = get_wal_logs_by_transaction(tx.transaction_id)
    assert len(logs_before) == 1
    assert logs_before[0]["log_status"] == WALStatus.PENDING

    # 3. Commit transaction -> WAL record state transitions PENDING -> COMMITTED
    commit_transaction(tx)

    logs_after = get_wal_logs_by_transaction(tx.transaction_id)
    assert len(logs_after) == 1
    assert logs_after[0]["log_status"] == WALStatus.COMMITTED


def test_write_wal_record_and_rollback():
    query_id = create_query(
        query_text="INSERT INTO orders VALUES (101, 'laptop');",
        algorithm="FCFS",
        priority=1
    )
    p = Process(process_id=602, arrival_time=0, burst_time=3)
    p_db_id = create_process(query_id=query_id, process=p, base_time=datetime.now())

    tx = begin_transaction(process_id=p_db_id)

    # Write WAL record for INSERT
    log_rec = write_wal_record(
        transaction_id=tx.transaction_id,
        operation_type=WALOperation.INSERT,
        table_name="orders",
        record_identifier="101",
        old_value=None,
        new_value="{'id': 101, 'item': 'laptop'}"
    )

    assert log_rec["log_status"] == WALStatus.PENDING

    # Rollback transaction -> WAL record state transitions PENDING -> ROLLEDBACK
    rollback_transaction(tx)

    logs_after = get_wal_logs_by_transaction(tx.transaction_id)
    assert len(logs_after) == 1
    assert logs_after[0]["log_status"] == WALStatus.ROLLEDBACK
