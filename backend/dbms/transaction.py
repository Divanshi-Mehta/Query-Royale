from datetime import datetime
from typing import Optional


class TransactionState:
    ACTIVE = "ACTIVE"
    WAITING = "WAITING"
    COMMITTED = "COMMITTED"
    ROLLEDBACK = "ROLLEDBACK"
    DEADLOCK = "DEADLOCK"


class Transaction:

    def __init__(
        self,
        process_id: int,
        transaction_id: Optional[int] = None,
        state: str = TransactionState.ACTIVE,
        start_time: Optional[datetime] = None,
        commit_time: Optional[datetime] = None,
        rollback_time: Optional[datetime] = None
    ):
        self.process_id = process_id
        self.transaction_id = transaction_id
        self.state = state
        self.start_time = start_time or datetime.now()
        self.commit_time = commit_time
        self.rollback_time = rollback_time

    def commit(self, timestamp: Optional[datetime] = None):
        """
        Transition transaction to COMMITTED state and record commit time.
        """
        if self.state in [TransactionState.COMMITTED, TransactionState.ROLLEDBACK]:
            raise ValueError(f"Cannot commit transaction in state '{self.state}'.")

        self.state = TransactionState.COMMITTED
        self.commit_time = timestamp or datetime.now()

    def rollback(self, timestamp: Optional[datetime] = None):
        """
        Transition transaction to ROLLEDBACK state and record rollback time.
        """
        if self.state in [TransactionState.COMMITTED, TransactionState.ROLLEDBACK]:
            raise ValueError(f"Cannot rollback transaction in state '{self.state}'.")

        self.state = TransactionState.ROLLEDBACK
        self.rollback_time = timestamp or datetime.now()

    def wait(self):
        """
        Transition transaction to WAITING state.
        """
        if self.state != TransactionState.ACTIVE:
            raise ValueError(f"Cannot transition to WAITING from state '{self.state}'.")

        self.state = TransactionState.WAITING

    def activate(self):
        """
        Transition transaction back to ACTIVE state from WAITING.
        """
        if self.state != TransactionState.WAITING:
            raise ValueError(f"Cannot activate transaction from state '{self.state}'.")

        self.state = TransactionState.ACTIVE

    def mark_deadlock(self):
        """
        Mark transaction as involved in DEADLOCK.
        """
        if self.state in [TransactionState.COMMITTED, TransactionState.ROLLEDBACK]:
            raise ValueError(f"Cannot mark deadlock on finished transaction in state '{self.state}'.")

        self.state = TransactionState.DEADLOCK

    def __repr__(self):
        return (
            f"Transaction("
            f"TID={self.transaction_id}, "
            f"PID={self.process_id}, "
            f"State={self.state}"
            f")"
        )
