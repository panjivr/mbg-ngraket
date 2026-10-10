# MBG Karyawan — Android 1.1

React Native + Expo 55, Android 7/API 24 and later. Reference: the existing djati.web.id employee portal and screenshots supplied by the owner. UI/UX Pro Max search: employee HR attendance mobile navy professional dashboard; native navigation/accessibility guidance. Native system font keeps offline availability and Android font scaling.

## Design decisions

- Navy background `#080f28`, cards `#111f49`, borders `#26355c`.
- Primary button blue `#3267df`, icon accent `#4379f6`, primary text `#f7f9fc`, secondary `#b9c6de`, success `#65dab7`.
- One outline icon family: Ionicons. Existing BGN assets bundled locally. No emoji icons.
- Spacing 8/12/16/20/24; rounded cards 24, controls 16; body 16 with line height 24.
- Five bottom actions: Peringkat, Slip, Absen, Riwayat, Menu. Header brand returns home. Android back returns home or traverses the web module.
- Grouped menu sheet; scrollable forms; max content width 680; safe-area insets; natural text wrapping; touch targets at least 44dp.
- Loading/disabled/pressed states. Labels remain visible. History status uses H/T text in addition to color. No decorative continuous animation.

## Connection and scope

Fixed HTTPS primary origin. No user server setting, no database copy. Core screens use existing APIs; Peringkat, SOP, Finansial, Aspirasi, People & Culture, employee card and full portal use the existing web module in a native modal. Its cookie is HttpOnly/Secure, held in the app's native cookie store; navigation to other origins is blocked. Website algorithms, production schema and frontend remain unchanged by this UI update.

New corrections/inbox APIs from PR #102 are still needed for those native workflows. On the current primary server, the UI explains HR correction handling and links to announcements/leave status instead of calling absent endpoints. Local reminders need the new server's timezone-aware `reminder_at`. Modern token login remains staff-only; current legacy web login permits the portal's existing staff/admin roles. Modern sessions without a web cookie may need web sign-in once when opening a web module.

## Verification boundary

Typecheck, client security/origin/GPS tests, Expo bundle and native APK CI required. Emulator verification covers installation, startup, logged-out layout and font scaling. Real-account login, physical Xiaomi 11T selfie/GPS, document downloads and all HR actions need device testing; production records must not be created as test fixtures.
