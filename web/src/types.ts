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
}

export interface Site {
  id: string
  name: Text
  area: Text
  active: boolean
}

/** Today's site and job for one worker. Contains no money. */
export interface Assignment {
  workerId: string
  siteId: string
  jobId: string
  date: string // YYYY-MM-DD, Asia/Kolkata
  task: Text
}

/** OFFLINE/PENDING SYNC → SUBMITTED → RECEIVED → APPROVED / REJECTED */
export type SyncStatus = 'pending_sync' | 'submitted' | 'received'
export type AttendanceStatus = SyncStatus | 'approved' | 'rejected'

export interface AuditEntry {
  at: number
  by: 'worker' | 'owner'
  action: string
  note?: string
}

export interface Attendance {
  id: string // workerId_date — one per worker per day
  workerId: string
  siteId: string
  date: string
  deviceTime: number // when the worker tapped, phone clock
  serverTime: number | null // when the server received it
  checkOutTime: number | null
  status: AttendanceStatus
  correctedTime: number | null
  history: AuditEntry[]
}

export type WorkClaim = 'completed' | 'in_progress' | null
export type PaymentClaim = 'paid' | 'unpaid' | null

export interface Report {
  id: string
  workerId: string
  siteId: string
  jobId: string
  deviceTime: number
  serverTime: number | null
  syncStatus: SyncStatus
  durationSec: number
  audioUrl: string | null
  workClaim: WorkClaim
  paymentClaim: PaymentClaim
  reviewed: boolean
}

export type WorkStatus = 'in_progress' | 'worker_completed' | 'owner_approved'

/** Owner-only: contains money. */
export interface Job {
  id: string
  siteId: string
  customer: string
  description: Text
  agreedCharge: number
  workStatus: WorkStatus
  paymentReported: PaymentClaim // what a worker said; never counts as money received
  followUpDate: string | null
  notes: string
  history: AuditEntry[]
}

/** Owner-only, append-only: a payment the owner has checked. */
export interface Payment {
  id: string
  jobId: string
  amount: number
  date: number
  evidence: string
}
