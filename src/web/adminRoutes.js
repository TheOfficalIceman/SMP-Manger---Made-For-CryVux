import { Router } from 'express';
import { createReadStream, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const PUBLIC_DIR = path.join(__dirname, '../../public/admin');
const COMMANDS_FILE = path.join(DATA_DIR, 'custom-commands.json');
const CONFIG_FILE = path.join(DATA_DIR, 'bot-config-overrides.json');
const MODULES_FILE = path.join(DATA_DIR, 'modules-state.json');
const MUSIC_CONFIG_FILE = path.join(DATA_DIR, 'music-config.json');

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex');
const sessions = new Map();

/* ─── MIME types ─────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
};

/* ─── File helpers ─────────────────────── */
function readJSON(file, fallback) {
  try { if (!existsSync(file)) return fallback; return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) { writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }

function serveFile(res, filePath) {
  if (!existsSync(filePath)) { res.status(404).send('Not found'); return; }
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'no-cache');
  createReadStream(filePath).pipe(res);
}

/* ─── Session helpers ─────────────────────── */
function makeToken() { return randomBytes(32).toString('hex'); }

function parseToken(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/admin_token=([a-f0-9]{64})/);
  return match?.[1] || null;
}

function requireAuth(req, res, next) {
  const token = parseToken(req);
  if (token && sessions.has(token)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

function requireUnlimited(req, res, next) {
  const token = parseToken(req);
  const sess = token && sessions.get(token);
  if (!sess?.unlimited) return res.status(403).json({ error: 'Unlimited mode required.' });
  next();
}

/* ─── Body parser ─────────────────────── */
function parseBody() {
  return (req, res, next) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
      next();
    });
  };
}

/* ─── Deep merge ─────────────────────── */
function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] || {}, source[k]);
    } else { out[k] = source[k]; }
  }
  return out;
}

