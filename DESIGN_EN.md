# BTC Kafka Real-Time Price Monitoring System — Design Document

## 1. Overview

This project is a real-time BTC price simulation and monitoring system built on Spring Boot and Apache Kafka. It uses a message queue to decouple price production from consumption, enabling low-latency streaming data processing with threshold-based alerting.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Spring Boot App                       │
│                                                         │
│  ┌──────────────────┐         ┌──────────────────────┐  │
│  │  BtcPriceProducer│         │  MarketDataConsumer  │  │
│  │  (@Scheduled)    │         │  (@KafkaListener)    │  │
│  │                  │         │                      │  │
│  │  Emits random    │         │  price > 105 → 🚨   │  │
│  │  price every 1s  │         │  price ≤ 105 → info  │  │
│  └────────┬─────────┘         └──────────┬───────────┘  │
│           │                              │               │
└───────────┼──────────────────────────────┼───────────────┘
            │  produce                     │  consume
            ▼                             ▲
┌───────────────────────────────────────────────────────┐
│                   Apache Kafka                         │
│                                                       │
│   Topic: market-data  (partitions: 1, replicas: 1)    │
│                                                       │
└───────────────────────────────────────────────────────┘
            ▲
            │  broker coordination
┌───────────┴──────────┐     ┌────────────────────────┐
│      Zookeeper        │     │       Kafka UI          │
│      port: 2181       │     │  provectuslabs/kafka-ui │
└──────────────────────┘     │      port: 8080         │
                             └────────────────────────┘
```

---

## 3. Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Application Framework | Spring Boot | 3.2.4 |
| Message Broker | Apache Kafka | 3.6.1 (via spring-kafka) |
| Broker Coordination | Apache Zookeeper | — |
| UI Dashboard | Kafka UI (provectuslabs) | latest |
| Containerization | Docker Compose | — |
| Language | Java | 17 |
| Build Tool | Maven | 3.x |

---

## 4. Module Design

### 4.1 BtcPriceProducer

**Responsibility**: Simulates a BTC price feed by generating random prices on a fixed interval and publishing them to Kafka.

| Property | Value |
|----------|-------|
| Trigger | `@Scheduled(fixedRate = 1000)` |
| Price Range | 95.00 – 110.00 (2 decimal places) |
| Target Topic | `market-data` |
| Message Format | Plain string number, e.g. `"107.35"` |

**Core Logic**:
```
price = 95.0 + Random(0, 1) * 15.0
message = format(price, "%.2f")
KafkaTemplate.send("market-data", message)
```

### 4.2 MarketDataConsumer

**Responsibility**: Consumes messages from Kafka, parses the price, and determines the output level based on a configurable threshold.

| Property | Value |
|----------|-------|
| Listened Topic | `market-data` |
| Consumer Group | `btc-group` |
| Alert Threshold | price > 105.0 |
| Alert Style | ANSI red bold (`\033[1;31m`) |

**Alert Rules**:

```
price > 105  →  🚨 ALERT: BTC Price Spike! Current: [price]   (red bold)
price ≤ 105  →  Price: [price]                                (plain text)
```

### 4.3 BtcKafkaApplication

Spring Boot entry point. Annotated with `@EnableScheduling` to activate the producer's scheduled task.

---

## 5. Kafka Configuration

### Topic

| Setting | Value |
|---------|-------|
| Topic Name | `market-data` |
| Partitions | 1 |
| Replication Factor | 1 |

### Listener Setup

Two listeners are configured on the Kafka broker to solve the network isolation between the host machine and Docker containers:

| Listener | Address | Used By |
|----------|---------|---------|
| `PLAINTEXT` | `localhost:9092` | Spring Boot app on the host |
| `INTERNAL` | `kafka:29092` | Kafka UI inside Docker network |

---

## 6. Deployment Layout

```
Host Machine
├── Spring Boot App  (mvn spring-boot:run)
│     └── connects to localhost:9092
└── Docker Compose
      ├── zookeeper    :2181
      ├── kafka        :9092 (external) / :29092 (internal)
      └── kafka-ui     :8080
```

---

## 7. Data Flow

```
1. Producer generates a price every 1s
        ↓
2. KafkaTemplate publishes to market-data topic
        ↓
3. Kafka broker persists the message
        ↓
4. Consumer polls and receives the message
        ↓
5. Price parsed → threshold check → console output
```

End-to-end latency is under 10ms in a local environment.

---

## 8. Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Run the application
mvn spring-boot:run

# 3. Open Kafka UI
open http://localhost:8080
```

---

## 9. Future Improvements

- **Persistence**: Write consumed prices to InfluxDB or TimescaleDB and visualize with Grafana
- **Scalability**: Increase topic partition count and run multiple consumer instances for parallel processing
- **Live Data**: Replace the price simulator with a real-time WebSocket feed from Binance or OKX
- **Alerting**: Integrate with Slack or webhook endpoints to push alerts beyond the console
- **Schema Management**: Introduce Confluent Schema Registry and migrate message format from plain strings to Avro or JSON Schema
