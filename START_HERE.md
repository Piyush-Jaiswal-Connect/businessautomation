# START HERE — Ayush Enterprises app (for the owner)

## What this is
The Ayush Enterprises app has two sides:
- **Worker side (Hindi first):** one big green button to mark attendance, one big mic button to send a voice update. Workers never type.
- **Owner side (English first):** who is present, and every voice update turned into a card: which site, what work, finished or not, did the customer pay.

Both sides can switch between **हिंदी** and **English**.

It will open from a phone's home-screen icon called **"Ayush"**, like a normal app.

## Where things stand
- **Phase 2 (real login + real attendance): done and tested on a test database on this computer.**
  It is not yet connected to your real Firebase project — see "What you need to do now".
- See `PROJECT_STATUS.md` for exact progress.

## Try it on this computer (test database — not real records)
1. Open the `site-control` folder and double-click **START_DEMO.cmd**.
2. Two black windows open (test database and app), then the browser opens the app. First time takes a few minutes.
3. **Owner:** tap "Owner: sign in with Google". A *test* Google page appears: tap "Add new account", type
   `munnajaswal22@gmail.com`, tap "Sign in". (This is a pretend sign-in; no real Google account is used.)
4. Tap the people icon (top right) → **Manage**: add a site, add a worker, choose their site and work, tap **Connect phone**.
5. **Worker:** open a *different* browser or an Incognito window, go to `http://localhost:5173/#/pair/` followed by
   the 10-digit code (or open `http://localhost:5173` → "मैं कारीगर हूँ" and type the code). Then tap हाजिरी लगाओ.
6. Back on the owner window, the attendance appears by itself. Approve it — the worker window updates by itself.
7. To stop, close both black windows. The test data is deleted when you close them.

## The plan, in short
| Phase | What you get |
|---|---|
| 1 | Screens you can click through on this computer, with sample (DEMO) data |
| 2 | Real login: you sign in with Google; workers' phones are paired with a QR code; real attendance |
| 3 | Voice notes turned into text and dashboard cards by AI (site, work, payment); you can play every recording; payments verified only by you |
| 4 | App online with HTTPS, installed on phones, real notifications to your phone |
| 5 | A real Android home-screen widget for you |
| 6 | Optional extras: daily summary, productivity reports |

## How workers log in
No email, no password. You add the worker, tap **Connect phone**, and the worker scans the QR code with the
phone camera once (or types the 10-digit number). The code works once, for 15 minutes.
If a phone is lost or a worker leaves, tap **Deactivate** — that phone loses access immediately.

## Money
Expected cost: about ₹0–20 per month for the app, plus roughly ₹50–250 per month for the AI that turns voice
into text (you approved this; I will show exact prices before switching it on). From Phase 3 Google needs a card
on file; we will set an alert that emails you if the bill ever goes above ₹500.

## What you need to do now
1. Paste the **firebaseConfig** block and the **Project ID** in chat (Firebase console → gear icon → Project settings →
   Your apps → your web app → "Config"). Your last message arrived without them.
2. Tell me if any other Gmail should be an owner.
3. When ready, tell me: **"Start Phase 3"**.
