import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Firebase web app configuration is public client-side metadata. Keep secrets
  // (service-account keys and private credentials) out of the frontend.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBf-MkEyHFnSCvivyCnVXd74P2iun6yEu0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'study-masster.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'study-masster',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:751973059608:web:da7f4edb26e6145b41076d',
};

export const firebaseConfigured = Object.values(firebaseConfig).every(value => typeof value === 'string' && value.trim());
export const firebaseAuth = firebaseConfigured ? getAuth(initializeApp(firebaseConfig)) : null;
