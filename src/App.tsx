import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ConnectionSettings from './components/ConnectionSettings'
import LogErrorList from './components/LogErrorList'
import { Trash2, AlertCircle } from 'lucide-react'

export interface ConnectionConfig {
    url: string
    username: string
    password?: string
}

export type EnvType = 'STG' | 'DEV';

const DEFAULT_CONFIGS: Record<EnvType, ConnectionConfig> = {
    STG: {
        url: 'https://staging-realm-name.demandware.net/on/demandware.servlet/webdav/Sites/Log',
        username: '',
    },
    DEV: {
        url: 'https://development-realm-name.demandware.net/on/demandware.servlet/webdav/Sites/Logs',
        username: '',
    }
}

function App() {
    const [activeTab, setActiveTab] = useState('logs')
    const [activeEnv, setActiveEnv] = useState<EnvType>('STG')
    const [settingsView, setSettingsView] = useState<'STG' | 'DEV' | 'LogCenter'>('STG')
    const [lastRefresh, setLastRefresh] = useState('Not refreshed yet')
    const [logCenterGlobalUrl, setLogCenterGlobalUrl] = useState(() => {
        return localStorage.getItem('sfcc_log_center_url') || 'https://logcenter-eu.visibility.commercecloud.salesforce.com/logcenter/'
    })

    // Multi-instance configurations
    const [configs, setConfigs] = useState<Record<EnvType, ConnectionConfig>>(() => {
        const saved = localStorage.getItem('sfcc_configs')
        if (saved) {
            const parsed = JSON.parse(saved)
            // Cleanup old PRD if it exists in local storage
            const { PRD, ...rest } = parsed as any
            return rest as Record<EnvType, ConnectionConfig>
        }
        return DEFAULT_CONFIGS
    })

    useEffect(() => {
        localStorage.setItem('sfcc_configs', JSON.stringify(configs))
    }, [configs])

    useEffect(() => {
        localStorage.setItem('sfcc_log_center_url', logCenterGlobalUrl)
    }, [logCenterGlobalUrl])

    // Ignore List State
    const [ignoredSignatures, setIgnoredSignatures] = useState<string[]>(() => {
        const saved = localStorage.getItem('sfcc_ignored_signatures')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        localStorage.setItem('sfcc_ignored_signatures', JSON.stringify(ignoredSignatures))
    }, [ignoredSignatures])



    const updateCurrentConfig = (newConfig: ConnectionConfig) => {
        const targetEnv = (settingsView === 'LogCenter' ? activeEnv : settingsView) as EnvType
        setConfigs(prev => ({ ...prev, [targetEnv]: newConfig }))
    }


    const toggleIgnore = (signature: string) => {
        setIgnoredSignatures(prev =>
            prev.includes(signature)
                ? prev.filter(s => s !== signature)
                : [...prev, signature]
        )
    }

    return (
        <div className="app-container">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} logCenterUrl={logCenterGlobalUrl} />

            <div className="main-content">
                <Header lastRefresh={lastRefresh} />

                <main className="content-scroll">
                    {activeTab === 'dashboard' && (
                        <div className="dashboard-content">
                            <h2>Dashboard</h2>
                            <div className="card">
                                <p>Welcome to SFCC LogLens. Select a profile and fetch logs to begin analysis.</p>
                                <button className="primary" onClick={() => setActiveTab('logs')}>Go to Log Analysis</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="logs-content">
                            <div className="content-header">
                                <h2>Error Analysis (Last 24h)</h2>
                            </div>
                            <LogErrorList
                                configs={configs}
                                onRefreshFinished={(time) => setLastRefresh(time)}
                                ignoredSignatures={ignoredSignatures}
                                onIgnore={toggleIgnore}
                                currentEnv={activeEnv}
                            />
                        </div>
                    )}

                    {activeTab === 'mute' && (
                        <div className="mute-content">
                            <h2>Ignore List</h2>
                            <div className="card ignore-card">
                                <div className="info-banner">
                                    <AlertCircle size={18} />
                                    <span>Errors with these signatures will be hidden from the analysis view.</span>
                                </div>

                                {ignoredSignatures.length === 0 ? (
                                    <div className="empty-mute">No ignored signatures yet.</div>
                                ) : (
                                    <div className="ignore-list-items">
                                        {ignoredSignatures.map(sig => (
                                            <div key={sig} className="ignore-item">
                                                <code>{sig}</code>
                                                <button className="icon-btn delete" onClick={() => toggleIgnore(sig)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="settings-content">
                            <div className="settings-header">
                                <div className="settings-header-left">
                                    <h2>Settings</h2>
                                </div>
                                <div className="settings-env-switch">
                                    {(['STG', 'DEV'] as const).map((e) => (
                                        <button
                                            key={e}
                                            className={`env-button ${settingsView === e ? 'active' : ''}`}
                                            onClick={() => {
                                                setSettingsView(e)
                                                setActiveEnv(e)
                                            }}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                    <div className="switch-divider"></div>
                                    <button
                                        className={`env-button logcenter ${settingsView === 'LogCenter' ? 'active' : ''}`}
                                        onClick={() => setSettingsView('LogCenter')}
                                    >
                                        Log Center
                                    </button>
                                </div>
                            </div>

                            {settingsView === 'LogCenter' ? (
                                <div className="card settings-card">
                                    <h3>Global Log Center</h3>
                                    <div className="form-group-full">
                                        <label>Log Center Base URL</label>
                                        <input
                                            className="full-input"
                                            value={logCenterGlobalUrl}
                                            onChange={(e) => setLogCenterGlobalUrl(e.target.value)}
                                            placeholder="https://logcenter-eu.visibility.commercecloud.salesforce.com/logcenter/"
                                        />
                                        <p className="hint">This URL is used for the sidebar link and incident templates.</p>
                                    </div>
                                </div>
                            ) : (
                                <ConnectionSettings
                                    config={configs[settingsView as EnvType]}
                                    setConfig={updateCurrentConfig}
                                />
                            )}
                        </div>
                    )}
                </main>
            </div>

            <style>{`
        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .settings-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--glass-border);
        }
        .settings-header-left {
            display: flex;
            align-items: center;
        }

        .settings-env-switch {
            display: flex;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px;
            border-radius: 8px;
            border: 1px solid var(--glass-border);
            gap: 4px;
            align-items: center;
        }
        .switch-divider {
            width: 1px;
            height: 16px;
            background: var(--glass-border);
            margin: 0 4px;
        }
        .settings-env-switch .env-button {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .settings-env-switch .env-button:hover {
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.05);
        }
        .settings-env-switch .env-button.active {
            background: var(--primary);
            color: #020617;
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
        }
        .settings-env-switch .env-button.logcenter.active {
            background: #fff;
            color: #020617;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }

        .form-group-full {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .form-group-full label {
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .full-input {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            color: var(--text-primary);
            font-size: 0.9375rem;
            width: 100%;
        }
        .full-input:focus {
            outline: none;
            border-color: var(--primary);
        }
        .hint {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin: 0;
            opacity: 0.7;
        }

        .content-header h2, .settings-header h2 { margin-bottom: 0; }
        .ignore-card { padding: 1.5rem; }
        .info-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.2);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          color: var(--primary);
          font-size: 0.875rem;
        }
        .empty-mute { text-align: center; padding: 2rem; color: var(--text-secondary); }
        .ignore-list-items { display: flex; flex-direction: column; gap: 0.75rem; }
        .ignore-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
        }
        .ignore-item code { font-family: monospace; color: var(--text-secondary); font-size: 0.8125rem; }
        .icon-btn.delete:hover { color: #f87171; background: rgba(239, 68, 68, 0.1); }
      `}</style>
        </div>
    )
}

export default App
