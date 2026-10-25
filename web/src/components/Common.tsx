import { useMemo, useState, type ReactNode } from 'react'
import { LangContext, loadLang, makeT, saveLang, useLang } from '../i18n'
import { usingEmulators } from '../lib/firebase'
import { useInstall } from '../lib/install'
import type { Lang } from '../types'
import { Icon } from './Icon'

/** Each side remembers its own language: worker defaults to Hindi, owner to English. */
export function LangProvider({ storageKey, fallback, children }: { storageKey: string; fallback: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang(storageKey, fallback))
  const value = useMemo(
    () => ({
      lang,
      setLang: (l: Lang) => {
        saveLang(storageKey, l)
        setLangState(l)
      },
      t: makeT(lang),
      tx: (text: { en: string; hi: string }) => text[lang] || text.en,
    }),
    [lang, storageKey],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function LangToggle() {
  const { lang, setLang, t } = useLang()
  return (
    <button className="lang-toggle" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')} lang={lang === 'hi' ? 'en' : 'hi'}>
      <Icon name="lang" size={18} />
      {t('switchLang')}
    </button>
  )
}

/** Shown while the app uses the local test database instead of the real one. */
export function TestBanner() {
  const { t } = useLang()
  if (!usingEmulators) return null
  return (
    <div className="demo-banner" role="note">
      <strong>TEST</strong> {t('testDb')}
    </div>
  )
}

/** Shown until the app is installed: one button where Chrome allows it, otherwise the two manual steps. */
export function InstallCard({ dark = false }: { dark?: boolean }) {
  const { t } = useLang()
  const { installed, canPrompt, install } = useInstall()
  if (installed) return null
  return (
    <section className={`install-card ${dark ? 'install-dark' : ''}`}>
      <div className="install-title">
        <img src="/icons/icon-192.png" alt="" width={36} height={36} />
        {t('installTitle')}
      </div>
      {canPrompt ? (
        <button className="install-btn" onClick={() => void install()}>{t('installButton')}</button>
      ) : (
        <p className="install-steps">{t('installManual')}</p>
      )}
    </section>
  )
}
