import { DemoBanner, LangToggle } from '../components/Common'
import { Icon, type IconName } from '../components/Icon'
import { useStore } from '../demo/DemoStore'
import { useLang, type TKey } from '../i18n'
import { at, fmtLongDate, fmtTime, rupees } from '../lib/format'
import { go } from '../lib/hooks'
import { awaitsApproval, balanceOf, followUpsDue, isPresent, totalOutstanding, unreviewed } from '../lib/summary'
import { AttendancePage } from './AttendancePage'
import { PaymentsPage } from './PaymentsPage'
import { ReportsPage } from './ReportsPage'
import { SitesPage } from './SitesPage'
import { useNames } from './shared'
import './owner.css'

const tabs: [string, TKey, IconName][] = [
  ['home', 'navHome', 'home'],
  ['attendance', 'navAttendance', 'users'],
  ['sites', 'navSites', 'site'],
  ['reports', 'navReports', 'report'],
  ['payments', 'navPayments', 'rupee'],
]

export function OwnerApp({ tab }: { tab: string }) {
  const store = useStore()
  const { t } = useLang()
  const current = tabs.some(([id]) => id === tab) ? tab : 'home'
  const badges: Record<string, number> = {
    attendance: store.attendance.filter((a) => a.date === store.today && awaitsApproval(a)).length,
    reports: unreviewed(store.reports).length,
  }

  return (
    <div className="owner">
      <header className="o-header">
        <img src="/icons/icon-192.png" alt="" width={36} height={36} />
        <div className="o-title">
          <div>{t('appName')}</div>
          <small>{fmtLongDate(at(store.today, '12:00'))}</small>
        </div>
        <LangToggle />
      </header>
      <DemoBanner />
      <main className="o-main">
        {current === 'home' && <OwnerHome />}
        {current === 'attendance' && <AttendancePage />}
        {current === 'sites' && <SitesPage />}
        {current === 'reports' && <ReportsPage />}
        {current === 'payments' && <PaymentsPage />}
        <div className="o-footer">
          <button className="link-btn" onClick={() => go('/')}>{t('backToViews')}</button>
        </div>
      </main>
      <nav className="o-nav">
        {tabs.map(([id, label, icon]) => (
          <button key={id} className={id === current ? 'on' : ''} aria-current={id === current ? 'page' : undefined} onClick={() => go(`/owner/${id}`)}>
            <span className="o-nav-icon">
              <Icon name={icon} />
              {badges[id] > 0 && <span className="o-badge">{badges[id]}</span>}
            </span>
            {t(label)}
          </button>
        ))}
      </nav>
    </div>
  )
}

function OwnerHome() {
  const store = useStore()
  const { t } = useLang()
  const { workerName, siteName } = useNames()

  const todays = store.attendance.filter((a) => a.date === store.today)
  const activeWorkers = store.workers.filter((w) => w.active)
  const present = todays.filter(isPresent).length
  const awaiting = todays.filter(awaitsApproval).length
  const pendingSync = todays.filter((a) => a.status === 'pending_sync').length
  const activeSites = store.sites.filter((s) => s.active).length
  const reportsPending = unreviewed(store.reports).length
  const outstanding = totalOutstanding(store.jobs, store.payments)
  const owingJobs = store.jobs.filter((j) => balanceOf(j, store.payments) > 0).length
  const completedToApprove = store.jobs.filter((j) => j.workStatus === 'worker_completed').length
  const followUps = followUpsDue(store.jobs, store.payments, store.today).length

  const attention: [number, string, string][] = (
    [
      [awaiting, t('attnApprove', { n: awaiting }), '/owner/attendance'],
      [reportsPending, t('attnReports', { n: reportsPending }), '/owner/reports'],
      [completedToApprove, t('attnCompleted', { n: completedToApprove }), '/owner/reports'],
      [followUps, t('attnFollowUp', { n: followUps }), '/owner/payments'],
      [pendingSync, t('attnPendingSync', { n: pendingSync }), '/owner/attendance'],
    ] as [number, string, string][]
  ).filter(([n]) => n > 0)

  const activity = [
    ...todays.map((a) => ({ at: a.deviceTime, text: t('actCheckIn', { name: workerName(a.workerId), site: siteName(a.siteId) }), icon: 'check' as const })),
    ...store.reports.map((r) => ({ at: r.deviceTime, text: t('actReport', { name: workerName(r.workerId), site: siteName(r.siteId) }), icon: 'mic' as const })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)

  return (
    <>
      <section className="o-cards">
        <button className="o-card" onClick={() => go('/owner/attendance')}>
          <span className="o-card-label">{t('present')}</span>
          <span className="o-card-value">
            {present}<small>/{activeWorkers.length}</small>
          </span>
          <span className="o-card-sub">{awaiting > 0 ? t('nAwaiting', { n: awaiting }) : ' '}</span>
        </button>
        <button className="o-card" onClick={() => go('/owner/sites')}>
          <span className="o-card-label">{t('activeSites')}</span>
          <span className="o-card-value">{activeSites}</span>
          <span className="o-card-sub">&nbsp;</span>
        </button>
        <button className={`o-card ${reportsPending ? 'o-card-alert' : ''}`} onClick={() => go('/owner/reports')}>
          <span className="o-card-label">{t('reportsPending')}</span>
          <span className="o-card-value">{reportsPending}</span>
          <span className="o-card-sub">&nbsp;</span>
        </button>
        <button className="o-card" onClick={() => go('/owner/payments')}>
          <span className="o-card-label">{t('outstanding')}</span>
          <span className="o-card-value o-money">{rupees(outstanding)}</span>
          <span className="o-card-sub">{t('nJobs', { n: owingJobs })}</span>
        </button>
      </section>

      <section className="o-panel">
        <h2>{t('needsAttention')}</h2>
        {attention.length === 0 ? (
          <p className="o-muted">{t('allClear')}</p>
        ) : (
          <ul className="o-list">
            {attention.map(([, text, route]) => (
              <li key={text}>
                <button className="o-row-btn" onClick={() => go(route)}>
                  <Icon name="alert" size={20} className="o-amber" />
                  <span>{text}</span>
                  <Icon name="chevron" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="o-panel">
        <h2>{t('recentActivity')}</h2>
        <ul className="o-feed">
          {activity.map((a) => (
            <li key={`${a.icon}${a.at}${a.text}`}>
              <Icon name={a.icon} size={18} />
              <span>{a.text}</span>
              <time>{fmtTime(a.at)}</time>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
