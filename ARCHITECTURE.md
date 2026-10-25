# Ayush Enterprises app (project "Site Control") — Architecture Decisions

Last updated: 2026-10-25 (Phase 0)

## 1. Languages

- **Hindi and English only**, on both the worker app and the owner dashboard.
  Marathi was dropped by the owner's decision (2026-10-25).
- Worker app defaults to **Hindi**; owner dashboard defaults to **English**.
  Each user can switch with one toggle (हिंदी / English). The choice is saved on the device.
- All text lives in one translation file per language (`hi.ts`, `en.ts`) so no screen hard-codes text.
- Devanagari uses the phone's built-in font (Noto Sans Devanagari ships with Android), so no font download.

## 1b. Owner decisions of 2026-10-25 (supersede earlier plan where they differ)

- **Name:** everything the user sees says **Ayush Enterprises** (Hindi: आयुष एंटरप्राइज़ेज़); label under the
  phone icon is **"Ayush"**. Internal IDs (Firebase project, folders) keep "site-control"; nobody sees them.
- **Voice reports are the core feature, with AI** (moved from optional Phase 6 into Phase 3).
  ~~Paid Gemini~~ → **changed the same day: use a FREE option for now, with good accuracy** (see §1d).
- **Real Firebase project:** `businessautomation-2884f` (alias `prod` in `.firebaserc`). Web config in
  `web/src/firebase-config.ts` (Google Analytics left out).
- **Attendance = "started work" only.** Workers move between sites during the day; the sites they visit come from
  their voice reports. If the owner did assign a site, the worker still sees it.
- **Location is saved with each voice report** (only at that moment, never tracked all day; workers are told).

## 1c. Voice report → dashboard (Phase 3 design)

Worker: tap mic → speak (Hindi/English/mix) → tap stop → **sends automatically** (a few seconds to cancel).
Screen hint: "बताइए: कौन सी साइट, क्या काम किया, पैसे मिले या नहीं". No typing, no questions to answer.
Offline: recording kept on the phone and sent when network returns.

Processing (see §1d for where this runs while we stay on the free plan):
1. Gemini receives the audio + the owner's site list + the worker's name.
2. Returns: exact transcript (original language), English translation, and fields:
   **site** (matched to a known site, or "new place" text), **work done**, **work status**
   (completed / in progress / problem), **payment** (customer paid / not paid / partial / not mentioned, and amount
   if spoken), **follow-up**, plus a confidence flag per field. Rule: only what the worker said; unknown = blank.
3. The location saved with the report helps confirm the site.
4. Owner gets a notification (Phase 4 push).

Owner dashboard card: worker · time · ▶ play · site · work · status · payment (worker says) · follow-up ·
transcript + translation · ⚠ "please check" on uncertain fields · edit any field · **Verify payment**
(worker's word never counts as money until the owner verifies). Lists: today's reports, unpaid/follow-up,
per-site history. The original recording is always kept.

## 1d. Free voice-to-text plan (decided 2026-10-25, replaces paid Gemini for now)

Goal: good Hindi/Hinglish accuracy at ₹0, staying on the free **Spark** plan.

- **AI:** Google **Gemini** through **Firebase AI Logic**, using the **Gemini Developer API free tier**.
  Free while the project has no billing account. No API key to copy or protect: Firebase handles it.
  Chosen over the other free options because one call gives transcript + English translation + fields:
  - Chrome's built-in speech-to-text: free, but works only live while speaking (clashes with recording the
    original), gives words only (no site/payment fields), weaker in site noise.
  - Whisper on this PC: free software, but the PC would have to stay on, and it is slow without a graphics card.
- **Free-tier conditions (owner must know):** Google may use free-tier inputs/outputs to improve its products and
  human reviewers may read/listen to them. Requests per minute/day are capped (exact numbers are per project in
  AI Studio; our ~50 messages/day should be far below). Google can change the free tier at any time.
  Switching to the paid tier later = linking a billing account; no code change.
  The worker privacy notice will say voice messages are processed by Google's AI.
