// Numbers on the dashboard are always calculated from the records, never typed in.
import type { Attendance, Job, Payment, Report } from '../types'

export const isPresent = (a: Attendance) => a.status !== 'rejected'
export const awaitsApproval = (a: Attendance) => a.status === 'received' || a.status === 'submitted'

export function paidFor(jobId: string, payments: Payment[]): number {
  return payments.filter((p) => p.jobId === jobId).reduce((sum, p) => sum + p.amount, 0)
}

export function balanceOf(job: Job, payments: Payment[]): number {
  return Math.max(0, job.agreedCharge - paidFor(job.id, payments))
}

export type PayState = 'pay_none' | 'pay_partial' | 'pay_full'

export function payState(job: Job, payments: Payment[]): PayState {
  const paid = paidFor(job.id, payments)
  if (paid <= 0) return 'pay_none'
  if (job.agreedCharge <= 0) return 'pay_partial' // agreed amount not entered yet: never call it "fully paid"
  return paid >= job.agreedCharge ? 'pay_full' : 'pay_partial'
}

export function lastPayment(jobId: string, payments: Payment[]): Payment | undefined {
  return payments.filter((p) => p.jobId === jobId).sort((a, b) => b.date - a.date)[0]
}

export function totalOutstanding(jobs: Job[], payments: Payment[]): number {
  return jobs.reduce((sum, j) => sum + balanceOf(j, payments), 0)
}

/** Follow-ups on or before today for jobs that still owe money. */
export function followUpsDue(jobs: Job[], payments: Payment[], today: string): Job[] {
  return jobs.filter((j) => j.followUpDate !== null && j.followUpDate <= today && balanceOf(j, payments) > 0)
}

export const unreviewed = (reports: Report[]) => reports.filter((r) => !r.reviewed)
