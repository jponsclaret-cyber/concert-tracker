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

Or build remotely with EAS instead of a local Xcode/Android Studio install:

```sh
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
npx expo start --dev-client
```

An Expo/EAS account is required for `eas build`; an Apple Developer account is required to run
on a physical iPhone (HealthKit entitlements) or to distribute a TestFlight build.

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
