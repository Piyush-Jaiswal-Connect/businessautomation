// Sign-in screens: owner Google sign-in, worker phone pairing, and the "no access" states.
import { GoogleAuthProvider, getRedirectResult, signInAnonymously, signInWithRedirect, signOut } from 'firebase/auth'
import { doc, getDocFromServer, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { InstallCard, LangToggle, TestBanner } from '../components/Common'
import { Icon } from '../components/Icon'
import { errorText } from '../data/convert'
import { useLang, type TKey } from '../i18n'
import { auth, db } from '../lib/firebase'
import { go } from '../lib/hooks'
import '../worker/worker.css'

export function Loading() {
  const { t } = useLang()
  return <div className="center-note">{t('loading')}</div>
}

export function NotConfigured() {
  const { t } = useLang()
  return <div className="center-note">{t('notConfigured')}</div>
}

export async function signOutAndHome() {
  await signOut(auth)
  go('/')
}

export function Landing() {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)

  // Coming back from Google: show any sign-in error (success is picked up by the auth listener).
  useEffect(() => {
    getRedirectResult(auth).catch((e) => setError(t('signInFailed', { msg: errorText(e) })))
  }, [t])

  // Redirect (not popup): works in an installed home-screen app as well as in Chrome.
  function ownerSignIn() {
    setError(null)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    signInWithRedirect(auth, provider).catch((e) => setError(t('signInFailed', { msg: errorText(e) })))
  }

  return (
    <div className="picker">
      <TestBanner />
      <main className="picker-main">
        <div className="picker-logo">
          <img src="/icons/icon-192.png" alt="" />
          {t('appName')}
        </div>
        <LangToggle />
        <button className="picker-card" onClick={() => go('/pair')}>
          <span className="picker-icon" style={{ background: 'var(--green)' }}>
            <Icon name="check" size={28} />
          </span>
          {t('workerStart')}
          <Icon name="chevron" />
        </button>
        <button className="picker-card" onClick={ownerSignIn}>
          <span className="picker-icon" style={{ background: 'var(--blue)' }}>
            <Icon name="home" size={28} />
          </span>
          {t('ownerSignIn')}
          <Icon name="chevron" />
        </button>
        {error && <p className="picker-error">{error}</p>}
        <InstallCard dark />
      </main>
    </div>
  )
}

/** A worker phone first gets its own anonymous sign-in, then shows the pairing screen. */
export function StartPhone() {
  const { t } = useLang()
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    signInAnonymously(auth).catch((e) => setFailed(errorText(e)))
  }, [])
  if (!failed) return <div className="center-note">{t('loading')}</div>
  // Offline is the usual reason; anything else is a settings problem the owner must fix.
  const offline = !navigator.onLine || failed === 'auth/network-request-failed'
  return <div className="center-note">{offline ? t('needNetwork') : t('phoneSignInOff', { code: failed })}</div>
}

/** Worker phone: enter (or arrive from the QR with) the owner's one-time code. */
export function PairPage({ initialCode }: { initialCode: string }) {
  const { t } = useLang()
  const [code, setCode] = useState(initialCode.replace(/\D/g, '').slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TKey | null>(null)

  async function pair() {
    if (!navigator.onLine) {
      setError('needNetwork')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const user = auth.currentUser!
      // Readable only while the code is fresh and unused (security rules).
      const pairing = await getDocFromServer(doc(db, 'pairings', code))
      if (!pairing.exists()) throw new Error('no code')
      const workerId = pairing.data().workerId as string
      const b = writeBatch(db)
      b.update(doc(db, 'workers', workerId), { deviceUid: user.uid, pairedAt: serverTimestamp(), pairingCode: code })
      b.update(doc(db, 'pairings', code), { usedBy: user.uid, usedAt: serverTimestamp() })
      b.set(doc(db, 'devices', user.uid), { workerId, pairedAt: serverTimestamp() })
      await b.commit()
      go('/')
    } catch {
      setError('badCode')
    } finally {
      setBusy(false)
    }
  }

  const shown = code.length > 5 ? `${code.slice(0, 5)} ${code.slice(5)}` : code

  return (
    <div className="worker">
      <header className="w-header">
        <div className="w-hello">{t('pairTitle')}</div>
        <LangToggle />
      </header>
      <TestBanner />
      <main className="w-main">
        <p className="w-help">{t('pairHelp')}</p>
        <label className="w-code">
          <span className="w-label">{t('codeLabel')}</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={shown}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="00000 00000"
          />
        </label>
        <section className="w-privacy">
          <strong>{t('privacyTitle')}</strong>
          <p>{t('privacyText')}</p>
        </section>
        <button className="w-big w-big-green w-big-short" onClick={pair} disabled={busy || code.length !== 10}>
          <span className="w-big-text">{busy ? t('pairing') : t('pairButton')}</span>
        </button>
        {error && (
          <div className="w-error" role="alert">
            <Icon name="alert" /> {t(error)}
          </div>
        )}
      </main>
    </div>
  )
}

export function AccessRemoved({ onPairAgain }: { onPairAgain: () => void }) {
  const { t } = useLang()
  return (
    <div className="worker">
      <header className="w-header">
        <div className="w-hello">{t('appName')}</div>
        <LangToggle />
      </header>
      <main className="w-main">
        <div className="w-error" role="alert">
          <Icon name="alert" /> {t('accessRemoved')}
        </div>
        <button className="w-btn w-btn-dark" onClick={onPairAgain}>{t('pairAgain')}</button>
      </main>
    </div>
  )
}

export function NotOwner({ email }: { email: string }) {
  const { t } = useLang()
  return (
    <div className="picker">
      <main className="picker-main">
        <p className="picker-error">{t('notOwner', { email })}</p>
        <button className="picker-card" onClick={signOutAndHome}>{t('signOut')}</button>
      </main>
    </div>
  )
}

export function OwnerSignedInHere() {
  const { t } = useLang()
  return (
    <div className="picker">
      <main className="picker-main">
        <p className="picker-error">{t('ownerSignedInHere')}</p>
        <button className="picker-card" onClick={signOutAndHome}>{t('signOut')}</button>
      </main>
    </div>
  )
}
