import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, BellOff, RefreshCw, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react'
import { ConnectionConfig } from '../App'
import dayjs from 'dayjs'

interface LogEntry {
  timestamp: string
  severity: string
  message: string
  stacktrace: string
  siteId?: string
  requestId?: string
  sessionId?: string
  raw: string
}

interface LogError {
  signature: string
  title: string
  message: string
  count: number
  firstSeen: string
  lastSeen: string
  siteIds: string[]
  lastRequestId?: string
  lastSessionId?: string
  requestIds: string[]
  entries: LogEntry[]
  env?: 'STG' | 'DEV'
}

interface LogErrorListProps {
  configs: Record<'STG' | 'DEV', ConnectionConfig>
  onRefreshFinished: (time: string) => void
  ignoredSignatures: string[]
  onIgnore: (signature: string) => void
  currentEnv: 'STG' | 'DEV'
}

const LogErrorList: React.FC<LogErrorListProps> = ({ configs, onRefreshFinished, ignoredSignatures, onIgnore, currentEnv }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [allErrors, setAllErrors] = useState<LogError[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [instanceFilter, setInstanceFilter] = useState<'ALL' | 'STG' | 'DEV'>('ALL')
  const [sortKey, setSortKey] = useState<'env' | 'count' | 'lastSeen'>('count')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter out ignored errors and filter by instance, then sort
  const errors = allErrors
    .filter(err => {
      const isIgnored = ignoredSignatures.includes(err.signature)
      const matchesFilter = instanceFilter === 'ALL' || err.env === instanceFilter
      return !isIgnored && matchesFilter
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortKey === 'count') {
        comparison = a.count - b.count
      } else if (sortKey === 'env') {
        comparison = (a.env || '').localeCompare(b.env || '')
      } else if (sortKey === 'lastSeen') {
        comparison = dayjs(a.lastSeen).unix() - dayjs(b.lastSeen).unix()
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const fetchLogs = async (specificConfig?: ConnectionConfig, envLabel?: 'STG' | 'DEV') => {
    const targetConfig = specificConfig || configs[currentEnv]
    const targetEnv = envLabel || currentEnv

    if (!targetConfig.username || !targetConfig.url) {
      if (!specificConfig) setErrorMessage(`Please configure WebDAV URL and Username for ${targetEnv} first.`)
      return
    }

    setLoading(true)
    setErrorMessage(null)
    try {
      const result: LogError[] = await window.ipcRenderer.invoke('logs:fetch', targetConfig)

      const taggedResult = result.map(err => ({ ...err, env: targetEnv }))

      setAllErrors(prev => {
        const newMap = new Map<string, LogError>()
        prev.forEach(err => newMap.set(`${err.env}-${err.signature}`, err))
        taggedResult.forEach(err => newMap.set(`${err.env}-${err.signature}`, err))

        return Array.from(newMap.values()).sort((a, b) =>
          b.count - a.count
        )
      })

      onRefreshFinished(dayjs().format('HH:mm:ss'))
    } catch (err: any) {
      console.error(`Failed to fetch logs for ${targetEnv}:`, err)
      setErrorMessage(`Failed to fetch logs for ${targetEnv}: ${err.message}.`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const envs: ('STG' | 'DEV')[] = ['STG', 'DEV']
      for (const e of envs) {
        const cfg = configs[e]
        if (cfg.username && cfg.url) {
          await fetchLogs(cfg, e)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])



  const handleCopyTemplate = async (error: LogError) => {
    const reqIds = error.requestIds && error.requestIds.length > 0
      ? error.requestIds.join(', ')
      : (error.lastRequestId || 'N/A')
    const template = `--- SFCC INCIDENT TEMPLATE ---
Error Message: ${error.message}
Signature: ${error.signature}
Environment: ${error.env || 'N/A'}
Site IDs: ${error.siteIds.join(', ') || 'N/A'}
First Seen: ${dayjs(error.firstSeen).format('YYYY-MM-DD HH:mm:ss')} GMT
Last Seen: ${dayjs(error.lastSeen).format('YYYY-MM-DD HH:mm:ss')} GMT
Occurrences: ${error.count}
Request IDs: ${reqIds}
Session ID: ${error.lastSessionId || 'N/A'}

--- STACKTRACE / RAW LOG ---
${error.entries[error.entries.length - 1]?.stacktrace || error.entries[error.entries.length - 1]?.raw || error.message}
`
    try {
      await navigator.clipboard.writeText(template)
      setCopySuccess(error.signature)
      setTimeout(() => setCopySuccess(null), 3000)
    } catch (err) {
      console.error('Clipboard failed', err)
    }
  }

  const toggleExpand = (index: number) => {
    setExpandedId(expandedId === index ? null : index)
  }

  const handleSort = (key: 'env' | 'count' | 'lastSeen') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc') // Default to desc for new keys
    }
  }

  const renderSortIcon = (key: 'env' | 'count' | 'lastSeen') => {
    if (sortKey !== key) return null
    return sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  return (
    <div className="error-list">
      {errorMessage && <div className="error-alert">{errorMessage}</div>}

      <div className="list-actions">
        <div className="instance-filters">
          {(['ALL', 'STG', 'DEV'] as const).map(f => (
            <button
              key={f}
              className={`filter-btn ${instanceFilter === f ? 'active' : ''}`}
              onClick={() => setInstanceFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="action-buttons">
          <button className="secondary-sm" onClick={() => setAllErrors([])} disabled={loading || allErrors.length === 0}>
            Clear All
          </button>
          <button className="primary-sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            {loading ? 'Fetching All...' : 'Fetch All Active'}
          </button>
        </div>
      </div>

      <div className="list-header">
        <div className="col-exp"></div>
        <div className="col-sig">Error Message</div>
        <div className={`col-env sortable ${sortKey === 'env' ? 'active' : ''}`} onClick={() => handleSort('env')}>
          Env {renderSortIcon('env')}
        </div>
        <div className={`col-count sortable ${sortKey === 'count' ? 'active' : ''}`} onClick={() => handleSort('count')}>
          Count {renderSortIcon('count')}
        </div>
        <div className={`col-last sortable ${sortKey === 'lastSeen' ? 'active' : ''}`} onClick={() => handleSort('lastSeen')}>
          Last Seen {renderSortIcon('lastSeen')}
        </div>
        <div className="col-actions"></div>
      </div>

      <div className="list-body">
        {errors.length === 0 && !loading && !errorMessage && (
          <div className="empty-state">
            {allErrors.length > 0 ? 'No logs match the current filter.' : 'No critical errors found. Please check logs manually or adjust filters.'}
          </div>
        )}
        {errors.map((error, index) => (
          <div key={`${error.env}-${error.signature}`} className={`error-row ${expandedId === index ? 'expanded' : ''}`}>
            <div className="row-main" onClick={() => toggleExpand(index)}>
              <div className="col-exp">
                {expandedId === index ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              <div className="col-sig">
                <span className="sig-text">{error.title || 'Unknown Error'}</span>
                <span className="sig-message">{error.message}</span>
                <span className="sig-sites">Sites: {error.siteIds.join(', ')}</span>
              </div>
              <div className="col-env">
                <span className={`env-tag ${error.env?.toLowerCase()}`}>{error.env}</span>
              </div>
              <div className="col-count">
                <span className="count-badge">{error.count}</span>
              </div>
              <div className="col-last">
                <span className="time-text">{dayjs(error.lastSeen).format('D. MMM, HH:mm')}</span>
              </div>
              <div className="col-actions">
                <button
                  className="icon-btn"
                  title="Mute signature"
                  onClick={(e) => {
                    e.stopPropagation()
                    onIgnore(error.signature)
                  }}
                >
                  <BellOff size={16} />
                </button>
              </div>
            </div>

            {expandedId === index && (
              <div className="row-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Sites</span>
                    <span className="value">{error.siteIds.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Last Request ID</span>
                    <span className="value"><code>{error.lastRequestId || 'N/A'}</code></span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Last Session ID</span>
                    <span className="value"><code>{error.lastSessionId || 'N/A'}</code></span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Request IDs ({error.requestIds?.length || 0})</span>
                    <span className="value">
                      {error.requestIds && error.requestIds.length > 0
                        ? error.requestIds.map((id, i) => <code key={i} style={{ display: 'block', marginTop: i > 0 ? '4px' : '0' }}>{id}</code>)
                        : <code>N/A</code>
                      }
                    </span>
                  </div>
                </div>

                <div className="stacktrace-container">
                  <div className="stack-header">
                    <span>Stacktrace / Raw Log</span>
                  </div>
                  <pre className="stacktrace">{error.entries[error.entries.length - 1]?.stacktrace || error.entries[error.entries.length - 1]?.raw || error.message}</pre>
                </div>

                <div className="incident-actions">
                  <button
                    className={`primary-sm ${copySuccess === error.signature ? 'success-btn' : ''}`}
                    onClick={() => handleCopyTemplate(error)}
                  >
                    {copySuccess === error.signature ? <CheckCircle2 size={16} /> : null}
                    {copySuccess === error.signature ? ' Copied!' : 'Generate Incident Template'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .empty-state { text-align: center; padding: 3rem; color: var(--text-secondary); background: rgba(255,255,255,0.02); border-radius: 12px; margin-top: 1rem; }
        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .list-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }
        .instance-filters {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
        }
        .filter-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn:hover { color: var(--text-primary); }
        .filter-btn.active {
          background: var(--primary);
          color: #020617;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
        }
        .action-buttons {
          display: flex;
          gap: 0.75rem;
        }
        .list-actions button { display: flex; align-items: center; gap: 0.5rem; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .error-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .list-header {
          display: flex;
          padding: 0.75rem 1.5rem;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .col-exp { width: 40px; }
        .col-sig { flex: 1; min-width: 0; }
        .col-env { width: 60px; text-align: center; }
        .col-count { width: 80px; text-align: center; }
        .col-last { width: 140px; }
        .col-actions { width: 50px; }
        .sortable { 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 4px;
          user-select: none;
          transition: color 0.2s;
        }
        .sortable:hover { color: var(--primary); }
        .sortable.active { color: var(--primary); }
        .col-last.sortable { justify-content: flex-start; }
        .env-tag {
          font-size: 0.625rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.1);
        }
        .env-tag.prd { color: #f87171; background: rgba(239, 68, 68, 0.1); }
        .env-tag.stg { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
        .env-tag.dev { color: #34d399; background: rgba(52, 211, 153, 0.1); }
        
        .error-row {
          background: var(--bg-card);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .error-row:hover {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(30, 41, 59, 0.6);
        }
        .row-main { display: flex; align-items: center; padding: 1rem 1.5rem; cursor: pointer; }
        .sig-text { 
           display: block; 
           font-weight: 700; 
           color: var(--primary); 
           margin-bottom: 4px;
           line-height: 1.2;
           font-size: 0.9375rem;
        }
        .sig-message {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 4px;
          opacity: 0.8;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sig-sites {
          display: block;
          font-size: 0.6875rem;
          color: var(--text-secondary);
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .count-badge {
          background: rgba(56, 189, 248, 0.15);
          color: var(--primary);
          padding: 4px 12px;
          border-radius: 99px; font-size: 0.8125rem; font-weight: 700;
        }
        .time-text { font-size: 0.8125rem; color: var(--text-secondary); }
        .icon-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; }
        .icon-btn:hover { color: var(--primary); background: rgba(255, 255, 255, 0.05); }
        .row-details { padding: 0 1.5rem 1.5rem 1.5rem; background: rgba(0, 0, 0, 0.15); border-top: 1px solid var(--glass-border); }
        .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; padding: 1.5rem 0; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item .label { font-size: 0.6875rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; }
        .detail-item .value { font-size: 0.875rem; }
        .stacktrace-container { background: var(--bg-darker); border-radius: 8px; border: 1px solid var(--glass-border); overflow: hidden; }
        .stack-header { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--glass-border); font-size: 0.75rem; color: var(--text-secondary); }
        .stack-actions { display: flex; gap: 1rem; }
        .stack-header button { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; gap: 4px; }
        .stack-header button:hover { color: var(--text-primary); }
        .stacktrace { margin: 0; padding: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #cbd5e1; overflow-x: auto; max-height: 400px; white-space: pre-wrap; }
        .incident-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
        .primary-sm { background: var(--primary); color: #020617; border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
        .primary-sm:hover { opacity: 0.9; box-shadow: 0 0 15px rgba(56, 189, 248, 0.4); }
        .secondary-sm { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); border: 1px solid var(--glass-border); padding: 8px 16px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
        .secondary-sm:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--primary); }
        .success-btn { background: #22c55e; color: white; }
      `}</style>
    </div>
  )
}

export default LogErrorList
