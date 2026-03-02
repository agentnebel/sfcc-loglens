import React from 'react'
import { LayoutDashboard, Settings, FileText, BellOff, Link2 } from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  logCenterUrl: string
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, logCenterUrl }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'logs', icon: FileText, label: 'Log Analysis' },
    { id: 'mute', icon: BellOff, label: 'Ignore List' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <a href={logCenterUrl} target="_blank" rel="noopener noreferrer" className="log-center-link">
          <Link2 size={16} />
          SFCC Log Center
        </a>
      </div>

      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-family: inherit;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: rgba(56, 189, 248, 0.1);
          color: var(--primary);
        }
        .sidebar-footer {
          border-top: 1px solid var(--glass-border);
          padding-top: 1rem;
        }
        .log-center-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 0.5rem;
          border-radius: 6px;
          transition: color 0.2s;
        }
        .log-center-link:hover {
          color: var(--primary);
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
