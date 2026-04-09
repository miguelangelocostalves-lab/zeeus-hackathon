# ZEEUS – Startup Sustainability Evaluation Tool

## How to run

### Requirements
- Docker Desktop installed (https://www.docker.com/products/docker-desktop/)

### Steps

1. Put these 3 files in the same folder:
   - app.html
   - Dockerfile
   - docker-compose.yml

2. Open a terminal in that folder and run:
   ```
   docker compose up
   ```

3. Open your browser and go to:
   ```
   http://localhost:8080
   ```

4. To stop the app:
   ```
   docker compose down
   ```

## What the app does
- Stage I (Inside-Out): scores Environmental, Social, Governance and Financial aspects
- Stage II (Outside-In): scores Risks and Opportunities
- Dashboard: charts, material topics (score ≥ 2), SDG alignment
- Export: CSV download + PDF via browser print
