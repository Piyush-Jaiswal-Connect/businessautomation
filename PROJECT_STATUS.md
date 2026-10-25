# PROJECT_STATUS — Ayush Enterprises app (project folder: site-control)

## CURRENT PHASE:
**Phase 4 — Online app, install, notifications: IN PROGRESS (checkpoint P4a).**
Live at **https://businessautomation-2884f.firebaseapp.com**. Notifications built and emulator-tested, NOT live
(server part needs the Blaze plan). Real-phone tests not done (owner). Worker phone sign-in blocked until the owner
enables the **Anonymous** provider.

## PHASE 4 SO FAR (2026-10-25):
- **Hosting:** Firebase Hosting, default site. App address = `…firebaseapp.com` (same domain as Google's sign-in
  handler, so redirect sign-in works in the installed app with no extra Google settings); `…web.app` redirects there.
  Cache headers: index/sw/manifest no-cache, assets 1 year. `npm run deploy:web`.
- **Install:** "Put the Ayush app on your home screen" card (Install button when Chrome offers it, else ⋮ steps) on
  start screen, worker home and owner Manage. Manifest name "Ayush Enterprises", short "Ayush".
- **Notifications (owner):** Manage → "Turn on notifications" stores this device's FCM token in
  `ownerDevices/{uid}/tokens/{token}` (owner-only rule + test). `public/push-sw.js` (own scope `/push/`) shows them;
  tap opens the right page. Server `functions/index.js` (asia-south1): check-in → "Rajesh started work · 9:08 am · tap to
  approve"; new voice report → "New voice report from Rajesh"; 9 am summary (approvals, reports to review, follow-ups
  due) only if something waits. English/Hindi per device. One message per event (`notificationLog/{eventId}`);
  dead tokens removed. In the emulator they are logged, not sent.
- **Fix (2026-10-25):** owner Google sign-in looped on "Loading…": the offline service worker answered Google's
  `/__/auth/handler` page with the cached app. Workbox now has `navigateFallbackDenylist: [/^\/__\//, /^\/push\//]`
  + skipWaiting/clientsClaim (new version takes over at once); index.html also drops an old worker if it ever serves a
  `/__/` page. Verified in a browser that had the old copy: the handler now reaches accounts.google.com.
- **Clearer errors:** phone sign-in failure now says "sign-in is switched off in settings (code)" instead of "no network".
- **Tests:** rules 35/35 (now on their own emulator port, so they never touch the everyday test database);
  `npm run test:functions` 1/1 (check-in + report → exactly one log entry each, right EN/HI words, no duplicates).
  Live checks: web.app→firebaseapp.com redirect, manifest, offline worker, sign-in handler all 200; app loads in Hindi,
  no TEST banner, no console errors; Google provider enabled; **Anonymous provider disabled** (ADMIN_ONLY_OPERATION).
- **Option prepared:** `aiFirebaseConfig` in `web/src/firebase-config.ts` lets voice-to-text run in a separate card-free
  project (keeps AI free after Blaze).

## COMPLETED:
- P0 setup · P1 screens · P2 login, phone pairing, attendance, approvals (see git history and ARCHITECTURE.md).
- Renamed **Ayush Enterprises** (icon label "Ayush"); real Firebase project `businessautomation-2884f` connected.

Phase 3 (P3):
- **Worker:** attendance = "started work" (site only if assigned). **Voice report:** tap mic → speak (hint: which site,
  what work, payment) → tap stop → 5-second cancel → sends by itself. Location taken at that moment only. Recording
  limited to 3 min / ~850 KB. Without network it waits on the phone (survives closing the app) and sends later.
  Today's list shows each message as "पहुँच गई" (reached) or "नेटवर्क का इंतज़ार". No questions, no typing.
