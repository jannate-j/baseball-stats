import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = 'http://localhost:5001/api';

const POSITION_INFO = {
  LF:  { name: 'Left Field',          desc: 'Patrols the left side of the outfield' },
  RF:  { name: 'Right Field',         desc: 'Patrols the right side of the outfield, usually the strongest arm' },
  CF:  { name: 'Center Field',        desc: 'Covers the most ground in the outfield, often the fastest player' },
  OF:  { name: 'Outfield',            desc: 'General outfield designation' },
  '1B':{ name: 'First Base',          desc: 'Anchors the right side of the infield, receives throws on grounders' },
  '2B':{ name: 'Second Base',         desc: 'Turns double plays, covers the middle of the infield' },
  '3B':{ name: 'Third Base',          desc: 'The "hot corner" — reacts to hard-hit balls down the line' },
  SS:  { name: 'Shortstop',           desc: 'Often the most athletic infielder, covers the gap between 2B and 3B' },
  C:   { name: 'Catcher',             desc: 'Controls the defense, calls pitches, and blocks home plate' },
  P:   { name: 'Pitcher',             desc: 'Delivers the ball to the batter, controls the pace of the game' },
  SP:  { name: 'Starting Pitcher',    desc: 'Opens the game and pitches as deep into it as possible' },
  RP:  { name: 'Relief Pitcher',      desc: 'Enters the game after the starter is removed' },
  DH:  { name: 'Designated Hitter',   desc: 'Bats in place of the pitcher but plays no defense' },
};

const STAT_COLS = [
  { key: 'games',         label: 'G',   title: 'Games Played',          type: 'int' },
  { key: 'at_bats',       label: 'AB',  title: 'At Bats',               type: 'int' },
  { key: 'runs',          label: 'R',   title: 'Runs Scored',           type: 'int' },
  { key: 'hits',          label: 'H',   title: 'Hits',                  type: 'int' },
  { key: 'doubles',       label: '2B',  title: 'Doubles',               type: 'int' },
  { key: 'triples',       label: '3B',  title: 'Triples',               type: 'int' },
  { key: 'home_runs',     label: 'HR',  title: 'Home Runs',             type: 'int' },
  { key: 'rbi',           label: 'RBI', title: 'Runs Batted In',        type: 'int' },
  { key: 'walks',         label: 'BB',  title: 'Walks (Base on Balls)', type: 'int' },
  { key: 'strikeouts',    label: 'SO',  title: 'Strikeouts',            type: 'int' },
  { key: 'stolen_bases',  label: 'SB',  title: 'Stolen Bases',          type: 'int' },
  { key: 'avg',           label: 'AVG', title: 'Batting Average',       type: 'decimal', rate: true },
  { key: 'obp',           label: 'OBP', title: 'On-Base Percentage',    type: 'decimal', rate: true },
  { key: 'slg',           label: 'SLG', title: 'Slugging Percentage',   type: 'decimal', rate: true },
  { key: 'ops',           label: 'OPS', title: 'On-Base Plus Slugging', type: 'decimal', rate: true },
];

function fmt(val, type) {
  if (val === null || val === undefined || val === '') return '--';
  if (type === 'decimal') return Number(val).toFixed(3);
  return val;
}

function StatBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (Number(value) / max) * 100) : 0;
  return (
    <div className="bar-bg">
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatRow({ label, value, max, color }) {
  return (
    <div className="modal-stat-row">
      <span className="msr-label">{label}</span>
      <span className="msr-value">{value ?? '--'}</span>
      {max !== undefined && <StatBar value={value} max={max} color={color} />}
    </div>
  );
}

function PlayerModal({ player, allPlayers, onClose }) {
  const pos = POSITION_INFO[player.position] || { name: player.position, desc: '' };
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState('');

  async function analyze() {
    setAiLoading(true);
    setAiAnalysis('');
    setAiError('');
    try {
      const res  = await fetch(`${API}/ai/player/${player.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setAiAnalysis(data.analysis);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function maxOf(key) { return Math.max(...allPlayers.map(p => Number(p[key]) || 0)); }

  const keyStats = [
    { label: 'AVG', val: fmt(player.avg, 'decimal'), raw: player.avg, max: maxOf('avg'),         color: '#1B3A6B' },
    { label: 'OBP', val: fmt(player.obp, 'decimal'), raw: player.obp, max: maxOf('obp'),         color: '#2563EB' },
    { label: 'SLG', val: fmt(player.slg, 'decimal'), raw: player.slg, max: maxOf('slg'),         color: '#7C3AED' },
    { label: 'OPS', val: fmt(player.ops, 'decimal'), raw: player.ops, max: maxOf('ops'),         color: '#059669' },
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-hero">
          <div className="modal-player-name">{player.name}</div>
          <div className="modal-pos-row">
            <span className="modal-pos-badge">{player.position}</span>
            <span className="modal-pos-name">{pos.name}</span>
          </div>
          {pos.desc && <p className="modal-pos-desc">{pos.desc}</p>}
        </div>

        <div className="modal-key-stats">
          {keyStats.map(s => (
            <div key={s.label} className="key-stat">
              <div className="ks-label">{s.label}</div>
              <div className="ks-value">{s.val}</div>
              <StatBar value={s.raw} max={s.max} color={s.color} />
            </div>
          ))}
        </div>

        <div className="modal-grid">
          <div className="modal-section">
            <h4>Batting</h4>
            <StatRow label="Games"       value={player.games}   />
            <StatRow label="At Bats"     value={player.at_bats} />
            <StatRow label="Hits"        value={player.hits}    max={maxOf('hits')}    color="#1B3A6B" />
            <StatRow label="Batting Avg" value={fmt(player.avg, 'decimal')} />
          </div>

          <div className="modal-section">
            <h4>Power</h4>
            <StatRow label="Home Runs" value={player.home_runs} max={maxOf('home_runs')} color="#CC0000" />
            <StatRow label="Doubles"   value={player.doubles}   max={maxOf('doubles')}   color="#B45309" />
            <StatRow label="Triples"   value={player.triples}   />
            <StatRow label="Slugging"  value={fmt(player.slg, 'decimal')} />
          </div>

          <div className="modal-section">
            <h4>On Base</h4>
            <StatRow label="Walks"   value={player.walks} max={maxOf('walks')} color="#0369A1" />
            <StatRow label="Runs"    value={player.runs}  max={maxOf('runs')}  color="#0369A1" />
            <StatRow label="OBP"     value={fmt(player.obp, 'decimal')} />
            <StatRow label="OPS"     value={fmt(player.ops, 'decimal')} />
          </div>

          <div className="modal-section">
            <h4>Baserunning &amp; Other</h4>
            <StatRow label="Stolen Bases"    value={player.stolen_bases} max={maxOf('stolen_bases')} color="#059669" />
            <StatRow label="Caught Stealing" value={player.caught_stealing} />
            <StatRow label="RBI"             value={player.rbi}        max={maxOf('rbi')}         color="#7C3AED" />
            <StatRow label="Strikeouts"      value={player.strikeouts} />
          </div>
        </div>

        <div className="ai-section">
          {!aiAnalysis && !aiLoading && (
            <>
              <button className="btn-ai" onClick={analyze}>✦ Generate Scouting Report</button>
              {aiError && <div className="ai-error">{aiError}</div>}
            </>
          )}
          {aiLoading && (
            <div className="ai-loading">
              <div className="ai-spinner" />
              Generating scouting report…
            </div>
          )}
          {aiAnalysis && (
            <div className="ai-result">
              <div className="ai-result-header">
                <span>✦ AI Scouting Report</span>
                <button className="ai-regen" onClick={analyze}>Regenerate</button>
              </div>
              <div className="ai-body">
                {aiAnalysis.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <br key={i} />;
                  const bold = t => t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  if (/^\*\*[^*]+\*\*$/.test(trimmed))
                    return <h4 key={i}>{trimmed.replace(/\*\*/g, '')}</h4>;
                  if (/^\d+\.\s+\*\*[^*]+\*\*/.test(trimmed))
                    return <h4 key={i} dangerouslySetInnerHTML={{ __html: bold(trimmed) }} />;
                  if (trimmed.startsWith('- ') || trimmed.startsWith('• '))
                    return <li key={i} dangerouslySetInnerHTML={{ __html: bold(trimmed.slice(2)) }} />;
                  return <p key={i} dangerouslySetInnerHTML={{ __html: bold(trimmed) }} />;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [players,      setPlayers]      = useState([]);
  const [sortCol,      setSortCol]      = useState('name');
  const [sortOrder,    setSortOrder]    = useState('asc');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null);
  const [editingId,    setEditingId]    = useState(null);
  const [editVals,     setEditVals]     = useState({});
  const [importing,    setImporting]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState(null);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/players?sort=${sortCol}&order=${sortOrder}`);
      if (res.ok) setPlayers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [sortCol, sortOrder]);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  function handleSort(col) {
    if (sortCol === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortOrder('asc'); }
  }

  async function importPlayers() {
    setImporting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/players/import`, { method: 'POST' });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setMsg({ type: 'success', text: `Imported ${d.imported} new players (${d.total} total in API).` });
      loadPlayers();
    } catch (e) {
      setMsg({ type: 'error', text: `Import failed: ${e.message}` });
    } finally {
      setImporting(false);
    }
  }

  async function deletePlayer(id) {
    if (!window.confirm('Delete this player?')) return;
    await fetch(`${API}/players/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    loadPlayers();
  }

  function startEdit(player) {
    const vals = { name: player.name, position: player.position };
    STAT_COLS.forEach(c => { vals[c.key] = player[c.key]; });
    setEditVals(vals);
    setEditingId(player.id);
  }

  async function saveEdit(id) {
    await fetch(`${API}/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editVals),
    });
    setEditingId(null);
    loadPlayers();
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="si">⇅</span>;
    return <span className="si active">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  }

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">⚾</span>
          <span className="app-title">Baseball Stats</span>
          {players.length > 0 && <span className="pill">{players.length} players</span>}
        </div>
        <div className="topbar-right">
          <input
            className="search"
            placeholder="Search name or position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-import" onClick={importPlayers} disabled={importing}>
            {importing ? 'Importing…' : '⬇ Import from API'}
          </button>
        </div>
      </header>

      {msg && (
        <div className={`flash flash-${msg.type}`}>
          {msg.text}
          <button onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {players.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-ball">⚾</div>
          <p>No players yet.</p>
          <p>Click <strong>⬇ Import from API</strong> to load 330 players.</p>
        </div>
      )}

      {(players.length > 0 || loading) && (
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-name sticky" onClick={() => handleSort('name')}>
                  Player <SortIcon col="name" />
                </th>
                <th onClick={() => handleSort('position')}>
                  Pos <SortIcon col="position" />
                </th>
                {STAT_COLS.map(c => (
                  <th key={c.key} title={c.title} className={c.rate ? 'rate-col' : ''} onClick={() => handleSort(c.key)}>
                    {c.label} <SortIcon col={c.key} />
                  </th>
                ))}
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const editing = editingId === p.id;
                return (
                  <tr key={p.id} className={editing ? 'row-edit' : ''}>
                    <td className="td-name sticky">
                      {editing ? (
                        <input className="ei ei-name" value={editVals.name || ''} onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))} />
                      ) : (
                        <button className="player-btn" onClick={() => setSelected(p)}>{p.name}</button>
                      )}
                    </td>
                    <td className="td-pos">
                      {editing ? (
                        <input className="ei ei-pos" value={editVals.position || ''} onChange={e => setEditVals(v => ({ ...v, position: e.target.value }))} />
                      ) : (
                        <span className="pos-tag">{p.position}</span>
                      )}
                    </td>
                    {STAT_COLS.map(c => (
                      <td key={c.key} className={c.rate ? 'td-rate' : 'td-stat'}>
                        {editing ? (
                          <input
                            className="ei"
                            type="number"
                            step={c.type === 'decimal' ? '0.001' : '1'}
                            value={editVals[c.key] ?? ''}
                            onChange={e => setEditVals(v => ({ ...v, [c.key]: e.target.value }))}
                          />
                        ) : (
                          fmt(p[c.key], c.type)
                        )}
                      </td>
                    ))}
                    <td className="td-actions">
                      {editing ? (
                        <>
                          <button className="btn-save"   onClick={() => saveEdit(p.id)}>Save</button>
                          <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-edit"   onClick={() => startEdit(p)}>Edit</button>
                          <button className="btn-del"    onClick={() => deletePlayer(p.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && players.length > 0 && (
                <tr><td colSpan={STAT_COLS.length + 3} className="no-match">No players match "{search}"</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <PlayerModal player={selected} allPlayers={players} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
