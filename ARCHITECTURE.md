# Site Control — Architecture Decisions

Last updated: 2026-10-25 (Phase 0)

## 1. Languages

- **Hindi and English only**, on both the worker app and the owner dashboard.
  Marathi was dropped by the owner's decision (2026-10-25).
- Worker app defaults to **Hindi**; owner dashboard defaults to **English**.
  Each user can switch with one toggle (हिंदी / English). The choice is saved on the device.
- All text lives in one translation file per language (`hi.ts`, `en.ts`) so no screen hard-codes text.
- Devanagari uses the phone's built-in font (Noto Sans Devanagari ships with Android), so no font download.

## 2. Stack (chosen for low cost and low maintenance)

| Part | Choice | Why |
|---|---|---|
| App (worker + owner) | **React + TypeScript + Vite**, one installable **PWA** | One codebase, free hosting, installs to home screen from Chrome. |
| PWA support | `vite-plugin-pwa` (added in Phase 1) | Generates manifest + service worker for offline and install. |
| Login | **Firebase Authentication** | Free for our scale; handles sessions and token refresh. |
| Database | **Cloud Firestore**, region `asia-south1` (Mumbai) | Real-time updates, offline queue built in, security rules. |
| Voice files | **Cloud Storage for Firebase** | Private files, readable only through security rules. |
| Server logic | **Cloud Functions (2nd gen)**, region `asia-south1` | Pairing codes, notifications, audit log, owner-only actions. |
| Push notifications | **Firebase Cloud Messaging (FCM)** web push | Free; works for installed PWAs on Android Chrome. |
| Hosting | **Firebase Hosting** | Free HTTPS; same project as everything else. |
| Local testing | **Firebase Emulator Suite** (via `npx firebase-tools`) | Test rules and functions without touching real data. |
| Owner widget (Phase 5) | **Kotlin + Jetpack Glance** Android app | A real home-screen widget; same Firebase backend. |
| Transcription (Phase 6, optional) | Decide later (e.g. Google Speech-to-Text or a Gemini model) | Not needed for first release; costs explained before enabling. |

Not used on purpose: separate servers, paid databases, SMS OTP (costs per message), payment gateways, billing/quotation modules.

## 3. Login design

### Owner / admin
- Signs in with **Google Sign-In** (their own Gmail). No new password.
- Role is stored as a Firebase **custom claim** (`role: "owner"` or `"admin"`), set once by a setup script
  for an allow-listed email. Security rules trust only this claim, never a value the app sends.

### Worker (no email, no password)
1. Owner adds the worker in the dashboard (name, trade, phone, site).
2. Owner taps **"Pair phone"** → a Cloud Function creates a **one-time 6-digit code + QR**, valid 15 minutes,
   stored only as a hash.
3. On the worker's phone, open Site Control → scan the QR (or type the 6 digits).
4. Cloud Function checks the code (single use, rate-limited, expiry), then returns a Firebase **custom token**
   for that worker. The app signs in with it.
5. Firebase keeps the session on the phone. The worker never logs in again on that phone unless it is revoked.
- **Lost phone:** owner taps "Deactivate". The function disables the account, revokes refresh tokens and
  marks the worker inactive; rules reject that worker's writes immediately.
- **Optional 4-digit PIN** (off by default): only a screen lock on the device, never the real credential.

## 4. Data model (Firestore)

Workers must not see wages or customer money, and Firestore rules protect whole documents, not single fields.
So sensitive data sits in separate owner-only collections.

| Collection | Contents | Who can read | Who can write |
|---|---|---|---|
| `users/{uid}` | role, name, language, active | self, owner | functions, owner |
| `workers/{workerId}` | name, trade, phone, active, linked uid | that worker, owner | owner |
| `workerPrivate/{workerId}` | wage type, daily wage, notes | owner only | owner |
| `sites/{siteId}` | site name, area, address label, active | assigned workers, owner | owner |
| `assignments/{date_workerId}` | site, today's job text (no money) | that worker, owner | owner |
| `attendance/{workerId_YYYY-MM-DD}` | site, device time, **server time**, optional location, status, check-out | that worker, owner | worker: create once / check-out only; owner: approve/reject/correct |
| `reports/{reportId}` | worker, site, device time, server time, audio path, worker payment claim, transcript (later) | that worker, owner | worker: create only; owner: review |
| `jobs/{jobId}` | site, work description, agreed charge, received, outstanding, work + payment statuses, follow-up date, notes | owner only | owner |
| `payments/{paymentId}` | job, amount, date, evidence note, verified by | owner only | owner, append-only |
| `auditLog/{id}` | who changed what, old → new, reason, time | owner only | Cloud Functions only, append-only |
| `pairingCodes/{hash}` | worker, expiry, used | nobody (functions only) | functions only |
| `ownerDevices/{uid}/tokens/{token}` | FCM push tokens | owner | owner |

Voice files: `reports/{workerId}/{reportId}.webm` in Storage. Worker may upload only into their own folder
(size/type limited); only the owner (and the uploading worker) can play them.

## 5. Key rules of behaviour

- **No double attendance:** attendance document ID is `workerId_date`; rules allow *create* only if it does not
  exist. A retry after a bad network becomes a no-op, not a second record.
- **Server time:** check-in uses Firestore `serverTimestamp()`; rules require it equals the request time.
  The phone's own time is also stored (`deviceTime`) so offline submissions keep their real moment.
- **Approval:** attendance starts as `received`. Only the owner moves it to `approved`, `rejected` or
  `corrected` (correction needs a reason). Every change writes an audit entry.
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
  web/                 React + TypeScript PWA (worker app + owner dashboard)
  firebase/            security rules, Cloud Functions, emulator config  (Phase 2)
  android-widget/      Kotlin + Glance owner widget                      (Phase 5)
```

## 8. Cost estimate (for about 15–30 workers)

| Service | Free allowance (approx.) | Our expected use | Expected cost |
|---|---|---|---|
| Firestore | 50k reads, 20k writes per day; 1 GiB stored | a few thousand reads/day | ₹0 |
| Authentication (custom token + Google) | free | ~30 users | ₹0 |
| Cloud Functions | 2 million calls/month | a few thousand/month | ₹0 |
| Cloud Storage (voice) | 5 GB stored, 1 GB/day download *in US regions only* | ~0.5 MB per minute of voice; ~0.5 GB/month | ₹0–20/month |
| FCM push | free | — | ₹0 |
| Hosting | 10 GB stored, 360 MB/day | small app | ₹0 |

**Important:** Cloud Storage and Cloud Functions now require the **Blaze (pay-as-you-go)** plan. Blaze still
includes the free allowances above, but needs a debit/credit card with international payments enabled.
We will set a **budget alert at ₹100/month** so any unexpected cost is emailed immediately.
Storage bucket region: `asia-south1` (Mumbai) for speed and keeping data in India; at our size the
cost is a few rupees per month. (Alternative: `us-central1` to stay fully free — decided at Phase 3.)

Prices and limits change; they will be re-checked on the official pricing page before Blaze is turned on.
