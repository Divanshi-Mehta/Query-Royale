USE query_royale;

CREATE TABLE queries (
    query_id INT AUTO_INCREMENT PRIMARY KEY,
    query_text TEXT NOT NULL,
    scheduling_algorithm VARCHAR(30),
    priority INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE processes (
    process_id INT AUTO_INCREMENT PRIMARY KEY,
    query_id INT NOT NULL,
    process_state VARCHAR(20) DEFAULT 'NEW',
    arrival_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    burst_time INT NOT NULL,
    priority INT DEFAULT 0,
    completion_time DATETIME NULL,
    waiting_time INT DEFAULT 0,
    turnaround_time INT DEFAULT 0,
    response_time INT DEFAULT 0,

    FOREIGN KEY (query_id)
        REFERENCES queries(query_id)
);

CREATE TABLE transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    process_id INT NOT NULL,
    transaction_state VARCHAR(20) DEFAULT 'ACTIVE',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    commit_time DATETIME NULL,
    rollback_time DATETIME NULL,

    FOREIGN KEY (process_id)
        REFERENCES processes(process_id)
);

CREATE TABLE locks (
    lock_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    lock_type VARCHAR(10) NOT NULL,
    lock_state VARCHAR(20) DEFAULT 'GRANTED',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    released_at DATETIME NULL,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE TABLE deadlocks (
    deadlock_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_1_id INT NOT NULL,
    transaction_2_id INT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolution_status VARCHAR(20) DEFAULT 'DETECTED',
    resolved_transaction_id INT NULL,

    FOREIGN KEY (transaction_1_id)
        REFERENCES transactions(transaction_id),

    FOREIGN KEY (transaction_2_id)
        REFERENCES transactions(transaction_id),

    FOREIGN KEY (resolved_transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE TABLE scheduling_results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    process_id INT NOT NULL,
    algorithm VARCHAR(30) NOT NULL,
    waiting_time INT DEFAULT 0,
    turnaround_time INT DEFAULT 0,
    response_time INT DEFAULT 0,
    completion_time DATETIME NULL,
    cpu_utilization DECIMAL(5,2) DEFAULT 0.00,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (process_id)
        REFERENCES processes(process_id)
);

CREATE TABLE system_metrics (
    metric_id INT AUTO_INCREMENT PRIMARY KEY,
    cpu_utilization DECIMAL(5,2) DEFAULT 0.00,
    active_processes INT DEFAULT 0,
    waiting_processes INT DEFAULT 0,
    active_transactions INT DEFAULT 0,
    waiting_transactions INT DEFAULT 0,
    active_locks INT DEFAULT 0,
    lock_waits INT DEFAULT 0,
    deadlock_count INT DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wal_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_identifier VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    log_status VARCHAR(20) DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);