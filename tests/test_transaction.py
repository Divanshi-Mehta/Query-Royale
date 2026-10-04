import pytest
from datetime import datetime

from dbms.transaction import Transaction, TransactionState
from dbms.transaction_database import (
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


def test_transaction_database_crud():
    # Setup prerequisite query & process for FK constraint
    query_id = create_query(
        query_text="SELECT * FROM products;",
        algorithm="FCFS",
        priority=1
    )
    proc = Process(process_id=101, arrival_time=0, burst_time=4)
    process_db_id = create_process(query_id=query_id, process=proc, base_time=datetime.now())

    # 1. Create Transaction
    tx_id = create_transaction(process_id=process_db_id, state=TransactionState.ACTIVE)
    assert tx_id > 0

    fetched_tx = get_transaction(tx_id)
    assert fetched_tx is not None
    assert fetched_tx.process_id == process_db_id
    assert fetched_tx.state == TransactionState.ACTIVE

    # 2. Update state to WAITING
    updated = update_transaction_state(tx_id, TransactionState.WAITING)
    assert updated is True

    fetched_tx = get_transaction(tx_id)
    assert fetched_tx.state == TransactionState.WAITING

    # 3. Commit Transaction
    committed = commit_transaction(tx_id)
    assert committed is True

    fetched_tx = get_transaction(tx_id)
    assert fetched_tx.state == TransactionState.COMMITTED
    assert fetched_tx.commit_time is not None

    # 4. Create second transaction for same process & Rollback
    tx_id2 = create_transaction(process_id=process_db_id, state=TransactionState.ACTIVE)
    rolled_back = rollback_transaction(tx_id2)
    assert rolled_back is True

    fetched_tx2 = get_transaction(tx_id2)
    assert fetched_tx2.state == TransactionState.ROLLEDBACK
    assert fetched_tx2.rollback_time is not None

    # 5. Get all transactions by process
    tx_list = get_transactions_by_process(process_db_id)
    assert len(tx_list) >= 2
