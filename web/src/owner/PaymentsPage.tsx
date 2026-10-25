// Owner-only customer money, one card per site. Workers' words are shown but never counted as money.
import { useState } from 'react'
import { useStore } from '../data/OwnerStore'
import { useLang } from '../i18n'
import { fmtDate, fmtDay, fmtTime, rupees } from '../lib/format'
import { balanceOf, lastPayment, paidFor, payState, totalOutstanding } from '../lib/summary'
import type { Job, Site } from '../types'
import { needsPaymentCheck, PayForm } from './ReportsPage'
import { Chip } from './shared'
import { workTones } from './SitesPage'

export function PaymentsPage() {
  const store = useStore()
  const { t } = useLang()
  // Active sites, plus finished ones that still owe money.
  const sites = store.sites
    .filter((s) => s.active || store.jobs.some((j) => j.id === s.id && balanceOf(j, store.payments) > 0))
    .map((s) => ({ site: s, job: store.jobs.find((j) => j.id === s.id) }))
    .sort((a, b) => (b.job ? balanceOf(b.job, store.payments) : 0) - (a.job ? balanceOf(a.job, store.payments) : 0))

  return (
    <>
      <div className="o-total">
        <span>{t('totalOutstanding')}</span>
        <strong>{rupees(totalOutstanding(store.jobs, store.payments))}</strong>
      </div>
      {sites.length === 0 && <p className="o-muted">{t('noSitesMoney')}</p>}
      <ul className="o-stack">
        {sites.map(({ site, job }) => (
          <JobCard key={site.id} site={site} job={job} />
        ))}
      </ul>
    </>
  )
}

