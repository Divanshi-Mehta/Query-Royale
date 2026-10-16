import os
import re
import sqlite3
from pathlib import Path
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

SQLITE_DB_PATH = Path(__file__).resolve().parent / "query_royale.db"


class SQLiteCursorWrapper:
    def __init__(self, cursor, dictionary=False):
        self._cursor = cursor
        self._dictionary = dictionary

    def execute(self, query, params=None):
        # Convert MySQL %s placeholder to SQLite ? placeholder
        sqlite_query = re.sub(r"%s", "?", query)
        # Convert MySQL NOW() or CURRENT_TIMESTAMP if needed
        sqlite_query = re.sub(r"\bNOW\(\)", "CURRENT_TIMESTAMP", sqlite_query, flags=re.IGNORECASE)

        if params is None:
            return self._cursor.execute(sqlite_query)
        elif isinstance(params, (list, tuple)):
            # Convert datetime or objects to strings/primitives if needed
            converted_params = []
            for p in params:
                if hasattr(p, "isoformat"):
                    converted_params.append(p.strftime("%Y-%m-%d %H:%M:%S"))
                else:
                    converted_params.append(p)
            return self._cursor.execute(sqlite_query, converted_params)
        elif isinstance(params, dict):
            return self._cursor.execute(sqlite_query, params)
        else:
            return self._cursor.execute(sqlite_query, (params,))

    def executemany(self, query, seq_of_params):
        sqlite_query = re.sub(r"%s", "?", query)
        return self._cursor.executemany(sqlite_query, seq_of_params)

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        if self._dictionary:
            return dict(row)
        return row

    def fetchall(self):
        rows = self._cursor.fetchall()
        if self._dictionary:
            return [dict(r) for r in rows]
        return rows

    @property
    def lastrowid(self):
        return self._cursor.lastrowid

    @property
    def rowcount(self):
        return self._cursor.rowcount

    @property
    def description(self):
        return self._cursor.description

    def close(self):
        try:
            self._cursor.close()
        except Exception:
            pass


class SQLiteConnectionWrapper:
    def __init__(self, connection):
        self._connection = connection

    def cursor(self, dictionary=False):
        self._connection.row_factory = sqlite3.Row if dictionary else None
        raw_cursor = self._connection.cursor()
        return SQLiteCursorWrapper(raw_cursor, dictionary=dictionary)

    def commit(self):
        return self._connection.commit()

    def rollback(self):
        return self._connection.rollback()

    def close(self):
        try:
            self._connection.close()
        except Exception:
            pass


