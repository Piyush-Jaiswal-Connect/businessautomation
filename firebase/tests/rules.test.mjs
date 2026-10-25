// Security-rule tests. Run from site-control/:  npm run test:rules
// They start a local Firestore emulator; nothing touches the real project.
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  Bytes, Timestamp, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'

const OWNER_EMAIL = 'munnajaswal22@gmail.com'
let env

const owner = () => env.authenticatedContext('owner1', { email: OWNER_EMAIL, email_verified: true }).firestore()
const stranger = () => env.authenticatedContext('google-stranger', { email: 'someone@gmail.com', email_verified: true }).firestore()
const phone = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
const nobody = () => env.unauthenticatedContext().firestore()

// India date for a moment, same as the app
const istDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(ms)
const today = () => istDate(Date.now())

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'sites/s1'), { name: { en: 'Ghansoli', hi: 'घणसोली' }, area: { en: 'Ghansoli', hi: '' }, active: true })
    await setDoc(doc(db, 'sites/s2'), { name: { en: 'Vashi', hi: '' }, area: { en: 'Vashi', hi: '' }, active: true })
    for (const id of ['wA', 'wB']) {
      await setDoc(doc(db, `workers/${id}`), { name: id, nameHi: '', trade: 'tiler', active: true, deviceUid: null, pairedAt: null, pairingCode: null })
    }
    await setDoc(doc(db, 'assignments/wA'), { siteId: 's1', task: { en: 'Tiles', hi: '' }, updatedAt: Timestamp.now() })
    await setDoc(doc(db, 'assignments/wB'), { siteId: 's2', task: { en: 'Paint', hi: '' }, updatedAt: Timestamp.now() })
  })
}

async function makeCode(code, workerId, minutes = 15) {
  await assertSucceeds(setDoc(doc(owner(), `pairings/${code}`), {
    workerId, createdBy: 'owner1', createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + minutes * 60_000), usedBy: null, usedAt: null,
  }))
}

function claimBatch(db, uid, code, workerId) {
  const b = writeBatch(db)
  b.update(doc(db, `workers/${workerId}`), { deviceUid: uid, pairedAt: serverTimestamp(), pairingCode: code })
  b.update(doc(db, `pairings/${code}`), { usedBy: uid, usedAt: serverTimestamp() })
  b.set(doc(db, `devices/${uid}`), { workerId, pairedAt: serverTimestamp() })
  return b.commit()
}

function checkInData(workerId, siteId, extra = {}) {
  const now = Date.now()
  return {
    workerId, siteId, date: istDate(now), deviceTime: Timestamp.fromMillis(now), serverTime: serverTimestamp(),
    location: null, status: 'received', checkOutTime: null, checkOutDeviceTime: null,
    correctedTime: null, correctionReason: null, decidedBy: null, decidedAt: null, lastAuditId: null, ...extra,
  }
}

async function pairA() {
  await makeCode('1111111111', 'wA')
  await assertSucceeds(claimBatch(phone('phoneA'), 'phoneA', '1111111111', 'wA'))
}

