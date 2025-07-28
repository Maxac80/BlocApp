import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useSecurity } from '../hooks/useSecurity';
import { useUserProfile } from '../hooks/useUserProfile';
import { useOnboarding } from '../hooks/useOnboarding';

// Creăm contextul enhanced
const AuthContextEnhanced = createContext();

// Hook pentru a folosi contextul enhanced
export function useAuthEnhanced() {
  return useContext(AuthContextEnhanced);
}

/**
 * 🔐 AUTH PROVIDER EXTINS CU FUNCȚIONALITĂȚI AVANSATE
 * 
 * Păstrează compatibilitatea cu AuthContext original
 * + Adaugă features de securitate avansate
 * + Integrează onboarding și profil management
 * + Session management și audit logging
 */
export function AuthProviderEnhanced({ children }) {
  // State original (compatibilitate)
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // State enhanced
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  
  // Hooks pentru funcționalități avansate
  const security = useSecurity();
  const profileManager = useUserProfile();
  const onboarding = useOnboarding();

  // 🔐 ÎNREGISTRARE AVANSATĂ CU VALIDĂRI
  async function registerEnhanced(email, password, userData = {}) {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Validare putere parolă
      const passwordValidation = security.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error('Parola nu îndeplinește cerințele de securitate. Necesită minim 8 caractere, litere mari, cifre.');
      }
      
      // Verifică limitările de login pentru email
      const loginCheck = await security.checkLoginAttempts(email);
      if (loginCheck.blocked) {
        throw new Error(`Contul este temporar blocat din cauza prea multor încercări. Încearcă din nou după ${Math.ceil(loginCheck.remainingTime / 60000)} minute.`);
      }
      
      // Creează utilizatorul
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizează profilul Firebase Auth
      await updateProfile(user, {
        displayName: userData.name || `${userData.firstName} ${userData.lastName}`.trim()
      });
      
      // Trimite email de verificare
      await security.sendEmailVerificationWithLogging(user);
      
      // Determină rolul
      const userRole = userData.role || 'admin_asociatie';
      
      // Salvează profilul de bază în Firestore (compatibilitate)
      const basicProfileData = {
        email: email,
        name: userData.name || userData.firstName || '',
        role: userRole,
        subscriptionStatus: userRole === 'admin_asociatie' ? 'trial' : null,
        createdAt: new Date().toISOString(),
        isActive: true,
        emailVerified: false,
        needsOnboarding: true,
        securityLevel: passwordValidation.strength,
        registrationIP: await security.getUserIP(),
        registrationDevice: security.deviceFingerprint
      };
      
      await setDoc(doc(db, 'users', user.uid), basicProfileData);
      setUserProfile(basicProfileData);
      
      // Inițializează profilul extins
      await profileManager.loadUserProfile(user.uid);
      
      // Inițializează progresul onboarding
      await onboarding.loadOnboardingProgress(user.uid);
      setNeedsOnboarding(true);
      
      // Log înregistrare
      await security.logActivity(user.uid, 'USER_REGISTERED', {
        email,
        role: userRole,
        passwordStrength: passwordValidation.strength,
        needsEmailVerification: true
      });
      
      console.log('✅ Utilizator înregistrat cu funcționalități avansate:', basicProfileData);
      return { user, needsEmailVerification: true };
      
    } catch (error) {
      setAuthError(error.message);
      
      // Log încercare eșuată
      await security.logActivity('system', 'REGISTRATION_FAILED', {
        email,
        error: error.code || error.message
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }

  // 🔑 LOGIN AVANSAT CU SECURITATE
  async function loginEnhanced(email, password, rememberMe = false) {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Verifică limitările de login
      const loginCheck = await security.checkLoginAttempts(email);
      if (loginCheck.blocked) {
        throw new Error(`Contul este temporar blocat. Încercări rămasă până la deblocare: ${Math.ceil(loginCheck.remainingTime / 60000)} minute.`);
      }
      
      try {
        // Încearcă autentificarea
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Verifică emailul
        if (!user.emailVerified) {
          setIsEmailVerified(false);
          // Nu bloca login-ul, dar notifică utilizatorul
          console.warn('⚠️ Email neconfirmat pentru utilizator:', email);
        } else {
          setIsEmailVerified(true);
        }
        
        // Resetează încercările de login
        await security.resetLoginAttempts(email);
        
        // Verifică device nou
        const deviceCheck = await security.checkNewDevice(user.uid);
        if (deviceCheck.isNewDevice) {
          console.log('🆕 Device nou detectat pentru utilizator:', user.uid);
          // Aici poți adăuga logica pentru notificare email despre device nou
        }
        
        // Creează informații sesiune
        const sessionData = {
          sessionId: generateSessionId(),
          loginTime: new Date().toISOString(),
          deviceFingerprint: security.deviceFingerprint,
          ip: await security.getUserIP(),
          rememberMe,
          isNewDevice: deviceCheck.isNewDevice
        };
        
        setSessionInfo(sessionData);
        
        // Salvează session info în localStorage dacă remember me
        if (rememberMe) {
          localStorage.setItem('blocapp_session', JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem('blocapp_session', JSON.stringify(sessionData));
        }
        
        // Log login reușit
        await security.logActivity(user.uid, 'LOGIN_SUCCESS', {
          email,
          deviceFingerprint: security.deviceFingerprint,
          isNewDevice: deviceCheck.isNewDevice,
          rememberMe
        });
        
        return { 
          user, 
          isNewDevice: deviceCheck.isNewDevice,
          emailVerified: user.emailVerified,
          sessionInfo: sessionData
        };
        
      } catch (authError) {
        // Incrementează încercările de login
        const attemptResult = await security.incrementLoginAttempts(email);
        
        let errorMessage = 'Email sau parolă incorectă.';
        if (attemptResult.blocked) {
          errorMessage = `Prea multe încercări eșuate. Contul este blocat pentru 15 minute.`;
        } else if (attemptResult.remainingAttempts <= 2) {
          errorMessage = `Email sau parolă incorectă. Mai ai ${attemptResult.remainingAttempts} încercări înainte de blocare.`;
        }
        
        // Log încercare eșuată
        await security.logActivity('system', 'LOGIN_FAILED', {
          email,
          error: authError.code,
          attemptsRemaining: attemptResult.remainingAttempts,
          blocked: attemptResult.blocked
        });
        
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  // 🚪 LOGOUT AVANSAT CU CLEANUP
  async function logoutEnhanced() {
    try {
      const user = auth.currentUser;
      
      if (user) {
        // Log logout
        await security.logActivity(user.uid, 'LOGOUT', {
          sessionDuration: calculateSessionDuration(),
          deviceFingerprint: security.deviceFingerprint
        });
      }
      
      // Cleanup session data
      localStorage.removeItem('blocapp_session');
      sessionStorage.removeItem('blocapp_session');
      
      // Firebase logout
      await signOut(auth);
      
      // Reset state
      setUserProfile(null);
      setSessionInfo(null);
      setIsEmailVerified(false);
      setNeedsOnboarding(false);
      setAuthError(null);
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      throw error;
    }
  }

  // 📧 RETRIMITERE EMAIL VERIFICARE
  async function resendEmailVerification() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Nu există utilizator autentificat');
      
      await security.sendEmailVerificationWithLogging(user);
      
      await security.logActivity(user.uid, 'EMAIL_VERIFICATION_RESENT', {
        email: user.email
      });
      
      return true;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  // 🔄 VERIFICARE STATUS EMAIL
  async function checkEmailVerification() {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      // În development, verifică dacă emailul a fost simulat ca verificat
      if (process.env.NODE_ENV === 'development') {
        const simulatedVerification = localStorage.getItem(`email_verified_simulated_${user.uid}`);
        if (simulatedVerification === 'true') {
          setIsEmailVerified(true);
          
          // Update profil că emailul e verificat
          await updateDoc(doc(db, 'users', user.uid), {
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
            verificationSimulated: true
          });
          
          return true;
        }
      }
      
      await reload(user);
      const isVerified = user.emailVerified;
      setIsEmailVerified(isVerified);
      
      if (isVerified && !userProfile?.emailVerified) {
        // Update profil că emailul e verificat
        await updateDoc(doc(db, 'users', user.uid), {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        });
        
        // Update local state
        setUserProfile(prev => ({
          ...prev,
          emailVerified: true
        }));
        
        await security.logActivity(user.uid, 'EMAIL_VERIFIED', {
          email: user.email
        });
      }
      
      return isVerified;
    } catch (error) {
      console.error('❌ Error checking email verification:', error);
      return false;
    }
  }

  // 🆔 GENERARE SESSION ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // ⏱️ CALCULARE DURATĂ SESIUNE
  const calculateSessionDuration = () => {
    if (!sessionInfo?.loginTime) return 0;
    const loginTime = new Date(sessionInfo.loginTime);
    const now = new Date();
    return Math.round((now - loginTime) / 1000 / 60); // minute
  };

  // 📊 VERIFICARE DACĂ UTILIZATORUL NECESITĂ ONBOARDING
  const checkNeedsOnboarding = async (user) => {
    if (!user) return false;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const needsOnboardingCheck = userData.needsOnboarding !== false;
        setNeedsOnboarding(needsOnboardingCheck);
        return needsOnboardingCheck;
      }
      return true;
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return false;
    }
  };

  // 🔄 ÎNCĂRCAREA PROFILULUI UTILIZATOR (enhanced)
  async function loadUserProfileEnhanced(user) {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      // Încarcă profilul de bază (compatibilitate)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        setUserProfile(profileData);
        
        // Verifică email verificat (real sau simulat în development)
        let emailVerified = user.emailVerified;
        if (process.env.NODE_ENV === 'development' && !emailVerified) {
          const simulatedVerification = localStorage.getItem(`email_verified_simulated_${user.uid}`);
          emailVerified = simulatedVerification === 'true';
        }
        setIsEmailVerified(emailVerified);
        
        // Încarcă profilul extins
        await profileManager.loadUserProfile(user.uid);
        
        // Verifică dacă necesită onboarding
        await checkNeedsOnboarding(user);
        
        // Încarcă progresul onboarding dacă e necesar
        if (profileData.needsOnboarding !== false) {
          await onboarding.loadOnboardingProgress(user.uid);
        }
        
        console.log('✅ Profil enhanced încărcat:', profileData);
      } else {
        console.log('❌ Nu s-a găsit profil pentru utilizator, creez unul nou...');
        
        // Creează un profil de bază dacă nu există
        const newProfileData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          role: 'admin_asociatie',
          subscriptionStatus: 'trial',
          createdAt: new Date().toISOString(),
          isActive: true,
          emailVerified: isEmailVerified || false,
          needsOnboarding: true,
          autoCreated: true
        };
        
        await setDoc(doc(db, 'users', user.uid), newProfileData);
        setUserProfile(newProfileData);
        setNeedsOnboarding(true);
        
        // Încarcă profilul extins
        await profileManager.loadUserProfile(user.uid);
        
        console.log('✅ Profil creat automat:', newProfileData);
      }
    } catch (error) {
      console.error('❌ Error loading enhanced profile:', error);
      setUserProfile(null);
    }
  }

  // Funcții originale pentru compatibilitate
  const register = registerEnhanced;
  const login = loginEnhanced;
  const logout = logoutEnhanced;

  // Funcții de verificare roluri (păstrate pentru compatibilitate)
  function isSuperAdmin() {
    return userProfile?.role === 'super_admin';
  }

  function isAdminAsociatie() {
    return userProfile?.role === 'admin_asociatie';
  }

  function isPresedinte() {
    return userProfile?.role === 'presedinte';
  }

  function isCenzor() {
    return userProfile?.role === 'cenzor';
  }

  function isProprietar() {
    return userProfile?.role === 'proprietar';
  }

  function canAdminister() {
    return isSuperAdmin() || isAdminAsociatie();
  }

  function canReview() {
    return isPresedinte() || isCenzor();
  }

  function canManage() {
    return canAdminister() || canReview();
  }

  // Effect pentru monitorizarea stării de autentificare
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Enhanced auth state changed:', user ? user.uid : 'No user');
      setCurrentUser(user);
      
      if (user) {
        // Încarcă profilul cu un mic delay pentru Firestore
        setTimeout(async () => {
          await loadUserProfileEnhanced(user);
          setLoading(false);
        }, 500);
        
        // Verifică email verification periodic
        const emailCheckInterval = setInterval(async () => {
          if (user.emailVerified !== isEmailVerified) {
            await checkEmailVerification();
          }
        }, 30000); // la fiecare 30 secunde
        
        return () => clearInterval(emailCheckInterval);
      } else {
        setUserProfile(null);
        setIsEmailVerified(false);
        setNeedsOnboarding(false);
        setSessionInfo(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Cleanup la dismount
  useEffect(() => {
    return () => {
      // Cleanup any intervals or subscriptions
    };
  }, []);

  const value = {
    // State original (compatibilitate)
    user: currentUser,
    currentUser,
    userProfile,
    loading,
    
    // State enhanced
    isEmailVerified,
    authError,
    sessionInfo,
    needsOnboarding,
    
    // Funcții originale (compatibilitate)
    register,
    login,
    logout,
    isSuperAdmin,
    isAdminAsociatie,
    isPresedinte,
    isCenzor,
    isProprietar,
    canAdminister,
    canReview,
    canManage,
    
    // Funcții enhanced
    registerEnhanced,
    loginEnhanced,
    logoutEnhanced,
    resendEmailVerification,
    checkEmailVerification,
    checkNeedsOnboarding,
    
    // Hooks integrate
    security,
    profileManager,
    onboarding,
    
    // Utils
    calculateSessionDuration,
    setAuthError
  };

  return (
    <AuthContextEnhanced.Provider value={value}>
      {!loading && children}
    </AuthContextEnhanced.Provider>
  );
}