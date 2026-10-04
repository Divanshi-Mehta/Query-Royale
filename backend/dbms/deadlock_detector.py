from datetime import datetime
from typing import Dict, List, Any, Set, Tuple, Optional

from database import get_db_connection
from .transaction import TransactionState, Transaction
from .transaction_database import (
    update_transaction_state,
    rollback_transaction,
    get_transaction
)
from .lock_manager import (
    LockState,
    LockType,
    release_locks_by_transaction
)


def build_wait_for_graph() -> Dict[int, List[int]]:
    """
    Build the Wait-For Graph (WFG) from active and waiting locks.
    Returns an adjacency list mapping waiting transaction_id -> list of holder transaction_ids.
    
    If T_wait requests a lock on resource R that is currently held by T_grant,
    we add a directed edge: T_wait -> T_grant.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        # Get all WAITING locks
        cursor.execute(
            "SELECT lock_id, transaction_id, resource_name, lock_type FROM locks WHERE lock_state = %s",
            (LockState.WAITING,)
        )
        waiting_locks = cursor.fetchall()

        if not waiting_locks:
            return {}

        # Get all GRANTED locks
        cursor.execute(
            "SELECT lock_id, transaction_id, resource_name, lock_type FROM locks WHERE lock_state = %s AND released_at IS NULL",
            (LockState.GRANTED,)
        )
        granted_locks = cursor.fetchall()

        # Group granted locks by resource
        resource_holders: Dict[str, List[Dict[str, Any]]] = {}
        for g_lock in granted_locks:
            r_name = g_lock["resource_name"]
            if r_name not in resource_holders:
                resource_holders[r_name] = []
            resource_holders[r_name].append(g_lock)

        wfg: Dict[int, List[int]] = {}

        for w_lock in waiting_locks:
            w_tx_id = w_lock["transaction_id"]
            r_name = w_lock["resource_name"]
            w_type = w_lock["lock_type"].upper()

            holders = resource_holders.get(r_name, [])
            for holder in holders:
                h_tx_id = holder["transaction_id"]
                h_type = holder["lock_type"].upper()

                if w_tx_id == h_tx_id:
                    continue

                # Check conflict
                # SHARED waiting on EXCLUSIVE holder
                # EXCLUSIVE waiting on SHARED or EXCLUSIVE holder
                is_conflict = (
                    w_type == LockType.EXCLUSIVE
                    or h_type == LockType.EXCLUSIVE
                )

                if is_conflict:
                    if w_tx_id not in wfg:
                        wfg[w_tx_id] = []
                    if h_tx_id not in wfg[w_tx_id]:
                        wfg[w_tx_id].append(h_tx_id)

        return wfg

    finally:
        cursor.close()
        connection.close()


def detect_cycles(graph: Dict[int, List[int]]) -> List[List[int]]:
    """
    Detect cycles in the directed Wait-For Graph using Depth-First Search (DFS).
    Returns a list of unique cycles (each cycle is a list of transaction IDs).
    """
    cycles: List[List[int]] = []
    visited: Dict[int, int] = {}  # 0: UNVISITED, 1: VISITING, 2: VISITED

    all_nodes: Set[int] = set(graph.keys())
    for neighbors in graph.values():
        all_nodes.update(neighbors)

    for node in all_nodes:
        visited[node] = 0

    def dfs(node: int, path: List[int]):
        visited[node] = 1
        path.append(node)

        for neighbor in graph.get(node, []):
            if visited.get(neighbor, 0) == 1:
                # Back-edge found -> Cycle detected
                cycle_start_index = path.index(neighbor)
                cycle = path[cycle_start_index:]
                # Normalize cycle to prevent duplicates
                min_idx = cycle.index(min(cycle))
                norm_cycle = cycle[min_idx:] + cycle[:min_idx]
                if norm_cycle not in cycles:
                    cycles.append(norm_cycle)
            elif visited.get(neighbor, 0) == 0:
                dfs(neighbor, path)

        path.pop()
        visited[node] = 2

    for node in all_nodes:
        if visited.get(node, 0) == 0:
            dfs(node, [])

    return cycles


def select_deadlock_victim(
    cycle_tx_ids: List[int],
    policy: str = "YOUNGEST"
) -> int:
    """
    Select a victim transaction to abort/rollback from a deadlock cycle.
    
    Default Policy: "YOUNGEST" (Rollback the younger transaction with the latest start_time).
    Ties broken by picking the higher transaction_id.
    """
    transactions: List[Transaction] = []
    for tx_id in cycle_tx_ids:
        tx = get_transaction(tx_id)
        if tx:
            transactions.append(tx)

    if not transactions:
        return cycle_tx_ids[0]

    if policy.upper() == "YOUNGEST":
        # Sort by start_time DESC, then transaction_id DESC
        victim = max(
            transactions,
            key=lambda t: (t.start_time or datetime.min, t.transaction_id or 0)
        )
        return victim.transaction_id

    # Fallback to last transaction in cycle
    return transactions[-1].transaction_id


def detect_deadlocks() -> List[Dict[str, Any]]:
    """
    Construct the Wait-For Graph, detect cycles, mark involved transactions as DEADLOCK,
    and persist deadlock records in the deadlocks database table.
    Returns details of detected deadlocks.
    """
    wfg = build_wait_for_graph()
    if not wfg:
        return []

    cycles = detect_cycles(wfg)
    if not cycles:
        return []

    detected_deadlocks: List[Dict[str, Any]] = []
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        for cycle in cycles:
            # Mark all transactions in the cycle as DEADLOCK state
            for tx_id in cycle:
                update_transaction_state(tx_id, TransactionState.DEADLOCK)

            # Insert pair records into deadlocks table for adjacent transactions in cycle
            for i in range(len(cycle)):
                tx1_id = cycle[i]
                tx2_id = cycle[(i + 1) % len(cycle)]

                query = """
                INSERT INTO deadlocks
                (
                    transaction_1_id,
                    transaction_2_id,
                    resolution_status
                )
                VALUES (%s, %s, %s)
                """

                cursor.execute(
                    query,
                    (
                        tx1_id,
                        tx2_id,
                        "DETECTED"
                    )
                )

                deadlock_id = cursor.lastrowid
                connection.commit()

                detected_deadlocks.append({
                    "deadlock_id": deadlock_id,
                    "transaction_1_id": tx1_id,
                    "transaction_2_id": tx2_id,
                    "cycle": cycle,
                    "resolution_status": "DETECTED",
                    "detected_at": datetime.now()
                })

        return detected_deadlocks

    finally:
        cursor.close()
        connection.close()


def resolve_deadlock(
    deadlock_id: int,
    victim_tx_id: Optional[int] = None,
    policy: str = "YOUNGEST"
) -> Dict[str, Any]:
    """
    Resolve a detected deadlock incident:
    1. Select victim transaction (e.g. YOUNGEST policy).
    2. Rollback the victim transaction.
    3. Release all locks held by victim, promoting surviving transactions.
    4. Update deadlocks table with resolution_status='RESOLVED' and resolved_transaction_id.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT * FROM deadlocks WHERE deadlock_id = %s"
        cursor.execute(query, (deadlock_id,))
        deadlock_record = cursor.fetchone()

        if not deadlock_record:
            raise ValueError(f"Deadlock ID {deadlock_id} not found.")

        tx1_id = deadlock_record["transaction_1_id"]
        tx2_id = deadlock_record["transaction_2_id"]

        if victim_tx_id is None:
            victim_tx_id = select_deadlock_victim([tx1_id, tx2_id], policy=policy)

        # 1. Rollback victim transaction
        rollback_transaction(victim_tx_id)

        # 2. Release all locks held by victim (promotes surviving transactions)
        release_locks_by_transaction(victim_tx_id)

        # 3. Update deadlock record in DB
        update_query = """
        UPDATE deadlocks
        SET
            resolution_status = %s,
            resolved_transaction_id = %s
        WHERE deadlock_id = %s
        """
        cursor.execute(update_query, ("RESOLVED", victim_tx_id, deadlock_id))
        connection.commit()

        return {
            "deadlock_id": deadlock_id,
            "resolution_status": "RESOLVED",
            "resolved_transaction_id": victim_tx_id,
            "victim_policy": policy,
            "resolved_at": datetime.now()
        }

    finally:
        cursor.close()
        connection.close()


def resolve_all_deadlocks(policy: str = "YOUNGEST") -> List[Dict[str, Any]]:
    """
    Detect all deadlocks and automatically resolve each by rolling back the victim.
    Returns list of resolution details.
    """
    detected = detect_deadlocks()
    resolutions = []

    for d in detected:
        res = resolve_deadlock(d["deadlock_id"], policy=policy)
        resolutions.append(res)

    return resolutions


def get_deadlocks() -> List[Dict[str, Any]]:
    """
    Fetch all recorded deadlocks from the deadlocks database table.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        query = "SELECT * FROM deadlocks ORDER BY deadlock_id DESC"
        cursor.execute(query)
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()
