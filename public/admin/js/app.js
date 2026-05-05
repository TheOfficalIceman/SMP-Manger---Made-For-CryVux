/* ─── State ─────────────────────────────── */
let currentCfg = {};
let statusInterval = null;

/* ─── Init ─────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildColorGrid();
  loadSession();
  loadConfig();
  loadCommands();
  pollStatus();
  statusInterval = setInterval(pollStatus, 15000);
});

/* ─── Navigation ─────────────────────────────── */
const panelTitles = {
  overview: 'Dashboard',
  presence: 'Presence & Status',
  colors: 'Embed Colors',
  economy: 'Economy Settings',
  welcome: 'Welcome & Goodbye',
  misc: 'Misc Settings',
  commands: 'Custom Commands',
  whitelist: 'Whitelist',
  setmoney: 'Set Balance',
  rawconfig: 'Raw Config Editor',
};

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
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch('/admin/api' + path, opts);
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
    if (uptimeBadge) {
      uptimeBadge.style.display = 'flex';
      document.getElementById('uptime-val').textContent = fmtUptime(d.uptime);
    }
  } catch { /* silent */ }
}

function fmtUptime(s) {
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function el(id) {
  return document.getElementById(id) || { textContent: '' };
}

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

/* ─── Config load/save ─────────────────────────────── */
async function loadConfig() {
  try {
    currentCfg = await api('GET', '/config');
    const c = currentCfg;

    if (c.presence) {
      if (c.presence.status) setVal('p-status', c.presence.status);
      const act = c.presence.activities?.[0];
      if (act) {
        setVal('p-atype', act.type ?? 3);
        setVal('p-aname', act.name || '');
      }
    }

    if (c.embeds?.colors) {
      const ec = c.embeds.colors;
      colorFields.forEach(({ key }) => {
        const val = ec[key];
        if (val) {
          const colorInput = document.getElementById('cc-' + key);
          const textInput = document.getElementById('ct-' + key);
          if (colorInput) colorInput.value = val;
          if (textInput) textInput.value = val;
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
  } catch (e) {
    toast('Failed to load config: ' + e.message, 'error');
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

async function savePresence() {
  try {
    const status = document.getElementById('p-status')?.value || 'online';
    const atype = parseInt(document.getElementById('p-atype')?.value || '3');
    const aname = document.getElementById('p-aname')?.value || '';

    await api('POST', '/config', {
      presence: {
        status,
        activities: aname ? [{ type: atype, name: aname }] : []
      }
    });
    toast('Presence saved!');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveColors() {
  try {
    const colors = {};
    colorFields.forEach(({ key }) => {
      const textInput = document.getElementById('ct-' + key);
      if (textInput?.value) colors[key] = textInput.value;
    });
    const footer = document.getElementById('c-footer')?.value;

    await api('POST', '/config', {
      embeds: {
        colors,
        ...(footer ? { footer: { text: footer } } : {})
      }
    });
    toast('Colors saved!');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveEconomy() {
  try {
    await api('POST', '/config', {
      economy: {
        currency: {
          name: document.getElementById('e-name')?.value,
          namePlural: document.getElementById('e-plural')?.value,
          symbol: document.getElementById('e-symbol')?.value,
        },
        starting: parseInt(document.getElementById('e-start')?.value || '0'),
        rewards: {
          daily: { min: parseInt(document.getElementById('e-daily')?.value || '100') },
          work: {
            min: parseInt(document.getElementById('e-wmin')?.value || '10'),
            max: parseInt(document.getElementById('e-wmax')?.value || '100')
          },
          beg: {
            min: parseInt(document.getElementById('e-bmin')?.value || '5'),
            max: parseInt(document.getElementById('e-bmax')?.value || '50')
          }
        },
        rob: { successRate: parseFloat(document.getElementById('e-rob')?.value || '0.4') }
      }
    });
    toast('Economy settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveWelcome() {
  try {
    await api('POST', '/config', {
      welcome: {
        message: document.getElementById('w-welcome')?.value,
        goodbyeMessage: document.getElementById('w-goodbye')?.value,
      }
    });
    toast('Welcome messages saved!');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveMisc() {
  try {
    await api('POST', '/config', {
      prefix: document.getElementById('m-prefix')?.value,
      cooldown: parseInt(document.getElementById('m-cooldown')?.value || '3'),
    });
    toast('Settings saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Color grid ─────────────────────────────── */
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
  if (text && picker && /^#[0-9a-fA-F]{6}$/.test(text.value)) {
    picker.value = text.value;
  }
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
  } catch (e) {
    toast('Failed to load commands: ' + e.message, 'error');
  }
}

function editCommand(cmd) {
  setVal('b-name', cmd.name);
  setVal('b-type', cmd.useEmbed ? 'embed' : 'text');
  setVal('b-response', cmd.response || '');
  setVal('b-etitle', cmd.embedTitle || '');
  setVal('b-ecolor', cmd.embedColor || '#5865F2');
  setVal('b-edesc', cmd.embedDescription || '');
  setVal('b-efooter', cmd.embedFooter || '');
  const ownerCb = document.getElementById('b-owner');
  if (ownerCb) ownerCb.checked = !!cmd.ownerOnly;
  toggleEmbedFields();
  updatePreview();
  document.querySelector('[data-panel="commands"]')?.scrollIntoView?.();
  window.scrollTo(0, 0);
}

async function saveCommand() {
  try {
    const name = document.getElementById('b-name')?.value?.trim();
    const type = document.getElementById('b-type')?.value;
    const useEmbed = type === 'embed';

    if (!name) return toast('Command name is required', 'error');

    const body = {
      name,
      useEmbed,
      ownerOnly: document.getElementById('b-owner')?.checked || false,
    };

    if (useEmbed) {
      body.embedTitle = document.getElementById('b-etitle')?.value || '';
      body.embedColor = document.getElementById('b-ecolor')?.value || '#5865F2';
      body.embedDescription = document.getElementById('b-edesc')?.value || '';
      body.embedFooter = document.getElementById('b-efooter')?.value || '';
      body.response = '';
    } else {
      body.response = document.getElementById('b-response')?.value || '';
    }

    await api('POST', '/commands', body);
    toast(`Command !${name} saved!`);
    loadCommands();
    clearBuilder();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteCommand(name) {
  if (!confirm(`Delete command !${name}? This cannot be undone.`)) return;
  try {
    await api('DELETE', `/commands/${name}`);
    toast(`Deleted !${name}`);
    loadCommands();
  } catch (e) { toast(e.message, 'error'); }
}

function clearBuilder() {
  ['b-name', 'b-response', 'b-etitle', 'b-edesc', 'b-efooter'].forEach(id => setVal(id, ''));
  setVal('b-type', 'text');
  setVal('b-ecolor', '#5865F2');
  const cb = document.getElementById('b-owner');
  if (cb) cb.checked = false;
  toggleEmbedFields();
  updatePreview();
}

function toggleEmbedFields() {
  const isEmbed = document.getElementById('b-type')?.value === 'embed';
  const tf = document.getElementById('text-fields');
  const ef = document.getElementById('embed-fields');
  if (tf) tf.style.display = isEmbed ? 'none' : 'block';
  if (ef) ef.style.display = isEmbed ? 'block' : 'none';
}

function updatePreview() {
  const box = document.getElementById('preview-box');
  if (!box) return;
  const isEmbed = document.getElementById('b-type')?.value === 'embed';
  const name = document.getElementById('b-name')?.value;

  if (!name) {
    box.innerHTML = '<span style="color:var(--muted);font-size:13px">Fill in the form above to see a preview...</span>';
    return;
  }

  if (isEmbed) {
    const title = document.getElementById('b-etitle')?.value || '';
    const color = document.getElementById('b-ecolor')?.value || '#5865F2';
    const desc = document.getElementById('b-edesc')?.value || '';
    const footer = document.getElementById('b-efooter')?.value || '';
    box.innerHTML = `
      <div class="preview-embed" style="border-left-color:${color}">
        ${title ? `<div class="pe-title">${esc(title)}</div>` : ''}
        ${desc ? `<div class="pe-desc">${esc(desc).replace(/\n/g, '<br>')}</div>` : ''}
        ${footer ? `<div class="pe-footer">${esc(footer)}</div>` : ''}
      </div>
    `;
  } else {
    const resp = document.getElementById('b-response')?.value || '';
    box.innerHTML = `<div class="preview-text">${esc(resp).replace(/\n/g, '<br>') || '<span style="color:#72767d">Response will appear here...</span>'}</div>`;
  }
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── Whitelist ─────────────────────────────── */
async function loadWhitelist() {
  try {
    const d = await api('GET', '/whitelist');
    renderIdList('wl-list', d.whitelist || [], true);
    renderIdList('wl-owners', d.owners || [], false, true);
  } catch {
    const el = document.getElementById('wl-list');
    if (el) el.innerHTML = '<span style="color:var(--red);font-size:12px">Forbidden — requires Unlimited mode</span>';
  }
}

function renderIdList(elId, ids, removable = false, owner = false) {
  const container = document.getElementById(elId);
  if (!container) return;
  if (!ids.length) {
    container.innerHTML = '<span style="color:var(--muted);font-size:12px">None</span>';
    return;
  }
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
    loadWhitelist();
    if (!prefilledId) setVal('wl-id', '');
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
  } catch (e) {
    toast('Forbidden — requires Unlimited mode', 'error');
  }
}

async function saveRC(field, elId) {
  let parsed;
  try {
    parsed = JSON.parse(document.getElementById(elId)?.value || '{}');
  } catch (e) {
    toast('Invalid JSON: ' + e.message, 'error');
    return;
  }
  try {
    await api('POST', '/raw-config', { [field]: parsed });
    toast('Saved!');
  } catch (e) { toast(e.message, 'error'); }
}

/* ─── Logout ─────────────────────────────── */
async function doLogout() {
  try {
    await api('POST', '/logout');
  } catch { /* ignore */ }
  window.location.href = '/admin/login';
}
