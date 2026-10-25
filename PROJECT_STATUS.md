# PROJECT_STATUS — Site Control

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
- Phase 2/3 real use: Firebase project `site-control` — Authentication (Google + Anonymous) and Firestore. **Free (Spark) plan is enough.**
- Phase 3: Cloud Storage for voice → Blaze plan. Phase 4: Hosting (free) + Cloud Functions for push → Blaze.

## COST/BILLING CONSIDERATIONS:
- Phase 2 adds no cost (no server code, no SMS). Firestore free daily limits are far above expected use.
- Blaze (card) needed from Phase 3; budget alert ₹100/month. Expected ₹0–20/month.

## MANUAL ACTION REQUIRED (owner, in https://console.firebase.google.com → project "site-control"):
1. **Build → Authentication → Get started** → Sign-in method → enable **Google** (choose your support email) and enable **Anonymous**.
2. **Build → Firestore Database → Create database** → location **asia-south1 (Mumbai)** → **Start in production mode**.
3. **Project settings (gear) → General → Your apps → Web (</>)** → nickname "Site Control" → Register (no Hosting tick needed)
   → copy the `firebaseConfig` block and paste it to me in chat (it is not secret).
4. Tell me the **Project ID** shown in Project settings (it may look like `site-control-1a2b3`).
5. Tell me if any other Gmail should be an owner/admin (e.g. a family member).
Then I will connect the app and upload the security rules (needs a one-time `firebase login` approval in your browser).

## NEXT EXACT ACTION:
When the owner sends the config: put it in `web/src/firebase-config.ts`, add the project to `.firebaserc`, run
`npx firebase login`, deploy `firebase/firestore.rules`, and smoke-test against the real project. Then Phase 3:
voice recording upload to Cloud Storage (Blaze), playback in owner inbox, jobs/payments with owner-verified money and audit.
