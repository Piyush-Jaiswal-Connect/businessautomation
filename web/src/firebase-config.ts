import type { FirebaseOptions } from 'firebase/app'

// The real Firebase project's web settings (Firebase console → Project settings → Your apps).
// These values are not secret; access is controlled by the security rules.
// null = not connected yet; the production build then shows a "not connected" screen.
export const firebaseConfig: FirebaseOptions | null = null
