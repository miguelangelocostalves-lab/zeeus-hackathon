# ZEEUS – Startup Sustainability Evaluation Tool

**Zero Emissions Entrepreneurship for Universal Sustainability**

A web application that transforms the Excel-based Startup Sustainability Evaluation Tool into a fully functional, multi-user web platform aligned with ESRS dual materiality standards and UN SDGs.

---

## Setup Instructions

### Requirements
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (free)

### Run locally

1. Clone the repository:
   ```
   git clone https://github.com/miguelangelocostalves-lab/zeeus-hackathon.git
   cd zeeus-hackathon
   ```

2. Start the application:
   ```
   docker compose up --build
   ```

3. Open your browser at:
   ```
   http://localhost:8080
   ```

4. To stop:
   ```
   docker compose down
   ```

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Browser (Client)           │
│         HTML + CSS + JavaScript         │
│  - Multi-step evaluation form           │
│  - Dynamic dashboard & charts           │
│  - Score interpretation & insights      │
└────────────────┬────────────────────────┘
                 │ HTTP requests
┌────────────────▼────────────────────────┐
│         Node.js Backend (server.js)     │
│  - Serves the frontend                  │
│  - REST API for evaluations             │
│  - Proxies AI recommendation requests  │
└────────────────┬────────────────────────┘
                 │ SQL queries
┌────────────────▼────────────────────────┐
│         SQLite Database                 │
│  - evaluations                          │
│  - stage1_scores                        │
│  - stage2_scores                        │
│  - sdg_mappings                         │
└─────────────────────────────────────────┘
```

### Data flow
1. User fills in basic startup information (NACE category, stage, country)
2. Stage I (Inside-Out): rates Environmental, Social, Governance and Financial impacts
3. Stage II (Outside-In): rates Risks and Opportunities using exact FAQ matrix
4. Dashboard calculates scores, identifies material topics (≥ 2.5), and maps UN SDGs
5. Insights page generates maturity score, recommendations, action plan and roadmap
6. Results can be saved to the database, exported as CSV or printed as PDF

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Charts | Chart.js 4.4.1 |
| Backend | Node.js (built-in http/https modules) |
| Database | SQLite via better-sqlite3 |
| Containerisation | Docker + Docker Compose |
| Base image | node:18-alpine |

---

## Scoring Logic

All scoring logic is preserved exactly from the original Excel tool.

### Stage I – Inside-Out (Impact Score)
```
Impact Score = ((Magnitude + Scale + Irreversibility) / 3) × Likelihood
```
- N/A = 0
- Material topic if score ≥ 2.5 (ESRS threshold)
- Watch list if score ≥ 2.0 and < 2.5

### Stage II – Outside-In

**Risk matrix** (Probability × Impact → Rating):

| | Low | Moderate | Significant | High |
|---|---|---|---|---|
| Rare | Sustainable (1) | Sustainable (1) | Moderate (2) | Severe (3) |
| Could occur | Moderate (2) | Moderate (2) | Severe (3) | Severe (3) |
| Likely | Sustainable (1) | Moderate (2) | Severe (3) | Critical (4) |
| Very likely | Moderate (2) | Severe (3) | Critical (4) | Critical (4) |

**Opportunity matrix** (Likelihood × Impact → Rating):

| | Low | Moderate | Significant | High |
|---|---|---|---|---|
| Rare | Small (1) | Reasonable (2) | Reasonable (2) | Sustainable (3) |
| Could occur | Reasonable (2) | Reasonable (2) | Sustainable (3) | Sustainable (3) |
| Likely | Sustainable (3) | Sustainable (3) | Great (4) | Great (4) |
| Very likely | Great (4) | Great (4) | Great (4) | Great (4) |

### Score Interpretation

| Score | Category |
|---|---|
| 0 | Not applicable |
| > 0 – < 1 | Very Low |
| ≥ 1 – < 2 | Low |
| ≥ 2 – < 2.5 | Relevant |
| ≥ 2.5 – 4 | High Priority |

---

## AI Usage

AI is used **only** for generating natural language recommendations — scoring formulas are never modified by AI.

### What AI does
- Generates tailored sustainability recommendations based on Stage I and Stage II scores
- Summarises material topics and suggests priority actions
- Provides natural language explanations in the Insights section

### What AI does NOT do
- Modify or influence any score calculations
- Alter formula logic
- Produce non-deterministic scoring outputs

### Implementation
- Automatic rule-based recommendations (no external API required) — always available
- Optional: Claude API integration via ANTHROPIC_API_KEY environment variable for enhanced recommendations

---

## Database Schema

```sql
CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, country TEXT, stage TEXT,
  bizcat TEXT, approach TEXT,
  prodservice TEXT, launched TEXT, description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stage1_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER,
  dimension TEXT, criterion TEXT, score REAL
);

CREATE TABLE stage2_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER,
  type TEXT, category TEXT, score REAL
);

CREATE TABLE sdg_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER,
  sdg_number INTEGER, source TEXT
);
```

---

## Features

- Stage I assessment — Financial, Environmental (E1-E5), Social (S1-S4), Governance (G1)
- Stage II assessment — 6 risks and 6 opportunities with exact FAQ matrix
- Dynamic dashboard — bar, radar and polar area charts with materiality threshold line
- Material topics — automatic flagging of topics >= 2.5 with score interpretation
- Watch list — topics between 2.0 and 2.5 flagged for monitoring
- SDG alignment — mapped from 87 NACE divisions (full ESRS classification)
- Sustainability maturity score — 0-100 composite score
- What-If simulator — interactive sliders to model improvement scenarios
- Action plan — prioritised actions ordered by urgency
- 12-month roadmap — structured sustainability milestones
- Automatic recommendations — rule-based, always available
- Save & load — persistent storage via SQLite database
- Export — CSV download and PDF via browser print

---

Supported by ClimateKIC · Funded by the European Union · EIT Higher Education Initiative
