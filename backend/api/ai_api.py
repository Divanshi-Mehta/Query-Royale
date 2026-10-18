
from statistics import mean
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.database import get_db_type, execute_query
from backend.dbms.lock_manager import get_active_locks, get_waiting_locks
from backend.dbms.deadlock_detector import get_deadlocks

import traceback

router = APIRouter(
    prefix="/ai",
    tags=["AI Engine & Assistant"],
)

class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

def get_intent(message: str) -> str:
    """Identify the most relevant intent, prioritizing specific issues."""
    msg = message.lower().strip()

    rules = {
        "deadlock": [
            "deadlock", "circular wait", "wait-for graph",
            "cycle between transactions",
        ],
        "recovery": [
            "recovery", "aries", "wal", "crash recovery",
            "undo", "redo", "checkpoint",
        ],
        "slow_query": [
            "slow query", "slow sql", "query is slow",
            "query performance", "full table scan", "index",
        ],
        "scheduling": [
            "schedul", "algorithm", "sjf", "srtf", "fcfs",
            "round robin", "time quantum", "cpu scheduling",
            "waiting time", "starvation", "priority scheduling",
        ],
        "locks": [
            "lock", "blocked", "blocking", "stuck",
            "waiting transaction", "lock contention",
        ],
        "health": [
            "analyze my system", "system health", "system status",
            "analyze system", "overall status", "diagnose",
            "what is happening", "system analysis",
        ],
    }

    for intent, keywords in rules.items():
        if any(keyword in msg for keyword in keywords):
            return intent

    return "general"

def _read_rows(sql: str):
    """Read rows through the project's existing database helper."""
    result = execute_query(sql, fetch=True)

    if result is None:
        return []

    if isinstance(result, list):
        return result

    if isinstance(result, tuple):
        return list(result)

    return []

def _value(row, key, index=None, default=None):
    """Read a field from either a dictionary row or a tuple row."""
    if isinstance(row, dict):
        return row.get(key, default)

    if isinstance(row, (tuple, list)) and index is not None:
        return row[index] if len(row) > index else default

    return default

def _active_deadlocks(deadlocks):
    """Keep unresolved records and avoid counting reversed duplicate pairs."""
    unique = {}

    for item in deadlocks or []:
        if not isinstance(item, dict):
            continue

        status = str(item.get("resolution_status", "")).upper()
        if status != "DETECTED":
            continue

        first = item.get("transaction_1_id")
        second = item.get("transaction_2_id")

        if first is None or second is None:
            key = ("record", item.get("deadlock_id", id(item)))
        else:
            key = tuple(sorted((str(first), str(second))))

        unique.setdefault(key, item)

    return list(unique.values())

def _lock_report(active_locks, waiting_locks, db_type):
    granted_count = len(active_locks or [])
    waiting_count = len(waiting_locks or [])

    lines = [
        "**Live Lock Manager Analysis**",
        "",
        f"- Database engine: **{str(db_type).upper()}**",
        f"- Granted locks reported by lock manager: **{granted_count}**",
        f"- Waiting locks reported by lock manager: **{waiting_count}**",
    ]

    if waiting_count:
        lines += [
            "",
            "**Finding:** One or more lock requests are waiting.",
            "Inspect the waiting transactions and the resources they request. "
            "Check whether another transaction holds a conflicting lock, "
            "and commit or roll back only when appropriate.",
        ]
    else:
        lines += [
            "",
            "**Finding:** The lock manager currently reports no waiting locks.",
        ]

    return "\n".join(lines)

