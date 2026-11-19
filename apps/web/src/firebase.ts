import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, GoogleAIBackend } from "firebase/ai";

// Web API keys are public identifiers, not secrets. Access is protected by App Check.
const firebaseConfig = {
  apiKey: "AIzaSyChMEaFeyV231IfGjwf6Dp2prT9SEtrT0Q",
  authDomain: "kontrata-hybrid.firebaseapp.com",
  projectId: "kontrata-hybrid",
  storageBucket: "kontrata-hybrid.firebasestorage.app",
  messagingSenderId: "586031191668",
  appId: "1:586031191668:web:6008dfcdf1618fb89c2321",
};

export const app = initializeApp(firebaseConfig);

// App Check: debug provider in dev (stable token or auto-generated),
// reCAPTCHA Enterprise ("Fraud Defense") in production. Free tier: 10k assessments/month, no billing.
// The debug token lives in .env.development.local (gitignored, never loaded by production builds).
if (import.meta.env.DEV) {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined) || true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    // Public site key (safe to commit), registered for this app in App Check.
    import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LepDSguAAAAAFc9CLOzWt0pbVRXWlkWgkhKvQN8",
  ),
  isTokenAutoRefreshEnabled: true,
});

export const ai = getAI(app, { backend: new GoogleAIBackend() });
