import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { useEffect, useState, type ReactNode } from 'react'
import { AccessRemoved, Landing, Loading, NotConfigured, NotOwner, OwnerSignedInHere, PairPage, StartPhone } from './auth/AuthScreens'
import { LangProvider } from './components/Common'
import { errorText } from './data/convert'
import { OwnerStoreProvider } from './data/OwnerStore'
import { WorkerStoreProvider, useWorkerStore } from './data/WorkerStore'
import { auth, configured, db } from './lib/firebase'
import { useHashRoute } from './lib/hooks'
import { OwnerApp } from './owner/OwnerApp'
import { WorkerHome } from './worker/WorkerHome'

const WorkerLang = ({ children }: { children: ReactNode }) => (
  <LangProvider key="worker" storageKey="sc.lang.worker" fallback="hi">{children}</LangProvider>
)
const OwnerLang = ({ children }: { children: ReactNode }) => (
  <LangProvider key="owner" storageKey="sc.lang.owner" fallback="en">{children}</LangProvider>
)

function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}

export default function App() {
  const route = useHashRoute()
  const user = useAuthUser()
  const pairCode = route.startsWith('/pair') ? (route.split('/')[2] ?? '') : null

  if (!configured) return <WorkerLang><NotConfigured /></WorkerLang>
  if (user === undefined) return <WorkerLang><Loading /></WorkerLang>

  // Nobody signed in: a worker connecting a phone, or the start screen.
  if (!user) {
    return <WorkerLang>{pairCode !== null ? <StartPhone /> : <Landing />}</WorkerLang>
  }

  // Worker phones sign in without a name or password; pairing links them to a worker.
  if (user.isAnonymous) {
    return (
      <WorkerLang>
        <WorkerStoreProvider key={user.uid}>
          <WorkerApp pairCode={pairCode} />
        </WorkerStoreProvider>
      </WorkerLang>
    )
  }

  if (pairCode !== null) return <WorkerLang><OwnerSignedInHere /></WorkerLang>

  return (
    <OwnerLang>
      <OwnerGate user={user}>
        <OwnerStoreProvider>
          <OwnerApp tab={route.split('/')[2] ?? 'home'} />
        </OwnerStoreProvider>
      </OwnerGate>
    </OwnerLang>
  )
}

function WorkerApp({ pairCode }: { pairCode: string | null }) {
  const store = useWorkerStore()
  const [repair, setRepair] = useState(false)

  if (store.phase === 'loading') return <Loading />
  if (store.phase === 'ready') return <WorkerHome />
  if (store.phase === 'unpaired' || repair || pairCode) return <PairPage initialCode={pairCode ?? ''} />
  return <AccessRemoved onPairAgain={() => setRepair(true)} />
}

/** The database decides who is an owner; this only asks it once to pick the right screen. */
function OwnerGate({ user, children }: { user: User; children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking')
  useEffect(() => {
    getDocs(query(collection(db, 'workers'), limit(1)))
      .then(() => setState('ok'))
      .catch((e) => setState(errorText(e) === 'permission-denied' ? 'denied' : 'ok'))
  }, [user.uid])

  if (state === 'checking') return <Loading />
  if (state === 'denied') return <NotOwner email={user.email ?? '?'} />
  return children
}
