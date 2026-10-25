# PROJECT_STATUS — Site Control

## CURRENT PHASE:
**Phase 0 — Environment and project setup: COMPLETE (checkpoint P0).**
Waiting for owner approval to start Phase 1.

## COMPLETED:
- Checked workspace (`Downloads/business automation 2`): it was empty; nothing else inspected.
- Checked tools: Node 24.21, npm 11.19, Git 2.55, Python 3.14 available. Java is 8 (too old for later steps). No Android SDK. No Firebase CLI (not needed globally; will use `npx firebase-tools`).
- Chose stack: React + TypeScript + Vite PWA, Firebase (Auth, Firestore, Storage, Functions, FCM, Hosting). See ARCHITECTURE.md.
- Language decision recorded: **Hindi + English only** on both ends (Marathi dropped by owner).
- Created project folder `site-control/` and scaffolded `web/` (Vite React-TS template, default demo page still in place).
- Git repository initialised with Phase 0 committed, so every checkpoint can be restored.

## FILES CREATED:
- `ARCHITECTURE.md` — decisions, data model, security, cost estimate
- `PROJECT_STATUS.md` — this file
- `START_HERE.md` — owner guide
- `.gitignore`
- `web/` — Vite React + TypeScript scaffold (`package.json` renamed `site-control-web`, page title "Site Control", `lang="hi"`)

## TESTS PASSED:
- `npm install` in `web/` — 0 vulnerabilities.
- `npm run build` in `web/` — TypeScript check + production build succeed.

## TESTS NOT RUN:
- No app features exist yet, so nothing functional is tested.
- Not tested on a phone. No PWA install, no backend, no notifications yet.

## KNOWN ERRORS:
- None.

## EXTERNAL SERVICES REQUIRED:
- Phase 1: none (runs on this computer with demo data).
- Phase 2+: one Google/Firebase project (free Spark plan is enough for Auth + Firestore + Hosting).
- Phase 3+: Blaze plan (needed for Cloud Storage voice files and Cloud Functions).
- Phase 5: Android Studio (free) on this PC.

## COST/BILLING CONSIDERATIONS:
- Expected running cost for 15–30 workers: about ₹0–20/month (see ARCHITECTURE.md §8).
- Blaze plan needs a card with international payments enabled; budget alert at ₹100/month will be set.
- No paid AI/transcription until Phase 6, and only after costs are shown to the owner.

## MANUAL ACTION REQUIRED:
- Now: nothing.
- Before Phase 2 (I will guide step by step): sign in to https://console.firebase.google.com with the business Google account and create a project named "site-control".
- Before Phase 2 testing: install Java 21 (free, Eclipse Temurin) for the Firebase emulators — I can do this with your OK.
- Before Phase 3: switch the Firebase project to Blaze and set the ₹100 budget alert.

## NEXT EXACT ACTION:
Start Phase 1 (after owner approval): add `vite-plugin-pwa`, Hindi/English translation files, worker home screen
(today's site, big green "हाजिरी लगाओ" button, big mic "काम की जानकारी भेजो" button), owner dashboard
(summary cards, attendance, sites, payments) using clearly labelled DEMO data, then test in the browser at phone width.
