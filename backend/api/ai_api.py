from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from backend.ai_engine.recommendation import recommend_algorithm
from backend.ai_engine.comparison import compare_algorithms
from backend.os_engine.process import Process
from backend.database import get_db_type, execute_query
from backend.dbms.lock_manager import get_active_locks, get_waiting_locks
from backend.dbms.deadlock_detector import get_deadlocks, build_wait_for_graph

router = APIRouter(
    prefix="/ai",
    tags=["AI Engine & Assistant"]
)


class AIChatRequest(BaseModel):
    message: str


@router.post("/chat")
def ai_assistant_chat(request: AIChatRequest):
    """
    Intelligent Assistant endpoint that analyzes the live system state
    (locks, active deadlocks, DB engine, queries) and responds with actionable insight.
    """
    msg = request.message.lower().strip()

    # Query live state
    active_locks = get_active_locks()
    waiting_locks = get_waiting_locks()
    deadlocks = get_deadlocks()
    active_deadlocks = [d for d in deadlocks if d.get("resolution_status") == "DETECTED"]
    db_type = get_db_type()

    reply = ""

    if "deadlock" in msg:
        if active_deadlocks:
            reply = (
                f"⚠️ **Deadlock Alert**: There are currently **{len(active_deadlocks)} active deadlock(s)** detected in the system! "
                f"Cycle detected involving transactions {active_deadlocks[0].get('transaction_1_id')} and {active_deadlocks[0].get('transaction_2_id')}. "
                "Recommendation: Navigate to the **Deadlocks** or **DBMS** tab and click **Resolve Deadlock** to abort the youngest victim transaction and unblock waiting queries."
            )
        else:
            reply = (
                "✅ **No Deadlocks Detected**: The current Wait-For Graph (WFG) is acyclic. "
                f"Currently tracking {len(active_locks)} active granted lock(s) and {len(waiting_locks)} waiting lock(s). "
                "The system is running smoothly without resource deadlocks."
            )

    elif "schedul" in msg or "algorithm" in msg or "sjf" in msg or "fcfs" in msg or "round robin" in msg:
        reply = (
            "⚙️ **OS Scheduler Recommendation**:\n\n"
            "- For **interactive / mixed workloads**, **Round Robin (Q=2-3ms)** guarantees fair CPU timeslices and eliminates starvation.\n"
            "- For **CPU-bound analytical queries** with high burst time variance, **SJF (Shortest Job First)** minimizes average waiting time by up to ~38%.\n"
            "- For **strict sequence workloads**, **FCFS** provides predictable arrival-order execution without context switching overhead.\n\n"
            "You can test these live on any workload using the **OS Scheduler** tab!"
        )

    elif "lock" in msg:
        reply = (
            f"🔒 **Lock Manager Analysis**:\n\n"
            f"- **Granted Locks:** {len(active_locks)}\n"
            f"- **Waiting Locks:** {len(waiting_locks)}\n"
            f"- **Database Engine:** {db_type.upper()}\n\n"
            "Tip: Ensure long-running transactions are committed or rolled back promptly to avoid lock contention on hot tables (like `orders` or `accounts`)."
        )

    elif "recovery" in msg or "aries" in msg or "wal" in msg:
        reply = (
            "🛡️ **ARIES Crash Recovery & WAL Protocol**:\n\n"
            "1. **Analysis Phase:** Scans Write-Ahead Logs forward from the last checkpoint to identify dirty pages and active transactions at crash time.\n"
            "2. **Redo Phase:** Replays changes for all committed transactions (repeating history) to restore page integrity.\n"
            "3. **Undo Phase:** Rolls back changes for transactions that were active when crash occurred, writing compensation log records (CLRs).\n\n"
            "You can simulate this live in the **DBMS -> WAL & Recovery** panel."
        )

    else:
        reply = (
            f"🤖 **Query Royale AI Assistant**:\n\n"
            f"I am actively monitoring your system (Engine: **{db_type.upper()}**):\n"
            f"- **Active Locks:** {len(active_locks)} | **Waiting Locks:** {len(waiting_locks)}\n"
            f"- **Active Deadlocks:** {len(active_deadlocks)}\n\n"
            "You can ask me to analyze lock contention, evaluate scheduling policies (FCFS, SJF, Priority, Round Robin), "
            "inspect deadlocks, or explain ARIES crash recovery!"
        )

    return {
        "reply": reply,
        "timestamp": datetime.now().isoformat()
    }
