import { LangToggle, TestBanner } from '../components/Common'
import { Icon, type IconName } from '../components/Icon'
import { useStore } from '../data/OwnerStore'
import { useLang, type TKey } from '../i18n'
import { at, fmtLongDate, fmtTime, rupees } from '../lib/format'
import { go } from '../lib/hooks'
import { awaitsApproval, balanceOf, followUpsDue, isPresent, totalOutstanding } from '../lib/summary'
import { AttendancePage } from './AttendancePage'
import { ManagePage } from './ManagePage'
import { PaymentsPage } from './PaymentsPage'
import { ReportCard, ReportsPage, needsPaymentCheck } from './ReportsPage'
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
  const current = tab === 'manage' || tabs.some(([id]) => id === tab) ? tab : 'home'
  const badges: Record<string, number> = {
    attendance: store.attendance.filter((a) => a.date === store.today && awaitsApproval(a)).length,
    reports: store.reports.filter((r) => !r.reviewed).length,
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
        <button className={`o-icon-btn ${current === 'manage' ? 'on' : ''}`} onClick={() => go('/owner/manage')} aria-label={t('manage')} title={t('manage')}>
          <Icon name="users" />
        </button>
      </header>
      <TestBanner />
      {store.error && (
        <div className="o-error" role="alert">
          {t('actionFailed', { msg: store.error })}
          <button onClick={store.clearError} aria-label={t('close')}><Icon name="x" size={18} /></button>
        </div>
      )}
      <main className="o-main">
        {!store.loaded ? (
          <p className="o-muted">{t('loading')}</p>
        ) : (
          <>
            {current === 'home' && <OwnerHome />}
            {current === 'attendance' && <AttendancePage />}
            {current === 'sites' && <SitesPage />}
            {current === 'reports' && <ReportsPage />}
            {current === 'payments' && <PaymentsPage />}
            {current === 'manage' && <ManagePage />}
          </>
        )}
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
  const { workerName } = useNames()

  const todays = store.attendance.filter((a) => a.date === store.today)
  const activeWorkers = store.workers.filter((w) => w.active)
  const present = todays.filter(isPresent).length
  const awaiting = todays.filter(awaitsApproval).length
  const activeSites = store.sites.filter((s) => s.active).length
  const unpaired = activeWorkers.filter((w) => !w.deviceUid).length
  const toReview = store.reports.filter((r) => !r.reviewed)
  const failed = store.reports.filter((r) => r.status === 'failed').length
  const toVerify = store.reports.filter(needsPaymentCheck).length
  const outstanding = totalOutstanding(store.jobs, store.payments)
  const owingJobs = store.jobs.filter((j) => balanceOf(j, store.payments) > 0).length
  const followUps = followUpsDue(store.jobs, store.payments, store.today).length

  const attention = (
    [
      [awaiting, t('attnApprove', { n: awaiting }), '/owner/attendance'],
      [toReview.length, t('attnReports', { n: toReview.length }), '/owner/reports'],
      [toVerify, t('attnVerify', { n: toVerify }), '/owner/reports'],
      [followUps, t('attnFollowUp', { n: followUps }), '/owner/payments'],
      [failed, t('attnAiFailed', { n: failed }), '/owner/reports'],
      [unpaired, t('attnUnpaired', { n: unpaired }), '/owner/manage'],
    ] as [number, string, string][]
  ).filter(([n]) => n > 0)

  const checkIns = todays
    .map((a) => ({ at: a.deviceTime, text: t('actCheckIn', { name: workerName(a.workerId), site: '' }).replace(/ — $/, '') }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8)

  return (
    <>
      <section className="o-cards">
        <button className="o-card" onClick={() => go('/owner/attendance')}>
          <span className="o-card-label">{t('present')}</span>
          <span className="o-card-value">
            {present}<small>/{activeWorkers.length}</small>
          </span>
          <span className="o-card-sub">{awaiting > 0 ? t('nAwaiting', { n: awaiting }) : '\u00a0'}</span>
        </button>
        <button className={`o-card ${toReview.length ? 'o-card-alert' : ''}`} onClick={() => go('/owner/reports')}>
          <span className="o-card-label">{t('reportsPending')}</span>
          <span className="o-card-value">{toReview.length}</span>
          <span className="o-card-sub">&nbsp;</span>
        </button>
        <button className="o-card" onClick={() => go('/owner/payments')}>
          <span className="o-card-label">{t('outstanding')}</span>
          <span className="o-card-value o-money">{rupees(outstanding)}</span>
          <span className="o-card-sub">{owingJobs ? t('nJobs', { n: owingJobs }) : '\u00a0'}</span>
        </button>
        <button className="o-card" onClick={() => go('/owner/sites')}>
          <span className="o-card-label">{t('activeSites')}</span>
          <span className="o-card-value">{activeSites}</span>
          <span className="o-card-sub">&nbsp;</span>
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

      {toReview.length > 0 && (
        <section>
          <h2 className="o-h2">{t('reportsToday')}</h2>
          <ul className="o-stack">
            {toReview.slice(0, 3).map((r) => (
              <ReportCard key={r.id} r={r} />
            ))}
          </ul>
          {toReview.length > 3 && (
            <button className="o-btn o-wide o-top" onClick={() => go('/owner/reports')}>
              {t('navReports')} ({toReview.length}) <Icon name="chevron" size={18} />
            </button>
          )}
        </section>
      )}

      <section className="o-panel">
        <h2>{t('recentActivity')}</h2>
        {checkIns.length === 0 ? (
          <p className="o-muted">{t('noActivity')}</p>
        ) : (
          <ul className="o-feed">
            {checkIns.map((a) => (
              <li key={`${a.at}${a.text}`}>
                <Icon name="check" size={18} />
                <span>{a.text}</span>
                <time>{fmtTime(a.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
