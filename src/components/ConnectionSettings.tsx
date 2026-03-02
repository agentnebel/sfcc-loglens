import React, { useState } from 'react'
import { User, Globe, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { ConnectionConfig } from '../App'

interface ConnectionSettingsProps {
  config: ConnectionConfig
  setConfig: (config: ConnectionConfig) => void
}

const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({ config, setConfig }) => {
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSave = () => {
    setTestResult({ success: true, message: 'Settings applied locally' })
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await window.ipcRenderer.invoke('logs:test-connection', config)

      if (result.success) {
        setTestResult({ success: true, message: 'Connection successful!' })
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' })
      }
    } catch (err: any) {
      setTestResult({ success: false, message: 'IPC communication error' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="settings-container">
      <div className="card settings-card">
        <h3>Connection Profile</h3>

        {testResult && (
          <div className={`test-feedback ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="form-group">
          <label><Globe size={16} /> WebDAV URL</label>
          <input
            type="text"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="form-group">
          <label><Globe size={16} /> Log Center Base URL</label>
          <input
            type="text"
            value={config.logCenterUrl}
            onChange={(e) => setConfig({ ...config, logCenterUrl: e.target.value })}
            placeholder="https://logcenter..."
          />
        </div>

        <div className="form-group">
          <label><User size={16} /> Username / Email</label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            placeholder="user@example.com"
          />
        </div>

        <div className="form-group">
          <label>Password / Access Key</label>
          <input
            type="password"
            value={config.password || ''}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            placeholder="••••••••••••"
          />
          <p className="hint">Stored in temporary memory during session</p>
        </div>

        <div className="actions">
          <button
            className="secondary"
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 size={16} className="spinning" /> : null}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button className="primary" onClick={handleSave}>
            <Save size={16} />
            Apply Settings
          </button>
        </div>
      </div>

      <style>{`
        .settings-container {
          max-width: 800px;
        }
        .settings-card h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.125rem;
          color: var(--primary);
        }
        .test-feedback {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .test-feedback.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }
        .test-feedback.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        .form-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.9375rem;
          transition: border-color 0.2s;
        }
        input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .hint {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        .actions button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        button.secondary {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        button.secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spinning {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default ConnectionSettings
