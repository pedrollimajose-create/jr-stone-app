# JR Stone WorkFlow – staff app (iOS + Android)

Native iOS and Android app for JR Stone staff, built with Capacitor around the live
WorkFlow job board at https://jr-stone-job-board.netlify.app.

The app opens the live workflow, so logins and role rules work exactly as on the website
(fitters, labourers and templaters see only the Day plan; production staff see only
Production). Anything deployed to the Netlify site appears in the app straight away,
with no app store update.

## What's in here

| Path | What it is |
| --- | --- |
| `capacitor.config.json` | App name, bundle id `com.jrstone.workflow`, and the live site URL |
| `android/` | Android Studio project (location, camera and notification permissions set) |
| `ios/` | Xcode project (location in background, camera and photo permissions set) |
| `www/offline.html` | Screen shown when the phone has no signal |
| `assets/` | Placeholder icon and splash. Replace with the JR Stone logo and run `npm run icons` |
| `web-bridge/jr-native.js` | Helpers the web app will use for clock in/out with live location and job photos (phase 2) |
| `.github/workflows/` | Automatic Android and iOS builds on GitHub |

## Building

**Automatically (recommended):** push this folder to a GitHub repo. On every push to `main`:
- *Android build* produces an installable test APK (download it from the run's Artifacts).
  Once the signing secrets below are added, it also produces the signed `.aab` for Google Play.
- *iOS build* checks the project compiles. Once the Apple secrets are added, it signs the app
  and uploads it to TestFlight.

**On a computer:** `npm install`, then `npx cap sync`, then `npm run open:android` (Android Studio)
or `npm run open:ios` (Xcode, Mac only).

## Secrets to add in GitHub (Settings → Secrets and variables → Actions)

Android (Google Play Console, $25 one-off):
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
  (an upload key made once with `keytool`; keep a backup, it signs every future update)

iOS (Apple Developer Program, $99/year):
- `APPLE_TEAM_ID`: from developer.apple.com → Membership
- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (the .p8 file's text pasted as-is; `ASC_KEY_P8_BASE64` also works): an App Store Connect API key
  (App Store Connect → Users and Access → Integrations, role "Admin" so the build can create signing certificates)
- Create the app record `com.jrstone.workflow` in App Store Connect first.

## Releasing to staff only

- **Android:** Google Play internal testing track (up to 100 testers by email), or a private
  app through Managed Google Play.
- **iPhone:** TestFlight (up to 10,000 testers, builds last 90 days), or a Custom App through
  Apple Business Manager for permanent private distribution.

## Phase 2: clock in/out and job photos

1. Add `web-bridge/jr-native.js` to the job board and buttons that call
   `JRNative.clockIn(jobId)`, `JRNative.clockOut()`, `JRNative.takeJobPhoto()` and
   `JRNative.uploadJobPhoto(jobId, dataUrl)`.
2. Add `/api/clock`, `/api/location` and `/api/photos` to the Netlify `api` function,
   storing clock records, location points and photos (Netlify Blobs).
3. Add an office view showing who is clocked in, where, and each job's finished photos.

Live location only runs while someone is clocked in, and Android shows a notification
while it is active.
