# GamanaGo – Smart Transit Companion 🚍

**GamanaGo (ගමනGo)** is an AI-powered multi-service travel assistant for Sri Lanka.  
It helps commuters find the **fastest, cheapest, and easiest routes** using real-time bus, train, and community data.  
With personalized travel plans, live disruption alerts, and accessibility support, GamanaGo makes every journey effortless.

---

## 🚀 Project Scaffold

This repository is structured as a **microservices monorepo**:

- **apps/**
  - `web` → Next.js frontend
  - `gateway` → FastAPI API Gateway
  - `agents/` → independent FastAPI agents  
    - `data-aggregator` (bus/train data, crowdsourcing)  
    - `route-optimizer` (pathfinding)  
    - `disruption-manager` (alerts/incidents)  
    - `profile-personalizer` (user prefs)  
    - `fare-optimizer` (fair price estimator)  
    - `language-accessibility` (translate & accessibility support)  
    - `local-knowledge` (community insights)  

- **shared/** → reusable Python + TypeScript code  
- **infra/** → Docker Compose, k8s config, etc.  
- **db/** → PostgreSQL + migrations  
- **ops/** → scripts, automation, CI  
- **docs/** → documentation and architecture notes

---

## 🛠️ Development

### Prerequisites
- Docker + Docker Compose 🐳
- Node.js (LTS) + npm
- Python 3.11 (for agents)

### Running full stack (Docker Compose)

```bash
docker compose -f infra/compose.dev.yml up --build