# BTC Alert — REST API Documentation

**Base URL:** `http://localhost:8081`

Authentication uses **JWT Bearer tokens**. Protected endpoints require:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /api/auth/register

Register a new user account.

**Auth required:** No

**Request body:**
```json
{
  "username": "alice",
  "password": "123456"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `username` | string | Required, must be unique |
| `password` | string | Required, minimum 6 characters |

**200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "alice"
}
```

**400 Bad Request** — validation failure
```json
{
  "message": "Username required and password must be ≥ 6 characters"
}
```

**400 Bad Request** — username taken
```json
{
  "message": "Username already taken"
}
```

---

### POST /api/auth/login

Authenticate and receive a JWT token.

**Auth required:** No

**Request body:**
```json
{
  "username": "alice",
  "password": "123456"
}
```

**200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "alice"
}
```

**401 Unauthorized** — wrong credentials
```json
{
  "token": null,
  "username": null
}
```

---

### GET /api/auth/me

Return the currently authenticated user's info.

**Auth required:** Yes

**Request headers:**
```
Authorization: Bearer <token>
```

**200 OK**
```json
{
  "username": "alice"
}
```

**403 Forbidden** — missing or invalid token

---

## WebSocket

### STOMP over SockJS

**Endpoint:** `http://localhost:8081/ws`  
**Protocol:** STOMP over SockJS  
**Auth required:** No

#### Subscribe: /topic/prices

Real-time BTC price messages pushed every 1 second.

**Message payload:**
```json
{
  "price": 107.35,
  "alert": true,
  "timestamp": 1776889290000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `price` | number | BTC price (2 decimal places, range 95–110) |
| `alert` | boolean | `true` if price exceeds $105 threshold |
| `timestamp` | number | Unix timestamp in milliseconds |

**Example client (JavaScript):**
```js
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
  onConnect: () => {
    client.subscribe('/topic/prices', (msg) => {
      const data = JSON.parse(msg.body)
      console.log(data.price, data.alert)
    })
  },
})
client.activate()
```

---

## Error Reference

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Validation error (see `message` field) |
| 401 | Wrong credentials |
| 403 | Missing or expired JWT |

---

## Quick Test (curl)

```bash
# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}'

# Get current user (replace <token>)
curl http://localhost:8081/api/auth/me \
  -H "Authorization: Bearer <token>"
```