function JobCard({ site, job }: { site: Site; job?: Job }) {
  const store = useStore()
  const { t, tx } = useLang()
  const [mode, setMode] = useState<'view' | 'edit' | 'pay'>('view')

  const payments = store.payments.filter((p) => p.jobId === site.id)
  const paid = paidFor(site.id, store.payments)
  const balance = job ? balanceOf(job, store.payments) : 0
  const state = job ? payState(job, store.payments) : paid > 0 ? 'pay_partial' : 'pay_none'
  const last = lastPayment(site.id, store.payments)
  const due = job?.followUpDate && balance > 0 ? (job.followUpDate < store.today ? 'overdue' : job.followUpDate === store.today ? 'dueToday' : null) : null
  // Latest worker report about money for this site that the owner has not verified yet.
  const report = store.reports.find((r) => r.ai?.siteId === site.id && needsPaymentCheck(r))
  const reportedFinished = store.reports.some((r) => r.ai?.siteId === site.id && r.ai.workStatus === 'completed')

  const stages: [string, boolean, string?][] = [
    [t('stageWorkDone'), reportedFinished || (job ? job.workStatus !== 'in_progress' : false)],
    [t('stageWorkApproved'), job?.workStatus === 'owner_approved'],
    [t('stagePayReported'), !!report || payments.length > 0],
    [t('stagePayVerified'), paid > 0, t(state)],
    [t('stageBalance'), !!job && balance === 0 && job.agreedCharge > 0, job ? rupees(balance) : undefined],
  ]

  return (
    <li className="o-item">
      <div className="o-item-head">
        <div>
          <div className="o-item-title">{tx(site.name)}</div>
          <div className="o-muted">
            {job?.customer || '—'}
            {job?.description && ` · ${job.description}`}
          </div>
        </div>
        <Chip tone={state === 'pay_full' ? 'green' : state === 'pay_partial' ? 'amber' : 'red'}>{t(state)}</Chip>
      </div>

      {job && job.agreedCharge <= 0 && mode === 'view' && (
        <button className="o-btn o-btn-green o-wide" onClick={() => setMode('edit')}>{t('setUpJob')}</button>
      )}
      {job ? (
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
      ) : (
        mode === 'view' && <button className="o-btn o-btn-green o-wide" onClick={() => setMode('edit')}>{t('setUpJob')}</button>
      )}

      <ol className="o-stages">
        {stages.map(([label, done, detail]) => (
          <li key={label} className={done ? 'done' : ''}>
            {label}
            {detail && ` · ${detail}`}
          </li>
        ))}
      </ol>

      <dl className="o-dl">
        {job && (
          <>
            <dt>{t('work')}</dt>
            <dd>
              <Chip tone={workTones[job.workStatus]}>{t(`work_${job.workStatus}`)}</Chip>
            </dd>
          </>
        )}
        <dt>{t('lastPayment')}</dt>
        <dd>{last ? `${rupees(last.amount)} · ${fmtDate(last.date)}` : t('none')}</dd>
        <dt>{t('nextFollowUp')}</dt>
        <dd>
          {job?.followUpDate ? fmtDay(job.followUpDate) : t('none')}
          {due && <span className={due === 'overdue' ? 'o-red' : 'o-amber'}> · {t(due)}</span>}
        </dd>
        {report?.ai && (
          <>
            <dt>{t('stagePayReported')}</dt>
            <dd>
              {t('workerPaymentReport', {
                time: `${fmtDate(report.deviceTime)} ${fmtTime(report.deviceTime)}`,
                what: `${t(`paySaid_${report.ai.paymentStatus}`)}${report.ai.amount ? ` ${rupees(report.ai.amount)}` : ''}`,
              })}
              <div className="o-muted o-small">{t('workerReportNote')}</div>
            </dd>
          </>
        )}
        {job?.notes && (
          <>
            <dt>{t('notes')}</dt>
            <dd>{job.notes}</dd>
          </>
        )}
      </dl>

      {mode === 'edit' && <JobForm siteId={site.id} job={job} onDone={() => setMode('view')} />}
      {mode === 'pay' && (
        <PayForm
          initial={report?.ai?.amount ?? null}
          max={job && job.agreedCharge > 0 ? balance : undefined}
          onCancel={() => setMode('view')}
          onSave={(amount, evidence) =>
            store.addPayment(site.id, amount, evidence, report && report.ai?.amount === amount ? report.id : null).then(() => setMode('view'), () => {})
          }
        />
      )}
      {mode === 'view' && job && (
        <div className="o-actions">
          <button className="o-btn o-btn-green" onClick={() => setMode('pay')}>{t('recordPayment')}</button>
          <button className="o-btn" onClick={() => setMode('edit')}>{t('editJob')}</button>
        </div>
      )}

      {payments.length > 0 && (
        <details className="o-history">
          <summary>{t('paymentHistory')}</summary>
          <ul>
            {payments.map((p) => (
              <li key={p.id} className="o-pay-row">
                <span>
                  {fmtDate(p.date)} — <strong className={p.amount < 0 ? 'o-red' : ''}>{rupees(p.amount)}</strong> — {p.evidence}
                </span>
                {p.amount > 0 && !payments.some((x) => x.amount === -p.amount && x.evidence.includes(fmtDate(p.date))) && (
                  <button
                    className="o-btn o-btn-red o-btn-small"
                    onClick={() => {
                      if (window.confirm(t('reverseConfirm', { amount: rupees(p.amount) }))) {
                        store.addPayment(site.id, -p.amount, `${t('reversalNote', { date: fmtDate(p.date) })} (${p.evidence})`).catch(() => {})
                      }
                    }}
                  >
                    {t('reverse')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}

function JobForm({ siteId, job, onDone }: { siteId: string; job?: Job; onDone: () => void }) {
  const store = useStore()
  const { t } = useLang()
  const [customer, setCustomer] = useState(job?.customer ?? '')
  const [description, setDescription] = useState(job?.description ?? '')
  const [agreed, setAgreed] = useState(job ? String(job.agreedCharge) : '')
  const [followUp, setFollowUp] = useState(job?.followUpDate ?? '')
  const [notes, setNotes] = useState(job?.notes ?? '')

  return (
    <form
      className="o-form"
      onSubmit={(e) => {
        e.preventDefault()
        store
          .saveJob(siteId, {
            customer: customer.trim(),
            description: description.trim(),
            agreedCharge: Number(agreed) || 0,
            followUpDate: followUp || null,
            notes: notes.trim(),
          })
          .then(onDone, () => {})
      }}
    >
      <label>
        {t('customer')}
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={120} />
      </label>
      <label>
        {t('jobDescription')}
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      </label>
      <label>
        {t('agreed')} (₹)
        <input inputMode="numeric" value={agreed} onChange={(e) => setAgreed(e.target.value.replace(/[^0-9]/g, ''))} />
      </label>
      <label>
        {t('followUpDate')}
        <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </label>
      <label>
        {t('notes')}
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </label>
      <div className="o-actions">
        <button className="o-btn o-btn-green" type="submit">{t('save')}</button>
        <button className="o-btn" type="button" onClick={onDone}>{t('cancel')}</button>
      </div>
    </form>
  )
}
