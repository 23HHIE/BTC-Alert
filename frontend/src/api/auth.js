const BASE = 'http://localhost:8081/api/auth'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const login = (username, password) => post('/login', { username, password })
export const register = (username, password) => post('/register', { username, password })

export function saveToken(token, username) {
  localStorage.setItem('btc_token', token)
  localStorage.setItem('btc_user', username)
}

export function getToken() {
  return localStorage.getItem('btc_token')
}

export function getUser() {
  return localStorage.getItem('btc_user')
}

export function clearAuth() {
  localStorage.removeItem('btc_token')
  localStorage.removeItem('btc_user')
}
