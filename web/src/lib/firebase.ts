import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig } from '../firebase-config'

/** `npm run dev` talks to the local test database (Firebase emulators), never the real one. */
export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const emulatorConfig: FirebaseOptions = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-site-control.firebaseapp.com',
  projectId: 'demo-site-control',
  appId: 'demo-app',
}

/** False until the real project's web config is pasted into firebase-config.ts. */
export const configured = usingEmulators || firebaseConfig !== null

const app = initializeApp(usingEmulators || !firebaseConfig ? emulatorConfig : firebaseConfig)

export const auth = getAuth(app)

// Keeps a copy on the phone so the app opens without network and queues writes until it returns.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
