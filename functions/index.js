// Ayush Enterprises — server part: notifications to the owner's devices.
// Every message comes from a real database event (a check-in, a voice report) or the 9 am summary.
// Needs the Blaze plan to deploy. In the local test database (emulator) messages are only logged, not sent.
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { onSchedule } from 'firebase-functions/v2/scheduler'

initializeApp()
const db = getFirestore()
// Same region as the database (Mumbai). One small instance is plenty for a few dozen events a day.
setGlobalOptions({ region: 'asia-south1', maxInstances: 2, memory: '256MiB' })

const TZ = 'Asia/Kolkata'
const inEmulator = process.env.FUNCTIONS_EMULATOR === 'true'

const timeIn = (date) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(date)
const todayIn = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

async function workerName(workerId) {
  const w = (await db.doc(`workers/${workerId}`).get()).data()
  return { en: w?.name ?? 'A worker', hi: w?.nameHi || w?.name || 'कारीगर' }
}

/**
 * Sends one message (English or Hindi per device) to every owner device, once per event.
 * eventId makes repeats harmless: the server may deliver the same event twice.
 */
async function notifyOwners(eventId, msg) {
  const logRef = db.doc(`notificationLog/${eventId}`)
  try {
    await logRef.create({ ...msg, at: FieldValue.serverTimestamp(), sent: 0, test: inEmulator })
  } catch {
    return // already handled this event
  }
  if (inEmulator) return

  const tokens = await db.collectionGroup('tokens').get()
  const byLang = { en: [], hi: [] }
  for (const t of tokens.docs) {
    if (t.ref.parent.parent?.parent.id !== 'ownerDevices') continue
    byLang[t.data().lang === 'hi' ? 'hi' : 'en'].push(t)
  }
  let sent = 0
  for (const lang of ['en', 'hi']) {
    const list = byLang[lang]
    if (!list.length) continue
    const res = await getMessaging().sendEachForMulticast({
      tokens: list.map((d) => d.id),
      data: { title: msg.title[lang], body: msg.body[lang], link: msg.link, tag: msg.tag ?? '' },
      webpush: { headers: { Urgency: 'high', TTL: String(24 * 3600) } },
    })
    sent += res.successCount
    // Remove devices that were uninstalled or turned notifications off.
    await Promise.all(
      res.responses.map((r, i) =>
        !r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code ?? '')
          ? list[i].ref.delete()
          : null,
      ),
    )
  }
  await logRef.update({ sent })
}

export const onCheckIn = onDocumentCreated('attendance/{id}', async (event) => {
  const a = event.data?.data()
  if (!a) return
  const name = await workerName(a.workerId)
  const time = timeIn(a.deviceTime.toDate())
  await notifyOwners(event.id, {
    kind: 'check_in',
    title: { en: `${name.en} started work`, hi: `${name.hi} ने हाजिरी लगाई` },
    body: { en: `${time} · tap to approve`, hi: `${time} · मंज़ूर करने के लिए दबाएँ` },
    link: '/#/owner/attendance',
    tag: `attendance-${event.params.id}`,
  })
})

export const onVoiceReport = onDocumentCreated('reports/{id}', async (event) => {
  const r = event.data?.data()
  if (!r) return
  const name = await workerName(r.workerId)
  const time = timeIn(r.deviceTime.toDate())
  await notifyOwners(event.id, {
    kind: 'report',
    title: { en: `New voice report from ${name.en}`, hi: `${name.hi} की नई आवाज़ रिपोर्ट` },
    body: { en: `${time} · open the app to see site, work and payment`, hi: `${time} · साइट, काम और पेमेंट देखने के लिए ऐप खोलें` },
    link: '/#/owner/reports',
    tag: `report-${event.params.id}`,
  })
})

/** 9 am India time: what is waiting for the owner. Sent only if something is waiting. */
export const morningSummary = onSchedule({ schedule: '0 9 * * *', timeZone: TZ }, async (event) => {
  const today = todayIn()
  const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() - 86_400_000))
  const [approvals, reports, jobs, payments] = await Promise.all([
    db.collection('attendance').where('date', 'in', [today, yesterday]).where('status', '==', 'received').get(),
    db.collection('reports').select('reviewed').get(), // new reports have no "reviewed" field yet
    db.collection('jobs').where('followUpDate', '<=', today).get(),
    db.collection('payments').get(),
  ])
  const toReview = reports.docs.filter((d) => d.data().reviewed !== true).length
  const paid = {}
  for (const p of payments.docs) paid[p.data().jobId] = (paid[p.data().jobId] ?? 0) + p.data().amount
  const followUps = jobs.docs.filter((j) => j.data().agreedCharge - (paid[j.id] ?? 0) > 0).length

  const parts = { en: [], hi: [] }
  if (approvals.size) {
    parts.en.push(`${approvals.size} attendance to approve`)
    parts.hi.push(`${approvals.size} हाजिरी मंज़ूर करनी है`)
  }
  if (toReview) {
    parts.en.push(`${toReview} voice report(s) to review`)
    parts.hi.push(`${toReview} आवाज़ रिपोर्ट देखनी हैं`)
  }
  if (followUps) {
    parts.en.push(`${followUps} payment follow-up(s) due`)
    parts.hi.push(`${followUps} पेमेंट फ़ॉलो-अप बाकी`)
  }
  if (!parts.en.length) return
  await notifyOwners(`summary-${today}-${event.jobName ?? 'daily'}`.replace(/[^\w-]/g, '_'), {
    kind: 'summary',
    title: { en: 'Good morning — waiting for you', hi: 'सुप्रभात — आपके लिए बाकी काम' },
    body: { en: parts.en.join(' · '), hi: parts.hi.join(' · ') },
    link: '/#/owner/home',
    tag: 'morning-summary',
  })
})