before(async () => {
  env = await initializeTestEnvironment({
    // Separate project and port from the everyday test database, so running tests never touches its data.
    projectId: 'demo-site-control-test',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: Number((process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180').split(':')[1]),
    },
  })
})
beforeEach(async () => {
  await env.clearFirestore()
  await seed()
})
after(() => env.cleanup())

describe('who can see what', () => {
  test('not signed in: nothing', async () => {
    await assertFails(getDoc(doc(nobody(), 'workers/wA')))
    await assertFails(getDoc(doc(nobody(), 'sites/s1')))
    await assertFails(getDocs(collection(nobody(), 'attendance')))
  })
  test('a Google account that is not the owner: nothing', async () => {
    await assertFails(getDocs(collection(stranger(), 'workers')))
    await assertFails(setDoc(doc(stranger(), 'sites/s9'), { name: { en: 'x', hi: '' }, area: { en: 'x', hi: '' }, active: true }))
  })
  test('owner can manage sites, workers and assignments', async () => {
    const db = owner()
    await assertSucceeds(getDocs(collection(db, 'workers')))
    await assertSucceeds(setDoc(doc(db, 'sites/s3'), { name: { en: 'Kopar', hi: 'कोपर' }, area: { en: 'Kopar', hi: '' }, active: true }))
    await assertSucceeds(setDoc(doc(db, 'workers/wC'), { name: 'C', nameHi: '', trade: 'plumber', active: true, deviceUid: null, pairedAt: null, pairingCode: null }))
    await assertSucceeds(setDoc(doc(db, 'assignments/wC'), { siteId: 's3', task: { en: 'Pipes', hi: '' }, updatedAt: serverTimestamp() }))
  })
  test('owner email must be verified', async () => {
    const db = env.authenticatedContext('fake', { email: OWNER_EMAIL, email_verified: false }).firestore()
    await assertFails(getDocs(collection(db, 'workers')))
  })
  test('unknown jobs/payments collections are closed even to signed-in phones', async () => {
    await pairA()
    await assertFails(getDocs(collection(phone('phoneA'), 'payments')))
  })
})

describe('pairing a phone', () => {
  test('fresh code works once and gives access to own data only', async () => {
    await pairA()
    const db = phone('phoneA')
    await assertSucceeds(getDoc(doc(db, 'workers/wA')))
    await assertSucceeds(getDoc(doc(db, 'assignments/wA')))
    await assertSucceeds(getDoc(doc(db, 'sites/s1')))
    await assertFails(getDoc(doc(db, 'workers/wB')))
    await assertFails(getDoc(doc(db, 'sites/s2')))
    await assertFails(getDocs(collection(db, 'workers')))
  })
  test('a used code cannot be used again by another phone', async () => {
    await pairA()
    await assertFails(getDoc(doc(phone('thief'), 'pairings/1111111111')))
    await assertFails(claimBatch(phone('thief'), 'thief', '1111111111', 'wA'))
  })
  test('an expired code does not work', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'pairings/2222222222'), {
        workerId: 'wA', createdBy: 'owner1', createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() - 1000), usedBy: null, usedAt: null,
      })
    })
    await assertFails(claimBatch(phone('late'), 'late', '2222222222', 'wA'))
  })
  test("a code for worker A cannot link a phone to worker B", async () => {
    await makeCode('3333333333', 'wA')
    await assertFails(claimBatch(phone('p'), 'p', '3333333333', 'wB'))
  })
  test('a phone cannot set itself as a worker without a code', async () => {
    const db = phone('sneaky')
    await assertFails(updateDoc(doc(db, 'workers/wA'), { deviceUid: 'sneaky' }))
  })
  test('owner cannot make a code valid for more than 30 minutes', async () => {
    await assertFails(setDoc(doc(owner(), 'pairings/4444444444'), {
      workerId: 'wA', createdBy: 'owner1', createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 120 * 60_000), usedBy: null, usedAt: null,
    }))
  })
})

