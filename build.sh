#!/bin/bash
# Generate per-portal builds of Breach Protocol (one ad SDK each — never two in one build).
# Output: builds/<portal>/  and  builds/<portal>.zip  (the zip is what you upload).
#
#   ./build.sh                # builds all portals
#   ./build.sh crazygames     # build just one
set -e
cd "$(dirname "$0")"

ASSETS="game.js style.css icon.svg og-image.png"
PORTALS="${*:-gamedistribution crazygames poki}"

for portal in $PORTALS; do
  out="builds/$portal"
  rm -rf "$out"; mkdir -p "$out"
  cp $ASSETS "$out"/

  # swap the ad-provider flag in index.html
  sed "s#window.BP_PORTAL = 'none';#window.BP_PORTAL = '$portal';#" index.html > "$out/index.html"

  # GameDistribution also needs your game id
  if [ "$portal" = "gamedistribution" ]; then
    sed -i.bak "s#window.BP_PORTAL = 'gamedistribution';#window.BP_PORTAL = 'gamedistribution'; window.BP_GD_GAME_ID = 'REPLACE_WITH_YOUR_GAMEDISTRIBUTION_GAME_ID';#" "$out/index.html"
    rm -f "$out/index.html.bak"
  fi

  ( cd builds && rm -f "$portal.zip" && zip -qr "$portal.zip" "$portal" )
  echo "✓ builds/$portal  (+ builds/$portal.zip)"
done

echo
echo "Upload the matching builds/<portal>.zip to each portal's developer dashboard."
echo "Reminder: set your real game id(s) before zipping for GameDistribution."