- **Where the AI call runs:** on the **owner's dashboard** (owner's phone/PC). When the owner app is open it picks up new
  voice reports, sends each to Gemini, and saves the result. Workers' phones never call the AI, so a worker cannot alter
  the result. Reports show "text coming" until the owner app has processed them. (A server function would do this
  without the owner app open, but needs the Blaze card plan.)
- **Audio format:** phones record Opus/WebM (small). Before sending to Gemini, the owner app converts to 16 kHz mono WAV
  (a format Gemini officially accepts).
- **Where recordings are kept:** Firebase Cloud Storage now requires the Blaze plan, so recordings are stored **inside
  Firestore** (`reportAudio/{reportId}`, max ~3 min ≈ 0.5 MB, below Firestore's 1 MiB document limit), separate from the
  report text so lists stay fast. Free Firestore storage (1 GiB) holds a few thousand messages; old recordings can be
  auto-deleted after a set number of days (text stays).
- **Model (tested 2026-10-25 with Hindi test messages):** `gemini-3.6-flash` (~6–11 s, accurate), fallback
  `gemini-3.5-flash-lite` (~3 s). `gemini-3.8-flash` did not answer within 3 min; `gemini-2.5-flash` is retired.
  60-second limit per call; on any failure the next model is tried; failed reports show "Try again".
- **Still needs Blaze later:** owner **push notifications** (Phase 4) need a server function to send them.
  Expected cost ₹0 within free limits, but Google requires a card on file.

## 2. Stack (chosen for low cost and low maintenance)

| Part | Choice | Why |
|---|---|---|
| App (worker + owner) | **React + TypeScript + Vite**, one installable **PWA** | One codebase, free hosting, installs to home screen from Chrome. |
| PWA support | `vite-plugin-pwa` (added in Phase 1) | Generates manifest + service worker for offline and install. |
| Login | **Firebase Authentication** | Free for our scale; handles sessions and token refresh. |
| Database | **Cloud Firestore**, region `asia-south1` (Mumbai) | Real-time updates, offline queue built in, security rules. |
| Voice files | **Cloud Storage for Firebase** | Private files, readable only through security rules. |
| Server logic | **Cloud Functions (2nd gen)**, region `asia-south1` — only from Phase 4 | Push notifications. (Login and pairing need no server code; see §3.) |
| Push notifications | **Firebase Cloud Messaging (FCM)** web push | Free; works for installed PWAs on Android Chrome. |
| Hosting | **Firebase Hosting** | Free HTTPS; same project as everything else. |
| Local testing | **Firebase Emulator Suite** (via `npx firebase-tools`) | Test rules and functions without touching real data. |
| Owner widget (Phase 5) | **Kotlin + Jetpack Glance** Android app | A real home-screen widget; same Firebase backend. |
| Voice → text + fields (Phase 3) | **Google Gemini, free tier, via Firebase AI Logic**, called from the owner's dashboard | Understands Hindi/Hinglish audio; transcript, translation and fields in one step; ₹0 on Spark. Free tier: Google may use the data (§1d). |

Not used on purpose: separate servers, paid databases, SMS OTP (costs per message), payment gateways, billing/quotation modules.

## 3. Login design (built in Phase 2)

Chosen so that login needs **no server code and no paid plan**: every check is done by the
Firestore security rules (`firebase/firestore.rules`), which are tested by `npm run test:rules`.

### Owner / admin
- Signs in with **Google Sign-In** (their own Gmail), using the redirect method (works inside the installed app).
- Owner = a Google account whose **verified** email is listed in `ownerEmails()` in the rules
  (currently munnajaswal22@gmail.com), or anyone with an `admins/{uid}` record created by an owner.
  To add another owner, add the email there and redeploy the rules.

### Worker (no email, no password)
1. Owner adds the worker and sets their site + work (Manage page).
2. Owner taps **"Connect phone"** → a random **10-digit code + QR** (valid 15 minutes, works once).
3. Worker scans the QR with the phone camera (opens Site Control) or types the 10 digits, reads the
   privacy notice and taps "मंज़ूर है — फ़ोन जोड़ो".
4. The phone gets its own anonymous Firebase login, then in one batch: marks the code used, links
   itself to the worker (`workers.deviceUid`) and writes `devices/{uid}`. The rules accept this only for a
   fresh, unused code that belongs to that worker.
5. Firebase keeps the session on the phone; no daily login.
- **Lost phone / worker left:** owner taps "Deactivate" → `active=false`, `deviceUid=null`. Every rule checks
  these on every request, so the old phone is cut off immediately. Connecting a new phone also cuts off the old one.
- **Optional 4-digit PIN:** not built (not needed while each worker uses their own phone).
- Brute-forcing a code: 10¹⁰ possibilities, each valid 15 minutes, so guessing is not practical.

## 4. Data model (Firestore)

Workers must not see wages or customer money, and Firestore rules protect whole documents, not single fields.
So sensitive data sits in separate owner-only collections.

| Collection | Contents | Who can read | Who can write |
|---|---|---|---|
| `workers/{workerId}` | name, Hindi name, trade, active, paired phone (`deviceUid`), paired time | that worker's phone, owner | owner; phone only to pair itself with a valid code |
| `devices/{uid}` | which worker a phone belongs to | that phone, owner | phone, only in the pairing batch |
| `pairings/{code}` | worker, expiry, used by | phone only while fresh & unused; owner | owner creates (≤30 min); phone marks used |
| `sites/{siteId}` | name (en/hi), area (en/hi), active | owner; a worker only for their own site | owner (no delete; mark finished) |
| `assignments/{workerId}` | current site + work text (en/hi), no money | that worker, owner | owner |
| `attendance/{workerId_YYYY-MM-DD}` | site, device time, **server time**, optional location, status, check-out, correction + reason | that worker (own only), owner | worker: create once / check-out once; owner: approve/reject/correct **with audit entry in same batch** |
| `auditLog/{id}` | who, when, what record, action, note | owner | owner, create only (no edit/delete) |
| `config/settings` | `askLocation` | any signed-in user | owner |
| `admins/{uid}` | extra owners/admins | owner | owner |
| `workerPrivate/{workerId}` | wages (later) | owner only | owner |
| `reports/{reportId}` | worker, phone, device + server time, length, location, status; then `ai` (transcript, translation, site, work, status, payment, amount, next step, confidence), review/edit/payment links | the sending phone, owner | phone: create once (with its recording in the same batch); owner: AI results, corrections, review — never the worker's own times/location |
| `reportAudio/{reportId}` | the recording (≤ 900 KB) | owner only | phone: create with its report; owner: delete after 90 days |
| `jobs/{siteId}` | customer, description, agreed charge, work status, follow-up date, notes | owner only | owner, **with an audit entry in the same batch** |
| `payments/{id}` | site, amount (negative = reversal), date, evidence, report link | owner only | owner, create only, **with audit entry**; never edited or deleted |

Anything not listed is closed to everyone.

Voice files: `reports/{workerId}/{reportId}.webm` in Storage. Worker may upload only into their own folder
(size/type limited); only the owner (and the uploading worker) can play them.

## 5. Key rules of behaviour

- **No double attendance:** attendance document ID is `workerId_date`; rules allow *create* only if it does not
  exist. A retry after a bad network becomes a no-op, not a second record.
- **Server time:** check-in uses Firestore `serverTimestamp()`; rules require it equals the request time.
  The phone's own time is also stored (`deviceTime`) so offline submissions keep their real moment.
- **Approval:** attendance starts as `received` (approval is always required). Only the owner moves it to
  `approved` or `rejected`, or corrects the time (reason required; record becomes approved). The rules refuse
  any owner change that does not write an audit entry in the same batch.
- **Payments:** a worker can only *report* "customer says paid / not paid" inside a voice report.
  Only the owner records amounts and marks a payment *verified*. Outstanding = agreed − sum(verified payments),
  calculated, not typed. Separate statuses: work completed → work approved → payment reported → payment
  verified → balance outstanding.
- **Status words shown to owner:** OFFLINE/PENDING SYNC → SUBMITTED → RECEIVED → APPROVED / REJECTED.
  "Received" is shown only after the server has confirmed the write (no pending writes).
- **Offline:** Firestore's built-in offline queue holds attendance; voice recordings are kept in IndexedDB on the
  phone and uploaded with retry. Client-generated IDs prevent duplicates on retry.
- **Location:** asked only at the moment of check-in (if the owner enabled it), never tracked in the background.
- **Notifications:** sent by Cloud Functions when a database record is actually created/changed
  (check-in, new report, follow-up due). One function run per event, with an event-ID check to avoid duplicates.
- **Time zone:** all "today" logic uses Asia/Kolkata.

## 6. Security and privacy

- Firestore + Storage security rules deny everything by default; each collection opens only what the table above allows.
- Firebase web config is public by design; real secrets (none needed yet) go in Cloud Functions secrets, never in the app.
- `.env*` files are git-ignored.
- Backup/export: owner can download CSV of attendance, reports and payments (Phase 3/4).
- Retention: voice recordings auto-delete after **180 days** by default (Storage lifecycle rule; owner can change).
  Attendance and payment records are kept.
- A short privacy notice (Hindi + English) is shown to each worker during pairing: what is recorded
  (attendance time, optional check-in location, voice notes) and who can see it.

## 7. Folder layout

```
site-control/
  ARCHITECTURE.md      this file
  PROJECT_STATUS.md    exact progress, for resuming
  START_HERE.md        plain-language guide for the owner
  START_DEMO.cmd       double-click to run the app on this PC
  web/                 React + TypeScript PWA (worker app + owner dashboard)
    src/types.ts         record shapes (match §4)
    src/i18n.ts          all Hindi/English text
    src/lib/             India-time formatting, dashboard sums, recorder/online hooks
    src/lib/firebase.ts  connection; `npm run dev` always uses the local test database
    src/firebase-config.ts  real project's web settings (empty until connected)
    src/auth/            Google sign-in, phone pairing, "no access" screens
    src/data/            OwnerStore (live owner data + actions), WorkerStore (one phone's own data)
    src/worker/          worker screen
    src/owner/           owner dashboard pages
  package.json         Firebase tools: `npm run emulators`, `npm run test:rules`
  firebase.json        emulator ports (+ hosting from Phase 4)
  firebase/            firestore.rules, tests/rules.test.mjs (Cloud Functions in Phase 4)
  android-widget/      Kotlin + Glance owner widget                      (Phase 5)
```

## 8. Cost estimate (for about 15–30 workers)

| Service | Free allowance (approx.) | Our expected use | Expected cost |
|---|---|---|---|
| Firestore | 50k reads, 20k writes per day; 1 GiB stored | a few thousand reads/day | ₹0 |
| Authentication (Google + anonymous phones) | free | ~30 users | ₹0 |
| Cloud Functions (Phase 4, push only) | 2 million calls/month (needs Blaze) | a few thousand/month | ₹0 |
| FCM push | free | — | ₹0 |
| Gemini AI (voice reports) | free tier (capped requests/day) | ~15 workers × 2–3 short messages/day | **₹0** (paid tier later only if needed) |
| Voice recordings | stored in Firestore (1 GiB free) | ~0.2–0.5 MB per message | ₹0 |
| Hosting | 10 GB stored, 360 MB/day | small app | ₹0 |

**Important:** Cloud Storage and Cloud Functions now require the **Blaze (pay-as-you-go)** plan. Blaze still
includes the free allowances above, but needs a debit/credit card with international payments enabled.
When Blaze is switched on (Phase 4, for push notifications) we will set a **budget alert** so any unexpected cost is emailed immediately.
Phase 3 stays on the free Spark plan (no Cloud Storage bucket; recordings in Firestore, see §1d).

Prices and limits change; they will be re-checked on the official pricing page before Blaze is turned on.
