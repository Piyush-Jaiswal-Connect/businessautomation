# START HERE — Ayush Enterprises app (for the owner)

## What this is
The Ayush Enterprises app has two sides:
- **Worker side (Hindi first):** one big green button to mark attendance, one big mic button to send a voice update. Workers never type.
- **Owner side (English first):** who is present, and every voice update turned into a card: which site, what work, finished or not, did the customer pay.

Both sides can switch between **हिंदी** and **English**. On phones it opens from a home-screen icon called **"Ayush"**.

## The app's address
**https://businessautomation-2884f.firebaseapp.com**
(The …web.app address also works and moves you here.) Workers never need to type it: the QR code you show them opens it.

## Where things stand
- **Phase 4 (online app, install, notifications): mostly done.** The app is live. Owner notifications are built and
  tested on the test database, but the server part can only go live after you switch on Google's pay-as-you-go plan.
- **Not yet tested on real phones**: that needs you (checklist below).
- See `PROJECT_STATUS.md` for exact progress.

## What you need to do now
1. **Turn on worker phone sign-in** (1 minute) — right now worker phones cannot connect:
   console.firebase.google.com → businessautomation → **Build → Authentication → Sign-in method** →
   **Add new provider → Anonymous → Enable → Save**.
2. **Decide about notifications** (they need Google's pay-as-you-go "Blaze" plan with a card on this project):
   - **Option A — notifications + paid AI:** about **₹100–250/month** for the AI at ~50 voice messages a day
     (Google then does not use your recordings). Everything else stays ~₹0.
   - **Option B — notifications + AI kept free:** create one more free Firebase project just for the AI (5 minutes,
     I guide you). App ₹0–few rupees; AI ₹0 (free-tier terms as now).
   - **Option C — no notifications for now:** stay completely free; you open the app to check.
   For A or B: Firebase console → bottom-left **"Spark – Upgrade"** → **Blaze** → add a billing account, then
   Google Cloud console → Billing → **Budgets & alerts** → ₹300/month budget with email alerts.
3. **Test on real phones** with the checklist below and tell me what happened.

## Install on a phone
1. Open **Chrome** on the Android phone and go to the address above (or scan the worker QR code).
2. Tap **Install** on the "Put the Ayush app on your home screen" card, or Chrome **⋮ → Add to Home screen / Install app**.
3. The **Ayush** icon appears on the home screen. Open the app from that icon from now on.

## Phone test checklist (please try and tell me the results)
Owner phone:
- [ ] Open the app → "मालिक: Google से लॉगिन" → sign in with munnajaswal22@gmail.com → dashboard opens.
- [ ] Manage → add a real site and a worker → **Connect phone** shows a QR code.
- [ ] Manage → **Turn on notifications** (after the Blaze step) → allow.
Worker phone:
- [ ] Scan the QR with the phone camera → app opens → "मंज़ूर है — फ़ोन जोड़ो" → worker screen appears.
- [ ] Install the app → open from the **Ayush** icon → still connected (no new code needed).
- [ ] Tap **हाजिरी लगाओ** → owner sees it (and gets a notification after the Blaze step) → approve → worker sees "मालिक ने मंज़ूर किया".
- [ ] Tap the mic → speak a real message on site → **रोको** → wait 5 seconds → "पहुँच गई".
- [ ] Owner opens Reports → the card shows the right site, work and payment. Play the recording.
- [ ] Turn on airplane mode → send a voice message → it says "नेटवर्क का इंतज़ार" → turn network on → becomes "पहुँच गई".
- [ ] Close and reopen the app → the worker is still connected.

## Try it on this computer (test database — not real records)
1. Double-click **START_DEMO.cmd** in the `site-control` folder. Two black windows open, then the browser.
2. **Owner:** "Owner: sign in with Google" → test page → "Add new account" → `munnajaswal22@gmail.com` → Sign in.
3. People icon (top right) → **Manage**: add sites, add a worker, tap **Connect phone**.
4. **Worker:** an **Incognito** window at `http://localhost:5173/#/pair/` + the 10-digit code → connect → attendance → mic.
5. Close both black windows to stop (test data is wiped).

## How workers log in
No email, no password. You add the worker, tap **Connect phone**, and the worker scans the QR code with the
phone camera once (or types the 10-digit number). The code works once, for 15 minutes.
If a phone is lost or a worker leaves, tap **Deactivate** — that phone loses access immediately.

## The plan, in short
| Phase | What you get |
|---|---|
| 1–3 | Screens, real login and attendance, voice messages → AI cards, customer payments (done) |
| 4 | App online, installed on phones, notifications to your phone (in progress) |
| 5 | A real Android home-screen widget for you |
| 6 | Optional extras: daily summary, productivity reports |

## Money
Now: **₹0** (free plan, free AI). With notifications (Blaze plan): app ₹0–a few rupees per month, plus the AI:
₹0 with Option B, or about ₹100–250 per month with Option A. The budget alert emails you before anything unexpected.
