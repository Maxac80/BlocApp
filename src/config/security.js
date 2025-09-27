// Security configuration for Firebase
// This adds an extra layer of protection

// Allowed domains for the application
const ALLOWED_DOMAINS = [
  'localhost:3000',
  'localhost:3001',
  '127.0.0.1:3000',
  '127.0.0.1:3001',
  // Add your production domain when you have it
  // 'your-domain.com',
];

// Check if current domain is allowed
export const isDomainAllowed = () => {
  const currentHost = window.location.host;
  // Allow localhost and development environments
  if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
    return true;
  }
  return ALLOWED_DOMAINS.includes(currentHost);
};

// Validate Firebase config before initialization
export const validateFirebaseConfig = () => {
  const config = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };

  // Check if all required fields are present
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  for (const field of requiredFields) {
    if (!config[field]) {
      console.error(`Missing required Firebase config: ${field}`);
      return false;
    }
  }

  // Additional validation
  if (!isDomainAllowed()) {
    console.error('Application running on unauthorized domain');
    return false;
  }

  return true;
};

// Monitor for suspicious activity
export const monitorUsage = () => {
  // Log authentication events
  let authAttempts = 0;
  const MAX_AUTH_ATTEMPTS = 10;

  return {
    logAuthAttempt: () => {
      authAttempts++;
      if (authAttempts > MAX_AUTH_ATTEMPTS) {
        console.warn('Suspicious activity detected: too many auth attempts');
        // Could implement additional actions here
      }
    },
    resetAuthCounter: () => {
      authAttempts = 0;
    }
  };
};