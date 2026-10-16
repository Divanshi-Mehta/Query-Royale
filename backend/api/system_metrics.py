from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from backend.database import get_db_connection, execute_query
from backend.dbms.lock_manager import get_active_locks, get_waiting_locks
from backend.dbms.transaction_database import get_all_transactions
from backend.dbms.transaction import TransactionState
from backend.dbms.deadlock_detector import get_deadlocks

router = APIRouter(
    prefix="/metrics",
    tags=["System Metrics & Dashboard"]
)


@router.get("/dashboard")
def get_dashboard_metrics():
    """
    Fetch comprehensive live metrics for the main system dashboard:
    CPU Utilization, Active/Waiting Processes, Active Transactions, Active Locks, Deadlocks.
    """
    try:
        # 1. Fetch latest system_metrics row if available
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM system_metrics ORDER BY metric_id DESC LIMIT 1")
        latest = cursor.fetchone()

        # 2. Real-time active items
        all_txns = get_all_transactions(limit=50)
        active_txns = [t for t in all_txns if t.state == TransactionState.ACTIVE]
        active_locks = get_active_locks()
        waiting_locks = get_waiting_locks()
        deadlocks = get_deadlocks()
        active_deadlocks = [d for d in deadlocks if d.get("resolution_status") == "DETECTED"]

        # 3. Process count & queries count
        cursor.execute("SELECT COUNT(*) as query_count FROM queries")
        q_row = cursor.fetchone()
        total_queries = q_row["query_count"] if q_row else 0

        cursor.execute("SELECT COUNT(*) as proc_count FROM processes WHERE process_state != 'TERMINATED'")
        p_row = cursor.fetchone()
        active_processes = p_row["proc_count"] if p_row else len(active_txns)

        # 4. CPU utilization from latest metric or calculated
        cpu_util = float(latest["cpu_utilization"]) if latest and "cpu_utilization" in latest else 32.5

        # 5. Recent history for sparkline
        cursor.execute("SELECT cpu_utilization FROM system_metrics ORDER BY metric_id DESC LIMIT 10")
        hist_rows = cursor.fetchall()
        sparkline = [float(r["cpu_utilization"]) for r in reversed(hist_rows)] if hist_rows else [18.0, 24.5, 32.0, 28.4, 35.1, 32.5]

        # 6. Recent queries
        cursor.execute("SELECT query_id, query_text, status, submitted_at FROM queries ORDER BY query_id DESC LIMIT 5")
        recent_queries = cursor.fetchall()
        for q in recent_queries:
            if "submitted_at" in q and hasattr(q["submitted_at"], "isoformat"):
                q["submitted_at"] = q["submitted_at"].strftime("%H:%M:%S")

        cursor.close()
        conn.close()

        return {
            "cpu_utilization": round(cpu_util, 2),
            "cpu_utilization_display": f"{round(cpu_util, 1)}%",
            "active_processes": active_processes,
            "waiting_processes": len(waiting_locks),
            "active_transactions": len(active_txns),
            "active_locks": len(active_locks),
            "lock_waits": len(waiting_locks),
            "deadlock_count": len(active_deadlocks),
            "total_queries": total_queries,
            "sparkline_points": sparkline,
            "recent_queries": recent_queries,
            "status": "OPERATIONAL",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_metrics_history(limit: int = 50):
    """
    Fetch historical system_metrics records for analysis charts.
    """
    try:
        query = "SELECT * FROM system_metrics ORDER BY metric_id DESC LIMIT %s"
        rows = execute_query(query, (limit,), fetch=True)
        for r in rows:
            if "recorded_at" in r and hasattr(r["recorded_at"], "isoformat"):
                r["recorded_at"] = r["recorded_at"].isoformat()
        return {
            "metrics": list(reversed(rows)),
            "count": len(rows)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
