# STRIDE

STRIDE is an iPhone walking tracker that saves walk routes and summaries in an on-device database. The app targets an iPhone XR running iOS 18.7.10. Expo SDK 58 requires iOS 16.4 or later.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/app/_layout.tsx` | App theme, fonts, storage initialization and root navigator |
| `src/app/(tabs)/_layout.tsx` | Expo Router tab bar |
| `src/app/(tabs)/index.tsx` | Home dashboard, distance totals and walk controls |
| `src/app/(tabs)/history.tsx` | Chronological session list with links to saved routes |
| `src/app/walk/[id].tsx` | Finish summary, saved route and walk deletion |
| `src/app/(tabs)/records.tsx` | Session, Day and Week record views |
| `src/app/(tabs)/settings.tsx` | Distance units, storage information and app version |
| `src/db/` | SQLite initialization, versioned migrations and queries |
| `src/domain/` | Stockholm calendar boundaries and measurement formatting |
| `src/state/` | Persisted preferences and focus-based reads |
| `src/ui/` | Theme, icons and shared screen components |
| `modules/stride-native/`, `native/StrideWalkWidget/` | Apple Maps route view, ActivityKit bridge, and Lock Screen extension |
| `assets/icon.png` | iOS app icon |
| `app.json`, `eas.json` | Expo app config and internal development build profile |

## Dependencies

Expo SDK 58 pairs React Native 0.88 with React 19.3. Expo Router uses Expo Constants, Expo Linking, React Native Screens and Safe Area Context. Expo SQLite stores app data. Expo Dev Client supports testing native code on the device. Expo Status Bar, Expo Symbols and Expo Font provide the dark interface, native icons and bundled DM Sans and Barlow Condensed fonts. TypeScript and the React type definitions are development dependencies.

Expo Location measures position during a walk. The map uses Apple's muted dark style and draws route overlays locally. Apple Maps loads the base map over the network. Session statistics and saved GPS points stay on the device.

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

### Walk replay on Windows

Run `npm.cmd run preview:walk`, then open `dist/walk-preview.html` in a browser. Start a walk, simulate a lock and unlock, and end the walk. The replay uses sample fixes and STRIDE's distance and records calculations. To check just the calculations, run `npm.cmd run preview:walk -- --check`.

The replay approximates the iPhone layout. Use a native iPhone build to check Apple Maps, the Motion & Fitness permission prompt, the Lock Screen activity, and GPS delivery while the phone is locked. Start a walk outdoors, lock the screen for a minute while walking, unlock it, and verify that the route and distance include the locked portion. End the walk and check History and Records.

### AltStore Classic source

Once the first release finishes, open **AltStore Classic → Browse → Sources → +** and paste this URL.

```text
https://github.com/CyberZBit/STRIDE/releases/latest/download/altstore-source.json
```

Each push to `main` starts a build. A successful build publishes the unsigned IPA and a matching feed as GitHub release assets. GitHub supplies a different build number for each run and retry. In AltStore, open **My Apps** to check for updates. If STRIDE was installed from a file and doesn't show an update there, open its listing under **Browse** and install from the source using the same Apple Account. Keep AltServer running on Windows and connect the phone by Wi-Fi or USB for signing.

Keep the **STRIDE Walk** extension if AltStore asks about app extensions. It supplies the Lock Screen Live Activity and uses one additional App ID. The GitHub build embeds the extension after Expo prebuild.

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
| `gps_points` | Session ID, coordinates, fix timestamp, accuracy, reported speed, segment breaks and transportation flag |
| `transport_flags` | Session ID, time interval, distance, classification and review state |
| `settings` | Key/value preferences, seeded with kilometres |

The initial migration uses `PRAGMA user_version`, write-ahead logging and a transaction. Foreign keys cascade from a deleted session to its route points and flags. A partial unique index permits at most one open session. Timestamps are UTC Unix milliseconds. Durations use milliseconds, distances use metres and speeds use metres per second. A null step count represents unavailable data. Home groups completed sessions by their start time in `Europe/Stockholm` and adds their confirmed walking distance. Weeks begin Monday.

Tap **Start walk** and grant precise location while using the app. The live map appears after the first usable GPS fix. Tap **End walk** to save the route and see the finish summary. In **History → View route and details**, you can review the route or delete the walk with confirmation. Walks saved before route persistence have their original statistics only.

During a walk, STRIDE presents a dedicated screen with steps, distance, elapsed time, the route, and Pause and End walk controls. Allow Motion & Fitness access for measured steps. Completed walks populate the session, day, and week records. Walks from older versions may have no step data.

The iPhone Lock Screen Live Activity shows distance and elapsed time. Its controls open STRIDE to handle the action. A walk started in STRIDE continues collecting GPS fixes when you lock your iPhone, go to the Home Screen, or switch apps. iOS can show its background location indicator during recording. GPS fixes are held in memory until the walk is saved. Force-quitting STRIDE or a system termination interrupts the unfinished walk.
