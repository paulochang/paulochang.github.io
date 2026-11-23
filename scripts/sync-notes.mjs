// Copy notes from the Obsidian vault into blog-src/. Never commits, never deletes.
// Env: BLOG_VAULT (source vault), BLOG_DEST (destination, default: the repo's blog-src).
// Layout is flat: only files directly inside posts/ and attachments/ are synced.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_VAULT = path.join(os.homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Blog');
const DEFAULT_DEST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'blog-src');
const SKIP = new Set(['.DS_Store', '.obsidian', '.trash']);
const SEEDS = ['templates/Post.md', 'HOW-TO-PUBLISH.md'];

function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Names like "Note 2.md" that sit next to "Note.md" (iCloud conflict copies).
function conflictBase(name, names) {
  const m = name.match(/^(.+) \d+(\.[^.]+)?$/);
  if (!m) return null;
  const base = m[1] + (m[2] || '');
  return names.has(base) ? base : null;
}

function sameBytes(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.size === sb.size && fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

export function syncNotes({ vault = DEFAULT_VAULT, dest = DEFAULT_DEST } = {}) {
  if (!fs.existsSync(vault) || !fs.statSync(vault).isDirectory()) {
    throw new Error(`Vault not found: ${vault}\nSet BLOG_VAULT to the vault folder.`);
  }
  const folders = [
    { dir: 'posts', keep: (n) => n.endsWith('.md') },
    { dir: 'attachments', keep: () => true },
  ];
  const result = { placeholders: [], added: [], changed: [], repoOnly: [], conflicts: [], seeded: [] };

  // Placeholders are dotfiles, so look for them before the dotfile filter.
  for (const { dir } of folders) {
    for (const n of listFiles(path.join(vault, dir))) {
      if (n.startsWith('.') && n.endsWith('.icloud')) result.placeholders.push(path.join(vault, dir, n));
    }
  }
  if (result.placeholders.length) return result;

  for (const { dir, keep } of folders) {
    const names = listFiles(path.join(vault, dir)).filter((n) => !n.startsWith('.') && !SKIP.has(n) && keep(n));
    const set = new Set(names);
    for (const n of names) {
      if (conflictBase(n, set)) {
        result.conflicts.push(`${dir}/${n}`);
        continue;
      }
      const src = path.join(vault, dir, n);
      const dst = path.join(dest, dir, n);
      const exists = fs.existsSync(dst);
      if (exists && sameBytes(src, dst)) continue;
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      (exists ? result.changed : result.added).push(`${dir}/${n}`);
    }
    for (const n of listFiles(path.join(dest, dir))) {
      if (n.startsWith('.') || (dir === 'posts' && !n.endsWith('.md'))) continue;
      if (!set.has(n)) result.repoOnly.push(`${dir}/${n}`);
    }
  }

  // One-way seeding: repo -> vault, only when missing.
  for (const rel of SEEDS) {
    const target = path.join(vault, rel);
    const source = path.join(dest, rel);
    if (fs.existsSync(target) || !fs.existsSync(source)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    result.seeded.push(rel);
  }
  return result;
}

export function formatSummary(r) {
  const out = [];
  if (r.placeholders.length) {
    out.push('Some files have not downloaded from iCloud. Nothing was copied.', '');
    r.placeholders.forEach((p) => out.push(`  ${p}`));
    out.push('', 'Fix: open the vault in Obsidian on the Mac, or run `brctl download <path>` for each, then rerun.');
    return out.join('\n');
  }
  const section = (title, items) => {
    out.push(`${title} (${items.length})`);
    items.forEach((i) => out.push(`  ${i}`));
  };
  section('Copied (new)', r.added);
  section('Copied (changed)', r.changed);
  section('In the repo only (git rm if you renamed or deleted them)', r.repoOnly);
  section('Conflict copies, not copied (resolve in the vault)', r.conflicts);
  section('Seeded into the vault', r.seeded);
  return out.join('\n');
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const r = syncNotes({
      vault: process.env.BLOG_VAULT || DEFAULT_VAULT,
      dest: process.env.BLOG_DEST || DEFAULT_DEST,
    });
    console.log(formatSummary(r));
    if (r.placeholders.length) process.exit(1);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
