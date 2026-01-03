import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import app from '../firebase';

// App Check configuration for additional security
// This prevents unauthorized use of your Firebase backend

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
    // For development, App Check is optional (silent)
    console.info('App Check disabled in development mode');
  }

  return null;
};

// Initialize App Check when the module loads
initAppCheck();