- **AI (free tier):** Google Gemini through Firebase AI Logic, called from the **owner's dashboard** while it is open
  (worker phones never call it). Converts the recording to 16 kHz WAV, sends it with the site list, gets back: exact
  words, English translation, matched site (or "not recognised" + place as said), work (English + Hindi), work status,
  payment status + amount, next step, confidence per part, audio quality. One at a time, 4 s apart (free limits).
  Model `gemini-3.6-flash`, fallback `gemini-3.5-flash-lite`, 60 s limit. Failed → "Try again".
- **Owner report cards:** worker · time · length · location link · site · work · payment ("worker says") · next step ·
  ⚠ "please check" on unsure parts · play recording · exact words + English · **Verify ₹X received** (prefilled) ·
  **Approve job as finished** · **Correct** (any field; first AI answer kept) · Mark reviewed. Filters: to review /
  payment talk / all, and by site.
- **Payments (owner only):** one record per site: customer, description, agreed amount, follow-up date, notes.
  Received = sum of owner-verified payments; balance calculated. Five separate stages shown. Worker payment reports
  shown as "not counted as money". Mistakes fixed with a **reversal** entry (nothing deleted). Every money change writes
  an audit entry (enforced by the security rules).
- **Home:** Present · Reports to review · Customer outstanding · Active sites; needs-attention list (approvals, new
  reports, payments to verify, follow-ups due, AI failures, phones not connected); newest report cards.
- **Sites:** who reported from each site today, last report, pending items.
- Recordings auto-deleted after 90 days (text kept). Privacy notice updated (Google AI, location with voice messages).
- AI code is loaded only on the owner's dashboard.

