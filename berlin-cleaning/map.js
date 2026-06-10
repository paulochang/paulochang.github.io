const STRINGS = {
  de: {
    title:          'BSR Straßenreinigung Berlin',
    subtitle:       'Reinigungsklassen · Klick zum Ein-/Ausblenden',
    loadingData:    'Daten werden geladen…',
    loadingBuilding:'GeoJSON wird aufgebaut…',
    loadingPct:     n => `Lädt… ${n}%`,
    searchPlaceholder: 'Adresse suchen…',
    searching:      'Suche…',
    noResults:      'Keine Ergebnisse gefunden',
    searchError:    'Fehler bei der Suche',
    themeLight:     'Zum hellen Thema wechseln',
    themeDark:      'Zum dunklen Thema wechseln',
    legend:         'Legende',
    segments:       n => `${n.toLocaleString('de')} Straßenabschnitte`,
    from:           'von',
    to:             'bis',
    errorPrefix:    'Fehler: ',
    splashTitle:       'BSR Straßenreinigung Berlin',
    splashAbout:       'Der offizielle BSR-Reinigungsplan für alle Berliner Straßen, visualisiert. Jede Straße ist farblich nach ihrer Reinigungsklasse (RKL) kodiert und zeigt, wie oft sie gereinigt wird.',
    splashClassesTitle:'Reinigungsklassen',
    splashHowTitle:    'Bedienung',
    splashHow: [
      'Auf eine Straße tippen – Details zur Reinigungsklasse',
      'Legende öffnen, um Klassen ein- oder auszublenden',
      'Adresse eingeben, um zu einem Ort zu navigieren',
    ],
    splashPrivacyTitle:'Datenschutz (DSGVO)',
    splashPrivacy:     'Kartenkacheln werden von <b>CARTO</b> geladen, Adressdaten von <b>Komoot/Photon</b>. Dabei wird Ihre IP-Adresse an diese Dienste übertragen. Es werden <b>keine Cookies</b> gesetzt. BSR-Daten werden nach dem ersten Laden lokal im Browser gespeichert (IndexedDB). Mit „Karte öffnen" stimmen Sie dieser Verarbeitung zu.',
    splashAccept:      'Karte öffnen →',
    splashBack:        '← Zur Startseite',
  },
  en: {
    title:          'BSR Street Cleaning Berlin',
    subtitle:       'Cleaning classes · Click to show/hide',
    loadingData:    'Loading data…',
    loadingBuilding:'Building GeoJSON…',
    loadingPct:     n => `Loading… ${n}%`,
    searchPlaceholder: 'Search address…',
    searching:      'Searching…',
    noResults:      'No results found',
    searchError:    'Search error',
    themeLight:     'Switch to light theme',
    themeDark:      'Switch to dark theme',
    legend:         'Legend',
    segments:       n => `${n.toLocaleString('en')} street segments`,
    from:           'from',
    to:             'to',
    errorPrefix:    'Error: ',
    splashTitle:       'BSR Street Cleaning Berlin',
    splashAbout:       'Berlin\'s official BSR street cleaning schedule, visualised. Each street is colour-coded by its cleaning class (Reinigungsklasse, RKL) — showing how often it is cleaned by the city.',
    splashClassesTitle:'Cleaning Classes',
    splashHowTitle:    'How to use',
    splashHow: [
      'Click any street — see its cleaning class and schedule',
      'Open the legend to show or hide individual classes',
      'Search for an address to navigate to a location',
    ],
    splashPrivacyTitle:'Data & Privacy (GDPR)',
    splashPrivacy:     'Map tiles are loaded from <b>CARTO</b>; address search uses <b>Komoot/Photon</b>. Your IP address is transmitted to these services as part of normal browser operation. <b>No cookies</b> are set. BSR data is cached locally in your browser (IndexedDB) after first load. By clicking "Open Map" you consent to this processing.',
    splashAccept:      'Open Map →',
    splashBack:        '← Back to homepage',
  },
};

