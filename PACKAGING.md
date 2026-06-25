# Packaging Breach Protocol as a downloadable app

The web game stays exactly as-is. Two thin wrappers turn the same static files into
downloadable apps:

- **Desktop** (Windows `.exe`/`.msi`, macOS `.dmg`, Linux `.AppImage`/`.deb`) — via **Tauri** (`src-tauri/`).
- **Android** (`.apk`) — via **Capacitor** (`android/`).

Both load the **same offline payload** produced by `scripts/make-dist.mjs`, which copies the
game into `dist/`, strips the Google AdSense loader, and makes the footer links relative so
everything works with no server.

## The fastest path: let CI build everything

You **cannot** build the Windows and Linux binaries on a Mac — Tauri builds per-OS. So the
supported flow is GitHub Actions, which builds each target on its native runner.

```bash
git tag v0.1.0
git push origin v0.1.0
```

That triggers two workflows:

- `.github/workflows/desktop-release.yml` → Windows, macOS (universal), and Linux desktop
  builds, attached to a **draft GitHub Release**.
- `.github/workflows/android-release.yml` → an Android **debug** APK, attached to the same release.

Open the draft release, download the assets, and upload them to **itch.io** (and point Keymailer
at the itch.io page). You can also trigger either workflow manually from the Actions tab
("Run workflow") without tagging.

## Building locally (optional)

Requires the matching toolchain installed:

```bash
npm install

# Desktop (only builds for the OS you're on):
#   needs Rust  -> https://rustup.rs
npm run desktop:dev      # run it in a window
npm run desktop:build    # produce installers in src-tauri/target/release/bundle/

# Android:
#   needs Android Studio / SDK + JDK 21 (JDK 25 is too new for the bundled Gradle)
npm run android:sync
npm run android:open     # opens Android Studio; Build > Build APK
```

## Identifiers

- App ID (both platforms): `com.samuelbanapour.breachprotocol`
- Icons are generated from `icon.svg` (`npx tauri icon`), committed under `src-tauri/icons/`
  and `android/app/src/main/res/mipmap-*`.

## Android signing

Signing is already wired into `android/app/build.gradle` and the Android workflow. With the
keystore secrets set, CI builds a **signed** `app-release.apk` + `app-release.aab`; without them
it falls back to an unsigned debug APK. See **[SIGNING.md](SIGNING.md)** for the one-time keystore
generation and the four GitHub secrets to add.
