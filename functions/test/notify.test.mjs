// Checks the notification triggers on a separate test database: one log entry per event, right words.
// Run from site-control/:  npm run test:functions
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'

initializeApp({ projectId: 'demo-site-control-fn' })
const db = getFirestore()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(fn, ms = 20000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const v = await fn()
    if (v) return v
    await sleep(500)
  }
  return null
}

test('check-in and voice report each notify the owner once, in English and Hindi', async () => {
  await db.doc('workers/wT').set({ name: 'Rajesh', nameHi: 'राजेश', trade: 'tiler', active: true, deviceUid: 'p1' })
  const when = Timestamp.fromDate(new Date('2026-10-25T03:38:00Z')) // 9:08 am India time
  await db.doc('attendance/wT_2026-10-25').set({ workerId: 'wT', siteId: null, date: '2026-10-25', deviceTime: when, status: 'received' })
  await db.doc('reports/rT').set({ workerId: 'wT', deviceUid: 'p1', deviceTime: when, durationSec: 12, status: 'new' })

  const logs = await waitFor(async () => {
    const s = await db.collection('notificationLog').get()
    return s.size >= 2 ? s.docs.map((d) => d.data()) : null
  })
  assert.ok(logs, 'two notifications were logged')
  const checkIn = logs.find((l) => l.kind === 'check_in')
  const report = logs.find((l) => l.kind === 'report')
  assert.equal(checkIn.title.en, 'Rajesh started work')
  assert.equal(checkIn.title.hi, 'राजेश ने हाजिरी लगाई')
  assert.match(checkIn.body.en, /9:08 am · tap to approve/)
  assert.equal(checkIn.link, '/#/owner/attendance')
  assert.equal(report.title.en, 'New voice report from Rajesh')
  assert.equal(report.link, '/#/owner/reports')
  assert.equal(checkIn.test, true)

  await sleep(3000)
  assert.equal((await db.collection('notificationLog').get()).size, 2, 'no duplicate notifications')
})
