// DEMO STORE — keeps records in memory in this browser tab only.
// Screens talk to it through useStore(); Phase 2 replaces it with a Firestore-backed store
// that offers the same data and actions.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { newId } from '../lib/format'
import type { Attendance, PaymentClaim, Report, WorkClaim } from '../types'
import { DEMO_WORKER_ID, makeDemoData, type DemoData } from './demoData'

type Action =
  | { type: 'checkIn'; workerId: string; online: boolean; now: number }
  | { type: 'checkOut'; workerId: string; now: number }
  | { type: 'received'; ids: string[]; now: number }
  | { type: 'decide'; id: string; status: 'approved' | 'rejected'; now: number }
  | { type: 'correct'; id: string; time: number; reason: string; now: number }
  | { type: 'addReport'; report: Report }
  | { type: 'reviewReport'; id: string }
  | { type: 'approveCompletion'; jobId: string; now: number }
  | { type: 'addPayment'; jobId: string; amount: number; evidence: string; now: number }

function reducer(s: DemoData, a: Action): DemoData {
  switch (a.type) {
    case 'checkIn': {
      const id = `${a.workerId}_${s.today}`
      // Same ID for the same worker and day: a second tap or a retry can never make a second record.
      if (s.attendance.some((x) => x.id === id)) return s
      const asg = s.assignments.find((x) => x.workerId === a.workerId)
      if (!asg) return s
      const rec: Attendance = {
        id, workerId: a.workerId, siteId: asg.siteId, date: s.today,
        deviceTime: a.now, serverTime: null, checkOutTime: null,
        status: a.online ? 'submitted' : 'pending_sync', correctedTime: null,
        history: [{ at: a.now, by: 'worker', action: 'check_in' }],
      }
      return { ...s, attendance: [...s.attendance, rec] }
    }
    case 'checkOut':
      return {
        ...s,
        attendance: s.attendance.map((x) =>
          x.workerId === a.workerId && x.date === s.today && x.checkOutTime === null
            ? { ...x, checkOutTime: a.now, history: [...x.history, { at: a.now, by: 'worker' as const, action: 'check_out' }] }
            : x,
        ),
      }
    case 'received': {
      const ids = new Set(a.ids)
      const reportsNow = s.reports.map((r) =>
        ids.has(r.id) && r.syncStatus !== 'received' ? { ...r, syncStatus: 'received' as const, serverTime: a.now } : r,
      )
      // What a worker says only sets the "reported" flags; money and approval stay with the owner.
      let jobs = s.jobs
      for (const r of reportsNow) {
        if (!ids.has(r.id)) continue
        jobs = jobs.map((j) => {
          if (j.id !== r.jobId) return j
          return {
            ...j,
            workStatus: r.workClaim === 'completed' && j.workStatus === 'in_progress' ? 'worker_completed' : j.workStatus,
            paymentReported: r.paymentClaim ?? j.paymentReported,
          }
        })
      }
      return {
        ...s,
        jobs,
        reports: reportsNow,
        attendance: s.attendance.map((x) =>
          ids.has(x.id) && (x.status === 'submitted' || x.status === 'pending_sync')
            ? { ...x, status: 'received' as const, serverTime: a.now }
            : x,
        ),
      }
    }
    case 'decide':
      return {
        ...s,
        attendance: s.attendance.map((x) =>
          x.id === a.id
            ? { ...x, status: a.status, history: [...x.history, { at: a.now, by: 'owner' as const, action: a.status === 'approved' ? 'approve' : 'reject' }] }
            : x,
        ),
      }
    case 'correct':
      return {
        ...s,
        attendance: s.attendance.map((x) =>
          x.id === a.id
            ? {
                ...x,
                status: 'approved' as const,
                correctedTime: a.time,
                history: [...x.history, { at: a.now, by: 'owner' as const, action: 'correct', note: a.reason }],
              }
            : x,
        ),
      }
    case 'addReport':
      if (s.reports.some((r) => r.id === a.report.id)) return s
      return { ...s, reports: [...s.reports, a.report] }
    case 'reviewReport':
      return { ...s, reports: s.reports.map((r) => (r.id === a.id ? { ...r, reviewed: true } : r)) }
    case 'approveCompletion':
      return {
        ...s,
        jobs: s.jobs.map((j) =>
          j.id === a.jobId
            ? { ...j, workStatus: 'owner_approved' as const, history: [...j.history, { at: a.now, by: 'owner' as const, action: 'approve_completion' }] }
            : j,
        ),
      }
    case 'addPayment':
      return {
        ...s,
        payments: [...s.payments, { id: newId(), jobId: a.jobId, amount: a.amount, date: a.now, evidence: a.evidence }],
        jobs: s.jobs.map((j) =>
          j.id === a.jobId
            ? { ...j, history: [...j.history, { at: a.now, by: 'owner' as const, action: 'payment_verified', note: `₹${a.amount} — ${a.evidence}` }] }
            : j,
        ),
      }
  }
}

