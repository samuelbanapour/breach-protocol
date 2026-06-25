# Android release signing

The Android release build is signed with a keystore. The keystore file and its
passwords are **secrets** — they are gitignored and must never be committed.

- Local builds read credentials from `android/keystore.properties` (gitignored).
- CI reads them from GitHub Actions **secrets**.
- `android/app/build.gradle` resolves them (env vars first, then the properties file)
  and signs the `release` build type.

## 1. Generate the keystore (one time)

Run this once on your machine. It creates a dedicated keystore **outside the repo**,
writes the gitignored `android/keystore.properties`, and prints the values you need
for CI:

```bash
KS_DIR="$HOME/.android-keystores"
KS_FILE="$KS_DIR/breach-protocol-release.jks"
ALIAS="breachprotocol"
PROPS="$(git rev-parse --show-toplevel)/android/keystore.properties"
mkdir -p "$KS_DIR"
PASS="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"

keytool -genkeypair -v \
  -keystore "$KS_FILE" -storetype PKCS12 \
  -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Samuel Banapour, O=Samuel Banapour, C=US"

printf 'storeFile=%s\nstorePassword=%s\nkeyAlias=%s\nkeyPassword=%s\n' \
  "$KS_FILE" "$PASS" "$ALIAS" "$PASS" > "$PROPS"

echo
echo "==================  SAVE THESE  =================="
echo "Keystore:        $KS_FILE   (BACK THIS UP — losing it means you can never update the app on Play)"
echo "KEYSTORE_PASSWORD / KEY_PASSWORD: $PASS"
echo "KEY_ALIAS:       $ALIAS"
echo "KEYSTORE_BASE64 (paste into the GitHub secret):"
base64 -i "$KS_FILE"
echo "================================================="
```

> **Critical:** store the password in a password manager and back up the `.jks` file
> somewhere safe (it is intentionally outside the repo and gitignored). If you lose it,
> you cannot ship updates under the same app identity on Google Play.

## 2. Add the GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add four:

| Secret name | Value |
|---|---|
| `KEYSTORE_BASE64` | the long base64 blob printed above |
| `KEYSTORE_PASSWORD` | the generated password |
| `KEY_ALIAS` | `breachprotocol` |
| `KEY_PASSWORD` | the same generated password |

Or with the GitHub CLI:

```bash
gh secret set KEYSTORE_BASE64   < <(base64 -i "$HOME/.android-keystores/breach-protocol-release.jks")
gh secret set KEYSTORE_PASSWORD --body "PASTE_PASSWORD"
gh secret set KEY_ALIAS         --body "breachprotocol"
gh secret set KEY_PASSWORD      --body "PASTE_PASSWORD"
```

## 3. Build

- **CI:** push a tag (`git tag v0.1.1 && git push origin v0.1.1`). With the secrets set,
  the Android workflow produces a **signed** `app-release.apk` and `app-release.aab`,
  attached to the draft release. Without the secrets it falls back to an unsigned debug APK.
- **Local:** `npm run android:sync && cd android && ./gradlew assembleRelease bundleRelease`
  (needs JDK ≤ 20 for Gradle 8.2.1 — JDK 17 recommended).

## Which artifact to upload where

- **itch.io / sideloading:** the signed `app-release.apk`.
- **Google Play:** the `app-release.aab`.
