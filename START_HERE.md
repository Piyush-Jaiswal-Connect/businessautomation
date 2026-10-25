# START HERE — Site Control (for the owner)

## What this is
Site Control is one app with two sides:
- **Worker side (Hindi first):** shows today's site, one big green button to mark attendance, one big mic button to send a voice update.
- **Owner side (English first):** who is present, which sites are active, new voice reports, and customer money still pending.

Both sides can switch between **हिंदी** and **English**.

It will open from a phone's home-screen icon called **"Site Control"**, like a normal app.

## Where things stand
- **Phase 2 (real login + real attendance): done and tested on a test database on this computer.**
  It is not yet connected to your real Firebase project — see "What you need to do now".
- See `PROJECT_STATUS.md` for exact progress.

## Try it on this computer (test database — not real records)
1. Open the `site-control` folder and double-click **START_DEMO.cmd**.
2. Two black windows open (test database and app), then the browser opens Site Control. First time takes a few minutes.
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
| 3 | Real voice notes you can play; customer payment tracking controlled only by you |
| 4 | App online with HTTPS, installed on phones, real notifications to your phone |
| 5 | A real Android home-screen widget for you |
| 6 | Optional: automatic Hindi voice-to-text (costs explained first) |

## How workers log in
No email, no password. You add the worker, tap **Connect phone**, and the worker scans the QR code with the
phone camera once (or types the 10-digit number). The code works once, for 15 minutes.
If a phone is lost or a worker leaves, tap **Deactivate** — that phone loses access immediately.

## Money
Expected cost: about ₹0–20 per month. From Phase 3 Google needs a card on file; we will set an alert
that emails you if the bill ever goes above ₹100.

## What you need to do now (about 10 minutes, free)
In https://console.firebase.google.com → your project **site-control**:
1. **Build → Authentication → Get started** → "Sign-in method" → turn on **Google** and **Anonymous**.
2. **Build → Firestore Database → Create database** → location **asia-south1 (Mumbai)** → **production mode**.
3. **Gear icon → Project settings → Your apps → Web (</>)** → name it "Site Control" → Register →
   copy the `firebaseConfig` block and paste it to me. (It is not a password; it is safe to share with me.)
4. Tell me the **Project ID** from the same settings page, and any other Gmail that should be an owner.

After that, tell me: **"Start Phase 3"** (voice notes and customer payments).
