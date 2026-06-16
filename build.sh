#!/bin/bash
# Generate per-portal builds of Breach Protocol (one ad SDK each — never two in one build).
# Output: builds/<portal>/  and  builds/<portal>.zip  (the zip is what you upload).
#
#   ./build.sh                # builds all portals
#   ./build.sh crazygames     # build just one
set -e
cd "$(dirname "$0")"
export COPYFILE_DISABLE=1   # don't let macOS/exFAT inject ._AppleDouble files

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
    sed -i.bak "s#window.BP_PORTAL = 'gamedistribution';#window.BP_PORTAL = 'gamedistribution'; window.BP_GD_GAME_ID = 'abca00ba8c594a07aa0c5eba4c3212c3';#" "$out/index.html"
    rm -f "$out/index.html.bak"
  fi

  find "$out" -name '._*' -delete 2>/dev/null || true   # strip exFAT detritus
  # zip the CONTENTS (index.html at the zip root — portals require this), not the folder
  rm -f "builds/$portal.zip"
  ( cd "$out" && zip -qr "../$portal.zip" . -x '._*' '*/._*' '.DS_Store' )
  echo "✓ builds/$portal  (+ builds/$portal.zip, index.html at root)"
done

echo
echo "Upload the matching builds/<portal>.zip to each portal's developer dashboard."
echo "Reminder: set your real game id(s) before zipping for GameDistribution."
