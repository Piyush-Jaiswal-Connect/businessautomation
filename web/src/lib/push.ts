// Owner notifications: registers this device with Firebase Cloud Messaging and stores its token
// (owner-only, see rules). The server sends to every stored owner token.
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { app, auth, db, usingEmulators } from './firebase'

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on' | 'test'

const KEY = 'sc.pushToken'

async function registration() {
  // Its own scope, so it never interferes with the offline-cache worker at "/".
  return navigator.serviceWorker.register('/push-sw.js', { scope: '/push/' })
}

export async function pushState(): Promise<PushState> {
  if (usingEmulators) return 'test'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported().catch(() => false))) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return Notification.permission === 'granted' && localStorage.getItem(KEY) ? 'on' : 'off'
}

export async function enablePush(lang: string): Promise<PushState> {
  const state = await pushState()
  if (state === 'unsupported' || state === 'test') return state
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const token = await getToken(getMessaging(app), { serviceWorkerRegistration: await registration() })
  await setDoc(doc(db, 'ownerDevices', auth.currentUser!.uid, 'tokens', token), {
    token, lang, userAgent: navigator.userAgent.slice(0, 200), createdAt: serverTimestamp(),
  })
  try {
    localStorage.setItem(KEY, token)
  } catch {
    // private mode: still works for this session
  }
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const token = localStorage.getItem(KEY)
  if (token) {
    await deleteDoc(doc(db, 'ownerDevices', auth.currentUser!.uid, 'tokens', token)).catch(() => {})
    await deleteToken(getMessaging(app)).catch(() => {})
    localStorage.removeItem(KEY)
  }
  return 'off'
}
