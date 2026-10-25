// Owner's live view of the database. Every list updates by itself when a phone writes.
import {
  Timestamp, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import { dayKey } from '../lib/format'
import type {
  Assignment, Attendance, AuditEntry, Job, Payment, Report, ReportAi, Settings, Site, Text, Trade, Worker, WorkStatus,
} from '../types'
import { errorText, ms, toAssignment, toAttendance, toJob, toPayment, toReport, toSite, toWorker } from './convert'
import { audioBlobFrom, cleanOldRecordings, useAiProcessor } from './processor'

interface AuditRow {
  target: string
  entry: AuditEntry
}

function useToday() {
  const [today, setToday] = useState(dayKey)
  useEffect(() => {
    const t = window.setInterval(() => setToday(dayKey()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return today
}

function randomCode(): string {
  const a = new Uint32Array(10)
  crypto.getRandomValues(a)
  return Array.from(a, (n) => n % 10).join('')
}

function useOwnerStoreValue() {
  const today = useToday()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [rawAttendance, setRawAttendance] = useState<Attendance[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [settings, setSettings] = useState<Settings>({ askLocation: false })
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fail = (e: unknown) => setError(errorText(e))
    const unsubs = [
      onSnapshot(collection(db, 'workers'), (s) => {
        setWorkers(s.docs.map(toWorker).sort((a, b) => a.name.localeCompare(b.name)))
        setLoaded(true)
      }, fail),
      onSnapshot(collection(db, 'sites'), (s) => setSites(s.docs.map(toSite).sort((a, b) => a.name.en.localeCompare(b.name.en))), fail),
      onSnapshot(collection(db, 'assignments'), (s) => setAssignments(s.docs.map(toAssignment)), fail),
      onSnapshot(doc(db, 'config/settings'), (s) => setSettings({ askLocation: s.data()?.askLocation === true }), fail),
      // Only reports the server has received (a phone's unsent ones are never shown as received).
      onSnapshot(query(collection(db, 'reports'), orderBy('deviceTime', 'desc'), limit(300)), (s) =>
        setReports(s.docs.filter((d) => d.data().serverTime).map(toReport)), fail),
      onSnapshot(collection(db, 'jobs'), (s) => setJobs(s.docs.map(toJob)), fail),
      onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (s) => setPayments(s.docs.map(toPayment)), fail),
      onSnapshot(query(collection(db, 'auditLog'), orderBy('at', 'desc'), limit(300)), (s) =>
        setAudit(
          s.docs.map((d) => {
            const x = d.data()
            return { target: x.target, entry: { at: ms(x.at) ?? Date.now(), by: 'owner' as const, action: x.action, note: x.note } }
          }),
        ), fail),
    ]
    cleanOldRecordings().catch(() => {}) // tidy up once per session
    return () => unsubs.forEach((u) => u())
  }, [])

  // New voice reports -> text + fields (while this dashboard is open).
  useAiProcessor(reports, workers, sites)

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'attendance'), where('date', '==', today)),
        (s) => setRawAttendance(s.docs.filter((d) => d.data().serverTime).map((d) => toAttendance(d))),
        (e) => setError(errorText(e)),
      ),
    [today],
  )

  // History = the worker's own check-in/out plus every owner change from the audit log.
  const attendance = useMemo(
    () =>
      rawAttendance.map((a) => {
        const history: AuditEntry[] = [{ at: a.deviceTime, by: 'worker', action: 'check_in' }]
        if (a.checkOutTime) history.push({ at: a.checkOutTime, by: 'worker', action: 'check_out' })
        for (const r of audit) if (r.target === `attendance/${a.id}`) history.push(r.entry)
        return { ...a, history: history.sort((x, y) => x.at - y.at) }
      }),
    [rawAttendance, audit],
  )
  const attendanceRef = useRefValue(attendance)
  const jobsRef = useRefValue(jobs)

  const actions = useMemo(() => {
    const me = () => auth.currentUser!
    const fail = (e: unknown) => {
      setError(errorText(e))
      throw e
    }

    function saveJob(siteId: string, patch: Partial<Omit<Job, 'id'>>, action: string) {
      const current = jobsRef.current.find((j) => j.id === siteId)
      const base = current ?? { customer: '', description: '', agreedCharge: 0, workStatus: 'in_progress' as WorkStatus, followUpDate: null, notes: '' }
      const { id: _drop, ...next } = { id: siteId, ...base, ...patch }
      void _drop
      const b = writeBatch(db)
      const auditRef = doc(collection(db, 'auditLog'))
      b.set(auditRef, {
        at: serverTimestamp(), by: me().uid, byEmail: me().email, target: `jobs/${siteId}`, action,
        note: null, before: current ? JSON.stringify(current) : null, after: JSON.stringify(next),
      })
      b.set(doc(db, 'jobs', siteId), { ...next, updatedAt: serverTimestamp(), lastAuditId: auditRef.id })
      return b.commit().catch(fail)
    }

    function decide(a: Attendance, status: 'approved' | 'rejected', action: string, extra: Record<string, unknown> = {}, note: string | null = null) {
      const b = writeBatch(db)
      const auditRef = doc(collection(db, 'auditLog'))
      b.set(auditRef, {
        at: serverTimestamp(), by: me().uid, byEmail: me().email, target: `attendance/${a.id}`,
        action, note, before: a.status, after: status,
      })
      b.update(doc(db, 'attendance', a.id), {
        status, decidedBy: me().uid, decidedAt: serverTimestamp(), lastAuditId: auditRef.id, ...extra,
      })
      return b.commit().catch(fail)
    }

    const find = (id: string) => attendanceRef.current.find((a) => a.id === id)!

    return {
      approve: (id: string) => decide(find(id), 'approved', 'approve'),
      reject: (id: string) => decide(find(id), 'rejected', 'reject'),
      correct: (id: string, time: number, reason: string) =>
        decide(find(id), 'approved', 'correct', { correctedTime: Timestamp.fromMillis(time), correctionReason: reason }, reason),

      addSite: (name: Text, area: Text) =>
        setDoc(doc(collection(db, 'sites')), { name, area, active: true, createdAt: serverTimestamp() }).catch(fail),
      setSiteActive: (site: Site, active: boolean) =>
        updateDoc(doc(db, 'sites', site.id), { active }).catch(fail),

      addWorker: (name: string, nameHi: string, trade: Trade) =>
        setDoc(doc(collection(db, 'workers')), {
          name, nameHi, trade, active: true, deviceUid: null, pairedAt: null, pairingCode: null, createdAt: serverTimestamp(),
        }).catch(fail),
      setAssignment: (workerId: string, siteId: string, task: Text) =>
        setDoc(doc(db, 'assignments', workerId), { siteId, task, updatedAt: serverTimestamp() }).catch(fail),

      /** One-time 10-digit code, valid 15 minutes. */
      async createPairing(workerId: string) {
        const code = randomCode()
        const expiresAt = Date.now() + 15 * 60_000
        await setDoc(doc(db, 'pairings', code), {
          workerId, createdBy: me().uid, createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromMillis(expiresAt), usedBy: null, usedAt: null,
        }).catch(fail)
        return { code, expiresAt }
      },

      /** Lost phone or worker left: their phone loses access immediately. */
      setWorkerActive(w: Worker, active: boolean) {
        const b = writeBatch(db)
        b.set(doc(collection(db, 'auditLog')), {
          at: serverTimestamp(), by: me().uid, byEmail: me().email, target: `workers/${w.id}`,
          action: active ? 'reactivate' : 'deactivate', note: null, before: null, after: null,
        })
        b.update(doc(db, 'workers', w.id), active ? { active: true } : { active: false, deviceUid: null })
        return b.commit().catch(fail)
      },

      setAskLocation: (askLocation: boolean) => setDoc(doc(db, 'config/settings'), { askLocation }).catch(fail),

      // ---------- voice reports ----------
      reviewReport: (id: string, reviewed = true) =>
        updateDoc(doc(db, 'reports', id), { reviewed, reviewedBy: me().uid, reviewedAt: serverTimestamp() }).catch(fail),
      retryReport: (id: string) => updateDoc(doc(db, 'reports', id), { status: 'new', aiError: null }).catch(fail),
      /** Owner corrects what the AI understood. The first AI answer is kept in aiOriginal. */
      editReport(r: Report, patch: Partial<ReportAi>) {
        const ai = { ...r.ai!, ...patch }
        return updateDoc(doc(db, 'reports', r.id), {
          ai, edited: true, ...(r.edited ? {} : { aiOriginal: r.ai }), editedBy: me().uid, editedAt: serverTimestamp(),
        }).catch(fail)
      },
      async loadAudio(reportId: string): Promise<Blob | null> {
        const a = await getDoc(doc(db, 'reportAudio', reportId))
        return a.exists() ? audioBlobFrom(a.data() as never) : null
      },

      // ---------- customer money (each change also writes an audit entry) ----------
      saveJob: (siteId: string, patch: Partial<Omit<Job, 'id'>>) => saveJob(siteId, patch, 'job_saved'),
      approveFinished: (siteId: string) => saveJob(siteId, { workStatus: 'owner_approved' as WorkStatus }, 'work_approved'),
      async addPayment(siteId: string, amount: number, evidence: string, reportId: string | null = null) {
        if (!jobsRef.current.some((j) => j.id === siteId)) await saveJob(siteId, {}, 'job_created')
        const b = writeBatch(db)
        const pay = doc(collection(db, 'payments'))
        const auditRef = doc(collection(db, 'auditLog'))
        b.set(auditRef, {
          at: serverTimestamp(), by: me().uid, byEmail: me().email, target: `payments/${pay.id}`,
          action: amount < 0 ? 'payment_reversed' : 'payment_verified', note: evidence, before: null, after: amount,
        })
        b.set(pay, {
          jobId: siteId, amount, date: Timestamp.now(), evidence, reportId, verifiedBy: me().uid,
          createdAt: serverTimestamp(), lastAuditId: auditRef.id,
        })
        if (reportId) b.update(doc(db, 'reports', reportId), { paymentId: pay.id })
        return b.commit().catch(fail)
      },

      clearError: () => setError(null),
    }
  }, [attendanceRef, jobsRef])

  return {
    today, loaded, error, settings,
    workers, sites, assignments, attendance, reports, jobs, payments,
    ...actions,
  }
}

/** A ref that always holds the latest value (read inside actions without re-creating them). */
function useRefValue<T>(value: T) {
  const [ref] = useState(() => ({ current: value }))
  useEffect(() => {
    ref.current = value
  }, [ref, value])
  return ref
}

export type OwnerStore = ReturnType<typeof useOwnerStoreValue>

const Ctx = createContext<OwnerStore | null>(null)

export function OwnerStoreProvider({ children }: { children: ReactNode }) {
  const store = useOwnerStoreValue()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): OwnerStore {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside OwnerStoreProvider')
  return s
}
