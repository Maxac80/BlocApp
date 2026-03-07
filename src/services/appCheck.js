import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import app from '../firebase';

// App Check configuration for additional security
// This prevents unauthorized use of your Firebase backend

// In development, enable debug token BEFORE any Firebase calls
// This must be set before initializeAppCheck() is called
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-restricted-globals
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

export const initAppCheck = () => {
  if (process.env.NODE_ENV === 'production') {
    // For production, use ReCaptcha Enterprise
    const reCaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

    if (reCaptchaSiteKey) {
      try {
        const appCheckInstance = initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(reCaptchaSiteKey),
          isTokenAutoRefreshEnabled: true
        });

        console.info('App Check initialized successfully with reCAPTCHA Enterprise');
        return appCheckInstance;
      } catch (error) {
        console.error('Failed to initialize App Check:', error);
      }
    } else {
      console.warn('App Check not configured - missing ReCaptcha site key');
    }
  } else {
    // Development: debug token is set globally above
    // Firebase will print a debug token in the console
    // Register it in Firebase Console > App Check > Manage debug tokens
    console.info('App Check: debug mode enabled - register the debug token from console in Firebase Console > App Check');
  }

  return null;
};

// Initialize App Check when the module loads
initAppCheck();