const RKL_INFO = {
  'A1a': { color: '#4ecdc4',
    de: { label: 'A1a — täglich',   desc: 'BSR, täglich (Mo–Sa)'           },
    en: { label: 'A1a — daily',     desc: 'BSR, daily (Mon–Sat)'           } },
  'A1b': { color: '#a8e063',
    de: { label: 'A1b — 6×/Woche',  desc: 'BSR, 6× pro Woche'              },
    en: { label: 'A1b — 6×/week',   desc: 'BSR, 6× per week'               } },
  'A2a': { color: '#ffd000',
    de: { label: 'A2a — 3×/Woche',  desc: 'BSR, 3× pro Woche'              },
    en: { label: 'A2a — 3×/week',   desc: 'BSR, 3× per week'               } },
  'A2b': { color: '#ffaa00',
    de: { label: 'A2b — 2×/Woche',  desc: 'BSR, 2× pro Woche'              },
    en: { label: 'A2b — 2×/week',   desc: 'BSR, 2× per week'               } },
  'A3':  { color: '#ff6b3b',
    de: { label: 'A3 — 1×/Woche',   desc: 'BSR, 1× pro Woche'              },
    en: { label: 'A3 — 1×/week',    desc: 'BSR, 1× per week'               } },
  'A4':  { color: '#ff3b3b',
    de: { label: 'A4 — 14-tägig',   desc: 'BSR, alle 2 Wochen'             },
    en: { label: 'A4 — fortnightly',desc: 'BSR, every 2 weeks'             } },
  'B':   { color: '#c77dff',
    de: { label: 'B — Eigentümer',  desc: 'Reinigung durch Hauseigentümer' },
    en: { label: 'B — Owner',       desc: 'Cleaned by property owner'      } },
  'C':   { color: '#74b9ff',
    de: { label: 'C — Plätze',      desc: 'Öffentliche Plätze / BSR'       },
    en: { label: 'C — Squares',     desc: 'Public squares / BSR'           } },
  'P':   { color: '#55efc4',
    de: { label: 'P — Parks',       desc: 'Parks und Grünanlagen'          },
    en: { label: 'P — Parks',       desc: 'Parks and green spaces'         } },
};

const ORDER = ['A1a', 'A1b', 'A2a', 'A2b', 'A3', 'A4', 'B', 'C', 'P'];

const DARK_STYLE  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const PHOTON_URL  = 'https://photon.komoot.io/api/';
const BERLIN_BBOX = '13.0884,52.3380,13.7611,52.6755';
const DB_NAME     = 'bsr-map';
const DB_VER      = 1;

