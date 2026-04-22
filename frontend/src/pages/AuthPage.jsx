import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, saveToken } from '../api/auth'

export default function AuthPage() {
  const [mode, setMode] = useState('login')       // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'login' ? login : register
      const data = await fn(username, password)
      if (!data.token) throw new Error('Invalid credentials')
      saveToken(data.token, data.username)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: '800', color: '#0a0c10',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(245,158,11,0.25)',
          }}>
            ₿
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e2e8f0' }}>BTC Monitor</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Real-time Kafka price stream</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111318',
          border: '1px solid #22262f',
          borderRadius: '16px',
          padding: '32px',
        }}>

          {/* Tab switcher */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: '#0a0c10',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '28px',
            gap: '4px',
          }}>
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.15s',
                background: mode === m ? '#1a1d24' : 'transparent',
                color: mode === m ? '#e2e8f0' : '#64748b',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
              }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field
              label="Username"
              icon="👤"
              value={username}
              onChange={setUsername}
              placeholder="Enter username"
              autoFocus
            />
            <Field
              label="Password"
              icon="🔒"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter password'}
            />

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: '4px',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '700',
              background: loading
                ? 'rgba(245,158,11,0.4)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0a0c10',
              transition: 'all 0.15s',
              letterSpacing: '0.02em',
            }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#3d4554', marginTop: '20px' }}>
          Spring Boot · Kafka · JWT Auth
        </p>
      </div>
    </div>
  )
}

function Field({ label, icon, type = 'text', value, onChange, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '6px', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#0a0c10',
        border: `1px solid ${focused ? '#f59e0b60' : '#22262f'}`,
        borderRadius: '8px',
        transition: 'border-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(245,158,11,0.08)' : 'none',
      }}>
        <span style={{ padding: '0 12px', fontSize: '15px', opacity: 0.6 }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          style={{
            flex: 1,
            padding: '11px 12px 11px 0',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: '#e2e8f0',
          }}
        />
      </div>
    </div>
  )
}
