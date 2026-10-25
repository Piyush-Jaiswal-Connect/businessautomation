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
Expected cost: **₹0** for now. The voice-to-text uses Google's free AI tier (good Hindi accuracy). The trade-off of
"free": Google may use those voice messages to improve its products, and request numbers per day are capped (far above
what you need). Later, only phone notifications (Phase 4) need a card on file with Google; expected cost still ₹0.

## What you need to do now
1. **Approve a one-time Firebase login on this PC** (I start it; you click "Allow" in the browser with the Google
   account that owns the Firebase project). This lets me upload the security rules.
2. **Turn on the free AI:** console.firebase.google.com → your project → **Build → AI Logic → Get started** →
   choose **Gemini Developer API** → enable. Do **not** add a billing account.
3. **Tell me who signs in as owner** — right now only munnajaswal22@gmail.com is allowed. Add family members if needed.
4. When ready, tell me: **"Start Phase 3"**.
