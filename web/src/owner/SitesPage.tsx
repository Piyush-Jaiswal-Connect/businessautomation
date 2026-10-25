import { useStore } from '../data/OwnerStore'
import { useLang } from '../i18n'
import { fmtTime, rupees } from '../lib/format'
import { awaitsApproval, balanceOf, isPresent } from '../lib/summary'
import type { WorkStatus } from '../types'
import { Chip, useNames, type Tone } from './shared'

export const workTones: Record<WorkStatus, Tone> = {
  in_progress: 'blue',
  worker_completed: 'amber',
  owner_approved: 'green',
}

export function SitesPage() {
  const store = useStore()
  const { t, tx } = useLang()
  const { workerName } = useNames()

  if (!store.sites.some((s) => s.active)) return <p className="o-muted">{t('noSitesYet')}</p>

  return (
    <ul className="o-stack">
      {store.sites
        .filter((s) => s.active)
        .map((site) => {
          const assigned = store.assignments.filter((a) => a.siteId === site.id && store.workers.some((w) => w.id === a.workerId && w.active))
          const job = store.jobs.find((j) => j.siteId === site.id)
          const att = store.attendance.filter((a) => a.siteId === site.id && a.date === store.today)
          const reports = store.reports.filter((r) => r.siteId === site.id)
          const lastUpdate = Math.max(0, ...att.map((a) => a.deviceTime), ...reports.map((r) => r.deviceTime))
          const toReview = reports.filter((r) => !r.reviewed).length
          const toApprove = att.filter(awaitsApproval).length
          const balance = job ? balanceOf(job, store.payments) : 0
          const issues = [
            toApprove > 0 && t('issueAttendance', { n: toApprove }),
            toReview > 0 && t('issueReports', { n: toReview }),
            balance > 0 && t('issueBalance', { amount: rupees(balance) }),
          ].filter(Boolean) as string[]

          return (
            <li key={site.id} className="o-item">
              <div className="o-item-head">
                <div>
                  <div className="o-item-title">{tx(site.name)}</div>
                  {job && <div className="o-muted">{tx(job.description)}</div>}
                </div>
                {job && <Chip tone={workTones[job.workStatus]}>{t(`work_${job.workStatus}`)}</Chip>}
              </div>

              <dl className="o-dl">
                <dt>{t('assignedWorkers')}</dt>
                <dd className="o-people">
                  {assigned.map((a) => {
                    const here = att.find((x) => x.workerId === a.workerId)
                    return (
                      <span key={a.workerId} className={`o-person ${here && isPresent(here) ? 'in' : ''}`}>
                        {workerName(a.workerId)}
                      </span>
                    )
                  })}
                </dd>
                <dt>{t('todayJob')}</dt>
                <dd>{[...new Set(assigned.map((a) => tx(a.task)))].join(' · ')}</dd>
                <dt>{t('lastUpdate')}</dt>
                <dd>{lastUpdate ? fmtTime(lastUpdate) : t('noUpdateYet')}</dd>
                <dt>{t('pendingIssues')}</dt>
                <dd>{issues.length ? issues.join(' · ') : t('noIssues')}</dd>
              </dl>
            </li>
          )
        })}
    </ul>
  )
}