/* ─── Main export ─────────────────────── */
export function setupAdminRoutes(app, client) {
  const router = Router();

  /* ── Discord Activity & CORS headers ── */
  router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://discord.com https://*.discord.com https://discordapp.com");
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  /* ── Static files ── */
  router.get('/css/:file', (req, res) => serveFile(res, path.join(PUBLIC_DIR, 'css', path.basename(req.params.file))));
  router.get('/js/:file', (req, res) => serveFile(res, path.join(PUBLIC_DIR, 'js', path.basename(req.params.file))));
  router.get('/assets/:file', (req, res) => serveFile(res, path.join(PUBLIC_DIR, 'assets', path.basename(req.params.file))));

  /* ── Login page ── */
  router.get('/login', (req, res) => {
    const token = parseToken(req);
    if (token && sessions.has(token)) return res.redirect('/admin');
    serveFile(res, path.join(PUBLIC_DIR, 'login.html'));
  });

  /* ── Discord Activity verification ── */
  router.get('/.well-known/discord', (req, res) => {
    res.json({ type: 1 });
  });

  /* ── Login API ── */
  router.post('/api/login', parseBody(), async (req, res) => {
    const { password } = req.body || {};
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD not set in environment' });
    if (!password || password !== expected) return res.status(401).json({ error: 'Invalid password' });

    const token = makeToken();
    sessions.set(token, { createdAt: Date.now(), unlimited: true });

    const cutoff = Date.now() - 86400000;
    for (const [t, s] of sessions) { if (s.createdAt < cutoff) sessions.delete(t); }

    res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.json({ ok: true, unlimited: true });
  });

  /* ── Logout API ── */
  router.post('/api/logout', (req, res) => {
    const token = parseToken(req);
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'admin_token=; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  /* ── All routes below require auth ── */
  router.use(requireAuth);

  /* ── Dashboard (root) ── */
  router.get('/', (req, res) => serveFile(res, path.join(PUBLIC_DIR, 'index.html')));

  /* ── Session info ── */
  router.get('/api/session', (req, res) => {
    const token = parseToken(req);
    const sess = token && sessions.get(token);
    res.json({ unlimited: !!sess?.unlimited });
  });

  /* ── Bot status ── */
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

  /* ── Config ── */
  router.get('/api/config', (req, res) => res.json(readJSON(CONFIG_FILE, {})));

  router.post('/api/config', parseBody(), (req, res) => {
    try {
      const current = readJSON(CONFIG_FILE, {});
      const updated = deepMerge(current, req.body || {});
      writeJSON(CONFIG_FILE, updated);
      logger.info('[Admin] Config overrides saved');
      res.json({ ok: true, config: updated });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Modules ── */
  router.get('/api/modules', (req, res) => {
    res.json({ modules: readJSON(MODULES_FILE, {}) });
  });

  router.post('/api/modules', parseBody(), (req, res) => {
    try {
      const current = readJSON(MODULES_FILE, {});
      const updated = { ...current, ...(req.body?.modules || {}) };
      writeJSON(MODULES_FILE, updated);
      logger.info('[Admin] Modules state updated');
      res.json({ ok: true, modules: updated });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Music config ── */
  router.get('/api/music-config', (req, res) => {
    res.json({ music: readJSON(MUSIC_CONFIG_FILE, {}) });
  });

  router.post('/api/music-config', parseBody(), (req, res) => {
    try {
      const current = readJSON(MUSIC_CONFIG_FILE, {});
      const updated = { ...current, ...(req.body?.music || {}) };
      writeJSON(MUSIC_CONFIG_FILE, updated);
      logger.info('[Admin] Music config saved');
      res.json({ ok: true, music: updated });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Custom commands ── */
  router.get('/api/commands', (req, res) => res.json(readJSON(COMMANDS_FILE, [])));

  router.post('/api/commands', parseBody(), (req, res) => {
    try {
      const cmds = readJSON(COMMANDS_FILE, []);
      const { name, response, embedTitle, embedColor, embedDescription, embedFooter, ownerOnly, useEmbed } = req.body || {};
      if (!name || !name.match(/^[a-z0-9_-]+$/i)) return res.status(400).json({ error: 'Invalid command name. Use letters, numbers, _ or -' });
      if (!response && !embedDescription) return res.status(400).json({ error: 'Response or embed description required' });
      const existing = cmds.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
      const cmd = {
        name: name.toLowerCase(), response: response || '', useEmbed: !!useEmbed,
        embedTitle: embedTitle || '', embedDescription: embedDescription || '',
        embedColor: embedColor || '#5865F2', embedFooter: embedFooter || '',
        ownerOnly: !!ownerOnly,
        createdAt: existing >= 0 ? cmds[existing].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (existing >= 0) cmds[existing] = cmd; else cmds.push(cmd);
      writeJSON(COMMANDS_FILE, cmds);
      logger.info(`[Admin] Custom command !${name} saved`);
      res.json({ ok: true, command: cmd });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.delete('/api/commands/:name', (req, res) => {
    try {
      let cmds = readJSON(COMMANDS_FILE, []);
      const before = cmds.length;
      cmds = cmds.filter(c => c.name.toLowerCase() !== req.params.name.toLowerCase());
      if (cmds.length === before) return res.status(404).json({ error: 'Command not found' });
      writeJSON(COMMANDS_FILE, cmds);
      logger.info(`[Admin] Custom command !${req.params.name} deleted`);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Whitelist (unlimited only) ── */
  router.get('/api/whitelist', requireUnlimited, async (req, res) => {
    try {
      const list = (await client.db?.get?.('fun:global:whitelist')) || [];
      const HARDCODED_SUPER = ['1184500199800963263'];
      const envOwners = (process.env.OWNER_IDS || process.env.OWNER_ID || '').split(/[,\s]+/).filter(Boolean);
      const owners = [...new Set([...HARDCODED_SUPER, ...envOwners])];
      res.json({ whitelist: list, owners });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/api/whitelist', requireUnlimited, parseBody(), async (req, res) => {
    try {
      const { action, discordId } = req.body || {};
      if (!discordId || !/^\d{5,25}$/.test(String(discordId))) return res.status(400).json({ error: 'Invalid Discord ID' });
      const list = (await client.db?.get?.('fun:global:whitelist')) || [];
      if (action === 'add') { if (!list.includes(discordId)) list.push(discordId); }
      else if (action === 'remove') { const i = list.indexOf(discordId); if (i >= 0) list.splice(i, 1); }
      else return res.status(400).json({ error: 'action must be add or remove' });
      await client.db?.set?.('fun:global:whitelist', list);
      logger.warn(`[Admin] Whitelist ${action}: ${discordId}`);
      res.json({ ok: true, whitelist: list });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Raw config (unlimited only) ── */
  router.get('/api/raw-config', requireUnlimited, async (req, res) => {
    try {
      const fileOverrides = readJSON(CONFIG_FILE, {});
      const customCommands = readJSON(COMMANDS_FILE, []);
      let globalGuildConfig = {};
      try { globalGuildConfig = (await client.db?.get?.('guild:__global__:config')) || {}; } catch {}
      res.json({ fileOverrides, customCommands, globalGuildConfig });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/api/raw-config', requireUnlimited, parseBody(), async (req, res) => {
    try {
      const { fileOverrides, customCommands, globalGuildConfig } = req.body || {};
      if (fileOverrides !== undefined) writeJSON(CONFIG_FILE, fileOverrides);
      if (customCommands !== undefined) writeJSON(COMMANDS_FILE, customCommands);
      if (globalGuildConfig !== undefined) await client.db?.set?.('guild:__global__:config', globalGuildConfig);
      logger.warn('[Admin] Raw config saved');
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Set money (unlimited only) ── */
  router.post('/api/setmoney', requireUnlimited, parseBody(), async (req, res) => {
    try {
      const { userId, amount, type } = req.body || {};
      if (!userId || amount === undefined) return res.status(400).json({ error: 'userId and amount required' });
      const eco = await import('../services/economy.js');
      const guildId = '__global__';
      const data = await eco.getEconomyData(client, guildId, userId);
      if ((type || 'wallet') === 'bank') data.bank = Math.max(0, parseInt(amount));
      else data.wallet = Math.max(0, parseInt(amount));
      await eco.setEconomyData(client, guildId, userId, data);
      logger.warn(`[Admin] setmoney: user=${userId} ${type || 'wallet'}=${amount}`);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.use('/admin', router);
}
