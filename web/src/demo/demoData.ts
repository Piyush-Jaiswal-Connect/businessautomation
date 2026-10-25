// DEMO DATA — invented names, sites and amounts for Phase 1 only.
// Replaced by real Firestore records in Phase 2/3.
import { addDays, at, dayKey } from '../lib/format'
import type { Assignment, Attendance, Job, Payment, Report, Site, Worker } from '../types'

export const DEMO_WORKER_ID = 'w1' // the "phone" shown in the worker view

export function makeDemoData() {
  const today = dayKey()
  // Sample events happened a little before "now", so they always look like earlier today.
  const ago = (minutes: number) => Date.now() - minutes * 60_000

  const workers: Worker[] = [
    { id: 'w1', name: 'Rajesh', nameHi: 'राजेश', trade: 'tiler', active: true },
    { id: 'w2', name: 'Suresh', nameHi: 'सुरेश', trade: 'mason', active: true },
    { id: 'w3', name: 'Anil', nameHi: 'अनिल', trade: 'plumber', active: true },
    { id: 'w4', name: 'Imran', nameHi: 'इमरान', trade: 'electrician', active: true },
    { id: 'w5', name: 'Ganesh', nameHi: 'गणेश', trade: 'painter', active: true },
    { id: 'w6', name: 'Ramesh', nameHi: 'रमेश', trade: 'painter', active: true },
    { id: 'w7', name: 'Santosh', nameHi: 'संतोष', trade: 'carpenter', active: true },
    { id: 'w8', name: 'Vijay', nameHi: 'विजय', trade: 'helper', active: true },
    { id: 'w9', name: 'Manoj', nameHi: 'मनोज', trade: 'waterproofing', active: true },
    { id: 'w10', name: 'Deepak', nameHi: 'दीपक', trade: 'helper', active: true },
    { id: 'w11', name: 'Sunil', nameHi: 'सुनील', trade: 'mason', active: true },
    { id: 'w12', name: 'Arif', nameHi: 'आरिफ़', trade: 'carpenter', active: true },
    { id: 'w13', name: 'Prakash', nameHi: 'प्रकाश', trade: 'helper', active: true },
  ]

  const sites: Site[] = [
    { id: 's1', name: { en: 'Ghansoli — Flat 502', hi: 'घणसोली — फ्लैट 502' }, area: { en: 'Ghansoli', hi: 'घणसोली' }, active: true },
    { id: 's2', name: { en: 'Koparkhairane — Shop 12', hi: 'कोपरखैरणे — दुकान 12' }, area: { en: 'Koparkhairane', hi: 'कोपरखैरणे' }, active: true },
    { id: 's3', name: { en: 'Vashi Sec 17 — Flat 1203', hi: 'वाशी सेक्टर 17 — फ्लैट 1203' }, area: { en: 'Vashi', hi: 'वाशी' }, active: true },
    { id: 's4', name: { en: 'Ghansoli — Row House 8', hi: 'घणसोली — रो हाउस 8' }, area: { en: 'Ghansoli', hi: 'घणसोली' }, active: true },
    { id: 's5', name: { en: 'Vashi Sec 9 — Flat 304', hi: 'वाशी सेक्टर 9 — फ्लैट 304' }, area: { en: 'Vashi', hi: 'वाशी' }, active: false },
  ]

  const jobs: Job[] = [
    {
      id: 'j1', siteId: 's1', customer: 'Mr. Patil (demo)',
      description: { en: 'Bathroom tiling and waterproofing', hi: 'बाथरूम टाइल्स और वॉटरप्रूफ़िंग' },
      agreedCharge: 85_000, workStatus: 'in_progress', paymentReported: null,
      followUpDate: addDays(today, 3), notes: '', history: [],
    },
    {
      id: 'j2', siteId: 's2', customer: 'Shree Medical (demo)',
      description: { en: 'Shop false ceiling and wiring', hi: 'दुकान फ़ॉल्स सीलिंग और वायरिंग' },
      agreedCharge: 1_20_000, workStatus: 'in_progress', paymentReported: null,
      followUpDate: today, notes: 'Second instalment due after ceiling', history: [],
    },
    {
      id: 'j3', siteId: 's3', customer: 'Mrs. Shah (demo)',
      description: { en: 'Full flat painting', hi: 'पूरे फ्लैट की पेंटिंग' },
      agreedCharge: 65_000, workStatus: 'worker_completed', paymentReported: 'unpaid',
      followUpDate: addDays(today, -1), notes: '', history: [],
    },
    {
      id: 'j4', siteId: 's4', customer: 'Mr. Khan (demo)',
      description: { en: 'Kitchen carpentry and plumbing', hi: 'किचन का लकड़ी का काम और प्लंबिंग' },
      agreedCharge: 2_10_000, workStatus: 'in_progress', paymentReported: null,
      followUpDate: addDays(today, 7), notes: '', history: [],
    },
    {
      id: 'j5', siteId: 's5', customer: 'Mr. Joshi (demo)',
      description: { en: 'Terrace waterproofing', hi: 'छत वॉटरप्रूफ़िंग' },
      agreedCharge: 40_000, workStatus: 'owner_approved', paymentReported: 'paid',
      followUpDate: null, notes: '', history: [],
    },
  ]

  const payments: Payment[] = [
    { id: 'p1', jobId: 'j1', amount: 40_000, date: at(addDays(today, -12), '11:00'), evidence: 'UPI advance (demo)' },
    { id: 'p2', jobId: 'j2', amount: 60_000, date: at(addDays(today, -20), '16:30'), evidence: 'Cheque (demo)' },
    { id: 'p3', jobId: 'j3', amount: 30_000, date: at(addDays(today, -15), '10:15'), evidence: 'Cash (demo)' },
    { id: 'p4', jobId: 'j4', amount: 1_50_000, date: at(addDays(today, -5), '18:00'), evidence: 'Bank transfer (demo)' },
    { id: 'p5', jobId: 'j5', amount: 40_000, date: at(addDays(today, -30), '12:00'), evidence: 'UPI (demo)' },
  ]

  const task = (en: string, hi: string) => ({ en, hi })
  const assign = (workerId: string, siteId: string, jobId: string, t: { en: string; hi: string }): Assignment =>
    ({ workerId, siteId, jobId, date: today, task: t })

  const assignments: Assignment[] = [
    assign('w1', 's1', 'j1', task('Bathroom wall tiles', 'बाथरूम दीवार की टाइल्स')),
    assign('w9', 's1', 'j1', task('Bathroom waterproofing coat', 'बाथरूम वॉटरप्रूफ़िंग कोट')),
    assign('w10', 's1', 'j1', task('Helper — tiles', 'हेल्पर — टाइल्स')),
    assign('w4', 's2', 'j2', task('Ceiling light wiring', 'सीलिंग लाइट वायरिंग')),
    assign('w12', 's2', 'j2', task('False ceiling frame', 'फ़ॉल्स सीलिंग फ्रेम')),
    assign('w8', 's2', 'j2', task('Helper — ceiling', 'हेल्पर — सीलिंग')),
    assign('w5', 's3', 'j3', task('Touch-up and final coat', 'टच-अप और फ़ाइनल कोट')),
    assign('w6', 's3', 'j3', task('Touch-up and final coat', 'टच-अप और फ़ाइनल कोट')),
    assign('w3', 's4', 'j4', task('Kitchen sink plumbing', 'किचन सिंक प्लंबिंग')),
    assign('w7', 's4', 'j4', task('Kitchen cabinets', 'किचन कैबिनेट')),
    assign('w2', 's4', 'j4', task('Kitchen platform', 'किचन प्लेटफ़ॉर्म')),
    assign('w11', 's4', 'j4', task('Platform support wall', 'प्लेटफ़ॉर्म की दीवार')),
    assign('w13', 's4', 'j4', task('Helper — kitchen', 'हेल्पर — किचन')),
  ]

  // Rajesh (w1) has not checked in yet, so the worker view can be tried.
  const att = (workerId: string, minutesAgo: number, status: Attendance['status']): Attendance => {
    const a = assignments.find((x) => x.workerId === workerId)!
    const t = ago(minutesAgo)
    return {
      id: `${workerId}_${today}`, workerId, siteId: a.siteId, date: today,
      deviceTime: t, serverTime: status === 'pending_sync' ? null : t + 2000,
      checkOutTime: null, status, correctedTime: null,
      history: [{ at: t, by: 'worker', action: 'check_in' }],
    }
  }
  const attendance: Attendance[] = [
    att('w9', 150, 'approved'),
    att('w10', 144, 'approved'),
    att('w4', 139, 'received'),
    att('w12', 130, 'received'),
    att('w8', 128, 'approved'),
    att('w5', 126, 'received'),
    att('w3', 121, 'approved'),
    att('w7', 117, 'received'),
    att('w2', 111, 'pending_sync'),
  ]

  const report = (id: string, workerId: string, minutesAgo: number, workClaim: Report['workClaim'], paymentClaim: Report['paymentClaim'], durationSec: number): Report => {
    const a = assignments.find((x) => x.workerId === workerId)!
    const t = ago(minutesAgo)
    return {
      id, workerId, siteId: a.siteId, jobId: a.jobId, deviceTime: t, serverTime: t + 3000,
      syncStatus: 'received', durationSec, audioUrl: null, workClaim, paymentClaim, reviewed: false,
    }
  }
  const reports: Report[] = [
    report('r1', 'w5', 90, 'completed', 'unpaid', 34),
    report('r2', 'w4', 66, 'in_progress', null, 21),
    report('r3', 'w3', 49, null, null, 48),
  ]

  return { today, workers, sites, jobs, payments, assignments, attendance, reports }
}

export type DemoData = ReturnType<typeof makeDemoData>
