import type { FirebaseOptions } from 'firebase/app'

// The real Firebase project's web settings (Firebase console → Project settings → Your apps).
// These values are not secret; access is controlled by the security rules.
// Google Analytics (measurementId) is left out on purpose: the app does not track its users.
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyDX4kppRcPjOVzdnhFU19WNtRMJhPGtrpY',
  authDomain: 'businessautomation-2884f.firebaseapp.com',
  projectId: 'businessautomation-2884f',
  storageBucket: 'businessautomation-2884f.firebasestorage.app',
  messagingSenderId: '841677442619',
  appId: '1:841677442619:web:234c77846eebd99d04d61e',
}
