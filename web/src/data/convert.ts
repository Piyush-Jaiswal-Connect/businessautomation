// Turns Firestore documents into the plain records the screens use.
import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'
import type { Assignment, Attendance, AttendanceStatus, Job, Payment, Report, Site, Worker } from '../types'

type Snap = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>

/** Firestore Timestamp (or a not-yet-confirmed server time) → milliseconds or null. */
export function ms(v: unknown): number | null {
  return v && typeof (v as { toMillis?: unknown }).toMillis === 'function' ? (v as { toMillis: () => number }).toMillis() : null
}

export function toWorker(s: Snap): Worker {
  const d = s.data()!
  return {
    id: s.id,
    name: d.name,
    nameHi: d.nameHi ?? '',
    trade: d.trade,
    active: d.active,
    deviceUid: d.deviceUid ?? null,
    pairedAt: ms(d.pairedAt),
  }
}

export function toSite(s: Snap): Site {
  const d = s.data()!
  return { id: s.id, name: d.name, area: d.area, active: d.active }
}

export function toAssignment(s: Snap): Assignment {
  const d = s.data()!
  return { workerId: s.id, siteId: d.siteId, task: d.task }
}

/**
 * pendingStatus: what to show while this phone still holds an unsent write
 * ('submitted' when online, 'pending_sync' when offline). The owner never sees those:
 * their screen only shows records the server has actually received.
 */
export function toAttendance(s: Snap, pendingStatus?: AttendanceStatus): Attendance {
  const d = s.data()!
  const serverTime = ms(d.serverTime)
  return {
    id: s.id,
    workerId: d.workerId,
    siteId: d.siteId ?? null,
    date: d.date,
    deviceTime: ms(d.deviceTime) ?? 0,
    serverTime,
    checkOutTime: ms(d.checkOutTime) ?? ms(d.checkOutDeviceTime),
    status: pendingStatus && (s.metadata.hasPendingWrites || serverTime === null) ? pendingStatus : d.status,
    correctedTime: ms(d.correctedTime),
    correctionReason: d.correctionReason ?? null,
    location: d.location ?? null,
    history: [],
  }
}

export function toReport(s: Snap): Report {
  const d = s.data()!
  return {
    id: s.id,
    workerId: d.workerId,
    deviceTime: ms(d.deviceTime) ?? 0,
    serverTime: ms(d.serverTime),
    durationSec: d.durationSec ?? 0,
    location: d.location ?? null,
    status: d.status ?? 'new',
    processingAt: ms(d.processingAt),
    ai: d.ai ?? null,
    aiError: d.aiError ?? null,
    edited: d.edited === true,
    reviewed: d.reviewed === true,
    paymentId: d.paymentId ?? null,
    audioDeleted: d.audioDeleted === true,
  }
}

export function toJob(s: Snap): Job {
  const d = s.data()!
  return {
    id: s.id,
    customer: d.customer ?? '',
    description: d.description ?? '',
    agreedCharge: d.agreedCharge ?? 0,
    workStatus: d.workStatus ?? 'in_progress',
    followUpDate: d.followUpDate ?? null,
    notes: d.notes ?? '',
  }
}

export function toPayment(s: Snap): Payment {
  const d = s.data()!
  return { id: s.id, jobId: d.jobId, amount: d.amount, date: ms(d.date) ?? 0, evidence: d.evidence, reportId: d.reportId ?? null }
}

export function errorText(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) return String((e as { code: string }).code)
  return e instanceof Error ? e.message : String(e)
}
