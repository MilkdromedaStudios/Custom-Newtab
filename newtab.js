const MAX_CARDS = 100;
const STORAGE_KEY = 'ultraNewtabConfig';

const defaultConfig = {
  title: 'My Command Center',
  subtitle: 'Pin sites, custom HTML, clocks, notes, and live previews on one start page.',
  globalScale: 100,
  columns: 4,
  editMode: true,
  preload: false,
  background: '',
  accent: '#38bdf8',
  textColor: '#e2e8f0',
  customCss: '',
  cards: [
    { id: crypto.randomUUID(), type: 'clock-digital', title: 'Local Time', width: 1, height: 1, scale: 100, render: false, url: '', html: '' },
    { id: crypto.randomUUID(), type: 'note', title: 'Quick Notes', width: 1, height: 1, scale: 100, render: false, url: '', html: 'Double-click into editor mode, then write anything here.' },
    { id: crypto.randomUUID(), type: 'site', title: 'Example Site', width: 2, height: 2, scale: 80, render: true, url: 'https://example.com', html: '' },
    { id: crypto.randomUUID(), type: 'html', title: 'Custom HTML', width: 1, height: 1, scale: 100, render: false, url: '', html: '<div style="padding:1rem"><h2>Make it yours</h2><p>Add HTML, CSS, widgets, and live sites.</p></div>' }
  ]
};

let config = structuredClone(defaultConfig);
let draggedId = null;
const $ = (selector, root = document) => root.querySelector(selector);
const storage = {
  async get(key) {
    if (globalThis.chrome?.storage?.local) return chrome.storage.local.get(key);
    return { [key]: JSON.parse(localStorage.getItem(key) || 'null') };
  },
  set(payload) {
    if (globalThis.chrome?.storage?.local) return chrome.storage.local.set(payload);
    Object.entries(payload).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
    return Promise.resolve();
  }
};

async function loadConfig() {
  const stored = await storage.get(STORAGE_KEY);
  config = { ...structuredClone(defaultConfig), ...(stored[STORAGE_KEY] || {}) };
  config.cards = (config.cards || []).slice(0, MAX_CARDS);
  applyConfig();
}

function saveConfig() {
  storage.set({ [STORAGE_KEY]: config });
}

function applyConfig() {
  $('#page-title').textContent = config.title;
  $('#subtitle').textContent = config.subtitle;
  $('#global-scale').value = config.globalScale;
  $('#columns').value = config.columns;
  $('#edit-mode').checked = config.editMode;
  $('#preload-sites').checked = config.preload;
  $('#background').value = config.background;
  $('#accent').value = config.accent;
  $('#text-color').value = config.textColor;
  $('#custom-css').value = config.customCss;
  document.body.classList.toggle('editing', config.editMode);
  document.documentElement.style.setProperty('--scale', config.globalScale / 100);
  document.documentElement.style.setProperty('--columns', config.columns);
  document.documentElement.style.setProperty('--accent', config.accent);
  document.documentElement.style.setProperty('--text', config.textColor);
  if (config.background) document.body.style.background = backgroundValue(config.background);
  $('#user-css').textContent = config.customCss;
  renderCards();
}

function backgroundValue(value) {
  return value.startsWith('http') ? `center / cover fixed url("${value.replaceAll('"', '%22')}")` : value;
}

function renderCards() {
  const grid = $('#grid');
  grid.textContent = '';
  config.cards.forEach((card) => grid.append(createCard(card)));
}

function createCard(card) {
  const node = $('#card-template').content.firstElementChild.cloneNode(true);
  node.dataset.id = card.id;
  node.style.setProperty('--w', card.width || 1);
  node.style.setProperty('--h', card.height || 1);
  node.style.setProperty('--card-scale', (card.scale || 100) / 100);
  $('.title-input', node).value = card.title || 'Untitled';
  $('.type-select', node).value = card.type;
  $('.url-input', node).value = card.url || '';
  $('.width-input', node).value = card.width || 1;
  $('.height-input', node).value = card.height || 1;
  $('.scale-input', node).value = card.scale || 100;
  $('.render-input', node).checked = Boolean(card.render);
  $('.html-input', node).value = card.html || '';
  renderCardContent(card, $('.card-content', node));
  bindCardEvents(node, card);
  return node;
}

function renderCardContent(card, container) {
  container.textContent = '';
  if (card.type === 'site') {
    if (card.render || config.preload) {
      const iframe = document.createElement('iframe');
      iframe.loading = config.preload ? 'eager' : 'lazy';
      iframe.referrerPolicy = 'no-referrer';
      iframe.src = normalizeUrl(card.url);
      container.append(iframe);
    } else {
      container.innerHTML = `<div class="note">Site preview is off. Enable “Render site” or global preloading.</div>`;
    }
  } else if (card.type === 'html') {
    const sandbox = document.createElement('iframe');
    sandbox.sandbox = 'allow-forms allow-modals allow-popups allow-scripts';
    sandbox.srcdoc = card.html || '<p style="padding:1rem">Add custom HTML in the editor.</p>';
    container.append(sandbox);
  } else if (card.type === 'note') {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = card.html || 'Write your custom text here.';
    container.append(note);
  } else {
    const clock = document.createElement('div');
    clock.className = `clock ${card.type === 'clock-analog' ? 'analog' : ''}`;
    container.append(clock);
    updateClock(clock, card.type);
  }
}

