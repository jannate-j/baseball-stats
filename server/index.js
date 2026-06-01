require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const VALID_SORT = [
  'name', 'position', 'games', 'at_bats', 'runs', 'hits', 'doubles',
  'triples', 'home_runs', 'rbi', 'walks', 'strikeouts', 'stolen_bases',
  'avg', 'obp', 'slg', 'ops',
];

// GET all players (server-side sort)
app.get('/api/players', (req, res) => {
  const { sort = 'name', order = 'asc' } = req.query;
  const col = VALID_SORT.includes(sort) ? sort : 'name';
  const dir = order === 'desc' ? 'DESC' : 'ASC';
  const players = db.prepare(`SELECT * FROM players ORDER BY ${col} ${dir}`).all();
  res.json(players);
});

// GET single player
app.get('/api/players/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  res.json(player);
});

// POST import from external API — idempotent (INSERT OR IGNORE)
app.post('/api/players/import', async (req, res) => {
  try {
    const response = await fetch('https://api.hirefraction.com/api/test/baseball');
    const data = await response.json();

    const insert = db.prepare(`
      INSERT OR IGNORE INTO players
        (name, position, games, at_bats, runs, hits, doubles, triples,
         home_runs, rbi, walks, strikeouts, stolen_bases, caught_stealing,
         avg, obp, slg, ops)
      VALUES
        (@name, @position, @games, @at_bats, @runs, @hits, @doubles, @triples,
         @home_runs, @rbi, @walks, @strikeouts, @stolen_bases, @caught_stealing,
         @avg, @obp, @slg, @ops)
    `);

    const importAll = db.transaction((rows) => {
      let count = 0;
      for (const p of rows) {
        const result = insert.run({
          name:            p['Player name']           || '',
          position:        p['position']              || '',
          games:           Number(p['Games'])         || 0,
          at_bats:         Number(p['At-bat'])        || 0,
          runs:            Number(p['Runs'])           || 0,
          hits:            Number(p['Hits'])           || 0,
          doubles:         Number(p['Double (2B)'])   || 0,
          triples:         Number(p['third baseman']) || 0,
          home_runs:       Number(p['home run'])      || 0,
          rbi:             Number(p['run batted in']) || 0,
          walks:           Number(p['a walk'])        || 0,
          strikeouts:      Number(p['Strikeouts'])    || 0,
          stolen_bases:    Number(p['stolen base'])   || 0,
          caught_stealing: String(p['Caught stealing'] ?? 0),
          avg:             Number(p['AVG'])                    || 0,
          obp:             Number(p['On-base Percentage'])     || 0,
          slg:             Number(p['Slugging Percentage'])    || 0,
          ops:             Number(p['On-base Plus Slugging'])  || 0,
        });
        count += result.changes;
      }
      return count;
    });

    const imported = importAll(data);
    res.json({ total: data.length, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update player stats
app.put('/api/players/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });

  const fields = [
    'name', 'position', 'games', 'at_bats', 'runs', 'hits', 'doubles', 'triples',
    'home_runs', 'rbi', 'walks', 'strikeouts', 'stolen_bases', 'avg', 'obp', 'slg', 'ops',
  ];
  const values = { id: req.params.id };
  for (const f of fields) {
    values[f] = req.body[f] !== undefined ? req.body[f] : current[f];
  }

  const sets = fields.map(f => `${f} = @${f}`).join(', ');
  db.prepare(`UPDATE players SET ${sets} WHERE id = @id`).run(values);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id));
});

// DELETE player
app.delete('/api/players/:id', (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// AI player analysis
app.get('/api/ai/player/:id', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set in server/.env' });
  }
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const allPlayers = db.prepare('SELECT * FROM players').all();
  function rank(key) {
    const sorted = [...allPlayers].sort((a, b) => Number(b[key]) - Number(a[key]));
    const idx = sorted.findIndex(p => p.id === player.id);
    return idx === -1 ? 'N/A' : `#${idx + 1} of ${allPlayers.length}`;
  }

  const prompt = `You are a baseball scout and analyst. Write a concise scouting report / player resume for this player based on their career stats. The database has ${allPlayers.length} players total.

Player: ${player.name}
Position: ${player.position}

Career Stats:
- Games: ${player.games}
- At Bats: ${player.at_bats}
- Hits: ${player.hits} (rank ${rank('hits')})
- Batting Average (AVG): ${Number(player.avg).toFixed(3)} (rank ${rank('avg')})
- On-Base Percentage (OBP): ${Number(player.obp).toFixed(3)} (rank ${rank('obp')})
- Slugging (SLG): ${Number(player.slg).toFixed(3)} (rank ${rank('slg')})
- OPS: ${Number(player.ops).toFixed(3)} (rank ${rank('ops')})
- Home Runs: ${player.home_runs} (rank ${rank('home_runs')})
- RBI: ${player.rbi} (rank ${rank('rbi')})
- Runs: ${player.runs}
- Doubles: ${player.doubles}
- Triples: ${player.triples}
- Walks: ${player.walks} (rank ${rank('walks')})
- Strikeouts: ${player.strikeouts}
- Stolen Bases: ${player.stolen_bases} (rank ${rank('stolen_bases')})

Write the report with these sections:
1. **Overall Rating** — Grade this player (Elite / Above Average / Average / Below Average) and give a one-sentence verdict.
2. **Strengths** — What does this player do exceptionally well? Reference specific stats and rankings.
3. **Weaknesses** — Where does this player fall short? Be honest.
4. **Player Type** — Describe their profile in one line (e.g. "Power hitter with low contact", "Speedy leadoff man", "Patient contact hitter").
5. **Verdict** — Should you sign/start this player? 1-2 sentences.

Keep it punchy and specific. Use the rankings to compare them to the rest of the database.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ analysis: message.content[0].text });
  } catch (err) {
    console.error('Anthropic error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Baseball API running on http://localhost:${PORT}`);
});
