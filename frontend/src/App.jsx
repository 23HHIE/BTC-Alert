import { useEffect, useRef, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import AuthPage from './pages/AuthPage'
import { getToken, getUser, clearAuth } from './api/auth'

const MAX_POINTS = 60
const DEFAULT_THRESHOLD = 105

// ─── Auth guard ──────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/auth" replace />
}

// ─── WebSocket hook ──────────────────────────────────────────────────────────

function usePriceFeed(threshold) {
  const thresholdRef = useRef(threshold)
  useEffect(() => { thresholdRef.current = threshold }, [threshold])

  const [prices, setPrices] = useState(() => {
    try {
      const saved = sessionStorage.getItem('btc_prices')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = sessionStorage.getItem('btc_alerts')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [connected, setConnected] = useState(false)
  const [flashKey, setFlashKey] = useState(0)

  useEffect(() => {
    sessionStorage.setItem('btc_prices', JSON.stringify(prices))
  }, [prices])

  useEffect(() => {
    sessionStorage.setItem('btc_alerts', JSON.stringify(alerts))
  }, [alerts])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL ?? ''}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/prices', (msg) => {
          const data = JSON.parse(msg.body)
          const isAlert = data.price > thresholdRef.current
          const point = {
            price: data.price,
            alert: isAlert,
            time: new Date(data.timestamp).toLocaleTimeString('en', { hour12: false }),
          }
          setPrices((prev) => [...prev.slice(-(MAX_POINTS - 1)), point])
          setFlashKey((k) => k + 1)
          if (isAlert) setAlerts((prev) => [point, ...prev.slice(0, 99)])
        })
      },
      onDisconnect: () => setConnected(false),
    })
    client.activate()
    return () => client.deactivate()
  }, [])

  const latest = prices[prices.length - 1] ?? null
  const prev = prices[prices.length - 2] ?? null
  const trend = latest && prev ? latest.price - prev.price : 0
  const min = prices.length ? Math.min(...prices.map((p) => p.price)) : null
  const max = prices.length ? Math.max(...prices.map((p) => p.price)) : null

  function clearHistory() {
    setPrices([])
    setAlerts([])
    sessionStorage.removeItem('btc_prices')
    sessionStorage.removeItem('btc_alerts')
  }

  return { prices, alerts, connected, latest, trend, min, max, flashKey, clearHistory }
}

// ─── Shared UI components ────────────────────────────────────────────────────

function Badge({ children, color = '#f59e0b' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em',
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  )
}

function Avatar({ username }) {
  return (
    <div style={{
      width: '30px', height: '30px', borderRadius: '8px',
      background: 'linear-gradient(135deg, #f59e0b22, #f59e0b44)',
      border: '1px solid #f59e0b30',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: '700', color: '#f59e0b',
      flexShrink: 0,
    }}>
      {username?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function StatusDot({ connected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: connected ? '#10b981' : '#ef4444',
        boxShadow: connected ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
        animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
        {connected ? 'Live' : 'Disconnected'}
      </span>
    </div>
  )
}

function StatCard({ label, value, sub, accent = '#f59e0b', icon }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #111318 0%, #13161e 100%)',
      border: '1px solid #22262f',
      borderRadius: '12px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px',
        background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            {label}
          </p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: accent + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#1a1d24', border: '1px solid #2e3340',
      borderRadius: '8px', padding: '10px 14px', fontSize: '13px',
    }}>
      <div style={{ color: '#64748b', marginBottom: '4px' }}>{d.time}</div>
      <div style={{ color: d.alert ? '#ef4444' : '#f59e0b', fontWeight: '600', fontSize: '15px' }}>
        ${d.price.toFixed(2)}
      </div>
      {d.alert && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>⚠ Spike Alert</div>}
    </div>
  )
}

// ─── Dashboard sections ──────────────────────────────────────────────────────

