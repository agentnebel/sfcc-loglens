import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

interface HeaderProps {
    env: 'STG' | 'DEV'
    setEnv: (env: 'STG' | 'DEV') => void
    lastRefresh?: string
}

const Header: React.FC<HeaderProps> = ({ env, setEnv, lastRefresh }) => {
    // ... same clock logic ...
    const [utcTime, setUtcTime] = useState(dayjs.utc().format('HH:mm:ss'))
    const [cetTime, setCetTime] = useState(dayjs.tz(dayjs(), 'Europe/Berlin').format('HH:mm:ss'))

    useEffect(() => {
        const timer = setInterval(() => {
            setUtcTime(dayjs.utc().format('HH:mm:ss'))
            setCetTime(dayjs.tz(dayjs(), 'Europe/Berlin').format('HH:mm:ss'))
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <header className="sticky-header">
            <div className="header-left">
                <div className="proposal-branding">
                    <div className="text-container">
                        <div className="title-row">
                            <h1>SFCC LogLens</h1>
                        </div>
                        <div className="branding-divider">
                            <div className="divider-line"></div>
                        </div>
                        <span className="subtitle">BY SVEN BELZ</span>
                    </div>
                </div>

                <div className="env-badge-container">
                    {(['STG', 'DEV'] as const).map((e) => (
                        <button
                            key={e}
                            className={`env-button ${env === e ? 'active' : ''}`}
                            onClick={() => setEnv(e)}
                        >
                            {e}
                        </button>
                    ))}
                </div>
            </div>

            <div className="header-right">
                <div className="clocks">
                    <div className="clock-item">
                        <span className="clock-label">UTC</span>
                        <span className="clock-value">{utcTime}</span>
                    </div>
                    <div className="clock-item">
                        <span className="clock-label">BER (CET)</span>
                        <span className="clock-value">{cetTime}</span>
                    </div>
                </div>

                {lastRefresh && (
                    <div className="last-refresh">
                        Last update: {lastRefresh}
                    </div>
                )}
            </div>

            <style>{`
                .proposal-branding {
                    display: flex;
                    align-items: center;
                    margin-right: 2rem;
                }
                .text-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .title-row h1 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin: 0;
                    line-height: 1;
                    letter-spacing: -0.01em;
                    background: linear-gradient(to bottom, #fff 20%, #7dd3fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                }
                .branding-divider {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-top: 0.125rem;
                }
                .divider-line {
                    height: 1px;
                    flex: 1;
                    background: linear-gradient(to right, rgba(56, 189, 248, 0) 0%, var(--primary) 70%, #fff 100%);
                }
                .subtitle {
                    font-size: 0.55rem;
                    font-weight: 700;
                    letter-spacing: 0.25em;
                    background: linear-gradient(to right, #fff, var(--primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    white-space: nowrap;
                    margin-top: 0.25rem;
                    opacity: 0.8;
                }
            `}</style>
        </header>
    )
}

export default Header
