# engineerit AI mobile shells

Native Android and iOS apps for [engineerit.ai](https://engineerit.ai). They live in this folder so they can be built without editing the Next.js app.

| | |
| --- | --- |
| App id | `ai.engineerit.app` |
| Display name | engineerit AI |
| Start URL | https://engineerit.ai |

The WebView loads https://engineerit.ai directly so the Capacitor bridge is available on that origin. If the site cannot be reached, the app shows `www/error.html` (offline or connection failure). Camera, photo, and document uploads use the system pickers. Push registration, deep links, and safe-area insets are included. Store copy, privacy answers, and the secret list are in [STORE_SUBMISSION.md](STORE_SUBMISSION.md).

## Payments

Digital plans stay on the website and are charged by Moyasar.

- **Android** sends `moyasar.com` (and any leftover Paddle checkout host) to Chrome Custom Tabs, the in-app browser. The subscription pages themselves stay in the WebView.
- **iOS** does not sell anything. Purchase links, plan prices, and checkout hosts are hidden or cancelled, and a sign-in notice is shown instead. See the App Store Guideline 3.1 note in `STORE_SUBMISSION.md` before you submit.

## Local setup

Node 20 or newer.

```bash
cd mobile
npm ci
npm test
npx cap sync
```

Icons and the splash screen are generated from `../public/engineerit-logo.PNG`:

```bash
npm run assets
```

Open the native projects with Android Studio or Xcode:

```bash
npx cap open android
npx cap open ios
```

A release Android App Bundle needs `android/keystore.properties` (see `android/keystore.properties.example`) or the `ANDROID_KEYSTORE_*` environment variables used by GitHub Actions. Do not commit the keystore. Android push needs `android/app/google-services.json` from Firebase, also not committed.

## Deep links

- `https://engineerit.ai/...` and `https://www.engineerit.ai/...` (App Links / Universal Links)
- `engineerit://chat` and `engineerit://open/profile`

Host the files in `well-known/` on the website before store review:

- `https://engineerit.ai/.well-known/assetlinks.json`
- `https://engineerit.ai/.well-known/apple-app-site-association`
- the same two paths on `www.engineerit.ai`

Replace `APPLE_TEAM_ID` and `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` first. Those files are not added to the Next.js app from this folder.

## CI

- `.github/workflows/mobile-android-aab.yml` builds a release AAB.
- `.github/workflows/mobile-ios-archive.yml` builds an `.xcarchive` on macOS, and an IPA when the signing secrets exist.

Secret names and the accounts that have to create them are listed in `STORE_SUBMISSION.md`.