def _init_sqlite_schema(conn):
    """Initialize schema tables and seed data in SQLite database."""
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS queries (
        query_id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_text TEXT NOT NULL,
        scheduling_algorithm TEXT,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'SUBMITTED',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS processes (
        process_id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_id INTEGER,
        process_state TEXT DEFAULT 'NEW',
        arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        burst_time INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        completion_time TIMESTAMP NULL,
        waiting_time INTEGER DEFAULT 0,
        turnaround_time INTEGER DEFAULT 0,
        response_time INTEGER DEFAULT 0,
        FOREIGN KEY (query_id) REFERENCES queries(query_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        process_id INTEGER,
        transaction_state TEXT DEFAULT 'ACTIVE',
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        commit_time TIMESTAMP NULL,
        rollback_time TIMESTAMP NULL
    );

    CREATE TABLE IF NOT EXISTS locks (
        lock_id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        resource_name TEXT NOT NULL,
        lock_type TEXT NOT NULL,
        lock_state TEXT DEFAULT 'GRANTED',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        released_at TIMESTAMP NULL
    );

    CREATE TABLE IF NOT EXISTS deadlocks (
        deadlock_id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_1_id INTEGER NOT NULL,
        transaction_2_id INTEGER NOT NULL,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolution_status TEXT DEFAULT 'DETECTED',
        resolved_transaction_id INTEGER NULL
    );

    CREATE TABLE IF NOT EXISTS scheduling_results (
        result_id INTEGER PRIMARY KEY AUTOINCREMENT,
        process_id INTEGER NOT NULL,
        algorithm TEXT NOT NULL,
        waiting_time INTEGER DEFAULT 0,
        turnaround_time INTEGER DEFAULT 0,
        response_time INTEGER DEFAULT 0,
        completion_time TIMESTAMP NULL,
        cpu_utilization REAL DEFAULT 0.00,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_metrics (
        metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
        cpu_utilization REAL DEFAULT 0.00,
        active_processes INTEGER DEFAULT 0,
        waiting_processes INTEGER DEFAULT 0,
        active_transactions INTEGER DEFAULT 0,
        waiting_transactions INTEGER DEFAULT 0,
        active_locks INTEGER DEFAULT 0,
        lock_waits INTEGER DEFAULT 0,
        deadlock_count INTEGER DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wal_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        operation_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_identifier TEXT,
        old_value TEXT,
        new_value TEXT,
        log_status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sample tables for realistic query execution
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        stock INTEGER DEFAULT 0,
        price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        balance REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'INR'
    );
    """)

    # Seed sample orders and products if empty
    res = c.execute("SELECT COUNT(*) FROM orders").fetchone()
    if res and res[0] == 0:
        c.executescript("""
        INSERT INTO orders (customer, status, amount) VALUES
            ('Alice Kumar', 'pending', 4500.00),
            ('Bob Sharma', 'pending', 1200.00),
            ('Carol Singh', 'completed', 8750.00),
            ('David Patel', 'processing', 3400.00),
            ('Eva Gupta', 'pending', 6100.00);

        INSERT INTO products (name, stock, price) VALUES
            ('Query Engine Core', 45, 12000.00),
            ('Memory Lock Module', 18, 4500.00),
            ('WAL Storage Buffer', 32, 7800.00),
            ('Deadlock Detector Kit', 10, 9500.00);

        INSERT INTO accounts (owner, balance, currency) VALUES
            ('Operations Escrow', 485200.00, 'INR'),
            ('Vendor Settlement', 124000.00, 'INR'),
            ('Trading Pool A', 950000.00, 'INR');

        INSERT INTO system_metrics (cpu_utilization, active_processes, waiting_processes, active_transactions, active_locks, deadlock_count) VALUES
            (32.5, 4, 1, 2, 2, 0);
        """)
    conn.commit()
    c.close()


def get_db_connection():
    """
    Returns a MySQL connection if configured and reachable;
    otherwise returns a fully MySQL-compatible SQLite connection wrapper.
    """
    db_host = os.getenv("DB_HOST")
    db_user = os.getenv("DB_USER")
    db_name = os.getenv("DB_NAME")

    if db_host and db_user and db_name:
        try:
            import mysql.connector
            conn = mysql.connector.connect(
                host=db_host,
                port=int(os.getenv("DB_PORT", 3306)),
                user=db_user,
                password=os.getenv("DB_PASSWORD", ""),
                database=db_name,
                connection_timeout=2
            )
            return conn
        except Exception:
            # Fall back to SQLite if MySQL connection fails
            pass

    # Seamless SQLite fallback
    raw_sqlite_conn = sqlite3.connect(str(SQLITE_DB_PATH), check_same_thread=False)
    _init_sqlite_schema(raw_sqlite_conn)
    return SQLiteConnectionWrapper(raw_sqlite_conn)


def get_db_type():
    """Returns 'mysql' if MySQL is actively connected, otherwise 'sqlite'."""
    db_host = os.getenv("DB_HOST")
    db_user = os.getenv("DB_USER")
    db_name = os.getenv("DB_NAME")

    if db_host and db_user and db_name:
        try:
            import mysql.connector
            conn = mysql.connector.connect(
                host=db_host,
                port=int(os.getenv("DB_PORT", 3306)),
                user=db_user,
                password=os.getenv("DB_PASSWORD", ""),
                database=db_name,
                connection_timeout=1
            )
            conn.close()
            return "mysql"
        except Exception:
            return "sqlite"
    return "sqlite"


def execute_query(query, values=None, fetch=False):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(query, values or ())

        if fetch:
            return cursor.fetchall()

        connection.commit()
    finally:
        cursor.close()
        connection.close()