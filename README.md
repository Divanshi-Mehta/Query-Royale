# ⚡ Query Royale

> **Interactive Operating System Process Scheduling & DBMS Concurrency Simulation Platform with AI-Powered Workload Intelligence**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.14-blue.svg?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Database](https://img.shields.io/badge/Storage-SQLite%20%2F%20MySQL-003B57.svg?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Security](https://img.shields.io/badge/Auth-JWT%20%2B%20PBKDF2--SHA256-green.svg)](https://jwt.io)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

**Query Royale** is a high-performance, full-stack educational and experimental simulation platform that bridges core **Operating System (OS) CPU scheduling**, **Database Management System (DBMS) concurrency control**, and **AI-driven workload optimization**.

Designed with a modern reactive frontend and a modular FastAPI backend, Query Royale allows students, researchers, and engineers to visually step through scheduling timelines, observe ACID transactions, inspect lock contention matrices, detect and resolve deadlocks in real time, and receive automated algorithmic suggestions powered by AI heuristics.

---

## ✨ Key Features

### 🖥️ 1. OS Process Scheduling Engine
- **Supported Scheduling Algorithms**:
  - **FCFS** (First-Come, First-Served)
  - **SJF** (Shortest Job First – Non-Preemptive)
  - **SRTF** (Shortest Remaining Time First – Preemptive SJF)
  - **Priority Scheduling** (Preemptive & Non-Preemptive modes)
  - **Round Robin (RR)** (Configurable Time Quantum)
- **Visual Gantt Timeline**: Dynamic interactive timeline showing CPU execution slots, context switches, and idle cycles.
- **Deep Performance Telemetry**: Immediate computation of:
  - Average Waiting Time ($W_{avg}$)
  - Average Turnaround Time ($TAT_{avg}$)
  - Average Response Time ($RT_{avg}$)
  - CPU Utilization percentage and throughput ($P/sec$).

### 🗄️ 2. DBMS Concurrency & Transaction Manager
- **ACID Transaction Lifecycle**: Monitor states across `NEW`, `ACTIVE`, `COMMITTED`, and `ABORTED`.
- **Strict Two-Phase Locking (2PL)**:
  - Growing Phase (acquiring Shared `S` and Exclusive `X` locks).
  - Shrinking Phase (releasing locks upon commit/abort).
  - Resource conflict matrix enforcement ($S \cap S$ allowed; $S \cap X$ and $X \cap X$ blocked).
- **Deadlock Detection & Resolution**:
  - Real-time **Wait-For Graph (WFG)** construction and cycle detection.
  - Victim selection policies (youngest transaction, lowest rollback cost).
  - Automatic rollback and lock unblocking.
- **Write-Ahead Logging (WAL) & ARIES Recovery**:
  - Full write-ahead transaction log tracking with Log Sequence Numbers (LSN).
  - Simulation of **ARIES Recovery Algorithm**: *Analysis*, *Redo*, and *Undo* passes.

### 🤖 3. AI Workload Intelligence
- **Workload Analysis**: Continuous inspection of job arrival variance, burst-time skewness, and priority distribution.
- **Smart Algorithm Recommender**: Heuristic and predictive advice recommending optimal algorithms (e.g., RR for high concurrency interactive tasks, SRTF for low turnaround variance).
- **Deadlock Root-Cause Diagnosis**: Automated explanation of resource starvation and dependency chains causing system bottlenecks.

### 🔐 4. Production-Ready Authentication & Security
- **Zero Mock Data**: Authentic backend session management backed by persistent database storage (`backend/query_royale.db` or MySQL).
- **Cryptographic Security**:
  - Passwords hashed using **PBKDF2-HMAC-SHA256** with 100,000 iterations and 16-byte cryptographically secure random salts.
  - Stateless **JWT (JSON Web Tokens)** containing user identity and role claims (`admin`, `analyst`, `user`).
- **User Management**:
  - Sign in, account registration, session verification (`/api/auth/me`), and profile telemetry.
  - Pre-seeded administrative account for instant demonstration.

---

## 🏗️ Architecture

```
Query-Royale/
├── backend/
│   ├── ai_engine/               # AI recommendation & comparison algorithms
│   │   ├── comparison.py
│   │   └── recommendation.py
│   ├── api/                     # REST API route controllers
│   │   ├── ai_api.py            # AI assistant endpoints
│   │   ├── auth.py              # Register, login, profile endpoints
│   │   ├── auth_security.py     # PBKDF2 hashing & JWT token issuance
│   │   ├── dbms.py              # Transaction, lock, and deadlock endpoints
│   │   ├── scheduling.py        # CPU scheduling simulation endpoints
│   │   └── system_metrics.py    # Health & telemetry monitoring
│   ├── dbms/                    # Core DBMS concurrency engine
│   │   ├── deadlock_detector.py # WFG cycle detection & victim selection
│   │   ├── lock_manager.py      # Shared/Exclusive 2PL lock manager
│   │   ├── recovery.py          # ARIES recovery manager
│   │   ├── transaction.py       # Transaction state machines
│   │   ├── transaction_database.py
│   │   └── wal_logger.py        # Write-Ahead Logging engine
│   ├── os_engine/               # Core CPU scheduling simulation engine
│   │   ├── fcfs.py              # First-Come First-Served
│   │   ├── sjf.py               # Shortest Job First (Preemptive & Non-preemptive)
│   │   ├── priority.py          # Priority scheduling
│   │   ├── round_robin.py       # Round Robin with time slicing
│   │   ├── process.py           # Process Control Block (PCB) model
│   │   └── metrics.py           # Metric calculation utilities
│   ├── database.py              # Database abstraction (SQLite & MySQL)
│   ├── main.py                  # FastAPI application entrypoint & middleware
│   ├── query_royale.db          # Persistent SQLite database file
│   └── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios/Fetch HTTP clients
│   │   ├── components/          # Reusable UI components (Sidebar, Topbar, etc.)
│   │   ├── context/             # React Context (AuthContext session state)
│   │   ├── pages/
│   │   │   ├── AIAssistant.jsx  # AI workload diagnosis page
│   │   │   ├── Dashboard.jsx    # System overview & live telemetry
│   │   │   ├── DbmsEngine.jsx   # Concurrency control & transaction sandbox
│   │   │   ├── Deadlocks.jsx    # Wait-For Graph deadlock visualization
│   │   │   ├── Locks.jsx        # Lock manager and conflict tables
│   │   │   ├── Login.jsx        # Glassmorphic Login/Registration screen
│   │   │   ├── Metrics.jsx      # Telemetry graphs & statistics
│   │   │   ├── Scheduler.jsx    # CPU scheduler & Gantt chart sandbox
│   │   │   ├── Settings.jsx     # User settings, DB engine info & maintenance
│   │   │   └── SqlQueries.jsx   # SQL query execution sandbox
│   │   ├── services/            # Frontend service abstraction (auth, scheduler, dbms)
│   │   ├── App.jsx              # Main React route & authenticated layout
│   │   └── main.jsx             # React entry point
│   ├── package.json             # Frontend dependencies & npm scripts
│   └── vite.config.js           # Vite development server configuration & API proxies
│
├── database/
│   ├── schema.sql               # Relational database table DDL
│   └── query_royale.db          # Reference database backup
└── tests/                       # Unit and integration tests
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Python**: Version `3.10` or higher (Python 3.10 - 3.14 supported)
- **Node.js**: Version `18.0` or higher (includes `npm`)
- **Git**: Installed and accessible in your shell

---

### 1. Clone the Repository

```bash
git clone https://github.com/Divanshi-Mehta/Query-Royale.git
cd Query-Royale
```

---

### 2. Backend Setup (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend server**:
   ```bash
   # From the repository root:
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

The backend server will start at **`http://127.0.0.1:8000`**.  
Interactive Swagger API documentation will be available at **`http://127.0.0.1:8000/docs`**.

---

### 3. Frontend Setup (React + Vite)

1. **Open a new terminal window** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```

The frontend application will start at **`http://localhost:5173`**.

---

## 🔑 Default Credentials

Query Royale comes pre-configured with a seeded administrative account stored in the database:

| Field | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `AdminPassword123!` |
| **Role** | `admin` |

> 💡 **Tip:** You can also click **"Create Account"** on the login screen to register your own custom user account with full access to all scheduling and DBMS workspaces!

---

## 🔌 API Endpoints Summary

Query Royale exposes a clean, self-documenting REST API:

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **System** | `GET` | `/health` | Live backend health, database engine, and feature flags |
| **Auth** | `POST` | `/api/auth/register` | Register a new user account with hashed password |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user credentials and receive JWT bearer token |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated profile and role details |
| **OS Scheduling** | `POST` | `/schedule/` | Execute process scheduling simulation (FCFS, SJF, RR, Priority) |
| **OS Scheduling** | `GET` | `/schedule/history` | Retrieve past scheduling runs and benchmark comparisons |
| **DBMS Engine** | `POST` | `/dbms/transaction` | Begin, step, or commit a transaction with 2PL locking |
| **DBMS Locks** | `GET` | `/dbms/locks` | View active Shared and Exclusive lock table |
| **Deadlocks** | `GET` | `/dbms/deadlocks` | Run Wait-For Graph cycle detection and inspect conflicts |
| **Deadlocks** | `POST` | `/dbms/deadlocks/resolve` | Automatically resolve deadlock by aborting optimal victim |
| **AI Assistant** | `POST` | `/ai/recommend` | Analyze workload metrics and receive algorithm advice |
| **AI Assistant** | `POST` | `/ai/diagnose` | Diagnose transaction lock contention and deadlock hazards |
| **Metrics** | `GET` | `/metrics/` | Real-time system telemetry and CPU utilization |

Full interactive schemas and live testing are available directly in your browser at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🗄️ Database Storage

Query Royale defaults to zero-configuration, embedded **SQLite** stored at `backend/query_royale.db`.

To switch to **MySQL**, set the following environment variables:
```env
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=query_royale
```

### Relational Schema Tables:
- `users`: User authentication, salt, hashed password, roles, timestamps.
- `queries`: Submitted query statements and scheduling metadata.
- `processes`: Process Control Blocks (burst time, arrival time, priority, state).
- `transactions`: DBMS transaction lifecycle states (`NEW`, `ACTIVE`, `COMMITTED`, `ABORTED`).
- `locks`: Concurrency locks (`S` / `X`), resource names, grant timestamps.
- `deadlocks`: Historical and active deadlock incidents and resolution records.
- `scheduling_results`: Algorithmic benchmark metrics ($W_t, TAT, RT, CPU\%$).
- `system_metrics`: Snapshot time series of CPU and lock queue utilization.
- `wal_logs`: Write-ahead transaction log records with LSN sequencing.

---

## 🧪 Running Tests

Query Royale includes unit tests for backend engines and API contracts:

```bash
# Run backend test suite
pytest tests/
```

To lint the frontend codebase:
```bash
cd frontend
npm run lint
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project on GitHub.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m "Add AmazingFeature"`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for operating system and database enthusiasts.
</p>
