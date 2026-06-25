// Build the offline `dist/` payload that the desktop (Tauri) and Android (Capacitor)
// wrappers package. The web repo stays untouched; this just produces a clean, ad-free,
// fully-relative copy of the game for a downloadable app.
//
//   node scripts/make-dist.mjs
//
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// Static files the game needs at runtime (index.html is rewritten below).
const FILES = ['game.js', 'style.css', 'icon.svg', 'og-image.png', 'privacy.html', 'contact.html'];
const DIRS = ['assets'];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const f of FILES) cpSync(join(root, f), join(dist, f));
for (const d of DIRS) cpSync(join(root, d), join(dist, d), { recursive: true });

// Rewrite index.html for offline/standalone use.
let html = readFileSync(join(root, 'index.html'), 'utf8');

// 1) Drop the Google AdSense loader — it can't (and shouldn't) run in a packaged app.
html = html.replace(
  /\s*<!-- Google AdSense[\s\S]*?<\/script>\n/,
  '\n'
);

// 2) Make the footer links work without server routing (/privacy -> privacy.html).
html = html.replace('href="/privacy"', 'href="privacy.html"')
           .replace('href="/contact"', 'href="contact.html"');

writeFileSync(join(dist, 'index.html'), html);

console.log('✓ dist/ built (ad-free, relative links) — ready for Tauri / Capacitor');
