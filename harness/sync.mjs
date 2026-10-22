#!/usr/bin/env node
// Pull the capability data from the ai-harness knowledge base into this page.
//
//   node harness/sync.mjs <path/to/kb>      (or HARNESS_KB=<path/to/kb>)
//   node harness/sync.mjs <path/to/kb> --copy   uncommitted KB edits are wording only
//
// KB commits whose subject starts with "Copy:" are wording only too: they are published
// but do not count as a review, so they add no changelog entry and keep review dates.
//
// 1. Validates the KB data with the KB's own explorer/build.sh (run in a temp copy).
// 2. Reads every committed revision of the data to build a changelog and
//    per-tool "last reviewed" dates.
// 3. Drops internal-only fields, then writes harness/data.json, embeds the same
//    JSON in harness/index.html, regenerates harness/index.md and bumps the
//    sitemap lastmod.
// No dependencies beyond Node 18+, git and jq (for build.sh).

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, '..');
const COPY_ONLY = process.argv.includes('--copy');
const KB_ARG = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.HARNESS_KB;
if (!KB_ARG) { console.error('Usage: node harness/sync.mjs <path/to/kb> [--copy]  (or set HARNESS_KB)'); process.exit(2); }
const KB = resolve(KB_ARG);
const DATA_DIR = join(KB, 'explorer/data');

