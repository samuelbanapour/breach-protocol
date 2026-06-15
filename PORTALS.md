# Publishing Breach Protocol to game portals (ad revenue)

The game has a provider-agnostic ad layer (`Ads` in `game.js`). Your own site
(`index.html` with `window.BP_PORTAL = 'none'`) stays **ad-free**. For each portal you
ship a separate build with that portal's SDK — **never two ad SDKs in one build.**

## Where the ads appear (kept tasteful, portal-friendly)
- **Interstitial** — when you leave a finished game ("Back to Menu").
- **Rewarded (opt-in)** — on a loss, a "▶ Watch ad — continue" button: restores the core
  (Blue Team) or cuts your Trace (Red Hat). One per game. Only shown in portal builds.

No ads ever interrupt active play, and the rewarded ad is always optional — this matches
CrazyGames/Poki/GameDistribution placement policies.

## Build the per-portal packages
```bash
./build.sh                 # builds all → builds/<portal>/ and builds/<portal>.zip
./build.sh crazygames      # just one
```
Upload the matching `builds/<portal>.zip` to each portal's dashboard.

## Can I be on all of them at once?
**Yes — with one caveat.** These coexist cleanly (non-exclusive):
**GameDistribution + CrazyGames + Newgrounds + Y8 + GameJolt + itch.io**.
**Poki is selective and leans exclusive** — apply separately and follow their terms; don't
assume the Poki build can run elsewhere.

## Per-portal steps

### CrazyGames — `builds/crazygames.zip`
1. Create a developer account → https://developer.crazygames.com
2. Submit a new game, upload the zip. SDK is already wired (`crazygames-sdk-v3`).
3. Revenue share is automatic once approved. No game id needed in code.

### GameDistribution (Azerion) — `builds/gamedistribution.zip`
1. Register the game → https://gamedistribution.com (developer dashboard) to get a **game id**.
2. Put that id in `build.sh` (replace `REPLACE_WITH_YOUR_GAMEDISTRIBUTION_GAME_ID`) **or** edit
   `window.BP_GD_GAME_ID` in `builds/gamedistribution/index.html`, then re-zip.
3. Upload / provide the hosted URL. Widest passive distribution.

### Poki — `builds/poki.zip`
1. Apply at https://app.poki.com (Poki for Developers). They review for quality + mobile.
2. SDK is wired (`poki-sdk v2`). Follow their integration checklist if accepted.

### Newgrounds — no SDK build needed
- Upload the **`none`** build (this repo root) at https://www.newgrounds.com — they wrap it
  with their own ad rev-share. Same for **Y8** (https://www.y8.com).

### GameJolt / itch.io — no ads, exposure/sales
- itch.io (https://itch.io) and GameJolt (https://gamejolt.com): upload the root build as an
  HTML5 game. itch.io is pay-what-you-want/donations rather than ads.

## Reality check
Revenue scales with traffic; HTML5 RPMs are low, so a single game is usually pocket money
until it gets popular. Portals matter because they supply the audience. Mobile-friendliness
is the biggest acceptance/earnings factor — this build is **landscape-optimized** (portrait
shows a "rotate device" prompt); a deeper portrait redesign would help further.
