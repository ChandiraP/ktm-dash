# KTM DASH

KTM DASH is a React + Vite motorcycle dashboard packaged for Android with Capacitor.

## Web app

```sh
npm install
npm run dev
```

Run `npm run lint` and `npm run build` to check and build the web app.

## Android APK

Install Android Studio and the Android SDK, then set the SDK path in `android/local.properties` (this machine-specific file is ignored by Git).

```sh
npm install
npm run android:apk
```

The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. It is debug-signed for local testing; a release build requires a separately managed signing key.

## Release notes — v1.0

- Package the KTM DASH web dashboard as a native Android app with the KTM launcher icon.
- Add GPS status indicators: off, searching, weak, and good.
- Filter inaccurate GPS fixes and implausible jumps when accumulating trip and odometer distance.
