// Shapes of the records. They mirror the Firestore collections in ARCHITECTURE.md §4,
// so Phase 2 can swap the demo store for the real database without changing screens.

export type Lang = 'hi' | 'en'

/** Text the owner enters once, shown in either language. */
export interface Text {
  en: string
  hi: string
}

export type Trade =
  | 'mason'
  | 'painter'
  | 'tiler'
  | 'carpenter'
  | 'plumber'
  | 'electrician'
  | 'waterproofing'
  | 'helper'

export interface Worker {
  id: string
  name: string
  nameHi: string
  trade: Trade
  active: boolean
  deviceUid: string | null // the paired phone; null = no phone or deactivated
  pairedAt: number | null
}

export interface Site {
  id: string
  name: Text
  area: Text
  active: boolean
}

/** A worker's current site and work. Stays until the owner changes it. Contains no money. */
export interface Assignment {
  workerId: string
  siteId: string
  jobId?: string // Phase 3
  task: Text
}

export interface Settings {
  askLocation: boolean
}

/** OFFLINE/PENDING SYNC → SUBMITTED → RECEIVED → APPROVED / REJECTED */
export type SyncStatus = 'pending_sync' | 'submitted' | 'received'
export type AttendanceStatus = SyncStatus | 'approved' | 'rejected'

export interface AuditEntry {
  at: number
  by: 'worker' | 'owner'
  action: string
  note?: string | null
}

export interface GeoPoint {
  lat: number
  lng: number
  accuracy: number
}

export interface Attendance {
  id: string // workerId_date — one per worker per day
  workerId: string
  siteId: string | null // only if the owner had assigned a site ("started work")
  date: string
  deviceTime: number // when the worker tapped, phone clock
  serverTime: number | null // when the server received it (null until it has)
  checkOutTime: number | null
  status: AttendanceStatus
  correctedTime: number | null
  correctionReason: string | null
  location: GeoPoint | null
  history: AuditEntry[]
}

// ---------- voice reports ----------

export type WorkSaid = 'completed' | 'in_progress' | 'problem' | 'not_mentioned'
export type PaymentSaid = 'paid' | 'partial' | 'unpaid' | 'not_mentioned'
export type Confidence = 'high' | 'low'

/** What the AI understood from a voice message. Only what the worker said; the owner can correct it. */
export interface ReportAi {
  transcript: string // exact words (Hindi in Devanagari, English in Latin)
  translationEn: string
  siteId: string | null // matched to a known site, or null
  placeText: string // the place as the worker said it
  workEn: string
  workHi: string
  workStatus: WorkSaid
  paymentStatus: PaymentSaid
  amount: number | null // rupees the worker says were received
  followUpEn: string
  followUpHi: string
  confidence: { site: Confidence; work: Confidence; payment: Confidence }
  audioQuality: 'clear' | 'noisy' | 'silent'
}

/** new → processing → processed (or failed, retried by the owner) */
export type ReportStatus = 'new' | 'processing' | 'processed' | 'failed'

export interface Report {
  id: string
  workerId: string
  deviceTime: number
  serverTime: number | null
  durationSec: number
  location: GeoPoint | null
  status: ReportStatus
  processingAt: number | null
  ai: ReportAi | null
  aiError: string | null
  edited: boolean // owner corrected the AI result
  reviewed: boolean
  paymentId: string | null // the verified payment made from this report
  audioDeleted: boolean
}

export type WorkStatus = 'in_progress' | 'worker_completed' | 'owner_approved'

/** Owner-only: one money record per site (id = siteId). Workers can never read it. */
export interface Job {
  id: string
  customer: string
  description: string
  agreedCharge: number
  workStatus: WorkStatus
  followUpDate: string | null
  notes: string
}

/** Owner-only, append-only: money the owner has checked. A mistake is fixed with a negative reversal. */
export interface Payment {
  id: string
  jobId: string
  amount: number
  date: number
  evidence: string
  reportId: string | null
}
