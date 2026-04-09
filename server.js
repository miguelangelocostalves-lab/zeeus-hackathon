const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PORT = 3000;
const DB_PATH = '/app/data/zeeus.db';

// ── SQLite setup ─────────────────────────────────────────────
const Database = require('better-sqlite3');

// Ensure data directory exists
if (!fs.existsSync('/app/data')) fs.mkdirSync('/app/data', { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT,
    stage TEXT,
    bizcat TEXT,
    approach TEXT,
    prodservice TEXT,
    launched TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stage1_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    criterion TEXT NOT NULL,
    score REAL NOT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
  );

  CREATE TABLE IF NOT EXISTS stage2_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    score REAL NOT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
  );

  CREATE TABLE IF NOT EXISTS sdg_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER NOT NULL,
    sdg_number INTEGER NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
  );
`);

console.log('Database initialised at', DB_PATH);

// ── Helper ───────────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
  });
}

function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Server ───────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── AI Recommendations ──────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/recommend') {
    const { prompt } = await parseBody(req);
    const payload = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    const options = {
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }
    };
    const apiReq = https.request(options, apiRes => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => { res.writeHead(200, {'Content-Type':'application/json'}); res.end(data); });
    });
    apiReq.on('error', err => jsonRes(res, 500, { error: err.message }));
    apiReq.write(payload); apiReq.end();
    return;
  }

  // ── Save evaluation ─────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/evaluations') {
    const body = await parseBody(req);
    const { basic, stage1, stage2, sdgs } = body;

    const info = db.prepare(`
      INSERT INTO evaluations (name, country, stage, bizcat, approach, prodservice, launched, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(basic.name, basic.country, basic.stage, basic.bizcat, basic.approach, basic.prodservice, basic.launched, basic.description);

    const evalId = info.lastInsertRowid;

    const insertScore1 = db.prepare('INSERT INTO stage1_scores (evaluation_id, dimension, criterion, score) VALUES (?, ?, ?, ?)');
    for (const s of stage1) insertScore1.run(evalId, s.dimension, s.criterion, s.score);

    const insertScore2 = db.prepare('INSERT INTO stage2_scores (evaluation_id, type, category, score) VALUES (?, ?, ?, ?)');
    for (const s of stage2) insertScore2.run(evalId, s.type, s.category, s.score);

    const insertSDG = db.prepare('INSERT INTO sdg_mappings (evaluation_id, sdg_number, source) VALUES (?, ?, ?)');
    for (const s of sdgs) insertSDG.run(evalId, s.number, s.source);

    jsonRes(res, 201, { id: evalId, message: 'Evaluation saved successfully' });
    return;
  }

  // ── List evaluations ────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/evaluations') {
    const rows = db.prepare('SELECT id, name, country, stage, bizcat, created_at FROM evaluations ORDER BY created_at DESC').all();
    jsonRes(res, 200, rows);
    return;
  }

  // ── Get single evaluation ───────────────────────────────
  if (req.method === 'GET' && req.url.startsWith('/api/evaluations/')) {
    const id = parseInt(req.url.split('/')[3]);
    const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(id);
    if (!evaluation) { jsonRes(res, 404, { error: 'Not found' }); return; }
    const stage1 = db.prepare('SELECT * FROM stage1_scores WHERE evaluation_id = ?').all(id);
    const stage2 = db.prepare('SELECT * FROM stage2_scores WHERE evaluation_id = ?').all(id);
    const sdgs = db.prepare('SELECT * FROM sdg_mappings WHERE evaluation_id = ?').all(id);
    jsonRes(res, 200, { evaluation, stage1, stage2, sdgs });
    return;
  }

  // ── Delete evaluation ───────────────────────────────────
  if (req.method === 'DELETE' && req.url.startsWith('/api/evaluations/')) {
    const id = parseInt(req.url.split('/')[3]);
    db.prepare('DELETE FROM stage1_scores WHERE evaluation_id = ?').run(id);
    db.prepare('DELETE FROM stage2_scores WHERE evaluation_id = ?').run(id);
    db.prepare('DELETE FROM sdg_mappings WHERE evaluation_id = ?').run(id);
    db.prepare('DELETE FROM evaluations WHERE id = ?').run(id);
    jsonRes(res, 200, { message: 'Deleted' });
    return;
  }

  // ── Serve frontend ──────────────────────────────────────
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`ZEEUS backend running on port ${PORT}`));
