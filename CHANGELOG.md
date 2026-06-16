# Changelog

All notable changes to **Breach Protocol** (web). Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning is loosely semantic.

## [1.2.0] — 2026-06-16 — Monetization & store assets

### Added
- **Provider-agnostic ad layer** (`Ads` in `game.js`) supporting GameDistribution,
  CrazyGames, and Poki. The public site stays **ad-free** (`BP_PORTAL = 'none'`).
- **Tasteful ad hooks** — an interstitial when leaving a finished game, and an opt-in
  **rewarded "Continue"** that revives you on a loss (restore core / cut trace). Portal
  builds only.
- **`build.sh`** — generates an upload-ready package per portal (`builds/<portal>.zip`).
- **`PORTALS.md`** — submission guide for CrazyGames, GameDistribution, Poki, Newgrounds,
  Y8, GameJolt, and itch.io (incl. the can-I-be-on-all-of-them rules).
- **`make_thumbs.py`** + store art in `assets/` — JPGs at 512×384, 512×512, 200×120,
  1280×720, 1280×550, and 720×1280.

### Changed
- **Mobile pass** — landscape-optimized, full-viewport canvas on touch devices, with a
  portrait "rotate your device" prompt.

### Fixed
- Landscape thumbnails: the "BREACH PROTOCOL" wordmark was overlapping the shield art.
- Portal zips now place `index.html` at the **archive root** (portals require it) and
  strip stray exFAT `._` files.

## [1.1.0] — 2026-06-14 — Launch & sharing

### Added
- **Open Graph / Twitter share card** (`og-image.png` + meta tags) for rich link previews.
- Deployed to **Vercel** with GitHub auto-deploy on push to `main`.
- Registration for the free **`breachprotocol.is-a.dev`** subdomain (PR pending merge;
  a scheduled task finishes the Vercel wiring once it lands).

### Changed
- Canonical URL is now **https://breachprotocol.vercel.app** (cleaner than the default
  project URL).

### Fixed
- Removed a stray 58 MB macOS `.app` bundle that was accidentally committed; history
  rewritten and `*.app/` git-ignored. Repo back to ~90 KB.

## [1.0.0] — 2026-06-13 — Web port

### Added
- Full **HTML5 Canvas + JavaScript** port — no build step, no dependencies.
- **Two complete modes:** 🔵 Blue Team (tower-defense) and 🔴 Red Hat (reverse
  tower-defense — launch attacks and breach the enemy core under a rising Trace meter).
- **65 achievements** with unlock toasts and a browsable achievements screen.
- Persistent **records** (best waves / fastest breach) and unlocks via `localStorage`.
- Procedural **Web Audio** sound effects; mouse + touch input.

## Origins (desktop, pre-web)

Breach Protocol began as a desktop game before being ported to the browser:

- **0.3.0** — Red Hat attacker mode, smarter focus-firing AI, achievements grown to 65,
  score/timer records, procedural sound, custom icon, and a signed macOS `.app`
  (PyInstaller).
- **0.2.0** — Python/**pygame** desktop version; added the Red Hat attacker mode.
- **0.1.0** — original single-file **HTML** tower-defense prototype (Blue Team only).