def _deadlock_report(active_deadlocks, active_locks, waiting_locks):
    if active_deadlocks:
        first = active_deadlocks[0]
        tx1 = first.get("transaction_1_id", "unknown")
        tx2 = first.get("transaction_2_id", "unknown")

        return (
            "**Deadlock Diagnostic**\n\n"
            f"- Unresolved deadlock records (unique transaction pairs): "
            f"**{len(active_deadlocks)}**\n"
            f"- Example recorded pair: **T{tx1}** and **T{tx2}**\n"
            f"- Granted locks currently reported: **{len(active_locks or [])}**\n"
            f"- Waiting locks currently reported: **{len(waiting_locks or [])}**\n\n"
            "**Recommended next step:** Open the Deadlocks page and verify "
            "the current wait-for graph and transaction states before resolving "
            "a cycle. A stored DETECTED record alone does not prove that a "
            "cycle still exists."
        )

    if waiting_locks:
        return (
            "**Deadlock Diagnostic**\n\n"
            "No unresolved deadlock record was returned by the database, "
            f"but the lock manager reports **{len(waiting_locks)} waiting lock(s)**.\n\n"
            "Waiting locks can indicate contention without a deadlock. "
            "Inspect the wait-for graph before concluding that the system is clear."
        )

    return (
        "**Deadlock Diagnostic**\n\n"
        "No unresolved deadlock records or waiting locks were returned by "
        "the current checks. This is not a fresh independent proof that the "
        "wait-for graph is acyclic."
    )

def _scheduling_report():
    """
    Inspect recorded process workload and make an explainable rule-based
    recommendation. This is a recommendation only, not a scheduler switch.
    """
    try:
        rows = _read_rows(
            "SELECT process_id, arrival_time, burst_time, priority "
            "FROM processes ORDER BY process_id DESC LIMIT 20"
        )
    except Exception:
        rows = []

    processes = []

    for row in rows:
        try:
            processes.append({
                "pid": _value(row, "process_id", 0),
                "arrival": float(_value(row, "arrival_time", 1, 0) or 0),
                "burst": float(_value(row, "burst_time", 2, 0) or 0),
                "priority": int(_value(row, "priority", 3, 0) or 0),
            })
        except (TypeError, ValueError):
            continue

    if not processes:
        return (
            "**Rule-Based Scheduling Assistant**\n\n"
            "I could not retrieve a usable process workload from the `processes` "
            "table. Run a scheduling simulation first, then ask for a recommendation. "
            "No performance improvement is claimed without workload measurements."
        )

    bursts = [p["burst"] for p in processes]
    priorities = [p["priority"] for p in processes]
    burst_spread = max(bursts) - min(bursts)
    priority_varies = len(set(priorities)) > 1

    if len(processes) >= 5:
        algorithm = "ROUND ROBIN"
        reason = (
            f"The inspected workload contains {len(processes)} processes. "
            "Round Robin is a reasonable rule-based starting point when fairness "
            "across multiple jobs matters. Choose the time quantum based on testing."
        )
    elif priority_varies:
        algorithm = "PRIORITY"
        reason = (
            "The inspected processes have different priority values. "
            "Priority scheduling is worth comparing if those values represent "
            "real urgency. Check for starvation of low-priority jobs."
        )
    elif burst_spread > 5:
        algorithm = "SJF"
        reason = (
            f"The burst-time range is {burst_spread:g} time units. "
            "SJF is worth comparing when burst estimates are known and minimizing "
            "average waiting time is the main goal."
        )
    else:
        algorithm = "FCFS"
        reason = (
            "The workload is relatively small and has no strong priority or "
            "burst-time signal under these rules. FCFS is a simple baseline."
        )

    return (
        "**Rule-Based Scheduling Recommendation**\n\n"
        f"- Processes inspected: **{len(processes)}**\n"
        f"- Burst-time range: **{min(bursts):g}–{max(bursts):g}**\n"
        f"- Priority values vary: **{'Yes' if priority_varies else 'No'}**\n"
        f"- Suggested algorithm: **{algorithm}**\n\n"
        f"**Reason:** {reason}\n\n"
        "This is a heuristic recommendation based on the latest process IDs "
        "returned by the database, not proof that this algorithm has the lowest "
        "waiting time. Use the Scheduler comparison feature to measure the same "
        "workload under each algorithm."
    )