export interface NewReport {
  durationSec: number
  audioUrl: string | null
  workClaim: WorkClaim
  paymentClaim: PaymentClaim
}

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, undefined, makeDemoData)
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  }, [state])

  // Pretend server round-trip: a submission becomes "received" a moment after it is sent.
  const confirmSoon = useCallback((id: string) => {
    setTimeout(() => dispatch({ type: 'received', ids: [id], now: Date.now() }), 900)
  }, [])

  // When this phone comes back online, send what was waiting.
  useEffect(() => {
    const flush = () => {
      const s = latest.current
      const ids = [
        ...s.attendance.filter((x) => x.workerId === DEMO_WORKER_ID && x.status === 'pending_sync').map((x) => x.id),
        ...s.reports.filter((r) => r.workerId === DEMO_WORKER_ID && r.syncStatus === 'pending_sync').map((r) => r.id),
      ]
      if (ids.length) setTimeout(() => dispatch({ type: 'received', ids, now: Date.now() }), 900)
    }
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  const actions = useMemo(
    () => ({
      checkIn(workerId: string) {
        const online = navigator.onLine
        dispatch({ type: 'checkIn', workerId, online, now: Date.now() })
        if (online) confirmSoon(`${workerId}_${latest.current.today}`)
      },
      checkOut: (workerId: string) => dispatch({ type: 'checkOut', workerId, now: Date.now() }),
      approve: (id: string) => dispatch({ type: 'decide', id, status: 'approved', now: Date.now() }),
      reject: (id: string) => dispatch({ type: 'decide', id, status: 'rejected', now: Date.now() }),
      correct: (id: string, time: number, reason: string) =>
        dispatch({ type: 'correct', id, time, reason, now: Date.now() }),
      addReport(workerId: string, r: NewReport) {
        const s = latest.current
        const asg = s.assignments.find((x) => x.workerId === workerId)
        if (!asg) return
        const online = navigator.onLine
        const id = newId()
        dispatch({
          type: 'addReport',
          report: {
            id, workerId, siteId: asg.siteId, jobId: asg.jobId, deviceTime: Date.now(), serverTime: null,
            syncStatus: online ? 'submitted' : 'pending_sync', reviewed: false, ...r,
          },
        })
        if (online) confirmSoon(id)
      },
      reviewReport: (id: string) => dispatch({ type: 'reviewReport', id }),
      approveCompletion: (jobId: string) => dispatch({ type: 'approveCompletion', jobId, now: Date.now() }),
      addPayment: (jobId: string, amount: number, evidence: string) =>
        dispatch({ type: 'addPayment', jobId, amount, evidence, now: Date.now() }),
    }),
    [confirmSoon],
  )

  return { ...state, ...actions }
}

export type Store = ReturnType<typeof useStoreValue>

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreValue()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
