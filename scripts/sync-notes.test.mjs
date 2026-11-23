import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncNotes } from './sync-notes.mjs';

const SCRATCH = process.env.SYNC_TEST_TMP || os.tmpdir();
const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sync-notes.mjs');

function setup() {
  const root = fs.mkdtempSync(path.join(SCRATCH, 'sync-'));
  const vault = path.join(root, 'vault');
  const dest = path.join(root, 'dest');
  for (const d of ['posts', 'attachments']) {
    fs.mkdirSync(path.join(vault, d), { recursive: true });
    fs.mkdirSync(path.join(dest, d), { recursive: true });
  }
  return { root, vault, dest };
}
const w = (...p) => { const c = p.pop(); fs.mkdirSync(path.dirname(path.join(...p)), { recursive: true }); fs.writeFileSync(path.join(...p), c); };

test('copies new and changed, leaves unchanged untouched', () => {
  const { vault, dest } = setup();
  w(vault, 'posts/new.md', 'n');
  w(vault, 'posts/chg.md', 'v2');
  w(vault, 'posts/same.md', 's');
  w(vault, 'attachments/a.png', 'img');
  w(dest, 'posts/chg.md', 'v1');
  w(dest, 'posts/same.md', 's');
  const old = new Date('2020-01-01');
  fs.utimesSync(path.join(dest, 'posts/same.md'), old, old);
  const r = syncNotes({ vault, dest });
  assert.deepEqual(r.added.sort(), ['attachments/a.png', 'posts/new.md']);
  assert.deepEqual(r.changed, ['posts/chg.md']);
  assert.equal(fs.readFileSync(path.join(dest, 'posts/chg.md'), 'utf8'), 'v2');
  assert.equal(fs.statSync(path.join(dest, 'posts/same.md')).mtimeMs, old.getTime());
});

test('never deletes; lists repo-only, ignoring posts.11tydata.mjs', () => {
  const { vault, dest } = setup();
  w(vault, 'posts/a.md', 'a');
  w(dest, 'posts/old.md', 'o');
  w(dest, 'posts/posts.11tydata.mjs', 'x');
  w(dest, 'attachments/gone.png', 'g');
  const r = syncNotes({ vault, dest });
  assert.deepEqual(r.repoOnly.sort(), ['attachments/gone.png', 'posts/old.md']);
  assert.ok(fs.existsSync(path.join(dest, 'posts/old.md')));
  assert.ok(fs.existsSync(path.join(dest, 'posts/posts.11tydata.mjs')));
  assert.ok(fs.existsSync(path.join(dest, 'attachments/gone.png')));
});

test('icloud placeholder stops the run and copies nothing', () => {
  const { vault, dest } = setup();
  w(vault, 'posts/a.md', 'a');
  w(vault, 'posts/.B.md.icloud', '');
  const r = syncNotes({ vault, dest });
  assert.equal(r.placeholders.length, 1);
  assert.equal(fs.existsSync(path.join(dest, 'posts/a.md')), false);
  assert.equal(fs.existsSync(path.join(vault, 'templates/Post.md')), false);
  w(vault, 'attachments/.pic.png.icloud', '');
  const cli = spawnSync(process.execPath, [script], { env: { ...process.env, BLOG_VAULT: vault, BLOG_DEST: dest }, encoding: 'utf8' });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stdout, /brctl download/);
  assert.equal(fs.existsSync(path.join(dest, 'posts/a.md')), false);
});

test('conflict copies are warned about and not copied', () => {
  const { vault, dest } = setup();
  w(vault, 'posts/Name.md', 'a');
  w(vault, 'posts/Name 2.md', 'b');
  w(vault, 'posts/Alone 2.md', 'c');
  w(vault, 'attachments/img.png', 'i');
  w(vault, 'attachments/img 2.png', 'j');
  const r = syncNotes({ vault, dest });
  assert.deepEqual(r.conflicts.sort(), ['attachments/img 2.png', 'posts/Name 2.md']);
  assert.equal(fs.existsSync(path.join(dest, 'posts/Name 2.md')), false);
  assert.equal(fs.existsSync(path.join(dest, 'attachments/img 2.png')), false);
  assert.ok(fs.existsSync(path.join(dest, 'posts/Alone 2.md')));
});

test('skips dotfiles and DS_Store', () => {
  const { vault, dest } = setup();
  w(vault, 'posts/.hidden.md', 'h');
  w(vault, 'attachments/.DS_Store', 'd');
  w(vault, '.obsidian/app.json', '{}');
  const r = syncNotes({ vault, dest });
  assert.deepEqual(r.added, []);
});

test('seeds template and how-to into an empty vault, never back', () => {
  const { vault, dest } = setup();
  w(dest, 'templates/Post.md', 'T');
  w(dest, 'HOW-TO-PUBLISH.md', 'H');
  const r = syncNotes({ vault, dest });
  assert.deepEqual(r.seeded.sort(), ['HOW-TO-PUBLISH.md', 'templates/Post.md']);
  assert.equal(fs.readFileSync(path.join(vault, 'templates/Post.md'), 'utf8'), 'T');
  w(vault, 'templates/Post.md', 'edited');
  const r2 = syncNotes({ vault, dest });
  assert.deepEqual(r2.seeded, []);
  assert.equal(fs.readFileSync(path.join(vault, 'templates/Post.md'), 'utf8'), 'edited');
  assert.equal(fs.readFileSync(path.join(dest, 'templates/Post.md'), 'utf8'), 'T');
});

test('missing vault fails clearly', () => {
  const { root, dest } = setup();
  assert.throws(() => syncNotes({ vault: path.join(root, 'nope'), dest }), /Vault not found/);
  const cli = spawnSync(process.execPath, [script], { env: { ...process.env, BLOG_VAULT: path.join(root, 'nope'), BLOG_DEST: dest }, encoding: 'utf8' });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /Vault not found/);
});
