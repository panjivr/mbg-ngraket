# Android UI 1.1 — verification

Code commit: `3d69a7d`. CI: https://github.com/panjivr/mbg-ngraket/actions/runs/38075989934. Web/API, Android bundle and native APK jobs all passed. Production/main were not deployed or migrated.

The employee app now fixes its origin to `https://djati.web.id`, removes server input, discards saved staging sessions on upgrade and uses navy cards, bundled BGN assets, one outline icon family, five bottom actions and a grouped service sheet. Existing web modules reuse their server algorithms in a WebView restricted to the primary origin. Legacy staff/admin cookies are stored as Secure/HttpOnly in the native cookie store. Web logout ends the native session.

Native screens retain attendance/selfie/GPS/shift/event, schedule, history, leave, slip/PDF, announcements and profile. The calendar counts actual check-ins and unique dates; seven columns stay aligned on narrow screens. Missing corrections/inbox APIs show available HR/announcement/leave routes. Modern token login is still staff-only; its web module may require separate web sign-in.

## Checks

- TypeScript, Expo dependency alignment, client origin/session/calendar/GPS tests and Android bundle passed.
- Existing backend lint/build, validation checks and HTTP/PostgreSQL integration tests passed in an isolated database.
- A native startup test found npm's auto-installed `expo-font` 57 incompatible with SDK 55. The direct dependency is pinned to `~55.0.8`, with a regression check before native builds.
- Final APK installed with `adb install -r`; cold Activity startup completed and the logged-out UI rendered. AndroidRuntime/ReactNativeJS error logs were empty.
- Android 15/x86_64 emulator: normal 1080×1920 viewport, 640×1136 at 320dpi and font scales 1.4/2.0. The form scrolls and its submit control can be brought fully into view. Portrait only.
- APK v2 signature and zip alignment check with 16 KB page option passed.

Package `id.mbg.ngraket.karyawan`, version `1.1.0` / code `2`, minSdk 24, target/compile 36; four ABIs: arm64-v8a, armeabi-v7a, x86, x86_64. Size 89,283,804 bytes. SHA-256: `91f48eda95abfdf8521ef512d77eb4c8fa455ab9ec05dc9943d97bb9fedad71a`.

## Limits

Test APK uses the template debug key, not a private release keystore. Real-account login, all signed-in UI states, physical Xiaomi 11T camera/GPS, web document downloads and HR operations were not tested. No production attendance/payroll/leave fixtures were created. Current production uses legacy web-session security until the new backend is activated; corrections/inbox/timezone-aware reminders are not active there. Mobile audit still has 34 transitive dependency findings (22 high, 12 moderate), zero critical. No claim of compatibility with Android below 7 or every vendor/device.
