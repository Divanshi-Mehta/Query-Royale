/**
 * Query Royale - Unified Backend API Client
 * Seamlessly interfaces the React frontend with the FastAPI backend and database.
 */

const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `${API_BASE}/${endpoint}`
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errJson = await response.json()
        if (errJson.detail) {
          errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
        }
      } catch {
        // use default error message
      }
      throw new Error(errorDetail)
    }

    return await response.json()
  } catch (err) {
    console.warn(`[Query-Royale API] Error on ${url}:`, err.message)
    throw err
  }
}

// System Health
export async function checkBackendHealth() {
  return request('/health')
}

// OS Engine Scheduling
export async function scheduleWorkload({
  queryText = 'UI Batch Scheduling',
  algorithm = 'FCFS',
  processes = [],
  priority = 1,
  timeQuantum = 3,
}) {
  return request('/schedule/', {
    method: 'POST',
    body: JSON.stringify({
      query_text: queryText,
      algorithm,
      processes: processes.map(p => ({
        process_id: p.pid ?? p.process_id,
        arrival_time: p.arrival ?? p.arrival_time ?? 0,
        burst_time: p.burst ?? p.burst_time ?? 1,
        priority: p.priority ?? 0,
      })),
      priority,
      time_quantum: algorithm === 'RR' || algorithm === 'ROUND_ROBIN' ? (timeQuantum || 3) : undefined,
    }),
  })
}

export async function compareWorkload({
  queryText = 'Workload Comparison',
  processes = [],
  timeQuantum = 2,
}) {
  return request('/schedule/compare', {
    method: 'POST',
    body: JSON.stringify({
      query_text: queryText,
      algorithm: 'FCFS',
      processes: processes.map(p => ({
        process_id: p.pid ?? p.process_id,
        arrival_time: p.arrival ?? p.arrival_time ?? 0,
        burst_time: p.burst ?? p.burst_time ?? 1,
        priority: p.priority ?? 0,
      })),
      time_quantum: timeQuantum,
    }),
  })
}

export async function recommendAlgorithm({
  queryText = 'Scheduling Recommendation',
  processes = [],
}) {
  return request('/schedule/recommend', {
    method: 'POST',
    body: JSON.stringify({
      query_text: queryText,
      algorithm: 'FCFS',
      processes: processes.map(p => ({
        process_id: p.pid ?? p.process_id,
        arrival_time: p.arrival ?? p.arrival_time ?? 0,
        burst_time: p.burst ?? p.burst_time ?? 1,
        priority: p.priority ?? 0,
      })),
    }),
  })
}

// DBMS Engine & SQL
export async function fetchDbmsStatus() {
  return request('/dbms/status')
}

export async function executeSql(queryText, recordHistory = true) {
  return request('/dbms/sql', {
    method: 'POST',
    body: JSON.stringify({
      query_text: queryText,
      record_history: recordHistory,
    }),
  })
}

export async function fetchSqlHistory() {
  return request('/dbms/sql/history')
}

// Transactions
export async function fetchTransactions(limit = 50) {
  return request(`/dbms/transactions?limit=${limit}`)
}

export async function beginTransaction(processId = 1, state = 'ACTIVE') {
  return request('/dbms/transactions/begin', {
    method: 'POST',
    body: JSON.stringify({ process_id: processId, state }),
  })
}

export async function commitTransaction(transactionId) {
  return request(`/dbms/transactions/${transactionId}/commit`, {
    method: 'POST',
  })
}

export async function rollbackTransaction(transactionId) {
  return request(`/dbms/transactions/${transactionId}/rollback`, {
    method: 'POST',
  })
}

// Locks
export async function fetchLocks() {
  return request('/dbms/locks')
}

export async function acquireLock(transactionId, resourceName, lockType = 'SHARED') {
  return request('/dbms/locks/acquire', {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: transactionId,
      resource_name: resourceName,
      lock_type: lockType,
    }),
  })
}

export async function releaseLock(transactionId, resourceName) {
  return request('/dbms/locks/release', {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: transactionId,
      resource_name: resourceName,
    }),
  })
}

// Deadlocks
export async function fetchDeadlocks() {
  return request('/dbms/deadlocks')
}

export async function resolveDeadlock(deadlockId, victimTxId = null, policy = 'YOUNGEST') {
  return request('/dbms/deadlocks/resolve', {
    method: 'POST',
    body: JSON.stringify({
      deadlock_id: deadlockId,
      victim_tx_id: victimTxId,
      policy,
    }),
  })
}

// WAL & Recovery
export async function fetchWalLogs(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/dbms/wal${query}`)
}

export async function triggerCheckpoint() {
  return request('/dbms/wal/checkpoint', {
    method: 'POST',
  })
}

export async function triggerRecovery() {
  return request('/dbms/wal/recover', {
    method: 'POST',
  })
}

// Dashboard & Metrics
export async function fetchDashboardMetrics() {
  return request('/metrics/dashboard')
}

export async function fetchMetricsHistory(limit = 50) {
  return request(`/metrics/history?limit=${limit}`)
}

// AI Assistant
export async function sendAiChatMessage(message) {
  return request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}
