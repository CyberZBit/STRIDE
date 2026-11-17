# STRIDE

STRIDE is an iPhone walking tracker that saves walk summaries in an on-device database. The app targets an iPhone XR running iOS 18.7.10. Expo SDK 58 requires iOS 16.4 or later.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/app/_layout.tsx` | App theme, fonts, storage initialization and root navigator |
| `src/app/(tabs)/_layout.tsx` | Expo Router tab bar |
| `src/app/(tabs)/index.tsx` | Home dashboard, distance totals and walk controls |
| `src/app/(tabs)/history.tsx` | Read-only chronological session list and empty state |
| `src/app/(tabs)/records.tsx` | Session, Day and Week record views |
| `src/app/(tabs)/settings.tsx` | Distance units, storage information and app version |
| `src/db/` | SQLite initialization, versioned migrations and queries |
| `src/domain/` | Stockholm calendar boundaries and measurement formatting |
| `src/state/` | Persisted preferences and focus-based reads |
| `src/ui/` | Theme, icons and shared screen components |
| `assets/icon.png` | iOS app icon |
| `app.json`, `eas.json` | Expo app config and internal development build profile |

## Dependencies

Expo SDK 58 pairs React Native 0.88 with React 19.3. Expo Router uses Expo Constants, Expo Linking, React Native Screens and Safe Area Context. Expo SQLite stores app data. Expo Dev Client supports testing native code on the device. Expo Status Bar, Expo Symbols and Expo Font provide the dark interface, native icons and bundled DM Sans and Barlow Condensed fonts. TypeScript and the React type definitions are development dependencies.

Expo Location measures position during a walk. Expo Task Manager, the iOS Core Motion module and maps are planned for later milestones.

## Install on Windows

Use a Node.js LTS release that satisfies the `engines` entry in `package.json`. Run these commands in PowerShell from the STRIDE folder.

```powershell
npm.cmd install
npx.cmd expo install --check
npx.cmd expo-doctor
npm.cmd run typecheck
npm.cmd run check:ios
```

Use `npm.cmd ci` for clean installations from the checked-in lockfile. The iOS export checks JavaScript bundling on Windows. The GitHub Actions workflow compiles the native iOS app on a macOS runner.

### AltStore Classic source

Once the first release finishes, open **AltStore Classic → Browse → Sources → +** and paste this URL.

```text
https://github.com/CyberZBit/STRIDE/releases/latest/download/altstore-source.json
```

Each push to `main` starts a build. A successful build publishes the unsigned IPA and a matching feed as GitHub release assets. GitHub supplies a different build number for each run and retry. In AltStore, open **My Apps** to check for updates. If STRIDE was installed from a file and doesn't show an update there, open its listing under **Browse** and install from the source using the same Apple Account. Keep AltServer running on Windows and connect the phone by Wi-Fi or USB for signing.

### Sideload from Windows

1. On GitHub, open **Actions → Build iPhone IPA → Run workflow**. After it succeeds, open the run summary and download **STRIDE-unsigned** under **Artifacts**. Extract the outer ZIP to get `STRIDE-unsigned.ipa`. GitHub's standard runners are free on public repositories. Private repositories use the account's Actions allowance.
2. Follow the [AltStore Classic Windows instructions](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows) to install Apple's Windows iTunes and iCloud prerequisites and install AltServer. Use the Apple downloads in that guide.
3. Unlock the iPhone, connect it by USB, and tap **Trust** if prompted. For Wi-Fi refreshes, open iTunes, select the phone, enable **Sync with this iPhone over Wi-Fi**, and click **Apply**. On the PC, open AltServer from the system tray and select **Install AltStore → your iPhone**. Enter your free Apple Account in AltServer.
4. On the iPhone, open **Settings → General → VPN & Device Management**, select the developer profile for your Apple Account, and tap **Trust**. In **Settings → Privacy & Security → Developer Mode**, turn it on, restart, and confirm after unlocking.
5. Get `STRIDE-unsigned.ipa` into the iPhone's Files app. You can open the GitHub run in Safari while signed in, download the ZIP, and tap it in Files to extract the IPA. Keep AltServer running and leave the iPhone connected. Open **AltStore → My Apps → +**, pick the IPA, then launch STRIDE from the Home Screen.
6. Refresh before the seven-day signing period expires. With AltServer running and the iPhone on the same Wi-Fi network or connected over USB, tap **AltStore → My Apps → Refresh All**. The release build bundles its JavaScript and can launch independently of the PC.

### EAS development build

EAS Build offers a limited free build allowance. The documented EAS method for signing and installing a development build on a physical iPhone requires an active Apple Developer Program membership. Apple lists it at US$99 per year or the local equivalent. The Expo account used to submit builds is separate from the app itself. STRIDE has no sign-in or backend.

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile development
```

Register the iPhone when prompted, install the finished development build from its EAS link and enable iOS Developer Mode. With the iPhone and PC on the same network, start Metro in the project folder and open the development build on the iPhone.

```powershell
npm.cmd start
```

Open each tab, switch between all three record views, change kilometres to miles, confirm the dashboard uses miles, then relaunch the app and check that the setting persisted. A clean install should show zero walking distance and an empty history.

[Expo SDK compatibility](https://docs.expo.dev/versions/v58.0.0/) · [EAS development builds on iOS](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical&mode=development-build) · [Apple Developer Program](https://developer.apple.com/programs/) · [EAS build allowance](https://docs.expo.dev/billing/plans/)

## Initial SQLite schema

| Table | Contents |
| --- | --- |
| `sessions` | Start and end timestamps, elapsed and moving durations, raw and confirmed walking distances, steps, average and maximum speeds, and lifecycle status |
| `gps_points` | Session ID, coordinates, fix timestamp, accuracy, reported speed and transportation flag |
| `transport_flags` | Session ID, time interval, distance, classification and review state |
| `settings` | Key/value preferences, seeded with kilometres |

The initial migration uses `PRAGMA user_version`, write-ahead logging and a transaction. Foreign keys cascade from a deleted session to its route points and flags. A partial unique index permits at most one open session. Timestamps are UTC Unix milliseconds. Durations use milliseconds, distances use metres and speeds use metres per second. A null step count represents unavailable data. Home groups completed sessions by their start time in `Europe/Stockholm` and adds their confirmed walking distance. Weeks begin Monday.

Tap **Start walk** and grant precise location while using the app. Keep STRIDE open while walking. Locking the phone or backgrounding the app pauses tracking. Resume from Home, then tap **Finish and save walk**. The completed walk appears in History and contributes to the day and week totals. GPS fixes are held in memory during a session. SQLite stores distance, elapsed and moving time, and speed summaries. The default iOS backup policy still applies to this database. An unfinished walk is lost if iOS terminates the app. Background tracking, route maps, step counts and record computation are planned for later milestones.