describe('attendance', () => {
  test('paired worker checks in once with server time; a second record is refused', async () => {
    await pairA()
    const db = phone('phoneA')
    const ref = doc(db, `attendance/wA_${today()}`)
    await assertSucceeds(setDoc(ref, checkInData('wA', 's1')))
    await assertFails(setDoc(ref, checkInData('wA', 's1')))
    await assertSucceeds(getDoc(ref))
  })
  test('worker cannot check in at a site they are not assigned to', async () => {
    await pairA()
    await assertFails(setDoc(doc(phone('phoneA'), `attendance/wA_${today()}`), checkInData('wA', 's2')))
  })
  test('worker cannot check in for someone else', async () => {
    await pairA()
    await assertFails(setDoc(doc(phone('phoneA'), `attendance/wB_${today()}`), checkInData('wB', 's2')))
  })
  test('worker cannot fake the server time or approve themselves', async () => {
    await pairA()
    const db = phone('phoneA')
    await assertFails(setDoc(doc(db, `attendance/wA_${today()}`), checkInData('wA', 's1', { serverTime: Timestamp.fromMillis(Date.now() - 3600_000) })))
    await assertFails(setDoc(doc(db, `attendance/wA_${today()}`), checkInData('wA', 's1', { status: 'approved' })))
    await assertSucceeds(setDoc(doc(db, `attendance/wA_${today()}`), checkInData('wA', 's1')))
    await assertFails(updateDoc(doc(db, `attendance/wA_${today()}`), { status: 'approved' }))
  })
  test('date in the ID must match the tap time', async () => {
    await pairA()
    const d = checkInData('wA', 's1', { date: '2020-01-01' })
    await assertFails(setDoc(doc(phone('phoneA'), 'attendance/wA_2020-01-01'), d))
  })
  test('worker can check out once', async () => {
    await pairA()
    const ref = doc(phone('phoneA'), `attendance/wA_${today()}`)
    await assertSucceeds(setDoc(ref, checkInData('wA', 's1')))
    await assertSucceeds(updateDoc(ref, { checkOutTime: serverTimestamp(), checkOutDeviceTime: Timestamp.now() }))
    await assertFails(updateDoc(ref, { checkOutTime: serverTimestamp(), checkOutDeviceTime: Timestamp.now() }))
  })
  test('worker cannot list everyone\'s attendance', async () => {
    await pairA()
    await assertFails(getDocs(collection(phone('phoneA'), 'attendance')))
  })
  test('owner approval needs an audit entry in the same batch', async () => {
    await pairA()
    const id = `wA_${today()}`
    await assertSucceeds(setDoc(doc(phone('phoneA'), `attendance/${id}`), checkInData('wA', 's1')))
    const db = owner()
    await assertFails(updateDoc(doc(db, `attendance/${id}`), { status: 'approved', decidedBy: 'owner1', decidedAt: serverTimestamp(), lastAuditId: 'nope' }))
    const b = writeBatch(db)
    b.set(doc(db, 'auditLog/a1'), { at: serverTimestamp(), by: 'owner1', byEmail: OWNER_EMAIL, target: `attendance/${id}`, action: 'approve', note: null, before: 'received', after: 'approved' })
    b.update(doc(db, `attendance/${id}`), { status: 'approved', decidedBy: 'owner1', decidedAt: serverTimestamp(), lastAuditId: 'a1' })
    await assertSucceeds(b.commit())
  })
  test('correction needs a reason', async () => {
    await pairA()
    const id = `wA_${today()}`
    await assertSucceeds(setDoc(doc(phone('phoneA'), `attendance/${id}`), checkInData('wA', 's1')))
    const db = owner()
    const tryCorrect = (auditId, reason) => {
      const b = writeBatch(db)
      b.set(doc(db, `auditLog/${auditId}`), { at: serverTimestamp(), by: 'owner1', byEmail: OWNER_EMAIL, target: `attendance/${id}`, action: 'correct', note: reason, before: null, after: null })
      b.update(doc(db, `attendance/${id}`), { status: 'approved', correctedTime: Timestamp.now(), correctionReason: reason, decidedBy: 'owner1', decidedAt: serverTimestamp(), lastAuditId: auditId })
      return b.commit()
    }
    await assertFails(tryCorrect('c1', ''))
    await assertSucceeds(tryCorrect('c2', 'Came at 9, phone had no network'))
  })
  test('audit entries cannot be edited or deleted', async () => {
    const db = owner()
    await assertSucceeds(setDoc(doc(db, 'auditLog/x'), { at: serverTimestamp(), by: 'owner1', byEmail: OWNER_EMAIL, target: 'workers/wA', action: 'deactivate', note: null, before: null, after: null }))
    await assertFails(updateDoc(doc(db, 'auditLog/x'), { note: 'changed' }))
  })
})