function bindCardEvents(node, card) {
  const update = (patch) => {
    Object.assign(card, patch);
    saveConfig();
    renderCards();
  };
  $('.title-input', node).addEventListener('input', (event) => update({ title: event.target.value }));
  $('.type-select', node).addEventListener('change', (event) => update({ type: event.target.value }));
  $('.url-input', node).addEventListener('change', (event) => update({ url: event.target.value }));
  $('.width-input', node).addEventListener('change', (event) => update({ width: clamp(event.target.value, 1, 12) }));
  $('.height-input', node).addEventListener('change', (event) => update({ height: clamp(event.target.value, 1, 8) }));
  $('.scale-input', node).addEventListener('change', (event) => update({ scale: clamp(event.target.value, 50, 150) }));
  $('.render-input', node).addEventListener('change', (event) => update({ render: event.target.checked }));
  $('.html-input', node).addEventListener('change', (event) => update({ html: event.target.value }));
  $('.delete-card', node).addEventListener('click', () => { config.cards = config.cards.filter((item) => item.id !== card.id); saveConfig(); renderCards(); });
  $('.open-site', node).addEventListener('click', () => window.open(normalizeUrl(card.url), '_blank', 'noopener'));
  node.addEventListener('dragstart', () => { draggedId = card.id; node.classList.add('dragging'); });
  node.addEventListener('dragend', () => node.classList.remove('dragging'));
  node.addEventListener('dragover', (event) => event.preventDefault());
  node.addEventListener('drop', () => reorderCards(draggedId, card.id));
}

function updateClock(element, type) {
  const now = new Date();
  if (type === 'clock-analog') {
    element.innerHTML = '<span class="hand hour"></span><span class="hand minute"></span><span class="hand second"></span>';
    $('.hour', element).style.transform = `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() / 2}deg)`;
    $('.minute', element).style.transform = `rotate(${now.getMinutes() * 6}deg)`;
    $('.second', element).style.transform = `rotate(${now.getSeconds() * 6}deg)`;
  } else {
    element.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

function reorderCards(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const source = config.cards.findIndex((card) => card.id === sourceId);
  const target = config.cards.findIndex((card) => card.id === targetId);
  config.cards.splice(target, 0, config.cards.splice(source, 1)[0]);
  saveConfig();
  renderCards();
}

function normalizeUrl(url) {
  if (!url) return 'about:blank';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

function addCard(type = 'site') {
  if (config.cards.length >= MAX_CARDS) return alert(`The dashboard supports up to ${MAX_CARDS} cards.`);
  config.cards.push({ id: crypto.randomUUID(), type, title: 'New card', width: 1, height: 1, scale: 100, render: type === 'site', url: '', html: '' });
  saveConfig();
  renderCards();
}

function bindGlobalEvents() {
  setInterval(() => document.querySelectorAll('.clock').forEach((clock) => updateClock(clock, clock.classList.contains('analog') ? 'clock-analog' : 'clock-digital')), 1000);
  $('#page-title').addEventListener('input', (event) => { config.title = event.target.textContent; saveConfig(); });
  $('#subtitle').addEventListener('input', (event) => { config.subtitle = event.target.textContent; saveConfig(); });
  $('#add-site').addEventListener('click', () => addCard('site'));
  $('#add-widget').addEventListener('click', () => addCard('note'));
  $('#open-settings').addEventListener('click', () => $('#settings-dialog').showModal());
  $('#global-scale').addEventListener('input', (event) => { config.globalScale = event.target.value; applyConfig(); saveConfig(); });
  $('#columns').addEventListener('input', (event) => { config.columns = event.target.value; applyConfig(); saveConfig(); });
  $('#edit-mode').addEventListener('change', (event) => { config.editMode = event.target.checked; applyConfig(); saveConfig(); });
  $('#preload-sites').addEventListener('change', (event) => { config.preload = event.target.checked; applyConfig(); saveConfig(); });
  ['background', 'accent', 'text-color', 'custom-css'].forEach((id) => $(`#${id}`).addEventListener('input', syncSettings));
  $('#export-config').addEventListener('click', exportConfig);
  $('#import-config').addEventListener('change', importConfig);
  $('#reset-config').addEventListener('click', resetConfig);
  document.addEventListener('dblclick', () => { config.editMode = true; applyConfig(); saveConfig(); });
}

function syncSettings() {
  config.background = $('#background').value;
  config.accent = $('#accent').value;
  config.textColor = $('#text-color').value;
  config.customCss = $('#custom-css').value;
  applyConfig();
  saveConfig();
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: 'ultra-newtab-config.json' });
  link.click();
  URL.revokeObjectURL(url);
}

async function importConfig(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  config = { ...structuredClone(defaultConfig), ...JSON.parse(await file.text()) };
  config.cards = (config.cards || []).slice(0, MAX_CARDS);
  saveConfig();
  applyConfig();
}

function resetConfig() {
  if (!confirm('Reset the entire new tab studio?')) return;
  config = structuredClone(defaultConfig);
  saveConfig();
  applyConfig();
}

bindGlobalEvents();
loadConfig();
