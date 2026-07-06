# fitbod-app

A Fitbod-style strength training app: auto-generated workouts, an exercise library, muscle
recovery tracking, and Apple Health / Health Connect sync — built with Expo + expo-router.

## Development (no Health features)

```sh
npm install
npm run start   # Expo Go or a simulator/emulator works fine up to this point
```

## Health integration requires a custom dev client

HealthKit and Health Connect are native modules and are **not available in Expo Go**.
From here on you need a dev-client build:

```sh
# iOS (needs a Mac + Xcode, and a real iPhone for meaningful HealthKit data —
# the simulator has no Health app data or Apple Watch to sync from)
npx expo run:ios

# Android (an emulator works if it has Health Connect installed via Play Store,
# or use a real device)
npx expo run:android
```

Or build remotely with EAS instead of a local Xcode/Android Studio install — no Mac or Android
Studio needed, Expo builds it in the cloud:

```sh
npx eas login                                       # your Expo account (free)
npx eas build:configure                             # links this project to your EAS account
npx eas build --profile development --platform ios  # or --platform android
```

An Expo/EAS account is required for `eas build`; an Apple Developer Program membership is
required to install on a physical iPhone (HealthKit entitlements) or to distribute a TestFlight
build. `eas build` walks you through registering your Apple account/device and managing
certificates — just follow its prompts.

Once the build finishes, EAS gives you a link/QR code: open it on the iPhone to install the dev
client. Then, back on your machine:

```sh
npx expo start --dev-client
```

and open the dev client app on the phone — it connects to this Metro server automatically (scan
the QR code shown in the terminal if it doesn't).

To actually test the Health sync end to end: in the app go to **Settings → Connect Apple Health**,
grant the permission prompts, then tap **Sync now**. Recent workouts logged elsewhere (Apple
Watch, a running app, etc.) should show up in **History**, and the muscle recovery bars on
**Home** should shift accordingly.

## Sanity checks

Pure-logic sanity scripts that don't need a device (they run against an in-memory SQLite via
`better-sqlite3`):

```sh
npm run verify        # runs all of the below
npm run verify:db
npm run verify:generator
npm run verify:recovery
npm run verify:activity-mapping
```

These don't exercise HealthKit/Health Connect themselves (that needs the real native SDKs on a
device) — they cover the schema/migrations, the workout generator, progressive overload, the
muscle recovery decay model, and the external-activity muscle-impact mapping.
