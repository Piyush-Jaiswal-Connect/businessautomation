# START HERE — Ayush Enterprises app (for the owner)

## What this is
The Ayush Enterprises app has two sides:
- **Worker side (Hindi first):** one big green button to mark attendance, one big mic button to send a voice update. Workers never type.
- **Owner side (English first):** who is present, and every voice update turned into a card: which site, what work, finished or not, did the customer pay.

Both sides can switch between **हिंदी** and **English**.

It will open from a phone's home-screen icon called **"Ayush"**, like a normal app.

## Where things stand
- **Phase 3 (voice messages → dashboard cards, customer payments): built and tested** on this computer's test
  database, using the real free Google AI. Hindi test messages came out right: correct site, work, finished or not,
  payment and amount, and "site not recognised" when the place was new.
- Not yet tried with real workers' voices on real phones (Phase 4), and the security rules are not yet uploaded to
  your real Firebase project (needs your one-time login).
- See `PROJECT_STATUS.md` for exact progress.

## Try it on this computer (test database — not real records)
1. Double-click **START_DEMO.cmd** in the `site-control` folder. Two black windows open, then the browser.
2. **Owner:** "Owner: sign in with Google" → test page → "Add new account" → `munnajaswal22@gmail.com` → Sign in.
3. People icon (top right) → **Manage**: add your sites (English + Hindi names), add a worker, tap **Connect phone**.
4. **Worker:** open an **Incognito** window at `http://localhost:5173/#/pair/` + the 10-digit code → connect →
   tap **हाजिरी लगाओ** → tap the mic, speak in Hindi (which site, what work, did the customer pay), tap **रोको**.
5. Back on the owner window → **Reports**: within seconds the voice becomes a card. Verify money, approve work,
   or tap **Correct** if anything is wrong.
6. Close both black windows to stop (test data is wiped).

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
1. Try the voice message yourself on this PC (steps above) and tell me what to change.
2. When ready, tell me: **"Start Phase 4"** (app online, installed on phones, notifications).