## FILES CREATED / CHANGED (P3):
- New: `web/src/data/ai.ts`, `web/src/data/processor.ts`, `web/test-audio/*.mp3` (3 synthetic Hindi test messages),
  `firebase/firestore.indexes.json` (index for a phone's own reports).
- Changed: `firebase/firestore.rules` (+reports, reportAudio, jobs, payments; started-work attendance),
  `firebase/tests/rules.test.mjs` (+9 tests), `web/src/types.ts`, `data/convert.ts`, `data/OwnerStore.tsx`,
  `data/WorkerStore.tsx`, `lib/hooks.ts`, `lib/format.ts`, `lib/summary.ts`, `lib/firebase.ts`, `i18n.ts` (+65 texts),
  `worker/WorkerHome.tsx`, `owner/ReportsPage.tsx`, `owner/PaymentsPage.tsx`, `owner/SitesPage.tsx`, `owner/OwnerApp.tsx`,
  CSS, `package.json` (`deploy:db`), `ARCHITECTURE.md`, `START_HERE.md`.
- Local only (not in git): `web/.env.development.local` = `VITE_REAL_AI=true` (test mode on this PC uses the real AI).

## TESTS PASSED:
- **Security rules: 34/34** (`npm run test:rules`), incl. new: report only with its recording; recording ≤ 900 KB;
  cannot send as another worker or pretend AI ran; unpaired phone cannot send; worker cannot read recordings / other
  phones' reports / change reports; owner cannot change worker's times; money records need audit entries, payments
  cannot be edited, reversals allowed; workers can never read money; attendance without a site allowed.
- **End to end, two separate sessions (owner on 127.0.0.1, worker phone on localhost), test database + REAL free Gemini:**
  - Pairing → started-work attendance (no site) → owner sees it.
  - Message 1 (Hindi: Ghansoli flat 502 tiles done, ₹5,000 paid, rest tomorrow) → site **Ghansoli - Flat 502**,
    "Bathroom tiling work completed" **Finished**, **Customer paid part ₹5,000**, next step "pay remaining tomorrow",
    exact Hindi words + English. ✔
  - Message 2 (Vashi painting half done, not paid) → **Vashi Sector 17 - Flat 1203**, **Still going**, **Not paid**. ✔
  - Message 3 (new customer's house in Koparkhairane, kitchen leak, send plumber) → **Site not recognised** (did NOT
    wrongly pick "Koparkhairane - Shop 12"), **Problem**, payment not mentioned, next step "Send plumber tomorrow". ✔
  - Verify ₹5,000 (prefilled) → "Payment verified"; Approve finished → "Work approved"; set customer + ₹20,000 →
    outstanding ₹15,000; wrong ₹3,000 entry then reverse → back to ₹15,000, both lines kept in history.
  - Recording plays on the owner side (full length shown). Home, sites and attendance pages show the right numbers.
  - 5-second cancel countdown and "reached" list on the worker phone.
- AI module called directly after code-splitting: correct result in ~11 s.
- `npm run build`, `npm run lint` clean.

## TESTS NOT RUN:
- Phase 4: real phones (install, QR pairing, mic, offline, two phones), owner Google sign-in on the live app,
  push delivery to a phone, 9 am summary (needs Google's scheduler), functions deploy (needs Blaze).
- **Real microphone and real phones** (test browser blocks the mic; test messages were computer-generated Hindi
  voices, clearer than a real site with noise). Real-world accuracy must be checked with your workers.
- Real project: nobody has signed in yet. Owner Google sign-in should be tested on the hosted app (Phase 4): on
  localhost, Chrome may block the sign-in redirect because the login page is on a different domain.
- Offline sending on a real phone (uses Firestore's offline queue; not switchable in the test browser).
- Two owner devices processing at the same time (guarded by a claim step; not tested).
- 90-day recording clean-up (runs when the owner app opens; not exercised).

## KNOWN ERRORS / LIMITS:
- Voice → text happens **only while the owner dashboard is open** somewhere (free plan has no server). Reports wait as
  "Waiting for text" until then.
- Free AI tier: Google may use the recordings/text to improve its products; daily request limit (far above expected use).
- Test-mode owner sign-in works only on `http://127.0.0.1:5173` (browser storage rule); not an issue online.
- Reverse button hides if a same-day reversal of the same amount already exists (two identical same-day payments
  would both look reversed).

## EXTERNAL SERVICES REQUIRED:
- Firebase `businessautomation-2884f`, Spark (free): Auth (Google + Anonymous), Firestore, AI Logic (Gemini Developer API,
  free tier). Phase 4: Hosting (free) + Blaze only for push notifications.

## COST/BILLING CONSIDERATIONS:
- Now: **₹0** (Spark plan; Gemini free tier; recordings in Firestore, ~0.1–0.5 MB each, deleted after 90 days).
- Phase 4: Blaze plan (card) for push notifications; expected ₹0; set a budget alert then.

## REAL PROJECT SET-UP (2026-10-25):
- `firebase login` done (munnajaswal22@gmail.com). Rules + index deployed with `npm run deploy:db`.
- Incident: the first rules deploy found no database and auto-created one in **nam5 (USA)**. It was empty; the owner deleted
  it, and it was recreated in **asia-south1** (Google blocks reusing a deleted name for ~5 minutes). `firebase.json` now pins
  `"location": "asia-south1"` so a deploy can never choose a location again.
- Verified from outside: reading workers/sites/jobs/payments/recordings and writing without sign-in → PERMISSION_DENIED.

## MANUAL ACTION REQUIRED (owner):
1. Firebase console → Authentication → Sign-in method → **Add new provider → Anonymous → Enable** (worker phones need it).
2. Choose notifications option A / B / C (START_HERE.md). A or B: upgrade to **Blaze** + budget alert.
   Linking billing ends the free AI tier for THIS project (paid AI ≈ ₹100–250/month at ~50 messages/day) unless
   option B (separate free AI project) is used.
3. Real-phone checklist in START_HERE.md.

## NEXT EXACT ACTION:
1. After Anonymous is enabled: owner signs in on the live app (phone), pairs a worker phone, runs the checklist.
2. After Blaze (A or B): `npm run deploy:functions` (asia-south1; set artifact clean-up policy when asked), owner turns
   on notifications, test a check-in notification on a real phone. For B: create the AI project, enable AI Logic there,
   paste its config into `aiFirebaseConfig`, redeploy web.
3. Then checkpoint P4 complete → Phase 5 (Android widget) on approval.
