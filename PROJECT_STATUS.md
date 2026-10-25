# PROJECT_STATUS — Ayush Enterprises app (project folder: site-control)

## CURRENT PHASE:
**Phase 2 — Real database and login: COMPLETE on the local test database (checkpoint P2).**
Not yet connected to the real Firebase project (needs the owner's console steps below).
Waiting for owner approval to start Phase 3.

## COMPLETED:
Phase 0 (P0): setup, stack, docs. Phase 1 (P1): worker + owner screens with demo data, PWA foundation.

Phase 2 (P2):
- **Security rules** (`firebase/firestore.rules`): deny-by-default; owner = verified Google email in the allow-list
  (munnajaswal22@gmail.com) or `admins/{uid}`; worker = paired phone of an active worker. Server time enforced,
  one attendance per worker per day, worker only at their assigned site, owner changes need an audit entry,
  audit log cannot be edited, pairing codes single-use and ≤30 min.
- **Owner sign-in** with Google (redirect method, works in installed app). Non-owner Google accounts are refused.
- **Worker phone pairing**: owner makes a 10-digit code + QR (15 min, once); phone scans/types it, sees a Hindi/English
  privacy notice, connects. No email/password. Deactivate cuts the phone off at once; re-pairing works.
- **Manage page** (owner): add workers (English + Hindi name, trade), add sites (English + Hindi), set each worker's
  site + work, connect/disconnect phones, mark sites finished, "ask location at check-in" switch, sign out.
- **Real attendance**: one tap; server time; optional location (only at that moment; refusal still records attendance);
  offline writes queue on the phone (status shown as "saved on phone" / "sending" until the server has it);
  check-out once.
- **Real-time owner dashboard**: home cards (present, active sites, to approve, phones connected), needs-attention list,
  attendance list with approve / reject / correct-time-with-reason / approve-all and history from the audit log.
  Worker phone shows approval/rejection/correction live.
- Demo data removed. Reports and Payments tabs show "switched on in the next phase".
- Java 21 installed for the test database (user folder, no admin): `%LOCALAPPDATA%\Programs\Temurin\jdk-21.0.12.1+1`,
  `JAVA_HOME` and user PATH set.
- `START_DEMO.cmd` now starts the test database + app.

## FILES CREATED / CHANGED:
- New: `package.json` (+ lock), `firebase.json`, `.firebaserc`, `firebase/firestore.rules`, `firebase/firestore.indexes.json`,
  `firebase/tests/rules.test.mjs`, `web/.env.development`, `web/src/firebase-config.ts`, `web/src/lib/firebase.ts`,
  `web/src/data/convert.ts`, `web/src/data/OwnerStore.tsx`, `web/src/data/WorkerStore.tsx`,
  `web/src/auth/AuthScreens.tsx`, `web/src/owner/ManagePage.tsx`
- Changed: `web/src/App.tsx` (login routing), `types.ts`, `i18n.ts` (+72 Hindi/English texts), worker and owner pages, CSS,
  `START_DEMO.cmd`, `ARCHITECTURE.md` (§3 login, §4 data model updated to what was built)
- Removed: `web/src/demo/*`
- Added libraries: `firebase` 13.1.0, `qrcode-generator` 2.0.4 (web); `firebase-tools`, `@firebase/rules-unit-testing` (tools)

## TESTS PASSED:
- **Security rules: 25/25 automated tests pass** (`npm run test:rules`): strangers/non-owners get nothing; owner email must be
  verified; codes: used/expired/wrong-worker/over-30-min refused; phone can't link itself without a code or point at another
  worker; worker can't read other workers/sites/attendance, can't check in for others or at another site, can't fake server
  time, date or approval, checks in once and out once; owner approval/correction refused without audit entry; correction needs
  reason; audit log not editable; deactivation and new pairing lock out the old phone; re-pairing the same phone works.
- **Two separate signed-in sessions** in the in-app browser (owner on `127.0.0.1`, worker phone on `localhost` — separate
  storage), local test database:
  - Owner Google sign-in → empty live dashboard → added site + worker (Hindi names) → assigned → QR + code shown.
  - Worker phone opened the QR link → connected → saw its own site/work in Hindi.
  - Check-in → phone "मालिक की मंज़ूरी बाकी है"; owner dashboard updated by itself (Present 1/1, To approve 1).
  - Owner approve → phone changed to "मालिक ने मंज़ूर किया" by itself; history shows check-in + approve.
  - Check-out → shown on both sides.
  - Deactivate → phone immediately showed "यह फ़ोन अब जुड़ा नहीं है"; reactivate + new code typed by hand → phone back, without reload.
  - Fresh phone (storage wiped) paired as a second worker (Suresh) via QR link; sees only his own work.
  - Location switched on; location refused by browser → attendance still recorded.
  - Correct time with reason → owner shows "Corrected (was 6:57 am)" + reason; phone shows corrected time and approval.
- `npm run build` and `npm run lint` clean.

## TESTS NOT RUN:
- **Real Firebase project** — not connected yet (manual steps below). Everything above ran on the local test database.
- **Two real phones** — needs the app online with https (Phase 4).
- Offline queue on a real phone (no network switch in the test browser). The code uses Firestore's offline queue.
- Real location capture (test browser blocks location).
- Refused (non-owner) Google account screen in the browser — the refusal itself is covered by the rule tests.
- `START_DEMO.cmd` not double-click tested.

## KNOWN ERRORS / LIMITS:
- In the test browser, Google test sign-in only works on `http://127.0.0.1:5173` (not `localhost`) because the browser blocks
  cross-site storage. Real sign-in on the hosted app (Phase 4) does not have this problem.
- If a phone's browser data is cleared, it must be connected again with a new code (by design).
- Test database data is wiped when the test database window is closed.

## EXTERNAL SERVICES REQUIRED:
- Firebase project **`businessautomation-2884f`** (alias `prod`), free **Spark** plan: Authentication (Google + Anonymous),
  Firestore, Hosting (Phase 4), **Firebase AI Logic → Gemini Developer API (free tier)** for voice-to-text.
- Phase 4 only: Blaze plan (card) for push notifications via a Cloud Function (expected ₹0).

## COST/BILLING CONSIDERATIONS:
- Phases 2–3: **₹0** — Spark plan, Gemini free tier, recordings stored in Firestore (1 GiB free).
- Gemini free tier: requests per day are capped (far above ~50 messages/day) and **Google may use free-tier data to improve
  its products; human reviewers may listen/read**. Paid tier later = link billing, no code change.
- Phase 4: Blaze needed only for push notifications; set a budget alert then.

## DECISIONS 2026-10-25 (after P2, before Phase 3):
- App renamed **Ayush Enterprises** (icon label "Ayush"). Done in app + docs (internal IDs unchanged).
- Phase 3 now = **voice reports with AI**: tap mic → speak → stop sends automatically → Gemini makes transcript,
  English translation and fields (site, work, status, payment + amount, follow-up, confidence) → owner dashboard cards,
  unpaid/follow-up list, per-site history; owner can correct any field and verifies money. See ARCHITECTURE.md §1b–1d.
- Attendance becomes "started work" only (no site needed at check-in).
- Location saved with each voice report (at that moment only; workers told in the privacy notice).
- ~~Paid Gemini~~ → owner chose a **free** option for now: Gemini free tier via Firebase AI Logic, run from the owner's
  dashboard; recordings stored in Firestore (ARCHITECTURE.md §1d).
- Real Firebase config received and connected (`web/src/firebase-config.ts`, `.firebaserc` alias `prod`). `npm run dev`
  still uses the local test database; only the production build uses the real project.

## MANUAL ACTION REQUIRED (owner):
1. **One-time `firebase login`** on this PC (approve in the browser) so I can upload the security rules.
2. Firebase console → **Build → AI Logic → Get started** → choose **Gemini Developer API** → enable. Do **not** link a
   billing account (that keeps it free).
3. Confirm which Google account(s) will sign in as **owner** (rules currently allow only munnajaswal22@gmail.com).
4. Confirm Firestore location chosen (expected asia-south1 Mumbai) — I can also read it after login.
5. For Phase 3 testing: an Android phone with Chrome (worker side), and you signing in yourself (I never type your password).
6. Phase 4 only: Blaze plan + budget alert for push notifications.

## NEXT EXACT ACTION:
Waiting for owner's "Start Phase 3". Then, in order:
1. After `firebase login`: deploy `firebase/firestore.rules` to `prod`; owner signs in on the real project; smoke-test
   pairing + attendance with a real phone (via this PC's local network is not https — real phone test may wait for Phase 4 hosting).
2. Attendance → "started work" (site optional), update rules + tests.
3. Voice report: one-tap record → stop auto-sends (cancel window), offline queue (IndexedDB), location at send,
   audio into Firestore `reportAudio/{id}` (≤ ~0.5 MB), `reports` docs + rules + tests.
4. Owner dashboard processing: new reports → convert to 16 kHz WAV → Gemini (Firebase AI Logic, free tier) with site list →
   transcript, translation, fields, confidence → saved to report (test with a stub in the emulator, then real AI).
5. Owner report cards with player, ⚠ uncertain fields, edit, unpaid/follow-up list, per-site history;
   jobs/payments with owner-verified money and audit log. Update worker privacy notice (Google AI processing).
6. Test with two sessions; update docs; checkpoint P3; stop.
