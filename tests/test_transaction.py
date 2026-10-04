import pytest
from datetime import datetime

from dbms.transaction import Transaction, TransactionState
from dbms.transaction_database import (
    begin_transaction,
    create_transaction,
    update_transaction_state,
    commit_transaction,
    rollback_transaction,
    get_transaction,
    get_transactions_by_process
)
from os_engine.os_database import create_query, create_process
from os_engine.process import Process


def test_transaction_class_logic():
    tx = Transaction(process_id=1)
    assert tx.state == TransactionState.ACTIVE
    assert tx.commit_time is None
    assert tx.rollback_time is None

    # Test wait & activate
    tx.wait()
    assert tx.state == TransactionState.WAITING

    tx.activate()
    assert tx.state == TransactionState.ACTIVE

    # Test commit
    tx.commit()
    assert tx.state == TransactionState.COMMITTED
    assert tx.commit_time is not None

    # Cannot commit or rollback terminated transaction
    with pytest.raises(ValueError):
        tx.commit()

    with pytest.raises(ValueError):
        tx.rollback()


def test_transaction_rollback_logic():
    tx = Transaction(process_id=2)
    tx.rollback()
    assert tx.state == TransactionState.ROLLEDBACK
    assert tx.rollback_time is not None


def test_begin_commit_rollback_flow():
    # Setup prerequisite query & process for FK constraint
    query_id = create_query(
        query_text="SELECT * FROM orders;",
        algorithm="FCFS",
        priority=1
    )
    proc = Process(process_id=202, arrival_time=0, burst_time=3)
    process_db_id = create_process(query_id=query_id, process=proc, base_time=datetime.now())

    # 1. BEGIN transaction
    tx = begin_transaction(process_id=process_db_id)
    assert tx.transaction_id > 0
    assert tx.state == TransactionState.ACTIVE
    assert tx.start_time is not None

    # Verify database record is ACTIVE
    db_tx = get_transaction(tx.transaction_id)
    assert db_tx.state == TransactionState.ACTIVE

    # 2. COMMIT transaction
    committed = commit_transaction(tx)
    assert committed is True
    assert tx.state == TransactionState.COMMITTED
    assert tx.commit_time is not None

    # Verify database record is COMMITTED with commit_time
    db_tx = get_transaction(tx.transaction_id)
    assert db_tx.state == TransactionState.COMMITTED
    assert db_tx.commit_time is not None

    # 3. BEGIN another transaction and ROLLBACK
    tx2 = begin_transaction(process_id=process_db_id)
    assert tx2.transaction_id > 0
    assert tx2.state == TransactionState.ACTIVE

    rolled_back = rollback_transaction(tx2)
    assert rolled_back is True
    assert tx2.state == TransactionState.ROLLEDBACK
    assert tx2.rollback_time is not None

    # Verify database record is ROLLEDBACK with rollback_time
    db_tx2 = get_transaction(tx2.transaction_id)
    assert db_tx2.state == TransactionState.ROLLEDBACK
    assert db_tx2.rollback_time is not None


def test_transaction_database_crud():
    query_id = create_query(
        query_text="SELECT * FROM products;",
        algorithm="FCFS",
        priority=1
    )
    proc = Process(process_id=101, arrival_time=0, burst_time=4)
    process_db_id = create_process(query_id=query_id, process=proc, base_time=datetime.now())

    tx_id = create_transaction(process_id=process_db_id, state=TransactionState.ACTIVE)
    assert tx_id > 0

    fetched_tx = get_transaction(tx_id)
    assert fetched_tx is not None
    assert fetched_tx.process_id == process_db_id
    assert fetched_tx.state == TransactionState.ACTIVE

    updated = update_transaction_state(tx_id, TransactionState.WAITING)
    assert updated is True

    fetched_tx = get_transaction(tx_id)
    assert fetched_tx.state == TransactionState.WAITING

    committed = commit_transaction(tx_id)
    assert committed is True

    fetched_tx = get_transaction(tx_id)
    assert fetched_tx.state == TransactionState.COMMITTED
    assert fetched_tx.commit_time is not None

    tx_id2 = create_transaction(process_id=process_db_id, state=TransactionState.ACTIVE)
    rolled_back = rollback_transaction(tx_id2)
    assert rolled_back is True

    fetched_tx2 = get_transaction(tx_id2)
    assert fetched_tx2.state == TransactionState.ROLLEDBACK
    assert fetched_tx2.rollback_time is not None

    tx_list = get_transactions_by_process(process_db_id)
    assert len(tx_list) >= 2
