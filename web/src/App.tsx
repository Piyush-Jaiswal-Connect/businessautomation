import { DemoBanner, LangProvider, LangToggle } from './components/Common'
import { Icon } from './components/Icon'
import { StoreProvider } from './demo/DemoStore'
import { useLang } from './i18n'
import { go, useHashRoute } from './lib/hooks'
import { OwnerApp } from './owner/OwnerApp'
import { WorkerHome } from './worker/WorkerHome'

export default function App() {
  const route = useHashRoute()

  // One shared demo store, so a check-in on the "worker phone" shows up on the owner screens.
  return (
    <StoreProvider>
      {route === '/worker' ? (
        <LangProvider key="worker" storageKey="sc.lang.worker" fallback="hi">
          <WorkerHome />
        </LangProvider>
      ) : route.startsWith('/owner') ? (
        <LangProvider key="owner" storageKey="sc.lang.owner" fallback="en">
          <OwnerApp tab={route.split('/')[2] ?? 'home'} />
        </LangProvider>
      ) : (
        <LangProvider key="picker" storageKey="sc.lang.owner" fallback="en">
          <ViewPicker />
        </LangProvider>
      )}
    </StoreProvider>
  )
}

/** Demo only: Phase 2 sends each signed-in person straight to their own side. */
function ViewPicker() {
  const { t } = useLang()
  return (
    <div className="picker">
      <DemoBanner />
      <main className="picker-main">
        <div className="picker-logo">
          <img src="/icons/icon-192.png" alt="" />
          {t('appName')}
        </div>
        <LangToggle />
        <h1>{t('chooseView')}</h1>
        <p>{t('chooseViewNote')}</p>
        <button className="picker-card" onClick={() => go('/worker')}>
          <span className="picker-icon" style={{ background: 'var(--green)' }}>
            <Icon name="check" size={28} />
          </span>
          {t('workerView')}
          <Icon name="chevron" />
        </button>
        <button className="picker-card" onClick={() => go('/owner/home')}>
          <span className="picker-icon" style={{ background: 'var(--blue)' }}>
            <Icon name="home" size={28} />
          </span>
          {t('ownerView')}
          <Icon name="chevron" />
        </button>
      </main>
    </div>
  )
}
