import { LangToggle, TestBanner } from '../components/Common'
import { Icon, type IconName } from '../components/Icon'
import { useStore } from '../data/OwnerStore'
import { useLang, type TKey } from '../i18n'
import { at, fmtLongDate, fmtTime } from '../lib/format'
import { go } from '../lib/hooks'
import { awaitsApproval, isPresent } from '../lib/summary'
import { AttendancePage } from './AttendancePage'
import { ManagePage } from './ManagePage'
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
  const current = tab === 'manage' || tabs.some(([id]) => id === tab) ? tab : 'home'
  const badges: Record<string, number> = {
    attendance: store.attendance.filter((a) => a.date === store.today && awaitsApproval(a)).length,
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
  const { workerName, siteName } = useNames()

  const todays = store.attendance.filter((a) => a.date === store.today)
  const activeWorkers = store.workers.filter((w) => w.active)
  const present = todays.filter(isPresent).length
  const awaiting = todays.filter(awaitsApproval).length
  const activeSites = store.sites.filter((s) => s.active).length
  const paired = activeWorkers.filter((w) => w.deviceUid).length
  const unpaired = activeWorkers.length - paired
  const noSite = activeWorkers.filter((w) => !store.assignments.some((a) => a.workerId === w.id)).length

  const attention = (
    [
      [awaiting, t('attnApprove', { n: awaiting }), '/owner/attendance'],
      [unpaired, t('attnUnpaired', { n: unpaired }), '/owner/manage'],
      [noSite, t('attnNoSite', { n: noSite }), '/owner/manage'],
    ] as [number, string, string][]
  ).filter(([n]) => n > 0)

  const activity = todays
    .flatMap((a) => [
      { at: a.deviceTime, text: t('actCheckIn', { name: workerName(a.workerId), site: siteName(a.siteId) }), icon: 'check' as const },
    ])
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
          <span className="o-card-sub">{awaiting > 0 ? t('nAwaiting', { n: awaiting }) : ' '}</span>
        </button>
        <button className="o-card" onClick={() => go('/owner/sites')}>
          <span className="o-card-label">{t('activeSites')}</span>
          <span className="o-card-value">{activeSites}</span>
          <span className="o-card-sub">&nbsp;</span>
        </button>
        <button className={`o-card ${awaiting ? 'o-card-alert' : ''}`} onClick={() => go('/owner/attendance')}>
          <span className="o-card-label">{t('toApprove')}</span>
          <span className="o-card-value">{awaiting}</span>
          <span className="o-card-sub">&nbsp;</span>
        </button>
        <button className="o-card" onClick={() => go('/owner/manage')}>
          <span className="o-card-label">{t('phonesPaired')}</span>
          <span className="o-card-value">
            {paired}<small>/{activeWorkers.length}</small>
          </span>
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

      <section className="o-panel">
        <h2>{t('recentActivity')}</h2>
        {activity.length === 0 ? (
          <p className="o-muted">{t('noActivity')}</p>
        ) : (
          <ul className="o-feed">
            {activity.map((a) => (
              <li key={`${a.icon}${a.at}${a.text}`}>
                <Icon name={a.icon} size={18} />
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
