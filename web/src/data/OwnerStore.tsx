// Owner's live view of the database. Every list updates by itself when a phone writes.
import {
  Timestamp, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, db } from '../lib/firebase'
import { dayKey } from '../lib/format'
import type { Assignment, Attendance, AuditEntry, Job, Payment, Report, Settings, Site, Text, Trade, Worker } from '../types'
import { errorText, ms, toAssignment, toAttendance, toSite, toWorker } from './convert'

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
      onSnapshot(query(collection(db, 'auditLog'), orderBy('at', 'desc'), limit(300)), (s) =>
        setAudit(
          s.docs.map((d) => {
            const x = d.data()
            return { target: x.target, entry: { at: ms(x.at) ?? Date.now(), by: 'owner' as const, action: x.action, note: x.note } }
          }),
        ), fail),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

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

  const actions = useMemo(() => {
    const me = () => auth.currentUser!
    const fail = (e: unknown) => {
      setError(errorText(e))
      throw e
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

      // Phase 3 (voice reports and payments) — screens exist, data not connected yet.
      reviewReport: (id: string) => void id,
      approveCompletion: (jobId: string) => void jobId,
      addPayment: (jobId: string, amount: number, evidence: string) => void [jobId, amount, evidence],

      clearError: () => setError(null),
    }
  }, [attendanceRef])

  return {
    today, loaded, error, settings,
    workers, sites, assignments, attendance,
    reports: [] as Report[], jobs: [] as Job[], payments: [] as Payment[],
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
