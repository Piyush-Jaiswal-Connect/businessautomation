import { useState } from 'react'
import { useStore } from '../data/OwnerStore'
import { useLang } from '../i18n'
import { fmtDate, fmtDay, rupees } from '../lib/format'
import { balanceOf, lastPayment, paidFor, payState, totalOutstanding } from '../lib/summary'
import type { Job } from '../types'
import { Chip, useNames } from './shared'
import { workTones } from './SitesPage'

export function PaymentsPage() {
  const store = useStore()
  const { t } = useLang()
  const jobs = [...store.jobs].sort((a, b) => balanceOf(b, store.payments) - balanceOf(a, store.payments))

  return (
    <>
      <p className="o-notice">{t('phase3Notice')}</p>
      <div className="o-total">
        <span>{t('totalOutstanding')}</span>
        <strong>{rupees(totalOutstanding(store.jobs, store.payments))}</strong>
      </div>
      <ul className="o-stack">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </ul>
    </>
  )
}

function JobCard({ job }: { job: Job }) {
  const store = useStore()
  const { t, tx } = useLang()
  const { siteName } = useNames()
  const [adding, setAdding] = useState(false)

  const paid = paidFor(job.id, store.payments)
  const balance = balanceOf(job, store.payments)
  const state = payState(job, store.payments)
  const last = lastPayment(job.id, store.payments)
  const due = job.followUpDate && balance > 0 ? (job.followUpDate < store.today ? 'overdue' : job.followUpDate === store.today ? 'dueToday' : null) : null

  const stages: [string, boolean, string?][] = [
    [t('stageWorkDone'), job.workStatus !== 'in_progress'],
    [t('stageWorkApproved'), job.workStatus === 'owner_approved'],
    [t('stagePayReported'), job.paymentReported !== null],
    [t('stagePayVerified'), state !== 'pay_none', t(state)],
    [t('stageBalance'), balance === 0, rupees(balance)],
  ]

  return (
    <li className="o-item">
      <div className="o-item-head">
        <div>
          <div className="o-item-title">{job.customer}</div>
          <div className="o-muted">
            {siteName(job.siteId)} · {tx(job.description)}
          </div>
        </div>
        <Chip tone={state === 'pay_full' ? 'green' : state === 'pay_partial' ? 'amber' : 'red'}>{t(state)}</Chip>
      </div>

      <div className="o-money-grid">
        <div>
          <span>{t('agreed')}</span>
          <strong>{rupees(job.agreedCharge)}</strong>
        </div>
        <div>
          <span>{t('receivedVerified')}</span>
          <strong>{rupees(paid)}</strong>
        </div>
        <div className={balance > 0 ? 'o-owe' : ''}>
          <span>{t('balance')}</span>
          <strong>{rupees(balance)}</strong>
        </div>
      </div>

      <ol className="o-stages">
        {stages.map(([label, done, detail]) => (
          <li key={label} className={done ? 'done' : ''}>
            {label}
            {detail && ` · ${detail}`}
          </li>
        ))}
      </ol>

      <dl className="o-dl">
        <dt>{t('work')}</dt>
        <dd>
          <Chip tone={workTones[job.workStatus]}>{t(`work_${job.workStatus}`)}</Chip>
        </dd>
        <dt>{t('lastPayment')}</dt>
        <dd>{last ? `${rupees(last.amount)} · ${fmtDate(last.date)}` : t('none')}</dd>
        <dt>{t('nextFollowUp')}</dt>
        <dd>
          {job.followUpDate ? fmtDay(job.followUpDate) : t('none')}
          {due && <span className={due === 'overdue' ? 'o-red' : 'o-amber'}> · {t(due)}</span>}
        </dd>
        {job.paymentReported && (
          <>
            <dt>{t('stagePayReported')}</dt>
            <dd>
              {t('workerReported', { claim: t(`claim_${job.paymentReported}`) })}
              <div className="o-muted o-small">{t('workerReportNote')}</div>
            </dd>
          </>
        )}
      </dl>

      {balance > 0 &&
        (adding ? (
          <PaymentForm
            max={balance}
            onCancel={() => setAdding(false)}
            onSave={(amount, evidence) => {
              store.addPayment(job.id, amount, evidence)
              setAdding(false)
            }}
          />
        ) : (
          <div className="o-actions">
            <button className="o-btn o-btn-green" onClick={() => setAdding(true)}>{t('recordPayment')}</button>
          </div>
        ))}

      <details className="o-history">
        <summary>{t('paymentHistory')}</summary>
        <ul>
          {store.payments
            .filter((p) => p.jobId === job.id)
            .sort((a, b) => b.date - a.date)
            .map((p) => (
              <li key={p.id}>
                {fmtDate(p.date)} — {rupees(p.amount)} — {p.evidence}
              </li>
            ))}
        </ul>
      </details>
    </li>
  )
}

function PaymentForm({ max, onSave, onCancel }: { max: number; onSave: (amount: number, evidence: string) => void; onCancel: () => void }) {
  const { t } = useLang()
  const [amount, setAmount] = useState('')
  const [evidence, setEvidence] = useState('')
  const n = Number(amount)
  const tooBig = n > max
  const ok = Number.isFinite(n) && n > 0 && !tooBig && evidence.trim().length >= 2

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onSave(Math.round(n), evidence.trim())
      }}
    >
      <label>
        {t('amount')}
        <input inputMode="numeric" pattern="[0-9]*" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} required />
      </label>
      {tooBig && <div className="o-red o-small">{t('amountTooBig')}</div>}
      <label>
        {t('evidence')}
        <input value={evidence} onChange={(e) => setEvidence(e.target.value)} required />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit" disabled={!ok}>{t('save')}</button>
        <button className="o-btn" type="button" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  )
}