def _slow_query_report():
    try:
        rows = _read_rows(
            "SELECT query_id, query_text, status, submitted_at "
            "FROM queries ORDER BY query_id DESC LIMIT 10"
        )
    except Exception:
        rows = []

    if not rows:
        return (
            "**Query Performance Analysis**\n\n"
            "I could not retrieve recent query history. Execute a query in the "
            "SQL Queries page and try again. I will not invent a table scan, "
            "row count, index, or latency measurement."
        )

    lines = [
        "**Recent Query History**",
        "",
        "These are recent logged statements, not a verified ranking by execution time.",
        "",
    ]

    for row in rows[:5]:
        query_id = _value(row, "query_id", 0, "?")
        query_text = str(_value(row, "query_text", 1, "Query text unavailable") or "")
        status = _value(row, "status", 2, "Unknown")
        lines.append(
            f"- Query **{query_id}** — status: **{status}** — "
            f"`{query_text[:180]}`"
        )

    lines += [
        "",
        "To diagnose a slow query accurately, provide its SQL and actual execution "
        "time. For MySQL, `EXPLAIN` can help identify scans and index usage. "
        "No index recommendation should be applied without examining the query plan.",
    ]

    return "\n".join(lines)

@router.post("/chat")
def ai_assistant_chat(request: AIChatRequest):
    message = request.message.strip()

    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    try:
        active_locks = get_active_locks() or []
        waiting_locks = get_waiting_locks() or []
        deadlocks = get_deadlocks() or []
        db_type = get_db_type()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not read live system state: {exc}",
        ) from exc

    unresolved = _active_deadlocks(deadlocks)
    intent = get_intent(message)

    if intent == "deadlock":
        reply = _deadlock_report(unresolved, active_locks, waiting_locks)

    elif intent == "locks":
        reply = _lock_report(active_locks, waiting_locks, db_type)

    elif intent == "scheduling":
        reply = _scheduling_report()

    elif intent == "slow_query":
        reply = _slow_query_report()

    elif intent == "recovery":
        reply = (
            "**WAL and Crash Recovery**\n\n"
            "WAL records changes before the corresponding data changes are "
            "considered safely persisted. Recovery commonly analyzes log records, "
            "redos changes that must be repeated, and undoes incomplete transactions. "
            "Your project's recovery implementation should be tested against its "
            "actual WAL records before claiming full ARIES compliance."
        )

    elif intent == "health":
        reply = (
            "**Live System Snapshot**\n\n"
            f"- Database engine: **{str(db_type).upper()}**\n"
            f"- Granted locks: **{len(active_locks)}**\n"
            f"- Waiting locks: **{len(waiting_locks)}**\n"
            f"- Unresolved recorded deadlock pairs: **{len(unresolved)}**\n\n"
            + (
                "⚠️ Waiting lock requests exist. Inspect the lock and transaction pages."
                if waiting_locks else
                "No waiting locks were reported by the lock manager."
            )
        )

    else:
        reply = (
            "**Query Royale Rule-Based Assistant**\n\n"
            "I can analyze the current lock state, inspect recorded deadlocks, "
            "recommend a scheduling algorithm from recorded process data, review "
            "recent query history, and explain WAL/recovery concepts.\n\n"
            "Try one of these questions:\n"
            "- Analyze my system\n"
            "- Why are queries waiting for locks?\n"
            "- Check for deadlocks\n"
            "- Recommend a CPU scheduling algorithm\n"
            "- Show recent queries and help diagnose a slow query\n"
            "- Explain WAL recovery"
        )


    try:
        return {
            "reply": reply,
            "intent": intent,
            "timestamp": datetime.now().isoformat(),
            "data_source": "live database and rule-based analysis",
        }
    except Exception:
        traceback.print_exc()
        raise