describe('lost phone', () => {
  test('after the owner deactivates the worker, the old phone is locked out', async () => {
    await pairA()
    await assertSucceeds(updateDoc(doc(owner(), 'workers/wA'), { active: false, deviceUid: null }))
    const db = phone('phoneA')
    await assertFails(getDoc(doc(db, 'workers/wA')))
    await assertFails(getDoc(doc(db, 'sites/s1')))
    await assertFails(setDoc(doc(db, `attendance/wA_${today()}`), checkInData('wA', 's1')))
  })
  test('the same phone can be connected again with a new code after deactivation', async () => {
    await pairA()
    await assertSucceeds(updateDoc(doc(owner(), 'workers/wA'), { active: false, deviceUid: null }))
    await assertSucceeds(updateDoc(doc(owner(), 'workers/wA'), { active: true }))
    await makeCode('6666666666', 'wA')
    await assertSucceeds(claimBatch(phone('phoneA'), 'phoneA', '6666666666', 'wA'))
    await assertSucceeds(getDoc(doc(phone('phoneA'), 'workers/wA')))
  })
  test('a phone cannot point its device record at another worker', async () => {
    await pairA()
    await assertFails(setDoc(doc(phone('phoneA'), 'devices/phoneA'), { workerId: 'wB', pairedAt: serverTimestamp() }))
  })
  test('pairing a new phone cuts off the old phone', async () => {
    await pairA()
    await makeCode('5555555555', 'wA')
    await assertSucceeds(claimBatch(phone('phoneA2'), 'phoneA2', '5555555555', 'wA'))
    await assertFails(getDoc(doc(phone('phoneA'), 'workers/wA')))
    await assertSucceeds(getDoc(doc(phone('phoneA2'), 'workers/wA')))
  })
})

describe('started-work attendance', () => {
  test('worker may check in without a site', async () => {
    await pairA()
    await assertSucceeds(setDoc(doc(phone('phoneA'), `attendance/wA_${today()}`), checkInData('wA', null)))
  })
})

function reportBatch(db, uid, id, workerId, { audioBytes = 1000, withAudio = true, extra = {} } = {}) {
  const b = writeBatch(db)
  b.set(doc(db, `reports/${id}`), {
    workerId, deviceUid: uid, deviceTime: Timestamp.now(), serverTime: serverTimestamp(),
    durationSec: 12, mimeType: 'audio/webm;codecs=opus', location: { lat: 19.12, lng: 73.0, accuracy: 20 }, status: 'new', ...extra,
  })
  if (withAudio) {
    b.set(doc(db, `reportAudio/${id}`), {
      workerId, deviceUid: uid, audio: Bytes.fromUint8Array(new Uint8Array(audioBytes)), mimeType: 'audio/webm', createdAt: serverTimestamp(),
    })
  }
  return b.commit()
}

describe('voice reports', () => {
  test('paired worker sends a report with its recording', async () => {
    await pairA()
    await assertSucceeds(reportBatch(phone('phoneA'), 'phoneA', 'r1', 'wA'))
    await assertSucceeds(getDocs(query(collection(phone('phoneA'), 'reports'), where('deviceUid', '==', 'phoneA'))))
  })
  test('a report without its recording, or a too-big recording, is refused', async () => {
    await pairA()
    await assertFails(reportBatch(phone('phoneA'), 'phoneA', 'r2', 'wA', { withAudio: false }))
    await assertFails(reportBatch(phone('phoneA'), 'phoneA', 'r3', 'wA', { audioBytes: 950 * 1024 }))
  })
  test('cannot send as another worker or pretend the AI already ran', async () => {
    await pairA()
    await assertFails(reportBatch(phone('phoneA'), 'phoneA', 'r4', 'wB'))
    await assertFails(reportBatch(phone('phoneA'), 'phoneA', 'r5', 'wA', { extra: { status: 'processed' } }))
  })
  test('unpaired phone cannot send', async () => {
    await assertFails(reportBatch(phone('stranger'), 'stranger', 'r6', 'wA'))
  })
  test('worker cannot read recordings, other phones\' reports, or change a report', async () => {
    await pairA()
    await assertSucceeds(reportBatch(phone('phoneA'), 'phoneA', 'r7', 'wA'))
    await assertFails(getDoc(doc(phone('phoneA'), 'reportAudio/r7')))
    await assertFails(getDocs(collection(phone('phoneA'), 'reports')))
    await assertFails(getDoc(doc(phone('other'), 'reports/r7')))
    await assertFails(updateDoc(doc(phone('phoneA'), 'reports/r7'), { status: 'processed' }))
  })
  test('owner reads the recording and saves AI results, but cannot change what the worker sent', async () => {
    await pairA()
    await assertSucceeds(reportBatch(phone('phoneA'), 'phoneA', 'r8', 'wA'))
    const db = owner()
    await assertSucceeds(getDoc(doc(db, 'reportAudio/r8')))
    await assertSucceeds(updateDoc(doc(db, 'reports/r8'), { status: 'processed', ai: { transcript: 'काम पूरा' } }))
    await assertFails(updateDoc(doc(db, 'reports/r8'), { deviceTime: Timestamp.fromMillis(0) }))
    await assertFails(updateDoc(doc(db, 'reportAudio/r8'), { mimeType: 'x' }))
  })
})

