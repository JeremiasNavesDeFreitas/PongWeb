const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'scores.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    score_total INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('skin', 'background', 'fonte', 'efeito')),
    nome TEXT NOT NULL,
    custo_score INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    data_unlock TEXT NOT NULL,
    UNIQUE(user_id, item_id)
  );
`);

function seedItems() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM items').get();
  if (c > 0) return;
  const insert = db.prepare('INSERT INTO items (tipo, nome, custo_score) VALUES (?, ?, ?)');
  const defaults = [
    ['skin', 'Classico', 0],
    ['skin', 'Neon', 50],
    ['skin', 'Retro', 100],
    ['background', 'Preto', 0],
    ['background', 'Grade', 60],
    ['background', 'Estrelas', 120],
    ['fonte', 'Padrao', 0],
    ['fonte', 'Retro Mono', 40],
    ['fonte', 'Arcade', 90],
    ['efeito', 'Nenhum', 0],
    ['efeito', 'Rastro de Bola', 70],
    ['efeito', 'Particulas no Gol', 150],
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(defaults);
}
seedItems();

function findOrCreateUser(nome) {
  let user = db.prepare('SELECT * FROM users WHERE nome = ?').get(nome);
  if (!user) {
    db.prepare('INSERT INTO users (nome, score_total) VALUES (?, 0)').run(nome);
    user = db.prepare('SELECT * FROM users WHERE nome = ?').get(nome);
  }
  return user;
}

function resolveUser({ nome, user_id }) {
  if (user_id) return db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) || null;
  if (nome) return db.prepare('SELECT * FROM users WHERE nome = ?').get(String(nome).trim()) || null;
  return null;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/score', (req, res) => {
  const { nome, score } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim() || !Number.isFinite(score)) {
    return res.status(400).json({ error: 'nome e score sao obrigatorios' });
  }
  const user = findOrCreateUser(nome.trim());
  const ganho = Math.max(0, Math.trunc(score));
  db.prepare('UPDATE users SET score_total = score_total + ? WHERE id = ?').run(ganho, user.id);
  const atualizado = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json(atualizado);
});

app.get('/scores', (_req, res) => {
  const ranking = db
    .prepare('SELECT nome, score_total FROM users ORDER BY score_total DESC LIMIT 20')
    .all();
  res.json(ranking);
});

app.get('/items', (req, res) => {
  const user = resolveUser(req.query);
  const items = db.prepare('SELECT * FROM items ORDER BY tipo, custo_score').all();
  const unlockedIds = user
    ? new Set(
        db.prepare('SELECT item_id FROM unlocks WHERE user_id = ?').all(user.id).map((r) => r.item_id)
      )
    : new Set();

  const resultado = items.map((item) => ({
    ...item,
    desbloqueado: item.custo_score === 0 || unlockedIds.has(item.id),
  }));

  res.json({ score_total: user ? user.score_total : 0, items: resultado });
});

app.post('/unlock', (req, res) => {
  const { item_id } = req.body || {};
  const user = resolveUser(req.body || {}) || (req.body && req.body.nome ? findOrCreateUser(req.body.nome.trim()) : null);

  if (!user) return res.status(400).json({ error: 'nome ou user_id e obrigatorio' });
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'item nao encontrado' });

  const jaTinha = db.prepare('SELECT 1 FROM unlocks WHERE user_id = ? AND item_id = ?').get(user.id, item.id);
  if (jaTinha) return res.json({ ok: true, jaDesbloqueado: true });

  if (user.score_total < item.custo_score) {
    return res.status(403).json({
      error: 'score_total insuficiente',
      necessario: item.custo_score,
      atual: user.score_total,
    });
  }

  db.prepare('INSERT INTO unlocks (user_id, item_id, data_unlock) VALUES (?, ?, ?)').run(
    user.id,
    item.id,
    new Date().toISOString()
  );
  res.json({ ok: true, jaDesbloqueado: false });
});

app.listen(PORT, () => {
  console.log(`PongWeb rodando em http://localhost:${PORT}`);
});
