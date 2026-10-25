# START HERE — Site Control (for the owner)

## What this is
Site Control is one app with two sides:
- **Worker side (Hindi first):** shows today's site, one big green button to mark attendance, one big mic button to send a voice update.
- **Owner side (English first):** who is present, which sites are active, new voice reports, and customer money still pending.

Both sides can switch between **हिंदी** and **English**.

It will open from a phone's home-screen icon called **"Site Control"**, like a normal app.

## Where things stand
- **Phase 0 (setup): done.** Only the plan and an empty app skeleton exist. Nothing is usable yet.
- See `PROJECT_STATUS.md` for exact progress.

## The plan, in short
| Phase | What you get |
|---|---|
| 1 | Screens you can click through on this computer, with sample (DEMO) data |
| 2 | Real login: you sign in with Google; workers' phones are paired with a QR code; real attendance |
| 3 | Real voice notes you can play; customer payment tracking controlled only by you |
| 4 | App online with HTTPS, installed on phones, real notifications to your phone |
| 5 | A real Android home-screen widget for you |
| 6 | Optional: automatic Hindi voice-to-text (costs explained first) |

## How workers will log in (from Phase 2)
No email, no password. You add the worker, tap "Pair phone", and the worker scans the QR code once.
If a phone is lost, you tap "Deactivate" and that phone loses access immediately.

## Money
Expected cost: about ₹0–20 per month. From Phase 3 Google needs a card on file; we will set an alert
that emails you if the bill ever goes above ₹100.

## What you need to do now
Nothing. When you are ready, tell me: **"Start Phase 1"**.