const git = (...args) => execFileSync('git', ['-C', KB, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const die = (msg) => { console.error(msg); process.exit(1); };

if (!existsSync(join(DATA_DIR, 'catalog.json'))) die(`No catalog at ${DATA_DIR}`);

// ---- 1. validate with the KB's own checks --------------------------------------
{
  const tmp = mkdtempSync(join(tmpdir(), 'harness-sync-'));
  try {
    cpSync(join(KB, 'explorer'), join(tmp, 'explorer'), { recursive: true });
    execFileSync('bash', [join(tmp, 'explorer/build.sh')], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch {
    die('KB validation failed (see above); nothing written.');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- 2. load the working tree and every committed revision ---------------------
function loadWorkingTree() {
  const catalog = JSON.parse(readFileSync(join(DATA_DIR, 'catalog.json'), 'utf8'));
  const hosts = {};
  for (const f of readdirSync(join(DATA_DIR, 'hosts')).filter((f) => f.endsWith('.json'))) {
    const h = JSON.parse(readFileSync(join(DATA_DIR, 'hosts', f), 'utf8'));
    hosts[h.host] = h;
  }
  return { catalog, hosts };
}

function loadRevision(rev) {
  const files = git('ls-tree', '-r', '--name-only', rev).split('\n');
  const catPath = files.find((f) => /(^|\/)explorer\/data\/catalog\.json$/.test(f));
  if (!catPath) return null;
  const base = catPath.replace(/catalog\.json$/, '');
  const catalog = JSON.parse(git('show', `${rev}:${catPath}`));
  const hosts = {};
  for (const f of files.filter((f) => f.startsWith(base + 'hosts/') && f.endsWith('.json'))) {
    const h = JSON.parse(git('show', `${rev}:${f}`));
    hosts[h.host] = h;
  }
  return { catalog, hosts };
}

const revisions = git('log', '--reverse', '--format=%H%x09%cI%x09%s', '--', ':(glob)**/explorer/data/**')
  .trim().split('\n').filter(Boolean)
  .map((line) => { const [rev, date, subject] = line.split('\t'); return { rev, date, subject, snap: loadRevision(rev) }; })
  .filter((r) => r.snap);

const current = loadWorkingTree();
const head = revisions.at(-1);
const dirty = !head || JSON.stringify(head.snap) !== JSON.stringify(current);
if (dirty) {
  if (!COPY_ONLY) console.warn('warning: KB data has uncommitted changes; dating them today.');
  // Local date, like the commit dates (%cI); toISOString() is UTC and can be a day behind.
  const now = new Date();
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
  revisions.push({ rev: null, date: today, subject: COPY_ONLY ? 'Copy: uncommitted wording edits' : 'Uncommitted review', snap: current });
}

// ---- 3. changelog --------------------------------------------------------------
const day = (iso) => iso.slice(0, 10);
// Prefer today's label so renamed capabilities read the same across the changelog.
const capLabel = (snap, id) => (current.catalog.capabilities.find((c) => c.id === id) || snap.catalog.capabilities.find((c) => c.id === id) || {}).label || id;
const hostLabel = (snap, id) => (snap.catalog.hosts.find((h) => h.id === id) || {}).label || id;

function diff(prev, next) {
  const changes = [];
  const prevCaps = new Set(prev.catalog.capabilities.map((c) => c.id));
  const nextCaps = new Set(next.catalog.capabilities.map((c) => c.id));
  for (const id of nextCaps) if (!prevCaps.has(id)) changes.push({ type: 'cap-added', cap: id, capLabel: capLabel(next, id) });
  for (const id of prevCaps) if (!nextCaps.has(id)) changes.push({ type: 'cap-removed', cap: id, capLabel: capLabel(prev, id) });
  for (const id of Object.keys(next.hosts)) {
    if (!prev.hosts[id]) { changes.push({ type: 'host-added', host: id, hostLabel: hostLabel(next, id) }); continue; }
    for (const [cap, cell] of Object.entries(next.hosts[id].cells)) {
      const was = prev.hosts[id].cells[cap];
      if (was && was.level !== cell.level) {
        changes.push({ type: 'level', host: id, hostLabel: hostLabel(next, id), cap, capLabel: capLabel(next, cap), from: was.level, to: cell.level });
      }
    }
  }
  for (const id of Object.keys(prev.hosts)) if (!next.hosts[id]) changes.push({ type: 'host-removed', host: id, hostLabel: hostLabel(prev, id) });
  return changes;
}

const changelog = [];
const hostReviewed = {};
revisions.forEach((r, i) => {
  const prev = revisions[i - 1];
  if (prev && /^copy:/i.test(r.subject)) return;
  for (const id of Object.keys(r.snap.hosts)) {
    if (!prev || JSON.stringify(prev.snap.hosts[id]) !== JSON.stringify(r.snap.hosts[id])) hostReviewed[id] = day(r.date);
  }
  if (!prev) {
    changelog.push({ date: day(r.date), kind: 'initial', hosts: Object.keys(r.snap.hosts).length, caps: r.snap.catalog.capabilities.length, changes: [] });
    return;
  }
  const changes = diff(prev.snap, r.snap);
  const edited = Object.keys(r.snap.hosts).filter((id) => prev.snap.hosts[id] && JSON.stringify(prev.snap.hosts[id]) !== JSON.stringify(r.snap.hosts[id]));
  if (!changes.length && !edited.length) return;
  const last = changelog.at(-1);
  if (last.date === day(r.date)) {
    // Same-day follow-ups fold into the entry they continue.
    if (last.kind === 'review') { last.edited = [...new Set([...last.edited, ...edited])]; last.changes.push(...changes); }
    else { last.hosts = Object.keys(r.snap.hosts).length; last.caps = r.snap.catalog.capabilities.length; }
    return;
  }
  changelog.push({ date: day(r.date), kind: 'review', edited, changes });
});
changelog.reverse();

// ---- 4. public payload -----------------------------------------------------------
// Editorial notes that point at internal talk material are rewritten or removed.
const scrub = (s) => String(s ?? '')
  .replace(/one-harness-many-agents-presenter-notes\.md/g, 'verification log')
  .replace(/presenter (notes|log)/gi, 'verification log')
  .replace(/[;,]?\s*(deck )?slides? \d+(\/\d+)?/gi, '')
  .replace(/verification log,? verification( log)?/gi, 'verification log')
  .replace(/\s{2,}/g, ' ')
  .trim();

// Main vendor sources for each tool, listed under "Sources & data". Every cell also cites its own
// source; these are the entry points. Check the links when adding a tool.
const MAIN_SOURCES = {
  'claude-code': [['Documentation', 'https://code.claude.com/docs/en/overview'], ['Changelog', 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md']],
  'codex': [['Documentation', 'https://learn.chatgpt.com/docs/'], ['Source code', 'https://github.com/openai/codex']],
  'github-copilot': [['Documentation', 'https://docs.github.com/en/copilot'], ['VS Code agent customization', 'https://code.visualstudio.com/docs/agent-customization/overview'], ['CLI changelog', 'https://github.com/github/copilot-cli/blob/main/changelog.md']],
  'cursor': [['Documentation', 'https://cursor.com/docs']],
  'gemini-cli': [['Documentation', 'https://geminicli.com/docs/'], ['Source code', 'https://github.com/google-gemini/gemini-cli'], ['Move to Antigravity CLI', 'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/']],
  'antigravity': [['Documentation', 'https://antigravity.google/docs/overview'], ['CLI changelog', 'https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md'], ['Move from Gemini CLI', 'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/']],
  'opencode': [['Documentation', 'https://opencode.ai/docs/'], ['Source code', 'https://github.com/anomalyco/opencode']],
};

const { catalog, hosts } = current;
const noSources = catalog.hosts.filter((h) => hosts[h.id] && !MAIN_SOURCES[h.id]).map((h) => h.id);
if (noSources.length) die(`No MAIN_SOURCES entry for: ${noSources.join(', ')}`);
const updated = day((revisions.findLast((r, i) => i === 0 || !/^copy:/i.test(r.subject)) || revisions.at(-1)).date);
const payload = {
  updated,
  firstPublished: day(revisions[0].date),
  levels: catalog.levels,
  areas: catalog.areas.map(({ id, label }) => ({ id, label })),
  capabilities: catalog.capabilities.map(({ id, area, label, tier, strategy }) => ({ id, area, label, tier, strategy: scrub(strategy) })),
  hosts: catalog.hosts.filter((h) => hosts[h.id]).map(({ id, label }) => {
    const h = hosts[id];
    return {
      id, label,
      reviewed: hostReviewed[id] || updated,
      headless: h.headless,
      homeDirs: h.homeDirs,
      summary: scrub(h.summary),
      unique: h.unique.map((u) => ({ title: u.title, detail: scrub(u.detail), source: scrub(u.source) })),
      gotchas: h.gotchas.map(scrub),
      cells: Object.fromEntries(Object.entries(h.cells).map(([k, c]) => [k, { level: c.level, native: c.native, note: scrub(c.note), source: scrub(c.source) }])),
      sources: MAIN_SOURCES[id].map(([label, url]) => ({ label, url })),
    };
  }),
  changelog,
};

const leaked = JSON.stringify(payload).match(/presenter|\bslides?\b \d|\.int\.|(^|[^a-z])talks\//i);
if (leaked) die(`Internal reference survived scrubbing: "${leaked[0]}"`);

// ---- 5. write --------------------------------------------------------------------
const json = JSON.stringify(payload);
writeFileSync(join(HERE, 'data.json'), JSON.stringify(payload, null, 1) + '\n');

const pagePath = join(HERE, 'index.html');
let page = readFileSync(pagePath, 'utf8');
const embedded = json.replace(/<\//g, '<\\/').replace(/<!--/g, '\\u003c!--');
const dataRe = /(<script id="data" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!dataRe.test(page)) die('index.html has no <script id="data"> block');
page = page.replace(dataRe, (_, a, b) => a + embedded + b)
  .replace(/("dateModified": ")[^"]*(")/, `$1${updated}$2`)
  .replace(/(<time id="updated" datetime=")[^"]*(">)[^<]*(<\/time>)/, `$1${updated}$2${fmtDate(updated)}$3`);
writeFileSync(pagePath, page);

writeFileSync(join(HERE, 'index.md'), markdown(payload));

const sitemapPath = join(SITE, 'sitemap.xml');
const sitemap = readFileSync(sitemapPath, 'utf8');
const sm = sitemap.replace(/(<loc>https:\/\/paulochang\.com\/harness\/<\/loc>\s*<lastmod>)[^<]*/, `$1${updated}`);
if (sm !== sitemap) writeFileSync(sitemapPath, sm);

const count = (lv) => payload.hosts.reduce((n, h) => n + Object.values(h.cells).filter((c) => c.level === lv).length, 0);
console.log(`Synced ${payload.hosts.length} tools x ${payload.capabilities.length} capabilities, updated ${updated}, ` +
  `${changelog.length} changelog entries (N ${count('N')}, C ${count('C')}, P ${count('P')}, - ${count('-')}, ? ${count('?')}).`);

// ---- helpers ---------------------------------------------------------------------
function fmtDate(iso) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function markdown(p) {
  const cellMd = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const out = [
    '# Agent Harness Tracker — Paulo Chang',
    '',
    'How the major AI coding agents compare on the parts of a team harness you can share: instruction files, skills, agent profiles, hooks, policy, MCP servers, code intelligence and packaging.',
    '',
    `Data last reviewed ${fmtDate(p.updated)}. Tracking ${p.hosts.length} tools across ${p.capabilities.length} capabilities. Live page: https://paulochang.com/harness/ · Raw data: https://paulochang.com/harness/data.json`,
    '',
    'Levels: ' + Object.entries(p.levels).map(([k, v]) => `\`${k}\` ${v}`).join('; ') + '.',
    '',
    '## Tools',
    '',
  ];
  for (const h of p.hosts) {
    out.push(`### ${h.label}`, '', h.summary, '', `- Headless: \`${h.headless}\``, `- Config: ${h.homeDirs.map((d) => '`' + d + '`').join(', ')}`, `- Last reviewed: ${h.reviewed}`, '');
    if (h.unique.length) { out.push('Distinctive:', ''); h.unique.forEach((u) => out.push(`- **${u.title}.** ${u.detail}`)); out.push(''); }
    if (h.gotchas.length) { out.push('Gotchas:', ''); h.gotchas.forEach((g) => out.push(`- ${g}`)); out.push(''); }
  }
  out.push('## Capability matrix', '');
  for (const a of p.areas) {
    const caps = p.capabilities.filter((c) => c.area === a.id);
    if (!caps.length) continue;
    out.push(`### ${a.label}`, '', `| Capability | Tier | ${p.hosts.map((h) => h.label).join(' | ')} |`, `|---|---|${p.hosts.map(() => '---').join('|')}|`);
    for (const c of caps) out.push(`| ${cellMd(c.label)} | ${c.tier} | ${p.hosts.map((h) => '`' + h.cells[c.id].level + '`' + (h.cells[c.id].native ? ' ' + cellMd(h.cells[c.id].native) : '')).join(' | ')} |`);
    out.push('');
  }
  out.push('## What changed', '');
  for (const e of p.changelog) {
    if (e.kind === 'initial') { out.push(`- ${e.date}: first published with ${e.hosts} tools and ${e.caps} capabilities.`); continue; }
    const lv = e.changes.filter((c) => c.type === 'level');
    out.push(`- ${e.date}: reviewed ${e.edited.length} tool${e.edited.length === 1 ? '' : 's'}` + (lv.length ? `; ${lv.length} level change${lv.length === 1 ? '' : 's'}:` : '; notes and sources only.'));
    for (const c of e.changes) {
      if (c.type === 'level') out.push(`  - ${c.hostLabel}, ${c.capLabel}: \`${c.from}\` → \`${c.to}\``);
      else out.push(`  - ${c.type.replace('-', ' ')}: ${c.hostLabel || c.capLabel}`);
    }
  }
  out.push('', '## Main sources', '');
  for (const h of p.hosts) out.push(`- ${h.label}: ${h.sources.map((s) => `[${s.label}](${s.url})`).join(', ')}`);
  out.push('', '---', '', '[GitHub](https://github.com/paulochang) · [LinkedIn](https://www.linkedin.com/in/paulochang)', '');
  return out.join('\n');
}