const layerVisible = Object.fromEntries(ORDER.map(k => [k, true]));
let geoData  = null;
let counts   = null;
let lang     = navigator.language.startsWith('de') ? 'de' : 'en';
let isDark   = true;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore('data');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}
function dbGet(db, key) {
  return new Promise(resolve => {
    const req = db.transaction('data').objectStore('data').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}
function dbPut(db, key, val) {
  return new Promise(resolve => {
    const tx = db.transaction('data', 'readwrite');
    tx.objectStore('data').put(val, key);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

async function fetchData(onProgress) {
  // Repeat visits: decompress from cached binary instead of re-downloading
  try {
    const db = await openDB();
    const bin = await dbGet(db, 'bin');
    if (bin) return JSON.parse(pako.inflate(new Uint8Array(bin), { to: 'string' }));
  } catch { /* fall through to network */ }

  document.getElementById('loading-text').textContent = STRINGS[lang].loadingData;
  const res = await fetch('data.bin');
  const total = +res.headers.get('Content-Length') || 0;
  let buffer;

  if (total && res.body?.getReader) {
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress?.(Math.round((received / total) * 100));
    }
    buffer = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) { buffer.set(c, off); off += c.length; }
  } else {
    buffer = new Uint8Array(await res.arrayBuffer());
  }

  document.getElementById('loading-text').textContent = STRINGS[lang].loadingBuilding;
  await new Promise(r => setTimeout(r, 30));
  const data = JSON.parse(pako.inflate(buffer, { to: 'string' }));

  // Cache compressed binary for repeat visits (fire-and-forget)
  openDB().then(db => dbPut(db, 'bin', buffer.buffer)).catch(() => {});

  return data;
}

function addDataLayers(map) {
  if (!geoData || map.getSource('rkl')) return;
  map.addSource('rkl', { type: 'geojson', data: geoData });

  for (const cls of ORDER) {
    const info = RKL_INFO[cls];
    if (!info) continue;
    const vis = layerVisible[cls] ? 'visible' : 'none';

    map.addLayer({
      id: `rkl-${cls}`,
      type: 'line',
      source: 'rkl',
      filter: ['==', ['get', 'rkl'], cls],
      layout: { visibility: vis },
      paint: {
        'line-color': info.color,
        'line-opacity': 0.8,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 2.5, 17, 4],
      },
    });

    map.addLayer({
      id: `rkl-${cls}-hit`,
      type: 'line',
      source: 'rkl',
      filter: ['==', ['get', 'rkl'], cls],
      layout: { visibility: vis },
      paint: { 'line-color': info.color, 'line-opacity': 0, 'line-width': 16 },
    });
  }

  // Trigger repaint once GeoJSON worker finishes — ensures rendering even if map
  // entered idle state before the 89k-feature worker processing completed.
  const onSourceData = (e) => {
    if (e.sourceId === 'rkl' && e.isSourceLoaded) {
      map.off('sourcedata', onSourceData);
      map.triggerRepaint();
    }
  };
  map.on('sourcedata', onSourceData);
}

function buildLegend(map) {
  const legendEl = document.getElementById('legend-body');
  legendEl.innerHTML = '';
  for (const cls of ORDER) {
    if (!counts?.[cls]) continue;
    const info = RKL_INFO[cls];
    const item = document.createElement('div');
    item.className = 'leg-item';
    if (!layerVisible[cls]) item.classList.add('inactive');
    item.innerHTML = `
      <div class="leg-swatch" style="background:${info.color}"></div>
      <div class="leg-label">${info[lang].label} <span style="color:var(--hover-border)">(${counts[cls].toLocaleString(lang)})</span></div>`;
    item.addEventListener('click', () => {
      layerVisible[cls] = !layerVisible[cls];
      item.classList.toggle('inactive', !layerVisible[cls]);
      const v = layerVisible[cls] ? 'visible' : 'none';
      if (map.getLayer(`rkl-${cls}`))     map.setLayoutProperty(`rkl-${cls}`,     'visibility', v);
      if (map.getLayer(`rkl-${cls}-hit`)) map.setLayoutProperty(`rkl-${cls}-hit`, 'visibility', v);
    });
    legendEl.appendChild(item);
  }
}

function applyLang(newLang, map) {
  lang = newLang;
  const s = STRINGS[lang];
  document.documentElement.lang                        = lang;
  document.title                                       = s.title;
  document.querySelector('header h1').textContent      = s.title;
  document.querySelector('.subtitle').textContent      = s.subtitle;
  document.getElementById('search-input').placeholder  = s.searchPlaceholder;
  document.getElementById('lang-de').classList.toggle('active', lang === 'de');
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('theme-btn').title           = isDark ? s.themeLight : s.themeDark;
  document.getElementById('legend-label').textContent  = s.legend;
  const statsEl = document.getElementById('stats');
  if (geoData) {
    statsEl.classList.remove('stats-loading');
    statsEl.textContent = s.segments(geoData.features.length);
    buildLegend(map);
  } else {
    statsEl.classList.add('stats-loading');
    statsEl.textContent = s.loadingData;
  }
}

function init() {
  // Show the map immediately; data loads in parallel
  const map = new maplibregl.Map({
    container: 'map',
    style: DARK_STYLE,
    center: [13.405, 52.52],
    zoom: 12,
  });

  let styleReady = false;

  function tryAddLayers() {
    if (!styleReady || !geoData) return;
    addDataLayers(map);
  }

  map.on('style.load', () => {
    if (!styleReady) {
      styleReady = true;
      document.getElementById('loading').style.display = 'none';
    }
    tryAddLayers(); // also handles re-add after theme switch
  });

  // Single click handler — topmost feature only
  let activePopup = null;
  const hitLayerIds = () => ORDER.filter(cls => map.getLayer(`rkl-${cls}-hit`)).map(cls => `rkl-${cls}-hit`);

  map.on('click', e => {
    const features = map.queryRenderedFeatures(e.point, { layers: hitLayerIds() });
    if (!features.length) return;
    const p = features[0].properties;
    const info = RKL_INFO[p.rkl];
    if (!info) return;
    const s = STRINGS[lang];
    if (activePopup) activePopup.remove();
    activePopup = new maplibregl.Popup({ maxWidth: '280px' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-class" style="color:${info.color}">${p.rkl}</div>
        <div class="popup-street">${p.street || '—'}</div>
        <div class="popup-detail">${p.von ? s.from + ' ' + p.von : ''} ${p.bis ? s.to + ' ' + p.bis : ''}</div>
        <div class="popup-detail" style="margin-top:4px">${info[lang].desc}</div>
      `)
      .addTo(map);
  });

  map.on('mousemove', e => {
    const features = map.queryRenderedFeatures(e.point, { layers: hitLayerIds() });
    map.getCanvas().style.cursor = features.length ? 'pointer' : '';
  });

  // Address search with Photon autocomplete
  const searchInput   = document.getElementById('search-input');
  const searchClear   = document.getElementById('search-clear');
  const searchResults = document.getElementById('search-results');
  let searchMarker    = null;
  let searchDebounce  = null;

  function updateClearBtn() {
    searchClear.style.display = searchInput.value ? 'flex' : 'none';
  }

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.style.display = 'none';
    updateClearBtn();
    searchInput.focus();
  });

  async function doSearch(q) {
    if (q.length < 2) { searchResults.style.display = 'none'; return; }
    const s = STRINGS[lang];
    searchResults.style.display = 'block';
    searchResults.innerHTML = `<div class="sr-none">${s.searching}</div>`;
    try {
      const params = new URLSearchParams({ q, limit: 5, lang, bbox: BERLIN_BBOX });
      const data = await fetch(`${PHOTON_URL}?${params}`).then(r => r.json());
      const features = data.features ?? [];
      if (!features.length) {
        searchResults.innerHTML = `<div class="sr-none">${s.noResults}</div>`;
        return;
      }
      searchResults.innerHTML = '';
      features.forEach(feat => {
        const p = feat.properties;
        const name = p.name || '';
        const street = p.street && p.housenumber
          ? `${p.street} ${p.housenumber}`
          : (p.street || '');
        const city = [p.postcode, p.city].filter(Boolean).join(' ');
        const label = [name, street !== name ? street : null, city]
          .filter(Boolean).join(', ');
        const div = document.createElement('div');
        div.className = 'sr-item';
        div.textContent = label || p.type || '?';
        div.addEventListener('click', () => {
          const [lng, lat] = feat.geometry.coordinates;
          map.flyTo({ center: [lng, lat], zoom: 16 });
          if (searchMarker) searchMarker.remove();
          searchMarker = new maplibregl.Marker({ color: '#4a9eff' })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup().setHTML(`<b>${name || label.split(',')[0]}</b>`))
            .addTo(map)
            .togglePopup();
          searchResults.style.display = 'none';
          searchInput.value = name || label.split(',')[0];
          updateClearBtn();
        });
        searchResults.appendChild(div);
      });
    } catch {
      searchResults.innerHTML = `<div class="sr-none">${STRINGS[lang].searchError}</div>`;
    }
  }

  searchInput.addEventListener('input', () => {
    updateClearBtn();
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => doSearch(searchInput.value.trim()), 350);
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounce);
      doSearch(searchInput.value.trim());
    } else if (e.key === 'Escape') {
      searchResults.style.display = 'none';
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap')) searchResults.style.display = 'none';
  });

  // Theme toggle
  const themeBtn = document.getElementById('theme-btn');
  themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('light', !isDark);
    themeBtn.textContent = isDark ? '☀' : '🌙';
    themeBtn.title = isDark ? STRINGS[lang].themeLight : STRINGS[lang].themeDark;
    map.setStyle(isDark ? DARK_STYLE : LIGHT_STYLE);
  });

  // Language toggle
  document.getElementById('lang-de').addEventListener('click', () => { if (lang !== 'de') applyLang('de', map); });
  document.getElementById('lang-en').addEventListener('click', () => { if (lang !== 'en') applyLang('en', map); });

  // Legend panel toggle
  document.getElementById('legend-toggle').addEventListener('click', () => {
    const isOpen = document.getElementById('legend-panel').classList.toggle('open');
    document.querySelector('.toggle-arrow').textContent = isOpen ? '▼' : '▲';
  });

  // Apply initial lang — geoData not ready yet, shows "loading" text in stats
  applyLang(lang, map);

  // Fetch data in parallel with map tile loading
  const progressBar = document.getElementById('legend-progress');
  fetchData(pct => {
    const el = document.getElementById('stats');
    if (el.classList.contains('stats-loading')) {
      el.textContent = STRINGS[lang].loadingPct(pct);
    }
    progressBar.style.width = pct + '%';
  }).then(data => {
    geoData = data;
    counts = Object.fromEntries(ORDER.map(k => [k, 0]));
    for (const f of geoData.features) {
      const k = f.properties.rkl;
      if (k in counts) counts[k]++;
    }
    progressBar.style.display = 'none';
    const statsEl = document.getElementById('stats');
    statsEl.classList.remove('stats-loading');
    statsEl.textContent = STRINGS[lang].segments(geoData.features.length);
    buildLegend(map);
    tryAddLayers();
  }).catch(e => {
    progressBar.style.display = 'none';
    const statsEl = document.getElementById('stats');
    statsEl.classList.remove('stats-loading');
    statsEl.textContent = STRINGS[lang].errorPrefix + e.message;
    console.error(e);
  });
}

function showSplash() {
  const s = STRINGS[lang];
  document.getElementById('loading').style.display = 'none';

  document.getElementById('splash-title').textContent        = s.splashTitle;
  document.getElementById('splash-about').textContent        = s.splashAbout;
  document.getElementById('splash-classes-title').textContent = s.splashClassesTitle;
  document.getElementById('splash-how-title').textContent    = s.splashHowTitle;
  document.getElementById('splash-privacy-title').textContent = s.splashPrivacyTitle;
  document.getElementById('splash-privacy-text').innerHTML   = s.splashPrivacy;
  document.getElementById('splash-back').textContent         = s.splashBack;
  document.getElementById('splash-accept').textContent       = s.splashAccept;

  const classesEl = document.getElementById('splash-classes');
  classesEl.innerHTML = '';
  for (const cls of ORDER) {
    const info = RKL_INFO[cls];
    const div = document.createElement('div');
    div.className = 'splash-cls';
    div.innerHTML = `<div class="splash-cls-swatch" style="background:${info.color}"></div><span>${info[lang].label}</span>`;
    classesEl.appendChild(div);
  }

  const howEl = document.getElementById('splash-how-list');
  howEl.innerHTML = '';
  for (const item of s.splashHow) {
    const li = document.createElement('li');
    li.textContent = item;
    howEl.appendChild(li);
  }

  document.getElementById('splash').style.display = 'flex';

  document.getElementById('splash-accept').addEventListener('click', () => {
    localStorage.setItem('bsr-consent', '1');
    document.getElementById('splash').style.display = 'none';
    document.getElementById('loading').style.display = 'flex';
    init();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('bsr-consent')) {
    init();
  } else {
    showSplash();
  }
});
