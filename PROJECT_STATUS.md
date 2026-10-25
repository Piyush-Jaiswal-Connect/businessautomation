# PROJECT_STATUS — Site Control

## CURRENT PHASE:
**Phase 1 — Worker interface + owner dashboard (DEMO data): COMPLETE (checkpoint P1).**
Waiting for owner approval to start Phase 2.

## COMPLETED:
Phase 0 (P0): environment check, stack choice, docs, `web/` scaffold, git repository.

Phase 1 (P1):
- **Languages:** Hindi + English on both sides (worker defaults to Hindi, owner to English, one-tap toggle, remembered per device). No Marathi.
- **Worker screen** (`#/worker`): today's site + today's job, giant green "हाजिरी लगाओ" button, status card (sending → waiting for owner approval / approved / rejected / saved on phone when offline), two-step check-out, giant blue "काम की जानकारी भेजो" mic button → recording with timer (auto-stop at 3 min) → playback → two optional one-tap questions (work finished? customer paid?) → send / record again. No-network banner. Clear mic-blocked message.
- **Owner dashboard** (`#/owner/...`), dark theme, bottom tabs with badges:
  - Home: Present x/y, Active sites, Reports to review, Customer outstanding (all calculated from records), "Needs your attention" list, recent activity.
  - Attendance: all workers with site, check-in/out time, status chip (Offline/pending sync · Submitted · Received · Approved · Rejected · Absent), Approve / Reject / Correct time (reason required), "Approve all received", filters, per-record history.
  - Sites: workers (green dot = present), today's job, completion status, last update, pending items.
  - Reports: voice inbox with player, worker's answers, "transcription comes later" note, Mark reviewed, Approve job as finished.
  - Payments: agreed / received (verified) / outstanding, 5 separate stages (work finished, work approved, payment reported, payment verified, balance), last payment, follow-up (overdue / due today), worker's report shown as "not counted as money", Record verified payment (cannot exceed balance, evidence note required), payment history.
- **PWA foundation:** manifest (name "Site Control", standalone, portrait), app icons incl. maskable, service worker (offline caching of the app files).
- Demo store shares data between the two views in the same browser tab, so a worker check-in/report appears on the owner screens.
- `START_DEMO.cmd`: double-click to open the demo on this PC.

## FILES CREATED:
- `web/vite.config.ts` (PWA manifest), `web/index.html`, `web/public/favicon.svg`, `web/public/icons/*` (+ `web/scripts/make-icons.py` to regenerate)
- `web/src/types.ts` — record shapes matching ARCHITECTURE.md §4
- `web/src/i18n.ts` — all Hindi/English text
- `web/src/lib/format.ts` (India-time dates, ₹), `lib/summary.ts` (dashboard calculations), `lib/hooks.ts` (online status, routes, microphone recorder)
- `web/src/demo/demoData.ts`, `demo/DemoStore.tsx` — **DEMO ONLY**, replaced in Phase 2
- `web/src/components/Icon.tsx`, `components/Common.tsx`
- `web/src/worker/WorkerHome.tsx`, `worker/worker.css`
- `web/src/owner/OwnerApp.tsx`, `AttendancePage.tsx`, `SitesPage.tsx`, `ReportsPage.tsx`, `PaymentsPage.tsx`, `shared.tsx`, `owner.css`
- `web/src/App.tsx` (demo view picker + routes), `web/src/index.css`
- `START_DEMO.cmd`

## TESTS PASSED (in the in-app browser, phone size 375×812):
- `npm run build` (TypeScript + production build) and `npm run lint` (no errors) pass.
- Worker view opens in Hindi; toggle to English works.
- Check-in: status goes "भेज रहे हैं…" → "मालिक की मंज़ूरी बाकी है"; big button disappears, so no double attendance (store also refuses a second record per worker per day).
- Voice flow with a **simulated** microphone (test tone): recording timer counts, stop gives an 11-second playable recording, answers can be selected, send shows "जानकारी भेज दी" and the count.
- Mic blocked → Hindi "माइक बंद है…" message shown.
- Owner home numbers update from the worker's actions (present 10/13, reports 4, ₹2,00,000 outstanding = sum of demo balances).
- Approve → chip "Approved", history "owner: approve". Correct time with reason → "Corrected (was …)", reason in history. Pending-sync record has no approve buttons.
- Payment: amount above balance is blocked; ₹35,000 recorded → balance ₹0, "Fully paid", total outstanding ₹2,00,000 → ₹1,65,000.
- Owner dashboard in Hindi (reports, sites pages) renders correctly.
- Production build preview: service worker active and controlling the page, manifest valid, all icons load.

## TESTS NOT RUN:
- **Real microphone** — the in-app browser blocks it; only a simulated tone was recorded. Needs a test on a real phone (needs https → Phase 4, or `localhost` on this PC in Chrome).
- Not tested on a real Android phone; "Add to Home screen" not tried (needs https → Phase 4).
- Offline mode not tested (no network switch in the test browser).
- `START_DEMO.cmd` not double-click tested.

## KNOWN ERRORS / LIMITS (expected for a demo):
- All data is fake and lives only in the open browser tab; reloading the page resets it.
- No login yet: the start screen lets anyone pick the worker or owner view (Phase 2 replaces this).
- Times like "4:10 am" in the demo are generated relative to the current time.

## EXTERNAL SERVICES REQUIRED:
- Phase 1: none.
- Phase 2: a Firebase project (free Spark plan is enough for login + database).
- Phase 3+: Blaze plan (voice-file storage and server functions).
- Phase 5: Android Studio (free).

## COST/BILLING CONSIDERATIONS:
- Phase 1 costs nothing. Expected later running cost ₹0–20/month (ARCHITECTURE.md §8). Budget alert ₹100/month before Blaze.

## MANUAL ACTION REQUIRED:
- Optional now: double-click `START_DEMO.cmd` and try the demo; tell me anything to change (wording, colours, sizes).
- Before Phase 2:
  1. Go to https://console.firebase.google.com with the business Google account → "Create a project" → name it `site-control` (Google Analytics: not needed). Tell me when done.
  2. Allow me to install Java 21 (free, Eclipse Temurin) for local database testing.

## NEXT EXACT ACTION:
Start Phase 2 (after owner approval): create `firebase/` (Firestore rules, Cloud Functions for pairing codes and owner role, emulator config), add the Firebase SDK to `web/`, replace `demo/DemoStore.tsx` with a Firestore-backed store offering the same data/actions, add owner Google sign-in, worker add + QR/code pairing, real attendance with server time and one-per-day rule, real-time dashboard, then test with two separate signed-in sessions in the emulator.
