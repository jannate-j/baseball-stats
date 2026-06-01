const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'baseball.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    position TEXT DEFAULT '',
    games INTEGER DEFAULT 0,
    at_bats INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    doubles INTEGER DEFAULT 0,
    triples INTEGER DEFAULT 0,
    home_runs INTEGER DEFAULT 0,
    rbi INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    stolen_bases INTEGER DEFAULT 0,
    caught_stealing TEXT DEFAULT '0',
    avg REAL DEFAULT 0,
    obp REAL DEFAULT 0,
    slg REAL DEFAULT 0,
    ops REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
