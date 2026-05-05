/* ─── State ─────────────────────────────── */
let currentCfg = {};
let modulesState = {};

/* ─── Module definitions ─────────────────────────────── */
const MODULES = [
  { id: 'moderation', name: 'Moderation', icon: '🛡️', color: '#9B59B6', desc: 'Kick, ban, mute, warn, purge and more', panel: 'moderation' },
  { id: 'automod', name: 'Auto-Moderation', icon: '🤖', color: '#E74C3C', desc: 'Automatically detect and remove spam, invites, links', panel: null },
  { id: 'logging', name: 'Logging', icon: '📋', color: '#3B9EDD', desc: 'Log server events to a dedicated channel', panel: 'logging' },
  { id: 'welcome', name: 'Welcome & Goodbye', icon: '👋', color: '#23D160', desc: 'Greet new members and farewell departing ones', panel: 'welcome' },
  { id: 'tickets', name: 'Tickets', icon: '🎫', color: '#F5C542', desc: 'Support ticket system for your community', panel: null },
  { id: 'economy', name: 'Economy', icon: '💰', color: '#F1C40F', desc: 'Currency, wallet, daily rewards, shop and gambling', panel: 'economy' },
  { id: 'leveling', name: 'Leveling', icon: '⭐', color: '#FF6B6B', desc: 'XP system with level-up notifications and role rewards', panel: null },
  { id: 'music', name: 'Music Player', icon: '🎵', color: '#5865F2', desc: 'Play YouTube music in voice channels', panel: 'music' },
  { id: 'reactionroles', name: 'Reaction Roles', icon: '🎭', color: '#9F7AEA', desc: 'Let members assign themselves roles via reactions', panel: null },
  { id: 'verification', name: 'Verification', icon: '✅', color: '#23D160', desc: 'Verify members before giving them full access', panel: null },
  { id: 'giveaways', name: 'Giveaways', icon: '🎉', color: '#FF69B4', desc: 'Host and manage server giveaways easily', panel: null },
  { id: 'joinToCreate', name: 'Join to Create', icon: '🔊', color: '#3B9EDD', desc: 'Auto-create temporary voice channels on join', panel: null },
  { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#E91E63', desc: 'Celebrate member birthdays with announcements', panel: null },
  { id: 'serverstats', name: 'Server Stats', icon: '📊', color: '#3498DB', desc: 'Display live server statistics in channels', panel: null },
];

/* ─── Init ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildColorGrid();
  loadSession();
  loadConfig();
  loadCommands();
  loadModules();
  loadMusicConfig();
  pollStatus();
  setInterval(pollStatus, 15000);
});

/* ─── Navigation ─────────────────────────────── */
const panelTitles = {
  overview: 'Dashboard',
  modules: 'Modules',
  music: 'Music Player',
  moderation: 'Moderation',
  logging: 'Logging',
  presence: 'Presence & Status',
  colors: 'Embed Colors',
  economy: 'Economy Settings',
  welcome: 'Welcome & Goodbye',
  misc: 'Misc Settings',
  commands: 'Custom Commands',
  whitelist: 'Whitelist',
  setmoney: 'Set Balance',
  rawconfig: 'Raw Config Editor',
  guildconfig: 'Server Config',
  tickets: 'Ticket Systems',
  leveling: 'Leveling',
  birthday: 'Birthday',
  serverbackup: 'Server Backup',
  discordbrowser: 'Discord Browser',
};

const _panelInited = new Set();

function showPanel(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('panel-title').textContent = panelTitles[id] || id;

  if (id === 'commands') loadCommands();
  if (id === 'whitelist') loadWhitelist();
  if (id === 'rawconfig') loadRC();
  if (id === 'modules') renderModulesGrid();
  if (id === 'moderation') loadModerationConfig();
  if (id === 'logging') loadLoggingConfig();

  if (!_panelInited.has(id)) {
    _panelInited.add(id);
    if (id === 'guildconfig')    initGuildConfig();
    if (id === 'tickets')        initTicketSystems();
    if (id === 'leveling')       initLeveling();
    if (id === 'birthday')       initBirthday();
    if (id === 'serverbackup')   initServerBackup();
    if (id === 'discordbrowser') initDiscordBrowser();
  }
}

function switchTab(btn, group, contentId) {
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById('panel-' + group);
  if (panel) panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const content = document.getElementById(contentId);
  if (content) content.classList.add('active');
}

/* ─── Toast ─────────────────────────────── */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const checkIcon = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`;
  const crossIcon = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? checkIcon : crossIcon}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3200);
}

/* ─── API ─────────────────────────────── */
const _BASE = (window.__API_ORIGIN || '') + '/admin/api';
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ─── Status polling ─────────────────────────────── */
async function pollStatus() {
  try {
    const d = await api('GET', '/status');
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    dot.className = 'status-indicator ' + (d.online ? 'online' : 'offline');
    text.textContent = d.online ? 'Bot Online' : 'Bot Offline';
    el('s-status').textContent = d.online ? '🟢 Online' : '🔴 Offline';
    el('s-guilds').textContent = d.guilds;
    el('s-members').textContent = (d.users || 0).toLocaleString();
    el('s-uptime').textContent = fmtUptime(d.uptime);
    el('s-ping').textContent = d.ping >= 0 ? d.ping + 'ms' : 'N/A';
    el('s-db').textContent = d.db === 'postgresql' ? '🟢 PostgreSQL' : '🟡 Memory';
    const uptimeBadge = document.getElementById('uptime-badge');
    if (uptimeBadge) { uptimeBadge.style.display = 'flex'; document.getElementById('uptime-val').textContent = fmtUptime(d.uptime); }
  } catch { /* silent */ }
}

function fmtUptime(s) {
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function el(id) { return document.getElementById(id) || { textContent: '' }; }

/* ─── Session ─────────────────────────────── */
async function loadSession() {
  try {
    const d = await api('GET', '/session');
    if (d.unlimited) {
      const section = document.getElementById('nav-unlimited');
      if (section) section.style.display = 'block';
    }
  } catch { /* silent */ }
}

/* ─── Modules ─────────────────────────────── */
async function loadModules() {
  try {
    const d = await api('GET', '/modules');
    modulesState = d.modules || {};
    renderModulesGrid();
    renderOverviewModules();
  } catch { /* silent */ }
}

function renderModulesGrid() {
  const grid = document.getElementById('modules-grid');
  const countEl = document.getElementById('modules-count');
  if (!grid) return;

  const enabledCount = MODULES.filter(m => modulesState[m.id] !== false).length;
  if (countEl) countEl.textContent = `${enabledCount} / ${MODULES.length} enabled`;

  grid.innerHTML = MODULES.map(m => {
    const enabled = modulesState[m.id] !== false;
    return `
      <div class="module-card ${enabled ? 'enabled' : 'disabled'}">
        <div class="module-card-top">
          <div class="module-icon" style="background:${m.color}22;color:${m.color}">${m.icon}</div>
          <label class="switch">
            <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleModule('${m.id}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
        <div class="module-card-body">
          <div class="module-name">${m.name}</div>
          <div class="module-desc">${m.desc}</div>
        </div>
        <div class="module-card-footer">
          ${m.panel ? `<button class="btn-configure" onclick="showPanel('${m.panel}', document.querySelector('[data-panel=${m.panel}]'))">Configure →</button>` : `<span class="no-config">No extra settings</span>`}
          <span class="module-badge ${enabled ? 'on' : 'off'}">${enabled ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderOverviewModules() {
  const list = document.getElementById('overview-modules-list');
  if (!list) return;
  const active = MODULES.filter(m => modulesState[m.id] !== false);
  list.innerHTML = active.map(m => `
    <div class="overview-module-pill">
      <span>${m.icon}</span>
      <span>${m.name}</span>
    </div>
  `).join('');
}

async function toggleModule(id, enabled) {
  try {
    modulesState[id] = enabled;
    await api('POST', '/modules', { modules: { [id]: enabled } });
    renderModulesGrid();
    renderOverviewModules();
    toast(`${MODULES.find(m => m.id === id)?.name} ${enabled ? 'enabled' : 'disabled'}`);
  } catch (e) {
    toast(e.message, 'error');
    loadModules();
  }
}

/* ─── Config load/save ─────────────────────────────── */
async function loadConfig() {
  try {
    currentCfg = await api('GET', '/config');
    const c = currentCfg;
    if (c.presence) {
      if (c.presence.status) setVal('p-status', c.presence.status);
      const act = c.presence.activities?.[0];
      if (act) { setVal('p-atype', act.type ?? 3); setVal('p-aname', act.name || ''); }
    }
    if (c.embeds?.colors) {
      const ec = c.embeds.colors;
      colorFields.forEach(({ key }) => {
        const val = ec[key];
        if (val) {
          const ci = document.getElementById('cc-' + key);
          const ti = document.getElementById('ct-' + key);
          if (ci) ci.value = val;
          if (ti) ti.value = val;
        }
      });
    }
    if (c.embeds?.footer?.text) setVal('c-footer', c.embeds.footer.text);
    if (c.economy) {
      const e = c.economy;
      if (e.currency?.name) setVal('e-name', e.currency.name);
      if (e.currency?.namePlural) setVal('e-plural', e.currency.namePlural);
      if (e.currency?.symbol) setVal('e-symbol', e.currency.symbol);
      if (e.starting !== undefined) setVal('e-start', e.starting);
      if (e.rewards?.daily?.min !== undefined) setVal('e-daily', e.rewards.daily.min);
      if (e.rewards?.work?.min !== undefined) setVal('e-wmin', e.rewards.work.min);
      if (e.rewards?.work?.max !== undefined) setVal('e-wmax', e.rewards.work.max);
      if (e.rewards?.beg?.min !== undefined) setVal('e-bmin', e.rewards.beg.min);
      if (e.rewards?.beg?.max !== undefined) setVal('e-bmax', e.rewards.beg.max);
      if (e.rob?.successRate !== undefined) setVal('e-rob', e.rob.successRate);
    }
    if (c.welcome) {
      if (c.welcome.message) setVal('w-welcome', c.welcome.message);
      if (c.welcome.goodbyeMessage) setVal('w-goodbye', c.welcome.goodbyeMessage);
    }
    if (c.prefix) setVal('m-prefix', c.prefix);
    if (c.cooldown !== undefined) setVal('m-cooldown', c.cooldown);
  } catch (e) { toast('Failed to load config: ' + e.message, 'error'); }
}

function setVal(id, val) { const e = document.getElementById(id); if (e) e.value = val; }
function getCheck(id) { return document.getElementById(id)?.checked ?? false; }
function setCheck(id, val) { const e = document.getElementById(id); if (e) e.checked = !!val; }

/* ─── Music config ─────────────────────────────── */
async function loadMusicConfig() {
  try {
    const d = await api('GET', '/music-config');
    const m = d.music || {};
    setVal('mu-volume', m.defaultVolume ?? 100);
    setVal('mu-maxqueue', m.maxQueueSize ?? 100);
    setVal('mu-maxduration', m.maxDuration ?? 0);
    setVal('mu-djrole', m.djRole ?? '');
    setCheck('mu-duplicates', m.allowDuplicates ?? false);
    setCheck('mu-announce', m.announceNowPlaying ?? true);
    setCheck('mu-autoleave', m.autoLeave ?? true);
  } catch { /* silent */ }
}

async function saveMusicConfig() {
  try {
    await api('POST', '/music-config', {
      music: {
        defaultVolume: parseInt(document.getElementById('mu-volume')?.value || '100'),
        maxQueueSize: parseInt(document.getElementById('mu-maxqueue')?.value || '100'),
        maxDuration: parseInt(document.getElementById('mu-maxduration')?.value || '0'),
        djRole: document.getElementById('mu-djrole')?.value?.trim() || '',
        allowDuplicates: getCheck('mu-duplicates'),
        announceNowPlaying: getCheck('mu-announce'),
        autoLeave: getCheck('mu-autoleave'),
      }
    });
    toast('Music settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Moderation config ─────────────────────────────── */
async function loadModerationConfig() {
  try {
    const c = await api('GET', '/config');
    const m = c.moderation || {};
    setVal('mod-logchannel', m.logChannel ?? '');
    setVal('mod-muterole', m.muteRole ?? '');
    setVal('mod-warnlimit', m.warnThreshold ?? 0);
    setCheck('mod-antispam', m.autoMod?.antiSpam ?? false);
    setCheck('mod-antiinvite', m.autoMod?.antiInvite ?? false);
    setCheck('mod-antilink', m.autoMod?.antiLink ?? false);
  } catch { /* silent */ }
}

async function saveModerationConfig() {
  try {
    await api('POST', '/config', {
      moderation: {
        logChannel: document.getElementById('mod-logchannel')?.value?.trim() || '',
        muteRole: document.getElementById('mod-muterole')?.value?.trim() || '',
        warnThreshold: parseInt(document.getElementById('mod-warnlimit')?.value || '0'),
        autoMod: {
          antiSpam: getCheck('mod-antispam'),
          antiInvite: getCheck('mod-antiinvite'),
          antiLink: getCheck('mod-antilink'),
        }
      }
    });
    toast('Moderation settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Logging config ─────────────────────────────── */
async function loadLoggingConfig() {
  try {
    const c = await api('GET', '/config');
    const l = c.logging || {};
    setVal('log-channel', l.channel ?? '');
    setVal('log-modchannel', l.modChannel ?? '');
    setCheck('log-msgdelete', l.events?.messageDelete ?? true);
    setCheck('log-msgedit', l.events?.messageEdit ?? true);
    setCheck('log-join', l.events?.memberJoin ?? true);
    setCheck('log-leave', l.events?.memberLeave ?? true);
    setCheck('log-roles', l.events?.roleChanges ?? false);
    setCheck('log-voice', l.events?.voiceActivity ?? false);
    setCheck('log-bans', l.events?.bans ?? true);
    setCheck('log-channels', l.events?.channelChanges ?? false);
  } catch { /* silent */ }
}

async function saveLoggingConfig() {
  try {
    await api('POST', '/config', {
      logging: {
        channel: document.getElementById('log-channel')?.value?.trim() || '',
        modChannel: document.getElementById('log-modchannel')?.value?.trim() || '',
        events: {
          messageDelete: getCheck('log-msgdelete'),
          messageEdit: getCheck('log-msgedit'),
          memberJoin: getCheck('log-join'),
          memberLeave: getCheck('log-leave'),
          roleChanges: getCheck('log-roles'),
          voiceActivity: getCheck('log-voice'),
          bans: getCheck('log-bans'),
          channelChanges: getCheck('log-channels'),
        }
      }
    });
    toast('Logging settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Presence ─────────────────────────────── */
async function savePresence() {
  try {
    const status = document.getElementById('p-status')?.value || 'online';
    const atype = parseInt(document.getElementById('p-atype')?.value || '3');
    const aname = document.getElementById('p-aname')?.value || '';
    await api('POST', '/config', { presence: { status, activities: aname ? [{ type: atype, name: aname }] : [] } });
    toast('Presence saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Colors ─────────────────────────────── */
const colorFields = [
  { key: 'primary', label: 'Primary', default: '#336699' },
  { key: 'success', label: 'Success', default: '#57F287' },
  { key: 'error', label: 'Error', default: '#ED4245' },
  { key: 'warning', label: 'Warning', default: '#FEE75C' },
  { key: 'info', label: 'Info', default: '#3498DB' },
  { key: 'economy', label: 'Economy', default: '#F1C40F' },
  { key: 'moderation', label: 'Moderation', default: '#9B59B6' },
  { key: 'birthday', label: 'Birthday', default: '#E91E63' },
];

function buildColorGrid() {
  const grid = document.getElementById('color-grid');
  if (!grid) return;
  grid.innerHTML = colorFields.map(({ key, label, default: def }) => `
    <div class="color-field">
      <label>${label}</label>
      <div class="color-preview-row">
        <input type="color" id="cc-${key}" value="${def}" oninput="syncColorText('${key}')">
        <input type="text" id="ct-${key}" value="${def}" maxlength="7" oninput="syncColorPicker('${key}')">
      </div>
    </div>
  `).join('');
}

function syncColorText(key) {
  const picker = document.getElementById('cc-' + key);
  const text = document.getElementById('ct-' + key);
  if (picker && text) text.value = picker.value;
}

function syncColorPicker(key) {
  const text = document.getElementById('ct-' + key);
  const picker = document.getElementById('cc-' + key);
  if (text && picker && /^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
}

async function saveColors() {
  try {
    const colors = {};
    colorFields.forEach(({ key }) => { const t = document.getElementById('ct-' + key); if (t?.value) colors[key] = t.value; });
    const footer = document.getElementById('c-footer')?.value;
    await api('POST', '/config', { embeds: { colors, ...(footer ? { footer: { text: footer } } : {}) } });
    toast('Colors saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Economy ─────────────────────────────── */
async function saveEconomy() {
  try {
    await api('POST', '/config', {
      economy: {
        currency: { name: document.getElementById('e-name')?.value, namePlural: document.getElementById('e-plural')?.value, symbol: document.getElementById('e-symbol')?.value },
        starting: parseInt(document.getElementById('e-start')?.value || '0'),
        rewards: {
          daily: { min: parseInt(document.getElementById('e-daily')?.value || '100') },
          work: { min: parseInt(document.getElementById('e-wmin')?.value || '10'), max: parseInt(document.getElementById('e-wmax')?.value || '100') },
          beg: { min: parseInt(document.getElementById('e-bmin')?.value || '5'), max: parseInt(document.getElementById('e-bmax')?.value || '50') }
        },
        rob: { successRate: parseFloat(document.getElementById('e-rob')?.value || '0.4') }
      }
    });
    toast('Economy settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Welcome ─────────────────────────────── */
async function saveWelcome() {
  try {
    await api('POST', '/config', { welcome: { message: document.getElementById('w-welcome')?.value, goodbyeMessage: document.getElementById('w-goodbye')?.value } });
    toast('Welcome messages saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Misc ─────────────────────────────── */
async function saveMisc() {
  try {
    await api('POST', '/config', { prefix: document.getElementById('m-prefix')?.value, cooldown: parseInt(document.getElementById('m-cooldown')?.value || '3') });
    toast('Settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Commands ─────────────────────────────── */
async function loadCommands() {
  try {
    const cmds = await api('GET', '/commands');
    const list = document.getElementById('cmd-list');
    if (!list) return;
    if (!cmds.length) {
      list.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">No custom commands yet. Use the builder above to create one.</div>';
      return;
    }
    list.innerHTML = cmds.map(c => `
      <div class="cmd-item" onclick="editCommand(${JSON.stringify(c).replace(/"/g, '&quot;')})">
        <div class="cmd-name">!${c.name}</div>
        <div class="cmd-preview">${c.useEmbed ? (c.embedDescription || c.embedTitle || 'Embed') : (c.response || '')}</div>
        <div class="cmd-actions">
          ${c.useEmbed ? '<span class="badge badge-embed">Embed</span>' : ''}
          ${c.ownerOnly ? '<span class="badge badge-owner">Owner</span>' : '<span class="badge badge-public">Public</span>'}
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteCommand('${c.name}')">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  } catch (e) { toast('Failed to load commands: ' + e.message, 'error'); }
}

function editCommand(cmd) {
  setVal('b-name', cmd.name); setVal('b-type', cmd.useEmbed ? 'embed' : 'text');
  setVal('b-response', cmd.response || ''); setVal('b-etitle', cmd.embedTitle || '');
  setVal('b-ecolor', cmd.embedColor || '#5865F2'); setVal('b-edesc', cmd.embedDescription || '');
  setVal('b-efooter', cmd.embedFooter || '');
  const ownerCb = document.getElementById('b-owner');
  if (ownerCb) ownerCb.checked = !!cmd.ownerOnly;
  toggleEmbedFields(); updatePreview(); window.scrollTo(0, 0);
}

async function saveCommand() {
  try {
    const name = document.getElementById('b-name')?.value?.trim();
    const type = document.getElementById('b-type')?.value;
    const useEmbed = type === 'embed';
    if (!name) return toast('Command name is required', 'error');
    const body = { name, useEmbed, ownerOnly: document.getElementById('b-owner')?.checked || false };
    if (useEmbed) {
      body.embedTitle = document.getElementById('b-etitle')?.value || '';
      body.embedColor = document.getElementById('b-ecolor')?.value || '#5865F2';
      body.embedDescription = document.getElementById('b-edesc')?.value || '';
      body.embedFooter = document.getElementById('b-efooter')?.value || '';
      body.response = '';
    } else { body.response = document.getElementById('b-response')?.value || ''; }
    await api('POST', '/commands', body);
    toast(`Command !${name} saved!`); loadCommands(); clearBuilder();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteCommand(name) {
  if (!confirm(`Delete command !${name}? This cannot be undone.`)) return;
  try { await api('DELETE', `/commands/${name}`); toast(`Deleted !${name}`); loadCommands(); }
  catch (e) { toast(e.message, 'error'); }
}

function clearBuilder() {
  ['b-name', 'b-response', 'b-etitle', 'b-edesc', 'b-efooter'].forEach(id => setVal(id, ''));
  setVal('b-type', 'text'); setVal('b-ecolor', '#5865F2');
  const cb = document.getElementById('b-owner'); if (cb) cb.checked = false;
  toggleEmbedFields(); updatePreview();
}

function toggleEmbedFields() {
  const isEmbed = document.getElementById('b-type')?.value === 'embed';
  const tf = document.getElementById('text-fields'); const ef = document.getElementById('embed-fields');
  if (tf) tf.style.display = isEmbed ? 'none' : 'block';
  if (ef) ef.style.display = isEmbed ? 'block' : 'none';
}

function updatePreview() {
  const box = document.getElementById('preview-box');
  if (!box) return;
  const isEmbed = document.getElementById('b-type')?.value === 'embed';
  const name = document.getElementById('b-name')?.value;
  if (!name) { box.innerHTML = '<span style="color:var(--muted);font-size:13px">Fill in the form above to see a preview...</span>'; return; }
  if (isEmbed) {
    const title = document.getElementById('b-etitle')?.value || '';
    const color = document.getElementById('b-ecolor')?.value || '#5865F2';
    const desc = document.getElementById('b-edesc')?.value || '';
    const footer = document.getElementById('b-efooter')?.value || '';
    box.innerHTML = `<div class="preview-embed" style="border-left-color:${color}">${title ? `<div class="pe-title">${esc(title)}</div>` : ''}${desc ? `<div class="pe-desc">${esc(desc).replace(/\n/g, '<br>')}</div>` : ''}${footer ? `<div class="pe-footer">${esc(footer)}</div>` : ''}</div>`;
  } else {
    const resp = document.getElementById('b-response')?.value || '';
    box.innerHTML = `<div class="preview-text">${esc(resp).replace(/\n/g, '<br>') || '<span style="color:#72767d">Response will appear here...</span>'}</div>`;
  }
}

function esc(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ─── Whitelist ─────────────────────────────── */
async function loadWhitelist() {
  try {
    const d = await api('GET', '/whitelist');
    renderIdList('wl-list', d.whitelist || [], true);
    renderIdList('wl-owners', d.owners || [], false, true);
  } catch {
    const e = document.getElementById('wl-list');
    if (e) e.innerHTML = '<span style="color:var(--red);font-size:12px">Forbidden — requires Unlimited mode</span>';
  }
}

function renderIdList(elId, ids, removable = false, owner = false) {
  const container = document.getElementById(elId);
  if (!container) return;
  if (!ids.length) { container.innerHTML = '<span style="color:var(--muted);font-size:12px">None</span>'; return; }
  container.innerHTML = ids.map(id => `
    <div class="id-chip${owner ? ' owner' : ''}">
      <code>${id}</code>
      ${removable ? `<button class="remove" onclick="wlAction('remove','${id}')" title="Remove">×</button>` : ''}
    </div>
  `).join('');
}

async function wlAction(action, prefilledId) {
  const id = prefilledId || document.getElementById('wl-id')?.value?.trim();
  if (!id) return toast('Enter a Discord User ID', 'error');
  try {
    await api('POST', '/whitelist', { action, discordId: id });
    toast(action === 'add' ? 'User added to whitelist' : 'User removed from whitelist');
    loadWhitelist(); if (!prefilledId) setVal('wl-id', '');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Set Balance ─────────────────────────────── */
async function setBalance() {
  try {
    const userId = document.getElementById('sm-id')?.value?.trim();
    const amount = parseInt(document.getElementById('sm-amt')?.value || '0');
    const type = document.getElementById('sm-type')?.value || 'wallet';
    if (!userId) return toast('Enter a Discord User ID', 'error');
    await api('POST', '/setmoney', { userId, amount, type });
    toast(`Balance set: ${userId} ${type} → ${amount}`);
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Raw Config ─────────────────────────────── */
async function loadRC() {
  try {
    const d = await api('GET', '/raw-config');
    setVal('rc-overrides', JSON.stringify(d.fileOverrides || {}, null, 2));
    setVal('rc-cmds', JSON.stringify(d.customCommands || [], null, 2));
    setVal('rc-gcfg', JSON.stringify(d.globalGuildConfig || {}, null, 2));
  } catch (e) { toast('Forbidden — requires Unlimited mode', 'error'); }
}

async function saveRC(field, elId) {
  let parsed;
  try { parsed = JSON.parse(document.getElementById(elId)?.value || '{}'); }
  catch (e) { toast('Invalid JSON: ' + e.message, 'error'); return; }
  try { await api('POST', '/raw-config', { [field]: parsed }); toast('Saved!'); }
  catch (e) { toast(e.message, 'error'); }
}

/* ─── Logout ─────────────────────────────── */
async function doLogout() {
  try { await api('POST', '/logout'); } catch { /* ignore */ }
  window.location.href = '/admin/login';
}

/* ─── Download dashboard ─────────────────────────────── */
function downloadDashboard() {
  window.location.href = _BASE + '/download';
}

/* ─── Guild selector helper ─────────────────────────────── */
let _guildsCache = null;
async function loadGuildSelector(selectId, onSelect) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading servers…</option>';
  try {
    const d = await api('GET', '/discord/guilds');
    _guildsCache = d.guilds || [];
    sel.innerHTML = '<option value="">— Select a server —</option>' +
      _guildsCache.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    sel.onchange = () => { if (sel.value && onSelect) onSelect(sel.value, sel.options[sel.selectedIndex].text); };
  } catch (e) {
    sel.innerHTML = `<option value="">Error: ${esc(e.message)}</option>`;
  }
}

async function loadChannelSelector(guildId, selectId, filterType) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading…</option>';
  try {
    const d = await api('GET', `/discord/guild/${guildId}/channels`);
    const TYPES = { text: [0, 5], voice: [2], category: [4], forum: [15], all: null };
    const allowed = TYPES[filterType] || null;
    const ch = (d.channels || [])
      .filter(c => !allowed || allowed.includes(c.type))
      .sort((a, b) => a.position - b.position);
    sel.innerHTML = '<option value="">— Select a channel —</option>' +
      ch.map(c => `<option value="${c.id}">#${esc(c.name)}</option>`).join('');
  } catch (e) { sel.innerHTML = `<option value="">Error: ${esc(e.message)}</option>`; }
}

async function loadRoleSelector(guildId, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading…</option>';
  try {
    const d = await api('GET', `/discord/guild/${guildId}/roles`);
    const roles = (d.roles || []).filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);
    sel.innerHTML = '<option value="">— Select a role —</option>' +
      roles.map(r => `<option value="${r.id}" style="color:#${r.color ? r.color.toString(16).padStart(6,'0') : 'aaa'}">@${esc(r.name)}</option>`).join('');
  } catch (e) { sel.innerHTML = `<option value="">Error: ${esc(e.message)}</option>`; }
}

/* ─── Discord Browser ─────────────────────────────── */
let _browserGuildId = null;
async function initDiscordBrowser() {
  await loadGuildSelector('db-guild-sel', async (guildId, name) => {
    _browserGuildId = guildId;
    document.getElementById('db-guild-name').textContent = name;
    document.getElementById('db-guild-detail').style.display = 'block';
    await Promise.all([loadBrowserChannels(guildId), loadBrowserRoles(guildId)]);
  });
}

async function loadBrowserChannels(guildId) {
  const el = document.getElementById('db-channels');
  el.innerHTML = '<div style="color:var(--muted)">Loading…</div>';
  try {
    const d = await api('GET', `/discord/guild/${guildId}/channels`);
    const typeNames = { 0:'# Text',2:'🔊 Voice',4:'📂 Category',5:'📢 Announce',13:'🎙️ Stage',15:'💬 Forum' };
    const sorted = (d.channels||[]).sort((a,b)=>a.position-b.position);
    el.innerHTML = sorted.map(c => `
      <div class="browser-row">
        <span class="browser-type">${typeNames[c.type]||'?'}</span>
        <span class="browser-name">${esc(c.name)}</span>
        <code class="browser-id" onclick="copyId('${c.id}')" title="Click to copy">${c.id}</code>
      </div>`).join('') || '<div style="color:var(--muted)">No channels</div>';
  } catch (e) { el.innerHTML = `<div style="color:var(--red)">${esc(e.message)}</div>`; }
}

async function loadBrowserRoles(guildId) {
  const el = document.getElementById('db-roles');
  el.innerHTML = '<div style="color:var(--muted)">Loading…</div>';
  try {
    const d = await api('GET', `/discord/guild/${guildId}/roles`);
    const roles = (d.roles||[]).filter(r=>r.name!=='@everyone').sort((a,b)=>b.position-a.position);
    el.innerHTML = roles.map(r => {
      const hex = r.color ? '#'+r.color.toString(16).padStart(6,'0') : '#99aab5';
      return `<div class="browser-row">
        <span class="role-dot" style="background:${hex}"></span>
        <span class="browser-name">@${esc(r.name)}</span>
        <code class="browser-id" onclick="copyId('${r.id}')" title="Click to copy">${r.id}</code>
      </div>`;
    }).join('') || '<div style="color:var(--muted)">No roles</div>';
  } catch (e) { el.innerHTML = `<div style="color:var(--red)">${esc(e.message)}</div>`; }
}

function copyId(id) {
  navigator.clipboard.writeText(id).then(() => toast('ID copied: ' + id));
}

/* ─── Ticket Systems ─────────────────────────────── */
let _tpGuildId = null;
let _tpGuildChannels = [];
let _tpGuildRoles = [];
let _tpEditId = null;

async function initTicketSystems() {
  await loadGuildSelector('tp-guild-sel', async (guildId) => {
    _tpGuildId = guildId;
    document.getElementById('tp-main').style.display = 'block';
    await Promise.all([
      loadTicketPanelList(),
      api('GET', `/discord/guild/${guildId}/channels`).then(d => { _tpGuildChannels = d.channels || []; }).catch(()=>{}),
      api('GET', `/discord/guild/${guildId}/roles`).then(d => { _tpGuildRoles = d.roles || []; }).catch(()=>{}),
    ]);
    populateTicketSelectors();
  });
}

function populateTicketSelectors() {
  const textCh = _tpGuildChannels.filter(c=>[0,5].includes(c.type)).sort((a,b)=>a.position-b.position);
  const cats   = _tpGuildChannels.filter(c=>c.type===4).sort((a,b)=>a.position-b.position);
  const roles  = _tpGuildRoles.filter(r=>r.name!=='@everyone').sort((a,b)=>b.position-a.position);

  const chOpts = '<option value="">— None —</option>' + textCh.map(c=>`<option value="${c.id}">#${esc(c.name)}</option>`).join('');
  const catOpts = '<option value="">— None —</option>' + cats.map(c=>`<option value="${c.id}">📂 ${esc(c.name)}</option>`).join('');
  const roleOpts = '<option value="">— None —</option>' + roles.map(r=>`<option value="${r.id}">@${esc(r.name)}</option>`).join('');

  setInner('tp-f-channel', chOpts);
  setInner('tp-f-category', catOpts);
  setInner('tp-f-staffrole', roleOpts);
}

function setInner(id, html) { const e = document.getElementById(id); if (e) e.innerHTML = html; }

async function loadTicketPanelList() {
  if (!_tpGuildId) return;
  const el = document.getElementById('tp-panel-list');
  el.innerHTML = '<div style="color:var(--muted)">Loading…</div>';
  try {
    const d = await api('GET', `/ticket-panels/${_tpGuildId}`);
    const panels = d.panels || [];
    if (!panels.length) { el.innerHTML = '<div style="color:var(--muted);padding:8px 0">No ticket panels yet. Create one above.</div>'; return; }
    el.innerHTML = panels.map(p => `
      <div class="cmd-item">
        <div class="cmd-name">🎫 ${esc(p.name)}</div>
        <div class="cmd-preview">${esc(p.panelMessage||'').slice(0,80)} · Button: <strong>${esc(p.buttonLabel||'Create Ticket')}</strong></div>
        <div class="cmd-actions">
          ${p.categoryId ? `<span class="badge badge-embed">Cat set</span>` : ''}
          ${p.staffRoleId ? `<span class="badge badge-owner">Role set</span>` : ''}
          <button class="btn btn-primary btn-sm" onclick="editTicketPanel(${JSON.stringify(p).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTicketPanel('${p.panelId}')">Delete</button>
        </div>
      </div>`).join('');
  } catch (e) { el.innerHTML = `<div style="color:var(--red)">${esc(e.message)}</div>`; }
}

function editTicketPanel(p) {
  _tpEditId = p.panelId;
  setVal('tp-f-name', p.name || '');
  setVal('tp-f-msg', p.panelMessage || '');
  setVal('tp-f-btn', p.buttonLabel || 'Create Ticket');
  setVal('tp-f-max', p.maxTicketsPerUser || 3);
  setCheck('tp-f-dm', p.dmOnClose !== false);
  // Set selects after a tick (DOM may not have values yet)
  setTimeout(() => {
    setVal('tp-f-channel', p.channelId || '');
    setVal('tp-f-category', p.categoryId || '');
    setVal('tp-f-staffrole', p.staffRoleId || '');
  }, 50);
  document.getElementById('tp-form-title').textContent = `✏️ Edit Panel: ${p.name}`;
  document.getElementById('tp-cancel-btn').style.display = 'inline-flex';
  document.getElementById('tp-form-card').scrollIntoView({ behavior: 'smooth' });
}

function clearTicketForm() {
  _tpEditId = null;
  ['tp-f-name','tp-f-msg','tp-f-btn'].forEach(id => setVal(id, ''));
  setVal('tp-f-max', 3);
  setCheck('tp-f-dm', true);
  ['tp-f-channel','tp-f-category','tp-f-staffrole'].forEach(id => setVal(id, ''));
  document.getElementById('tp-form-title').textContent = '➕ Create Ticket Panel';
  document.getElementById('tp-cancel-btn').style.display = 'none';
}

async function saveTicketPanel() {
  if (!_tpGuildId) return toast('Select a server first', 'error');
  const name = document.getElementById('tp-f-name')?.value?.trim();
  if (!name) return toast('Panel name is required', 'error');
  const panel = {
    panelId: _tpEditId || undefined,
    name,
    panelMessage: document.getElementById('tp-f-msg')?.value?.trim() || 'Click below to open a support ticket.',
    buttonLabel: document.getElementById('tp-f-btn')?.value?.trim() || 'Create Ticket',
    channelId: document.getElementById('tp-f-channel')?.value || null,
    categoryId: document.getElementById('tp-f-category')?.value || null,
    staffRoleId: document.getElementById('tp-f-staffrole')?.value || null,
    maxTicketsPerUser: parseInt(document.getElementById('tp-f-max')?.value || '3'),
    dmOnClose: getCheck('tp-f-dm'),
  };
  try {
    await api('POST', `/ticket-panels/${_tpGuildId}`, panel);
    toast(`Panel "${name}" saved!`);
    clearTicketForm();
    loadTicketPanelList();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteTicketPanel(panelId) {
  if (!confirm('Delete this ticket panel?')) return;
  try {
    await api('DELETE', `/ticket-panels/${_tpGuildId}/${panelId}`);
    toast('Panel deleted');
    loadTicketPanelList();
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Per-Guild Config (Welcome/Logging/Roles) ─────────────────────────────── */
let _gcGuildId = null;

async function initGuildConfig() {
  await loadGuildSelector('gc-guild-sel', async (guildId) => {
    _gcGuildId = guildId;
    document.getElementById('gc-main').style.display = 'block';
    await loadGuildConfigData();
    await Promise.all([
      loadChannelSelector(guildId, 'gc-welcome-ch', 'text'),
      loadChannelSelector(guildId, 'gc-goodbye-ch', 'text'),
      loadChannelSelector(guildId, 'gc-log-ch', 'text'),
      loadChannelSelector(guildId, 'gc-modlog-ch', 'text'),
      loadRoleSelector(guildId, 'gc-mod-role'),
      loadRoleSelector(guildId, 'gc-admin-role'),
      loadRoleSelector(guildId, 'gc-autorole'),
    ]);
  });
}

async function loadGuildConfigData() {
  if (!_gcGuildId) return;
  try {
    const d = await api('GET', `/guild-config/${_gcGuildId}`);
    const c = d.config || {};
    setVal('gc-welcome-msg', c.welcomeMessage || '');
    setVal('gc-goodbye-msg', c.goodbyeMessage || '');
    setCheck('gc-dm-close', c.dmOnClose !== false);
    setTimeout(() => {
      setVal('gc-welcome-ch', c.welcomeChannelId || c.welcomeChannel || '');
      setVal('gc-goodbye-ch', c.goodbyeChannelId || '');
      setVal('gc-log-ch', c.logChannelId || '');
      setVal('gc-modlog-ch', c.modLogChannelId || '');
      setVal('gc-mod-role', c.modRole || '');
      setVal('gc-admin-role', c.adminRole || '');
      setVal('gc-autorole', c.autoRole || '');
    }, 100);
  } catch (e) { toast('Failed to load config: ' + e.message, 'error'); }
}

async function saveGuildConfig() {
  if (!_gcGuildId) return toast('Select a server first', 'error');
  try {
    await api('POST', `/guild-config/${_gcGuildId}`, {
      welcomeChannelId: document.getElementById('gc-welcome-ch')?.value || null,
      welcomeMessage: document.getElementById('gc-welcome-msg')?.value || '',
      goodbyeChannelId: document.getElementById('gc-goodbye-ch')?.value || null,
      goodbyeMessage: document.getElementById('gc-goodbye-msg')?.value || '',
      logChannelId: document.getElementById('gc-log-ch')?.value || null,
      modLogChannelId: document.getElementById('gc-modlog-ch')?.value || null,
      modRole: document.getElementById('gc-mod-role')?.value || null,
      adminRole: document.getElementById('gc-admin-role')?.value || null,
      autoRole: document.getElementById('gc-autorole')?.value || null,
      dmOnClose: getCheck('gc-dm-close'),
    });
    toast('Server config saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Leveling ─────────────────────────────── */
let _lvGuildId = null;

async function initLeveling() {
  await loadGuildSelector('lv-guild-sel', async (guildId) => {
    _lvGuildId = guildId;
    document.getElementById('lv-main').style.display = 'block';
    await loadLevelingData();
    loadChannelSelector(guildId, 'lv-levelup-ch', 'text');
  });
}

async function loadLevelingData() {
  if (!_lvGuildId) return;
  try {
    const d = await api('GET', `/leveling-config/${_lvGuildId}`);
    const c = d.config || {};
    setVal('lv-xp-min', c.xpMin ?? 10);
    setVal('lv-xp-max', c.xpMax ?? 25);
    setVal('lv-cooldown', c.cooldown ?? 60);
    setCheck('lv-enabled', c.enabled !== false);
    setCheck('lv-announce', c.announceOnLevelUp !== false);
    setTimeout(() => setVal('lv-levelup-ch', c.levelUpChannelId || ''), 100);
  } catch (e) { toast('Failed to load leveling config: ' + e.message, 'error'); }
}

async function saveLeveling() {
  if (!_lvGuildId) return toast('Select a server first', 'error');
  try {
    await api('POST', `/leveling-config/${_lvGuildId}`, {
      enabled: getCheck('lv-enabled'),
      xpMin: parseInt(document.getElementById('lv-xp-min')?.value || '10'),
      xpMax: parseInt(document.getElementById('lv-xp-max')?.value || '25'),
      cooldown: parseInt(document.getElementById('lv-cooldown')?.value || '60'),
      announceOnLevelUp: getCheck('lv-announce'),
      levelUpChannelId: document.getElementById('lv-levelup-ch')?.value || null,
    });
    toast('Leveling settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Birthday ─────────────────────────────── */
let _bdGuildId = null;

async function initBirthday() {
  await loadGuildSelector('bd-guild-sel', async (guildId) => {
    _bdGuildId = guildId;
    document.getElementById('bd-main').style.display = 'block';
    await loadBirthdayData();
    await Promise.all([
      loadChannelSelector(guildId, 'bd-channel', 'text'),
      loadRoleSelector(guildId, 'bd-role'),
    ]);
  });
}

async function loadBirthdayData() {
  if (!_bdGuildId) return;
  try {
    const d = await api('GET', `/birthday-config/${_bdGuildId}`);
    setVal('bd-message', d.birthdayMessage || '🎂 Happy Birthday {user}! 🎉');
    setTimeout(() => {
      setVal('bd-channel', d.birthdayChannelId || '');
      setVal('bd-role', d.birthdayRole || '');
    }, 100);
  } catch (e) { toast('Failed to load birthday config: ' + e.message, 'error'); }
}

async function saveBirthday() {
  if (!_bdGuildId) return toast('Select a server first', 'error');
  try {
    await api('POST', `/birthday-config/${_bdGuildId}`, {
      birthdayChannelId: document.getElementById('bd-channel')?.value || null,
      birthdayRole: document.getElementById('bd-role')?.value || null,
      birthdayMessage: document.getElementById('bd-message')?.value || '🎂 Happy Birthday {user}! 🎉',
    });
    toast('Birthday settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Server Backup ─────────────────────────────── */
let _sbGuildId = null;

async function initServerBackup() {
  await loadGuildSelector('sb-guild-sel', async (guildId) => {
    _sbGuildId = guildId;
    document.getElementById('sb-main').style.display = 'block';
    loadSnapshotInfo();
  });
}

async function loadSnapshotInfo() {
  if (!_sbGuildId) return;
  const el = document.getElementById('sb-info');
  el.innerHTML = '<div style="color:var(--muted)">Loading…</div>';
  try {
    const d = await api('GET', `/server-snapshot/${_sbGuildId}`);
    if (!d.snapshot) {
      el.innerHTML = '<div style="color:var(--muted)">No backup found for this server.</div>';
    } else {
      const date = new Date(d.snapshot.savedAt).toLocaleString();
      el.innerHTML = `
        <div class="snapshot-stat"><strong>Last saved:</strong> ${date}</div>
        <div class="snapshot-stat"><strong>Roles:</strong> ${d.snapshot.roleCount}</div>
        <div class="snapshot-stat"><strong>Channels:</strong> ${d.snapshot.channelCount}</div>`;
    }
  } catch (e) { el.innerHTML = `<div style="color:var(--red)">${esc(e.message)}</div>`; }
}

function sbInstruction(action) {
  if (!_sbGuildId) return toast('Select a server first', 'error');
  const cmd = action === 'save' ? '!saveserver' : '!loadserver';
  toast(`Run "${cmd}" in your Discord server to ${action === 'save' ? 'save a snapshot' : 'restore from snapshot'}`);
  document.getElementById('sb-cmd-hint').textContent = `→ Type "${cmd}" in your Discord server`;
  document.getElementById('sb-cmd-hint').style.display = 'block';
}
