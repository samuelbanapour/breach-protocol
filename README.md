# Breach Protocol — Cyber Defense (web)

A cybersecurity strategy game that runs entirely in the browser. No build step, no
dependencies — just static HTML5 Canvas + JavaScript.

Play **two complete modes**:

- **🔵 Blue Team (defend)** — a tower-defense. Waves of cyber-attacks (Malware, DDoS,
  Phishing, SQL Injection, Ransomware, Zero-Days, and APT bosses) race down the network
  toward your Core. Deploy the right defense against the right threat — each defense is
  **3× vs its matching threat and weak vs the rest** — manage your budget, upgrade, and survive.
- **🔴 Red Hat (attack)** — tower-defense in reverse. You're the attacker: spend **intel**
  to launch attacks the enemy defenses can't counter, breach their Core, and stay under
  **100% Trace** before the (smart, self-escalating) blue team catches you. Tools: DDoS
  Surge, Zero-Day Exploit (cloak), Cover Tracks.

Plus **65 achievements** with unlock toasts and a browsable achievements screen, fastest-breach
and best-wave records, and procedural sound — all saved in your browser via `localStorage`.

## Controls

- **Mouse / touch** — pick a side and difficulty, click defenses/attacks, place towers, inspect.
- **Hotkeys:** `1`–`6` build/launch · `Q`/`W` abilities/tools · `F` speed · `P` pause ·
  `Space` start wave / begin intrusion · `Esc` cancel.

## Run locally

It's fully static. Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New… → Project**, import the repo.
3. Framework Preset: **Other** (no build command, output is the repo root). Click **Deploy**.

Or with the CLI from this folder:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

There's no build step — Vercel serves the static files directly.

## Files

| file | purpose |
|------|---------|
| `index.html` | page shell + canvas |
| `game.js` | the entire game (logic, rendering, achievements, saves) |
| `style.css` | page/canvas styling (responsive, keeps 16:9) |
| `icon.svg` | favicon |
| `vercel.json` | static hosting config + security headers |

## Reset progress

Clear the site's `localStorage` (browser devtools → Application → Local Storage), or in the
console: `localStorage.removeItem('breach_protocol_save')`.
