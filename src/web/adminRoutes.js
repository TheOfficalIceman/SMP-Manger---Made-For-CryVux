import { Router } from 'express';
import { createHmac, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const COMMANDS_FILE = path.join(DATA_DIR, 'custom-commands.json');
const CONFIG_FILE = path.join(DATA_DIR, 'bot-config-overrides.json');

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex');
const sessions = new Map();

function readJSON(file, fallback) {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch { return fallback; }
}

function writeJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function makeToken() {
  return randomBytes(32).toString('hex');
}

function parseToken(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/admin_token=([a-f0-9]+)/);
  return match?.[1] || null;
}

function requireAuth(req, res, next) {
  const token = parseToken(req);
  if (token && sessions.has(token)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

export function setupAdminRoutes(app, client) {
  const router = Router();

  router.get('/login', (req, res) => {
    const token = parseToken(req);
    if (token && sessions.has(token)) return res.redirect('/admin');
    res.send(loginHTML());
  });

  router.post('/api/login', express_json(), (req, res) => {
    const { password } = req.body || {};
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD not set' });
    if (!password || password !== expected) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const token = makeToken();
    sessions.set(token, { createdAt: Date.now() });
    res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.json({ ok: true });
  });

  router.post('/api/logout', (req, res) => {
    const token = parseToken(req);
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'admin_token=; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  router.use(requireAuth);

  router.get('/', (req, res) => res.send(dashboardHTML()));

  router.get('/api/status', (req, res) => {
    const guilds = client.guilds?.cache?.size ?? 0;
    const users = client.guilds?.cache?.reduce((a, g) => a + g.memberCount, 0) ?? 0;
    const dbStatus = client.db?.getStatus?.() ?? {};
    res.json({
      online: client.isReady?.() ?? false,
      uptime: Math.floor(process.uptime()),
      guilds,
      users,
      db: dbStatus.connectionType ?? 'unknown',
      dbDegraded: dbStatus.isDegraded ?? true,
      ping: client.ws?.ping ?? -1,
    });
  });

  router.get('/api/config', (req, res) => {
    res.json(readJSON(CONFIG_FILE, {}));
  });

  router.post('/api/config', express_json(), (req, res) => {
    try {
      const current = readJSON(CONFIG_FILE, {});
      const updated = deepMerge(current, req.body || {});
      writeJSON(CONFIG_FILE, updated);
      logger.info('[Admin Panel] Config overrides saved');
      res.json({ ok: true, config: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/api/commands', (req, res) => {
    res.json(readJSON(COMMANDS_FILE, []));
  });

  router.post('/api/commands', express_json(), (req, res) => {
    try {
      const cmds = readJSON(COMMANDS_FILE, []);
      const { name, response, embedTitle, embedColor, embedDescription, embedFooter, ownerOnly, useEmbed } = req.body || {};
      if (!name || !name.match(/^[a-z0-9_-]+$/i)) return res.status(400).json({ error: 'Invalid command name. Use letters, numbers, _ or -' });
      if (!response && !embedDescription) return res.status(400).json({ error: 'Response or embed description required' });
      const existing = cmds.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
      const cmd = { name: name.toLowerCase(), response: response || '', useEmbed: !!useEmbed, embedTitle: embedTitle || '', embedDescription: embedDescription || '', embedColor: embedColor || '#5865F2', embedFooter: embedFooter || '', ownerOnly: !!ownerOnly, createdAt: existing >= 0 ? cmds[existing].createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (existing >= 0) cmds[existing] = cmd;
      else cmds.push(cmd);
      writeJSON(COMMANDS_FILE, cmds);
      logger.info(`[Admin Panel] Custom command !${name} saved`);
      res.json({ ok: true, command: cmd });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/api/commands/:name', (req, res) => {
    try {
      let cmds = readJSON(COMMANDS_FILE, []);
      const before = cmds.length;
      cmds = cmds.filter(c => c.name.toLowerCase() !== req.params.name.toLowerCase());
      if (cmds.length === before) return res.status(404).json({ error: 'Command not found' });
      writeJSON(COMMANDS_FILE, cmds);
      logger.info(`[Admin Panel] Custom command !${req.params.name} deleted`);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use('/admin', router);
}

function express_json() {
  return (req, res, next) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
      next();
    });
  };
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] || {}, source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

function loginHTML() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMP Manager — Admin Login</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0f13;font-family:'Segoe UI',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#dcddde}
.card{background:#1e2124;border:1px solid #2f3136;border-radius:16px;padding:48px 40px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.logo{text-align:center;margin-bottom:32px}
.logo h1{font-size:24px;font-weight:700;color:#fff;letter-spacing:-.5px}
.logo p{font-size:13px;color:#72767d;margin-top:4px}
.logo svg{width:48px;height:48px;margin-bottom:12px}
label{display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#b9bbbe;margin-bottom:6px}
input{width:100%;background:#2f3136;border:1px solid #40444b;border-radius:8px;padding:12px 16px;color:#dcddde;font-size:15px;outline:none;transition:border .2s}
input:focus{border-color:#5865f2}
.btn{width:100%;background:#5865f2;color:#fff;border:none;border-radius:8px;padding:13px;font-size:15px;font-weight:600;cursor:pointer;margin-top:20px;transition:background .2s;letter-spacing:.3px}
.btn:hover{background:#4752c4}
.error{background:#ed424520;border:1px solid #ed4245;border-radius:8px;padding:10px 14px;font-size:13px;color:#ed4245;margin-top:14px;display:none}
.field{margin-bottom:18px}
</style></head><body>
<div class="card">
  <div class="logo">
    <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#5865F2"/><path d="M14 30l6-12 4 8 4-6 6 10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="16" r="3" fill="#57F287"/></svg>
    <h1>SMP Manager</h1>
    <p>Admin Panel — Owner Access Only</p>
  </div>
  <div class="field">
    <label>Admin Password</label>
    <input type="password" id="pwd" placeholder="Enter your password" onkeydown="if(event.key==='Enter')login()">
  </div>
  <button class="btn" onclick="login()">Sign In</button>
  <div class="error" id="err"></div>
</div>
<script>
async function login(){
  const pwd=document.getElementById('pwd').value;
  const err=document.getElementById('err');
  err.style.display='none';
  const r=await fetch('/admin/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})});
  if(r.ok){location.href='/admin';}else{const d=await r.json();err.textContent=d.error||'Login failed';err.style.display='block';}
}
</script></body></html>`;
}

function dashboardHTML() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMP Manager — Admin Panel</title><style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0d0f13;--sidebar:#1a1d23;--card:#1e2124;--border:#2f3136;--input:#2a2d31;--text:#dcddde;--muted:#72767d;--accent:#5865f2;--green:#57f287;--red:#ed4245;--yellow:#fee75c}
body{background:var(--bg);font-family:'Segoe UI',system-ui,sans-serif;color:var(--text);display:flex;height:100vh;overflow:hidden}
/* Sidebar */
.sidebar{width:240px;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.sidebar-logo{padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
.sidebar-logo svg{width:36px;height:36px;flex-shrink:0}
.sidebar-logo .title{font-weight:700;font-size:15px;color:#fff;line-height:1.2}
.sidebar-logo .sub{font-size:11px;color:var(--muted)}
.nav{flex:1;padding:12px 8px;overflow-y:auto}
.nav-group{margin-bottom:20px}
.nav-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);padding:0 8px;margin-bottom:4px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;font-size:14px;color:#b9bbbe;transition:all .15s;margin-bottom:2px}
.nav-item:hover{background:rgba(88,101,242,.15);color:#dcddde}
.nav-item.active{background:rgba(88,101,242,.25);color:#fff;font-weight:600}
.nav-item svg{width:18px;height:18px;flex-shrink:0;opacity:.8}
.nav-item.active svg{opacity:1}
.sidebar-footer{padding:14px;border-top:1px solid var(--border)}
.bot-status{display:flex;align-items:center;gap:8px;font-size:13px}
.status-dot{width:10px;height:10px;border-radius:50%;background:var(--muted);flex-shrink:0}
.status-dot.online{background:var(--green)}
.status-dot.offline{background:var(--red)}
/* Main */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{padding:0 28px;height:60px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.topbar h2{font-size:17px;font-weight:700;color:#fff}
.topbar-actions{display:flex;align-items:center;gap:10px}
.btn-sm{padding:7px 14px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#4752c4}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--text)}
.btn-danger{background:var(--red);color:#fff}
.btn-danger:hover{background:#c73537}
.content{flex:1;overflow-y:auto;padding:28px}
/* Panels */
.panel{display:none}
.panel.active{display:block}
/* Cards */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px}
.card-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px}
.card-desc{font-size:13px;color:var(--muted);margin-bottom:20px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px}
.stat{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px}
.stat-val{font-size:28px;font-weight:700;color:#fff}
.stat-label{font-size:12px;color:var(--muted);margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
/* Forms */
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.form-row.full{grid-template-columns:1fr}
.field{margin-bottom:16px}
.field label,.field-label{display:block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:#b9bbbe;margin-bottom:6px}
.field input,.field select,.field textarea{width:100%;background:var(--input);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-size:14px;outline:none;transition:border .2s;font-family:inherit}
.field input:focus,.field select,.field textarea:focus{border-color:var(--accent)}
.field textarea{resize:vertical;min-height:80px}
.field select option{background:#2f3136}
.field input[type=color]{height:40px;padding:4px 8px;cursor:pointer}
.hint{font-size:12px;color:var(--muted);margin-top:5px}
/* Toggle */
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)}
.toggle-row:last-child{border:none}
.toggle-info{flex:1}
.toggle-info .tname{font-size:14px;font-weight:600;color:var(--text)}
.toggle-info .tdesc{font-size:12px;color:var(--muted);margin-top:2px}
.toggle{position:relative;width:44px;height:24px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0;position:absolute}
.toggle-slider{position:absolute;inset:0;background:#40444b;border-radius:12px;cursor:pointer;transition:.2s}
.toggle-slider:before{content:'';position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
.toggle input:checked+.toggle-slider{background:var(--accent)}
.toggle input:checked+.toggle-slider:before{transform:translateX(20px)}
/* Command list */
.cmd-list{display:flex;flex-direction:column;gap:10px}
.cmd-item{background:var(--input);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:14px}
.cmd-name{font-size:14px;font-weight:700;color:var(--accent);font-family:monospace;min-width:120px}
.cmd-preview{flex:1;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase}
.badge-owner{background:rgba(237,66,69,.2);color:var(--red)}
.badge-public{background:rgba(87,242,135,.15);color:var(--green)}
.badge-embed{background:rgba(88,101,242,.2);color:#a5b4fc}
/* Command builder */
.builder{background:var(--input);border:1px solid var(--border);border-radius:12px;padding:20px}
.preview-box{background:#36393f;border-radius:8px;padding:16px;margin-top:12px;min-height:60px}
.preview-embed{border-left:4px solid var(--accent);padding-left:12px}
.preview-embed .pe-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
.preview-embed .pe-desc{font-size:13px;color:#dcddde}
.preview-embed .pe-footer{font-size:11px;color:var(--muted);margin-top:8px}
/* Toast */
.toast-wrap{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999}
.toast{background:#1e2124;border:1px solid var(--border);border-radius:10px;padding:12px 18px;font-size:14px;display:flex;align-items:center;gap:10px;animation:slidein .25s ease;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:240px}
.toast.ok{border-color:var(--green)}.toast.ok svg{color:var(--green)}
.toast.err{border-color:var(--red)}.toast.err svg{color:var(--red)}
@keyframes slidein{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}
/* Tabs */
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:24px;overflow-x:auto}
.tab{padding:10px 16px;font-size:14px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s}
.tab:hover{color:var(--text)}
.tab.active{color:#fff;border-color:var(--accent);font-weight:600}
.tab-panel{display:none}.tab-panel.active{display:block}
/* Save bar */
.save-bar{position:sticky;bottom:0;background:linear-gradient(transparent,var(--bg) 40%);padding:16px 0 0;display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
/* Responsive */
@media(max-width:768px){.sidebar{width:64px}.sidebar-logo .title,.sidebar-logo .sub,.nav-item span,.nav-label{display:none}.sidebar-logo{justify-content:center;padding:16px 8px}.nav-item{justify-content:center}.content{padding:16px}}
</style></head><body>
<aside class="sidebar">
  <div class="sidebar-logo">
    <svg viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="9" fill="#5865F2"/><path d="M10 23l4.5-9 3 6 3-4.5L25 23" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="11" r="2.5" fill="#57F287"/></svg>
    <div><div class="title">SMP Manager</div><div class="sub">Admin Panel</div></div>
  </div>
  <nav class="nav">
    <div class="nav-group">
      <div class="nav-label">Overview</div>
      <div class="nav-item active" onclick="showPanel('overview')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 000 2h.01a1 1 0 000-2H3zm3.5 0a1 1 0 000 2h7a1 1 0 000-2h-7zM3 9a1 1 0 000 2h.01a1 1 0 000-2H3zm3.5 0a1 1 0 000 2h7a1 1 0 000-2h-7zM3 14a1 1 0 000 2h.01a1 1 0 000-2H3zm3.5 0a1 1 0 000 2h7a1 1 0 000-2h-7z"/></svg>
        <span>Dashboard</span>
      </div>
    </div>
    <div class="nav-group">
      <div class="nav-label">Bot Config</div>
      <div class="nav-item" onclick="showPanel('presence')">
        <svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="7" r="4"/><path d="M2 17a8 8 0 0116 0H2z"/></svg>
        <span>Presence & Identity</span>
      </div>
      <div class="nav-item" onclick="showPanel('colors')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/><path d="M10 6a4 4 0 100 8 4 4 0 000-8z"/></svg>
        <span>Embed Colors</span>
      </div>
      <div class="nav-item" onclick="showPanel('economy')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V7h2v2z"/></svg>
        <span>Economy</span>
      </div>
      <div class="nav-item" onclick="showPanel('welcome')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
        <span>Welcome & Goodbye</span>
      </div>
      <div class="nav-item" onclick="showPanel('misc')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
        <span>Misc Settings</span>
      </div>
    </div>
    <div class="nav-group">
      <div class="nav-label">Commands</div>
      <div class="nav-item" onclick="showPanel('commands')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        <span>Custom Commands</span>
      </div>
    </div>
  </nav>
  <div class="sidebar-footer">
    <div class="bot-status"><div class="status-dot" id="sdot"></div><span id="stext" style="font-size:13px;color:var(--muted)">Checking...</span></div>
  </div>
</aside>

<div class="main">
  <div class="topbar">
    <h2 id="panel-title">Dashboard</h2>
    <div class="topbar-actions">
      <span style="font-size:13px;color:var(--muted)" id="owner-label">Owner: @cryvux</span>
      <button class="btn-sm btn-ghost" onclick="logout()">Sign Out</button>
    </div>
  </div>

  <div class="content">

    <!-- OVERVIEW -->
    <div class="panel active" id="panel-overview">
      <div class="stats-grid" id="stats-grid">
        <div class="stat"><div class="stat-val" id="s-online">...</div><div class="stat-label">Status</div></div>
        <div class="stat"><div class="stat-val" id="s-guilds">...</div><div class="stat-label">Servers</div></div>
        <div class="stat"><div class="stat-val" id="s-users">...</div><div class="stat-label">Total Members</div></div>
        <div class="stat"><div class="stat-val" id="s-uptime">...</div><div class="stat-label">Uptime</div></div>
        <div class="stat"><div class="stat-val" id="s-ping">...</div><div class="stat-label">Ping (ms)</div></div>
        <div class="stat"><div class="stat-val" id="s-db">...</div><div class="stat-label">Database</div></div>
      </div>
      <div class="card">
        <div class="card-title">Quick Info</div>
        <div class="card-desc">SMP Manager Admin Panel — All changes are saved directly to config files and take effect immediately for new commands.</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.8">
          <div>• Use the <b style="color:var(--text)">Config sections</b> on the left to customise bot settings</div>
          <div>• Use <b style="color:var(--text)">Custom Commands</b> to build your own <code style="background:var(--input);padding:1px 6px;border-radius:4px;color:var(--accent)">!</code> prefix commands</div>
          <div>• Only <b style="color:var(--accent)">@cryvux</b> has access to this panel</div>
        </div>
      </div>
    </div>

    <!-- PRESENCE -->
    <div class="panel" id="panel-presence">
      <div class="card">
        <div class="card-title">Bot Presence & Identity</div>
        <div class="card-desc">Change what status and activity Discord shows under the bot name.</div>
        <div class="tabs"><div class="tab active" onclick="switchTab(this,'presence','status-tab')">Online Status</div><div class="tab" onclick="switchTab(this,'presence','activity-tab')">Activity</div></div>
        <div class="tab-panel active" id="presence-status-tab">
          <div class="field">
            <label>Online Status</label>
            <select id="p-status">
              <option value="online">🟢 Online</option>
              <option value="idle">🟡 Idle</option>
              <option value="dnd">🔴 Do Not Disturb</option>
              <option value="invisible">⚫ Invisible (appears offline)</option>
            </select>
          </div>
        </div>
        <div class="tab-panel" id="presence-activity-tab">
          <div class="form-row">
            <div class="field"><label>Activity Type</label>
              <select id="p-atype">
                <option value="0">🎮 Playing</option>
                <option value="1">📺 Streaming</option>
                <option value="2">🎵 Listening to</option>
                <option value="3">👁️ Watching</option>
                <option value="5">🏆 Competing in</option>
              </select>
            </div>
            <div class="field"><label>Activity Text</label><input id="p-aname" placeholder="e.g. your SMP"></div>
          </div>
        </div>
        <div class="save-bar"><button class="btn-sm btn-primary" onclick="savePresence()">Save Presence</button></div>
      </div>
    </div>

    <!-- COLORS -->
    <div class="panel" id="panel-colors">
      <div class="card">
        <div class="card-title">Embed Colors</div>
        <div class="card-desc">Colors used in all bot embed messages.</div>
        <div class="form-row">
          <div class="field"><label>Primary</label><input type="color" id="c-primary" value="#336699"></div>
          <div class="field"><label>Success</label><input type="color" id="c-success" value="#57F287"></div>
          <div class="field"><label>Error</label><input type="color" id="c-error" value="#ED4245"></div>
          <div class="field"><label>Warning</label><input type="color" id="c-warning" value="#FEE75C"></div>
          <div class="field"><label>Info</label><input type="color" id="c-info" value="#3498DB"></div>
          <div class="field"><label>Economy</label><input type="color" id="c-economy" value="#F1C40F"></div>
          <div class="field"><label>Moderation</label><input type="color" id="c-moderation" value="#9B59B6"></div>
          <div class="field"><label>Birthday</label><input type="color" id="c-birthday" value="#E91E63"></div>
        </div>
        <div class="field full">
          <label>Embed Footer Text</label>
          <input id="c-footer" placeholder="SMP Manager">
          <div class="hint">Shown at the bottom of all bot embeds</div>
        </div>
        <div class="save-bar"><button class="btn-sm btn-primary" onclick="saveColors()">Save Colors</button></div>
      </div>
    </div>

    <!-- ECONOMY -->
    <div class="panel" id="panel-economy">
      <div class="card">
        <div class="card-title">Economy Settings</div>
        <div class="card-desc">Configure the in-server economy system.</div>
        <div class="form-row">
          <div class="field"><label>Currency Name (singular)</label><input id="e-name" placeholder="coins"></div>
          <div class="field"><label>Currency Name (plural)</label><input id="e-plural" placeholder="coins"></div>
          <div class="field"><label>Currency Symbol</label><input id="e-symbol" placeholder="$" maxlength="4"></div>
          <div class="field"><label>Starting Balance</label><input id="e-start" type="number" placeholder="0"></div>
          <div class="field"><label>Daily Reward Amount</label><input id="e-daily" type="number" placeholder="100"></div>
          <div class="field"><label>Work Min Payout</label><input id="e-wmin" type="number" placeholder="10"></div>
          <div class="field"><label>Work Max Payout</label><input id="e-wmax" type="number" placeholder="100"></div>
          <div class="field"><label>Beg Min Payout</label><input id="e-bmin" type="number" placeholder="5"></div>
          <div class="field"><label>Beg Max Payout</label><input id="e-bmax" type="number" placeholder="50"></div>
          <div class="field"><label>Rob Success Rate (0–1)</label><input id="e-rob" type="number" step="0.01" placeholder="0.4"></div>
        </div>
        <div class="save-bar"><button class="btn-sm btn-primary" onclick="saveEconomy()">Save Economy</button></div>
      </div>
    </div>

    <!-- WELCOME -->
    <div class="panel" id="panel-welcome">
      <div class="card">
        <div class="card-title">Welcome & Goodbye Messages</div>
        <div class="card-desc">Placeholders: <code style="background:var(--input);padding:1px 5px;border-radius:4px;font-size:12px">{user}</code> <code style="background:var(--input);padding:1px 5px;border-radius:4px;font-size:12px">{server}</code> <code style="background:var(--input);padding:1px 5px;border-radius:4px;font-size:12px">{memberCount}</code></div>
        <div class="field full"><label>Welcome Message</label><textarea id="w-welcome" rows="3" placeholder="Welcome {user} to {server}! We now have {memberCount} members!"></textarea></div>
        <div class="field full"><label>Goodbye Message</label><textarea id="w-goodbye" rows="3" placeholder="{user} has left. We now have {memberCount} members."></textarea></div>
        <div class="save-bar"><button class="btn-sm btn-primary" onclick="saveWelcome()">Save Messages</button></div>
      </div>
    </div>

    <!-- MISC -->
    <div class="panel" id="panel-misc">
      <div class="card">
        <div class="card-title">Misc Settings</div>
        <div class="card-desc">General bot configuration options.</div>
        <div class="form-row">
          <div class="field"><label>Command Prefix</label><input id="m-prefix" placeholder="!" maxlength="5"></div>
          <div class="field"><label>Default Cooldown (seconds)</label><input id="m-cooldown" type="number" placeholder="3"></div>
        </div>
        <div class="save-bar"><button class="btn-sm btn-primary" onclick="saveMisc()">Save Settings</button></div>
      </div>
    </div>

    <!-- COMMANDS -->
    <div class="panel" id="panel-commands">
      <div class="card">
        <div class="card-title">Command Builder</div>
        <div class="card-desc">Create custom prefix commands. They go live instantly — no restart needed.</div>
        <div class="builder">
          <div class="form-row">
            <div class="field">
              <label>Command Name</label>
              <div style="display:flex;align-items:center;gap:0">
                <span style="background:#1a1d23;border:1px solid var(--border);border-right:none;border-radius:8px 0 0 8px;padding:10px 12px;font-size:14px;color:var(--accent);font-weight:700">!</span>
                <input id="b-name" placeholder="mycommand" style="border-radius:0 8px 8px 0!important;flex:1" oninput="updatePreview()">
              </div>
              <div class="hint">Only letters, numbers, _ and -</div>
            </div>
            <div class="field">
              <label>Response Type</label>
              <select id="b-type" onchange="updatePreview();toggleEmbedFields()">
                <option value="text">💬 Plain Text</option>
                <option value="embed">🪄 Rich Embed</option>
              </select>
            </div>
          </div>
          <div id="text-fields">
            <div class="field full"><label>Response Message</label><textarea id="b-response" rows="3" placeholder="Your response here... Use {user} for mention, {server} for server name" oninput="updatePreview()"></textarea></div>
          </div>
          <div id="embed-fields" style="display:none">
            <div class="form-row">
              <div class="field"><label>Embed Title</label><input id="b-etitle" placeholder="My Command" oninput="updatePreview()"></div>
              <div class="field"><label>Embed Color</label><input type="color" id="b-ecolor" value="#5865F2" oninput="updatePreview()"></div>
            </div>
            <div class="field full"><label>Embed Description</label><textarea id="b-edesc" rows="3" placeholder="Description text here... Use {user}, {server}" oninput="updatePreview()"></textarea></div>
            <div class="field full"><label>Embed Footer (optional)</label><input id="b-efooter" placeholder="SMP Manager" oninput="updatePreview()"></div>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="tname">Owner Only</div>
              <div class="tdesc">Only @cryvux can use this command</div>
            </div>
            <label class="toggle"><input type="checkbox" id="b-owner"><span class="toggle-slider"></span></label>
          </div>
          <div style="margin-top:16px">
            <div class="field-label">Live Preview</div>
            <div class="preview-box" id="preview-box">
              <span style="color:var(--muted);font-size:13px">Fill in the form to see a preview...</span>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:14px;gap:8px">
            <button class="btn-sm btn-ghost" onclick="clearBuilder()">Clear</button>
            <button class="btn-sm btn-primary" onclick="saveCommand()">💾 Save Command</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Your Custom Commands</div>
        <div class="card-desc">Click a command to edit it.</div>
        <div class="cmd-list" id="cmd-list"><div style="color:var(--muted);font-size:13px">Loading commands...</div></div>
      </div>
    </div>

  </div><!-- end content -->
</div><!-- end main -->

<div class="toast-wrap" id="toasts"></div>

<script>
let currentCfg = {};

// Navigation
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  event.currentTarget.classList.add('active');
  const titles = {overview:'Dashboard',presence:'Presence & Identity',colors:'Embed Colors',economy:'Economy Settings',welcome:'Welcome & Goodbye',misc:'Misc Settings',commands:'Custom Commands'};
  document.getElementById('panel-title').textContent = titles[id] || id;
  if(id === 'commands') loadCommands();
}

function switchTab(el, group, id) {
  el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#panel-' + group + ' .tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(group + '-' + id).classList.add('active');
}

// Toast
function toast(msg, ok=true) {
  const w = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + (ok ? 'ok' : 'err');
  t.innerHTML = \`<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">\${ok ? '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>' : '<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>'}</svg>\${msg}\`;
  w.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// API helpers
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/admin/api' + path, opts);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

// Status polling
async function pollStatus() {
  try {
    const d = await api('GET', '/status');
    document.getElementById('s-online').textContent = d.online ? '🟢 Online' : '🔴 Offline';
    document.getElementById('s-guilds').textContent = d.guilds;
    document.getElementById('s-users').textContent = d.users.toLocaleString();
    document.getElementById('s-uptime').textContent = fmtUptime(d.uptime);
    document.getElementById('s-ping').textContent = d.ping >= 0 ? d.ping + 'ms' : 'N/A';
    document.getElementById('s-db').textContent = d.db === 'postgresql' ? '🟢 PG' : '🟡 Memory';
    const dot = document.getElementById('sdot');
    dot.className = 'status-dot ' + (d.online ? 'online' : 'offline');
    document.getElementById('stext').textContent = d.online ? 'Bot Online' : 'Bot Offline';
  } catch { }
}

function fmtUptime(s) {
  if(s < 60) return s + 's';
  if(s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  return h + 'h ' + m + 'm';
}

// Load config
async function loadConfig() {
  try {
    currentCfg = await api('GET', '/config');
    const c = currentCfg;
    if(c.presence) {
      if(c.presence.status) document.getElementById('p-status').value = c.presence.status;
      if(c.presence.activities?.[0]) {
        document.getElementById('p-atype').value = c.presence.activities[0].type ?? 3;
        document.getElementById('p-aname').value = c.presence.activities[0].name || '';
      }
    }
    if(c.embeds?.colors) {
      const ec = c.embeds.colors;
      ['primary','success','error','warning','info','economy','moderation','birthday'].forEach(k => {
        if(ec[k]) document.getElementById('c-' + k).value = ec[k];
      });
    }
    if(c.embeds?.footer?.text) document.getElementById('c-footer').value = c.embeds.footer.text;
    if(c.economy) {
      const e = c.economy;
      if(e.currency?.name) document.getElementById('e-name').value = e.currency.name;
      if(e.currency?.namePlural) document.getElementById('e-plural').value = e.currency.namePlural;
      if(e.currency?.symbol) document.getElementById('e-symbol').value = e.currency.symbol;
      if(e.startingBalance !== undefined) document.getElementById('e-start').value = e.startingBalance;
      if(e.dailyAmount !== undefined) document.getElementById('e-daily').value = e.dailyAmount;
      if(e.workMin !== undefined) document.getElementById('e-wmin').value = e.workMin;
      if(e.workMax !== undefined) document.getElementById('e-wmax').value = e.workMax;
      if(e.begMin !== undefined) document.getElementById('e-bmin').value = e.begMin;
      if(e.begMax !== undefined) document.getElementById('e-bmax').value = e.begMax;
      if(e.robSuccessRate !== undefined) document.getElementById('e-rob').value = e.robSuccessRate;
    }
    if(c.welcome) {
      if(c.welcome.defaultWelcomeMessage) document.getElementById('w-welcome').value = c.welcome.defaultWelcomeMessage;
      if(c.welcome.defaultGoodbyeMessage) document.getElementById('w-goodbye').value = c.welcome.defaultGoodbyeMessage;
    }
    if(c.prefix) document.getElementById('m-prefix').value = c.prefix;
    if(c.commands?.defaultCooldown !== undefined) document.getElementById('m-cooldown').value = c.commands.defaultCooldown;
  } catch(e) { console.warn('Config load error', e); }
}

// Save functions
async function savePresence() {
  try {
    await api('POST', '/config', {
      presence: {
        status: document.getElementById('p-status').value,
        activities: [{ name: document.getElementById('p-aname').value, type: parseInt(document.getElementById('p-atype').value) }]
      }
    });
    toast('Presence saved!');
  } catch(e) { toast(e.message, false); }
}

async function saveColors() {
  try {
    const colors = {};
    ['primary','success','error','warning','info','economy','moderation','birthday'].forEach(k => {
      colors[k] = document.getElementById('c-' + k).value;
    });
    await api('POST', '/config', { embeds: { colors, footer: { text: document.getElementById('c-footer').value } } });
    toast('Colors saved!');
  } catch(e) { toast(e.message, false); }
}

async function saveEconomy() {
  try {
    await api('POST', '/config', { economy: {
      currency: { name: document.getElementById('e-name').value, namePlural: document.getElementById('e-plural').value, symbol: document.getElementById('e-symbol').value },
      startingBalance: Number(document.getElementById('e-start').value),
      dailyAmount: Number(document.getElementById('e-daily').value),
      workMin: Number(document.getElementById('e-wmin').value), workMax: Number(document.getElementById('e-wmax').value),
      begMin: Number(document.getElementById('e-bmin').value), begMax: Number(document.getElementById('e-bmax').value),
      robSuccessRate: Number(document.getElementById('e-rob').value)
    }});
    toast('Economy saved!');
  } catch(e) { toast(e.message, false); }
}

async function saveWelcome() {
  try {
    await api('POST', '/config', { welcome: { defaultWelcomeMessage: document.getElementById('w-welcome').value, defaultGoodbyeMessage: document.getElementById('w-goodbye').value } });
    toast('Welcome messages saved!');
  } catch(e) { toast(e.message, false); }
}

async function saveMisc() {
  try {
    await api('POST', '/config', { prefix: document.getElementById('m-prefix').value, commands: { defaultCooldown: Number(document.getElementById('m-cooldown').value) } });
    toast('Settings saved!');
  } catch(e) { toast(e.message, false); }
}

// Command builder
function toggleEmbedFields() {
  const isEmbed = document.getElementById('b-type').value === 'embed';
  document.getElementById('text-fields').style.display = isEmbed ? 'none' : 'block';
  document.getElementById('embed-fields').style.display = isEmbed ? 'block' : 'none';
}

function updatePreview() {
  const box = document.getElementById('preview-box');
  const name = document.getElementById('b-name').value;
  const isEmbed = document.getElementById('b-type').value === 'embed';
  if(!name && !document.getElementById('b-response').value && !document.getElementById('b-edesc').value) {
    box.innerHTML = '<span style="color:var(--muted);font-size:13px">Fill in the form to see a preview...</span>';
    return;
  }
  if(isEmbed) {
    const title = document.getElementById('b-etitle').value || '(no title)';
    const desc = document.getElementById('b-edesc').value || '(no description)';
    const color = document.getElementById('b-ecolor').value;
    const footer = document.getElementById('b-efooter').value;
    box.innerHTML = \`<div style="margin-bottom:6px;font-size:12px;color:var(--muted)">!<b style="color:var(--accent)">\${name||'command'}</b></div><div class="preview-embed" style="border-color:\${color}"><div class="pe-title">\${title}</div><div class="pe-desc">\${desc.replace(/\\n/g,'<br>')}</div>\${footer ? '<div class="pe-footer">'+footer+'</div>' : ''}</div>\`;
  } else {
    const resp = document.getElementById('b-response').value || '(no response)';
    box.innerHTML = \`<div style="margin-bottom:6px;font-size:12px;color:var(--muted)">!<b style="color:var(--accent)">\${name||'command'}</b></div><div style="font-size:14px">\${resp.replace(/\\n/g,'<br>')}</div>\`;
  }
}

async function saveCommand() {
  try {
    const isEmbed = document.getElementById('b-type').value === 'embed';
    const body = {
      name: document.getElementById('b-name').value,
      response: document.getElementById('b-response').value,
      useEmbed: isEmbed,
      embedTitle: document.getElementById('b-etitle').value,
      embedColor: document.getElementById('b-ecolor').value,
      embedDescription: document.getElementById('b-edesc').value,
      embedFooter: document.getElementById('b-efooter').value,
      ownerOnly: document.getElementById('b-owner').checked,
    };
    await api('POST', '/commands', body);
    toast('Command !' + body.name + ' saved!');
    loadCommands();
    clearBuilder();
  } catch(e) { toast(e.message, false); }
}

function clearBuilder() {
  ['b-name','b-response','b-etitle','b-edesc','b-efooter'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('b-type').value = 'text';
  document.getElementById('b-ecolor').value = '#5865F2';
  document.getElementById('b-owner').checked = false;
  toggleEmbedFields();
  updatePreview();
}

function editCommand(cmd) {
  document.getElementById('b-name').value = cmd.name;
  document.getElementById('b-type').value = cmd.useEmbed ? 'embed' : 'text';
  document.getElementById('b-response').value = cmd.response || '';
  document.getElementById('b-etitle').value = cmd.embedTitle || '';
  document.getElementById('b-ecolor').value = cmd.embedColor || '#5865F2';
  document.getElementById('b-edesc').value = cmd.embedDescription || '';
  document.getElementById('b-efooter').value = cmd.embedFooter || '';
  document.getElementById('b-owner').checked = !!cmd.ownerOnly;
  toggleEmbedFields();
  updatePreview();
  document.querySelector('.builder').scrollIntoView({behavior:'smooth'});
}

async function deleteCommand(name, e) {
  e.stopPropagation();
  if(!confirm('Delete command !' + name + '?')) return;
  try {
    await api('DELETE', '/commands/' + name);
    toast('Command !' + name + ' deleted');
    loadCommands();
  } catch(err) { toast(err.message, false); }
}

async function loadCommands() {
  const list = document.getElementById('cmd-list');
  try {
    const cmds = await api('GET', '/commands');
    if(!cmds.length) { list.innerHTML = '<div style="color:var(--muted);font-size:13px">No custom commands yet. Use the builder above to create one!</div>'; return; }
    list.innerHTML = cmds.map(c => \`<div class="cmd-item" onclick='editCommand(\${JSON.stringify(c)})' style="cursor:pointer">
      <div class="cmd-name">!\${c.name}</div>
      <div class="cmd-preview">\${c.useEmbed ? '📋 Embed: '+(c.embedTitle||c.embedDescription) : c.response}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        \${c.useEmbed ? '<span class="badge badge-embed">EMBED</span>' : ''}
        \${c.ownerOnly ? '<span class="badge badge-owner">OWNER</span>' : '<span class="badge badge-public">PUBLIC</span>'}
        <button class="btn-sm btn-danger" style="padding:4px 10px" onclick="deleteCommand('\${c.name}',event)">✕</button>
      </div>
    </div>\`).join('');
  } catch(e) { list.innerHTML = '<div style="color:var(--red);font-size:13px">Failed to load commands: '+e.message+'</div>'; }
}

async function logout() {
  await api('POST', '/logout');
  location.href = '/admin/login';
}

// Init
loadConfig();
pollStatus();
setInterval(pollStatus, 15000);
</script></body></html>`;
}