function PriceHero({ latest, trend, flashKey }) {
  const isAlert = latest?.alert
  const accent = isAlert ? '#ef4444' : '#10b981'
  const trendIcon = trend > 0 ? '▲' : trend < 0 ? '▼' : '—'
  const trendColor = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#64748b'

  return (
    <div key={flashKey} className={latest ? 'flash' : ''} style={{
      background: 'linear-gradient(135deg, #111318 0%, #13161e 100%)',
      border: `1px solid ${isAlert ? '#ef444430' : '#22262f'}`,
      borderRadius: '16px',
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
      }} />
      {isAlert && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at top, rgba(239,68,68,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            BTC / USD
          </span>
          {isAlert && <Badge color="#ef4444">⚠ Spike</Badge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <span style={{
            fontSize: '52px', fontWeight: '800', color: accent,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px',
          }}>
            {latest ? `$${latest.price.toFixed(2)}` : '—'}
          </span>
          <span style={{ fontSize: '18px', color: trendColor, fontWeight: '600' }}>
            {trendIcon} {trend !== 0 ? Math.abs(trend).toFixed(2) : ''}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
          {latest ? `Last update: ${latest.time}` : 'Waiting for data...'}
        </p>
      </div>
      <div style={{ fontSize: '72px', opacity: 0.06, lineHeight: 1, userSelect: 'none' }}>₿</div>
    </div>
  )
}

function PriceChart({ prices, threshold }) {
  if (prices.length === 0) {
    return (
      <div style={{ height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ fontSize: '32px', opacity: 0.15 }}>📈</div>
        <p style={{ fontSize: '13px', color: '#3d4554' }}>Waiting for price data...</p>
      </div>
    )
  }
  const yMin = Math.floor(Math.min(...prices.map((p) => p.price)) - 1)
  const yMax = Math.ceil(Math.max(...prices.map((p) => p.price)) + 1)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={prices} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1d24" vertical={false} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#3d4554' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10, fill: '#3d4554' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={threshold} stroke="#ef444460" strokeDasharray="6 3"
          label={{ value: `$${threshold}`, position: 'right', fill: '#ef4444', fontSize: 10 }} />
        <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2}
          fill="url(#priceGrad)" dot={false}
          activeDot={{ r: 5, fill: '#f59e0b', stroke: '#0a0c10', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function AlertLog({ alerts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>Alert Log</span>
        {alerts.length > 0 && <Badge color="#ef4444">{alerts.length}</Badge>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {alerts.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', paddingTop: '32px' }}>
            <div style={{ fontSize: '28px', opacity: 0.2 }}>🔔</div>
            <p style={{ fontSize: '12px', color: '#3d4554' }}>No alerts triggered</p>
          </div>
        ) : (
          alerts.map((a, i) => (
            <div key={i} className={i === 0 ? 'alert-new slide-in' : ''} style={{
              padding: '10px 12px',
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                  ${a.price.toFixed(2)}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#3d4554' }}>{a.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Threshold input ─────────────────────────────────────────────────────────

function ThresholdInput({ value, onChange, onClear }) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  function commit() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n > 0) onChange(n)
    else setDraft(String(value))
    setFocused(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Alert threshold</span>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#0a0c10', border: `1px solid ${focused ? '#f59e0b60' : '#22262f'}`,
        borderRadius: '7px', overflow: 'hidden',
        boxShadow: focused ? '0 0 0 3px rgba(245,158,11,0.08)' : 'none',
        transition: 'all 0.15s',
      }}>
        <span style={{ padding: '0 8px', fontSize: '13px', color: '#64748b' }}>$</span>
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          style={{
            width: '64px', padding: '6px 6px 6px 0',
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: '13px', fontWeight: '600', color: '#f59e0b',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
      <button onClick={onClear} style={{
        padding: '5px 10px', borderRadius: '6px',
        border: '1px solid #22262f', background: 'transparent',
        color: '#64748b', fontSize: '11px', cursor: 'pointer',
        fontWeight: '500', transition: 'all 0.15s',
      }}
        onMouseEnter={e => { e.target.style.color = '#e2e8f0'; e.target.style.borderColor = '#3d4554' }}
        onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.borderColor = '#22262f' }}
      >
        Clear history
      </button>
    </div>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

function Dashboard() {
  const navigate = useNavigate()
  const username = getUser()
  const [threshold, setThreshold] = useState(() =>
    Number(localStorage.getItem('btc_threshold')) || DEFAULT_THRESHOLD
  )

  useEffect(() => {
    localStorage.setItem('btc_threshold', threshold)
  }, [threshold])

  const { prices, alerts, connected, latest, trend, min, max, flashKey, clearHistory } = usePriceFeed(threshold)

  function handleLogout() {
    clearAuth()
    navigate('/auth')
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 28px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: '800', color: '#0a0c10',
          }}>
            ₿
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', lineHeight: 1 }}>BTC Monitor</h1>
            <p style={{ fontSize: '11px', color: '#3d4554', marginTop: '2px' }}>Real-time Kafka stream</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <StatusDot connected={connected} />

          {/* User menu */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '6px 10px 6px 6px',
            background: '#111318', border: '1px solid #22262f', borderRadius: '10px',
          }}>
            <Avatar username={username} />
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500' }}>{username}</span>
            <button onClick={handleLogout} style={{
              marginLeft: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #22262f',
              background: 'transparent',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.target.style.color = '#ef4444'; e.target.style.borderColor = '#ef444440' }}
              onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.borderColor = '#22262f' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ marginBottom: '20px' }}>
        <PriceHero latest={latest} trend={trend} flashKey={flashKey} />
      </div>

      {/* Config bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', marginBottom: '16px',
        background: '#111318', border: '1px solid #22262f', borderRadius: '10px',
      }}>
        <ThresholdInput value={threshold} onChange={setThreshold} onClear={clearHistory} />
        <span style={{ fontSize: '11px', color: '#3d4554' }}>
          {prices.length} ticks in session
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <StatCard label="Session Low" value={min !== null ? `$${min.toFixed(2)}` : '—'} accent="#3b82f6" icon="↓" />
        <StatCard label="Session High" value={max !== null ? `$${max.toFixed(2)}` : '—'} accent="#8b5cf6" icon="↑" />
        <StatCard label="Spike Alerts" value={alerts.length} sub={`Threshold: $${threshold}`} accent="#ef4444" icon="⚠" />
      </div>

      {/* Chart + Alert log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #111318 0%, #13161e 100%)',
          border: '1px solid #22262f', borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>Price History</span>
            <span style={{ fontSize: '11px', color: '#3d4554' }}>Last {MAX_POINTS} ticks · 1s interval</span>
          </div>
          <PriceChart prices={prices} threshold={threshold} />
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #111318 0%, #13161e 100%)',
          border: '1px solid #22262f', borderRadius: '12px', padding: '20px', minHeight: '360px',
        }}>
          <AlertLog alerts={alerts} />
        </div>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '28px' }}>
        <p style={{ fontSize: '11px', color: '#1e2330' }}>Spring Boot · Apache Kafka · React · JWT</p>
      </footer>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