function jobBatch(db, siteId, auditId, agreed = 50000) {
  const b = writeBatch(db)
  b.set(doc(db, `auditLog/${auditId}`), { at: serverTimestamp(), by: 'owner1', byEmail: OWNER_EMAIL, target: `jobs/${siteId}`, action: 'job_saved', note: null, before: null, after: agreed })
  b.set(doc(db, `jobs/${siteId}`), {
    customer: 'Mr. Patil', description: 'Bathroom', agreedCharge: agreed, workStatus: 'in_progress',
    followUpDate: null, notes: '', updatedAt: serverTimestamp(), lastAuditId: auditId,
  })
  return b.commit()
}

function paymentBatch(db, id, auditId, amount = 5000) {
  const b = writeBatch(db)
  b.set(doc(db, `auditLog/${auditId}`), { at: serverTimestamp(), by: 'owner1', byEmail: OWNER_EMAIL, target: `payments/${id}`, action: 'payment_verified', note: 'UPI', before: null, after: amount })
  b.set(doc(db, `payments/${id}`), {
    jobId: 's1', amount, date: Timestamp.now(), evidence: 'UPI ref 123', reportId: null,
    verifiedBy: 'owner1', createdAt: serverTimestamp(), lastAuditId: auditId,
  })
  return b.commit()
}

describe('customer money', () => {
  test('owner saves a job and a verified payment only with audit entries', async () => {
    const db = owner()
    await assertFails(setDoc(doc(db, 'jobs/s1'), {
      customer: 'x', description: '', agreedCharge: 1, workStatus: 'in_progress', followUpDate: null, notes: '', updatedAt: serverTimestamp(), lastAuditId: 'none',
    }))
    await assertSucceeds(jobBatch(db, 's1', 'j1'))
    await assertSucceeds(paymentBatch(db, 'p1', 'pa1'))
    await assertFails(updateDoc(doc(db, 'payments/p1'), { amount: 1 }))
    await assertSucceeds(paymentBatch(db, 'p2', 'pa2', -5000)) // reversal of a mistake
  })
  test('workers can never read money records', async () => {
    await pairA()
    await assertSucceeds(jobBatch(owner(), 's1', 'j2'))
    await assertFails(getDoc(doc(phone('phoneA'), 'jobs/s1')))
    await assertFails(getDocs(collection(phone('phoneA'), 'payments')))
    await assertFails(jobBatch(phone('phoneA'), 's1', 'j3'))
  })
})

describe('owner notification devices', () => {
  test('owner stores own device token; workers and others cannot', async () => {
    const data = (t) => ({ token: t, lang: 'en', userAgent: 'test', createdAt: serverTimestamp() })
    await assertSucceeds(setDoc(doc(owner(), 'ownerDevices/owner1/tokens/tok1'), data('tok1')))
    await assertFails(setDoc(doc(owner(), 'ownerDevices/someoneElse/tokens/tok2'), data('tok2')))
    await pairA()
    await assertFails(setDoc(doc(phone('phoneA'), 'ownerDevices/phoneA/tokens/tok3'), data('tok3')))
    await assertFails(getDoc(doc(phone('phoneA'), 'ownerDevices/owner1/tokens/tok1')))
    await assertFails(getDoc(doc(owner(), 'notificationLog/x')))
  })
})
