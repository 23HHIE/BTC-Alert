# BTC Alert

Real-time BTC price monitoring system built with Spring Boot, Apache Kafka, and React. Simulates a live price feed, streams data via WebSocket, and triggers configurable spike alerts.

![Java](https://img.shields.io/badge/Java-17-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green) ![React](https://img.shields.io/badge/React-18-blue) ![Kafka](https://img.shields.io/badge/Kafka-3.6-black)

---

## Features

- **Live price stream** — producer emits a random BTC price every second via Kafka
- **Real-time dashboard** — React frontend receives prices over WebSocket (STOMP)
- **Configurable alerts** — threshold is adjustable in the UI; spike prices highlighted in red
- **Session history** — price and alert history persists across page refreshes
- **JWT authentication** — register / login with BCrypt-hashed passwords stored in MySQL
- **Kafka UI** — visual broker management at `localhost:8080`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2, Spring Security 6, Spring Kafka, Spring WebSocket |
| Auth | JWT (jjwt 0.12), BCrypt |
| Database | MySQL 8.0 (JPA / Hibernate) |
| Message broker | Apache Kafka 3.6 + Zookeeper |
| Frontend | React 18, Vite, Recharts, STOMP.js |
| Infrastructure | Docker Compose, Nginx |

---

## Project Structure

```
btc-kafka/
├── src/main/java/com/example/btckafka/
│   ├── BtcKafkaApplication.java     # Entry point
│   ├── BtcPriceProducer.java        # Scheduled Kafka producer
│   ├── MarketDataConsumer.java      # Kafka consumer + WebSocket broadcast
│   ├── AuthController.java          # POST /api/auth/register, /login, /me
│   ├── JwtUtil.java                 # Token generation & validation
│   ├── JwtFilter.java               # Per-request JWT filter
│   ├── SecurityConfig.java          # Spring Security configuration
│   └── WebSocketConfig.java         # STOMP WebSocket configuration
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Dashboard, chart, alert log
│   │   ├── pages/AuthPage.jsx       # Login / register
│   │   └── api/auth.js              # Auth API client
│   ├── nginx.conf                   # Production Nginx config
│   └── Dockerfile
├── docker-compose.yml               # Development (Kafka + MySQL + Kafka UI)
├── docker-compose.prod.yml          # Production (full stack)
├── Dockerfile                       # Backend multi-stage build
├── API.md                           # REST API reference
└── DESIGN_EN.md                     # Architecture design document
```

---

## Getting Started (Development)

### Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 20+
- Docker + Docker Compose

### 1. Start infrastructure

```bash
docker-compose up -d
```

Starts Zookeeper, Kafka, MySQL, and Kafka UI.

### 2. Start the backend

```bash
mvn spring-boot:run
```

Backend runs on `http://localhost:8081`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

### Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8081 |
| Kafka UI | http://localhost:8080 |
| H2 Console (dev) | http://localhost:8081/h2-console |

---

## Production Deployment

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=btcdb
MYSQL_USER=btc
MYSQL_PASSWORD=your_password
JWT_SECRET=a-random-string-at-least-32-characters-long
JWT_EXPIRATION_MS=86400000
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
```

### 2. Build and run

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

The app is available at `http://your-server-ip`.

### Production architecture

```
Client → Nginx:80
            ├── /        → React static files
            ├── /api/*   → backend:8081
            └── /ws/*    → backend:8081 (WebSocket upgrade)
```

---

## API Reference

See [API.md](API.md) for full documentation.

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT token |
| GET | `/api/auth/me` | Yes | Current user info |

**WebSocket:** Connect to `/ws`, subscribe to `/topic/prices` for real-time price messages.

---

## Running Tests

```bash
mvn test
```

```
JwtUtilTest        6 tests  — unit, no Spring context
AuthControllerTest 7 tests  — integration, embedded Kafka + H2
─────────────────────────────
Total             13 tests  ✓
```

---

## Configuration

### Alert threshold

The spike alert threshold defaults to **$105** and can be changed live in the dashboard UI. The setting persists in `localStorage`.

### Price range

The producer generates prices between **$95–$110** at 1-second intervals. Modify `BtcPriceProducer.java` to adjust the range or interval.

### JWT expiration

Set `JWT_EXPIRATION_MS` in your `.env`. Default is 86400000 ms (24 hours).
