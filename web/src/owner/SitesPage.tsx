import { useStore } from '../data/OwnerStore'
import { useLang } from '../i18n'
import { at, fmtTime, rupees } from '../lib/format'
import { balanceOf } from '../lib/summary'
import type { WorkStatus } from '../types'
import { Chip, useNames, type Tone } from './shared'

export const workTones: Record<WorkStatus, Tone> = {
  in_progress: 'blue',
  worker_completed: 'amber',
  owner_approved: 'green',
}

export function SitesPage() {
  const store = useStore()
  const { t, tx, lang } = useLang()
  const { workerName } = useNames()
  const startOfToday = at(store.today, '00:00')

  if (!store.sites.some((s) => s.active)) return <p className="o-muted">{t('noSitesYet')}</p>

  return (
    <ul className="o-stack">
      {store.sites
        .filter((s) => s.active)
        .map((site) => {
          const job = store.jobs.find((j) => j.id === site.id)
          const assigned = store.assignments.filter((a) => a.siteId === site.id && store.workers.some((w) => w.id === a.workerId && w.active))
          const reports = store.reports.filter((r) => r.ai?.siteId === site.id) // newest first
          const todayReports = reports.filter((r) => r.deviceTime >= startOfToday)
          const seenToday = [...new Set(todayReports.map((r) => r.workerId))]
          const last = reports[0]
          const toReview = reports.filter((r) => !r.reviewed).length
          const balance = job ? balanceOf(job, store.payments) : 0
          const issues = [
            toReview > 0 && t('issueReports', { n: toReview }),
            balance > 0 && t('issueBalance', { amount: rupees(balance) }),
          ].filter(Boolean) as string[]
          const pick = (en: string, hi: string) => (lang === 'hi' ? hi || en : en || hi)

          return (
            <li key={site.id} className="o-item">
              <div className="o-item-head">
                <div>
                  <div className="o-item-title">{tx(site.name)}</div>
                  <div className="o-muted">{job?.description || tx(site.area)}</div>
                </div>
                {job && <Chip tone={workTones[job.workStatus]}>{t(`work_${job.workStatus}`)}</Chip>}
              </div>

              <dl className="o-dl">
                <dt>{t('workersSeenToday')}</dt>
                <dd className="o-people">
                  {seenToday.length ? seenToday.map((id) => <span key={id} className="o-person in">{workerName(id)}</span>) : t('none')}
                </dd>
                {assigned.length > 0 && (
                  <>
                    <dt>{t('assignedWorkers')}</dt>
                    <dd className="o-people">
                      {assigned.map((a) => <span key={a.workerId} className="o-person">{workerName(a.workerId)}</span>)}
                    </dd>
                  </>
                )}
                <dt>{t('lastReport')}</dt>
                <dd>
                  {last?.ai
                    ? `${fmtTime(last.deviceTime)} · ${workerName(last.workerId)} · ${pick(last.ai.workEn, last.ai.workHi) || t(`said_${last.ai.workStatus}`)}`
                    : t('noUpdateYet')}
                </dd>
                <dt>{t('pendingIssues')}</dt>
                <dd>{issues.length ? issues.join(' · ') : t('noIssues')}</dd>
              </dl>
            </li>
          )
        })}
    </ul>
  )
}
