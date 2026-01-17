import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error('Missing VITE_FIREBASE_API_KEY');
}

if (!firebaseConfig.authDomain) {
  throw new Error('Missing VITE_FIREBASE_AUTH_DOMAIN');
}

if (!firebaseConfig.projectId) {
  throw new Error('Missing VITE_FIREBASE_PROJECT_ID');
}

if (!firebaseConfig.appId) {
  throw new Error('Missing VITE_FIREBASE_APP_ID');
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export async function getCurrentUserIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken();
}
