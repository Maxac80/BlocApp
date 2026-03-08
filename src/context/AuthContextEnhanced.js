/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reload,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
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

  // 🆕 STATE PENTRU CONTEXT SWITCHING
  const [currentContext, setCurrentContext] = useState(null);
  // currentContext = { type: 'organization' | 'association', id: string, data: object, role: string }
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [userDirectAssociations, setUserDirectAssociations] = useState([]);
  const [contextsLoading, setContextsLoading] = useState(false);
  const autoSelectDisabledRef = useRef(false); // previne auto-select după clearContext explicit

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
      
      // Trimite email de verificare (skip pentru invite registrations)
      const skipVerification = userData.skipEmailVerification === true;
      if (!skipVerification) {
        await security.sendEmailVerificationWithLogging(user);
      }

      // Determină rolul (onboarding eliminat - userul merge direct la Context Selector)
      const userRole = userData.role || 'admin_asociatie';
      const needsOnboardingFlag = false;

      // Salvează profilul de bază în Firestore (compatibilitate)
      const basicProfileData = {
        email: email,
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || '',
        phone: userData.phone || '',
        role: userRole,
        subscriptionStatus: userRole === 'admin_asociatie' ? 'trial' : null,
        createdAt: new Date().toISOString(),
        isActive: true,
        emailVerified: skipVerification,
        needsOnboarding: needsOnboardingFlag,
        securityLevel: passwordValidation.strength,
        registrationIP: await security.getUserIP(),
        registrationDevice: security.deviceFingerprint
      };

      await setDoc(doc(db, 'users', user.uid), basicProfileData);
      setUserProfile(basicProfileData);

      // Set states based on flags
      if (skipVerification) {
        setIsEmailVerified(true);
      }
      setNeedsOnboarding(needsOnboardingFlag);

      // Inițializează profilul extins
      await profileManager.loadUserProfile(user.uid);

      // Onboarding eliminat - nu mai încărcăm progresul

      // Log înregistrare
      await security.logActivity(user.uid, 'USER_REGISTERED', {
        email,
        role: userRole,
        passwordStrength: passwordValidation.strength,
        needsEmailVerification: !skipVerification
      });

      return { user, needsEmailVerification: !skipVerification };
      
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
        // 🔐 Setează persistența bazată pe "Ține-mă conectat"
        // browserLocalPersistence = persistă după închiderea browser-ului
        // browserSessionPersistence = se șterge când tab-ul/browser-ul se închide
        const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistenceType);

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
          // console.log('🆕 Device nou detectat pentru utilizator:', user.uid);
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
        try {
          await security.logActivity(user.uid, 'LOGOUT', {
            sessionDuration: calculateSessionDuration(),
            deviceFingerprint: security.deviceFingerprint
          });
        } catch (logError) {
          console.warn('⚠️ Could not log logout activity:', logError);
        }
      }

      // Cleanup session data
      localStorage.removeItem('blocapp_session');
      sessionStorage.removeItem('blocapp_session');

      // Firebase logout
      await signOut(auth);

      // Reset state
      setCurrentUser(null);
      setUserProfile(null);
      setSessionInfo(null);
      setIsEmailVerified(false);
      setNeedsOnboarding(false);
      setAuthError(null);

      // Forțează reload pentru a asigura un state curat
      window.location.reload();

    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Chiar dacă avem eroare, încearcă să facă cleanup și reload
      localStorage.removeItem('blocapp_session');
      sessionStorage.removeItem('blocapp_session');
      window.location.reload();
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

      // Forțează reload-ul datelor utilizatorului din Firebase
      try {
        await reload(user);
      } catch (reloadError) {
        console.warn('⚠️ Reload failed, trying to get fresh token:', reloadError);
        // Dacă reload eșuează, încearcă să obținem un token nou
        try {
          await user.getIdToken(true); // forceRefresh = true
          await reload(user);
        } catch (tokenError) {
          console.error('❌ Token refresh also failed:', tokenError);
        }
      }

      // Verifică statusul după reload
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

  // 📊 VERIFICARE DACĂ UTILIZATORUL NECESITĂ ONBOARDING (dezactivat - mereu false)
  const checkNeedsOnboarding = async (user) => {
    setNeedsOnboarding(false);
    return false;
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
        
        setIsEmailVerified(user.emailVerified || profileData.emailVerified === true || profileData.skipEmailVerification === true);
        
        // Încarcă profilul extins
        await profileManager.loadUserProfile(user.uid);
        
        // Onboarding dezactivat - setează mereu false
        setNeedsOnboarding(false);
        
        // console.log('✅ Profil enhanced încărcat:', profileData);
      } else {
        // console.log('❌ Nu s-a găsit profil pentru utilizator, creez unul nou...');
        
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
          needsOnboarding: false,
          autoCreated: true
        };

        await setDoc(doc(db, 'users', user.uid), newProfileData);
        setUserProfile(newProfileData);
        setNeedsOnboarding(false);
        
        // Încarcă profilul extins
        await profileManager.loadUserProfile(user.uid);
        
        // console.log('✅ Profil creat automat:', newProfileData);
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
  function isMaster() {
    return userProfile?.role === 'master';
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
    return isMaster() || isAdminAsociatie();
  }

  function canReview() {
    return isPresedinte() || isCenzor();
  }

  function canManage() {
    return canAdminister() || canReview();
  }

  // 🆕 ÎNCĂRCARE ORGANIZAȚII ȘI ASOCIAȚII DIRECTE
  const loadUserContexts = useCallback(async (userId) => {
    if (!userId) {
      setUserOrganizations([]);
      setUserDirectAssociations([]);
      return;
    }

    setContextsLoading(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        setUserOrganizations([]);
        setUserDirectAssociations([]);
        return;
      }

      const userData = userDoc.data();

      // Încarcă organizațiile cu date complete
      const orgs = [];
      if (userData.organizations && userData.organizations.length > 0) {
        for (const orgRef of userData.organizations) {
          try {
            const orgDoc = await getDoc(doc(db, 'organizations', orgRef.id));
            if (orgDoc.exists()) {
              orgs.push({
                id: orgRef.id,
                userRole: orgRef.role,
                joinedAt: orgRef.joinedAt,
                ...orgDoc.data()
              });
            }
          } catch (err) {
            console.error(`Error loading org ${orgRef.id}:`, err);
          }
        }
      }
      setUserOrganizations(orgs);

      // Încarcă asociațiile directe cu date complete + rolul utilizatorului
      const assocs = [];
      if (userData.directAssociations && userData.directAssociations.length > 0) {
        for (const assocId of userData.directAssociations) {
          try {
            const assocDoc = await getDoc(doc(db, 'associations', assocId));
            if (assocDoc.exists()) {
              const assocData = assocDoc.data();

              // Detectează rolul utilizatorului pe această asociație
              let userRole = 'assoc_admin'; // default
              if (assocData.adminId === userId) {
                userRole = 'assoc_admin';
              } else {
                // Citește member doc pentru a determina rolul
                try {
                  const memberDoc = await getDoc(doc(db, 'associations', assocId, 'members', userId));
                  if (memberDoc.exists()) {
                    userRole = memberDoc.data().role || 'assoc_admin';
                  }
                } catch (memberErr) {
                  console.warn(`Could not load member role for assoc ${assocId}:`, memberErr);
                }
              }

              assocs.push({
                id: assocId,
                userRole,
                ...assocData
              });
            }
          } catch (err) {
            console.error(`Error loading assoc ${assocId}:`, err);
          }
        }
      }
      setUserDirectAssociations(assocs);
    } catch (err) {
      console.error('Error loading user contexts:', err);
    } finally {
      setContextsLoading(false);
    }
  }, []);

  // 🆕 SELECTARE CONTEXT ORGANIZAȚIE
  const selectOrganization = useCallback(async (organization) => {
    if (!organization) {
      setCurrentContext(null);
      localStorage.removeItem('blocapp_context');
      return;
    }

    const role = organization.userRole ||
      userProfile?.organizations?.find(o => o.id === organization.id)?.role ||
      'org_member';

    const context = {
      type: 'organization',
      id: organization.id,
      data: organization,
      role
    };

    setCurrentContext(context);
    localStorage.setItem('blocapp_context', JSON.stringify({
      type: 'organization',
      id: organization.id
    }));
  }, [userProfile]);

  // 🆕 SELECTARE CONTEXT ASOCIAȚIE DIRECTĂ
  const selectDirectAssociation = useCallback(async (association) => {
    if (!association) {
      setCurrentContext(null);
      localStorage.removeItem('blocapp_context');
      return;
    }

    autoSelectDisabledRef.current = false; // resetăm flag-ul la selectare explicită

    const context = {
      type: 'association',
      id: association.id,
      data: association,
      role: association.userRole || 'assoc_admin'
    };

    setCurrentContext(context);
    localStorage.setItem('blocapp_context', JSON.stringify({
      type: 'association',
      id: association.id
    }));
  }, []);

  // 🆕 CLEAR CONTEXT
  const clearContext = useCallback(() => {
    autoSelectDisabledRef.current = true;
    setCurrentContext(null);
    localStorage.removeItem('blocapp_context');
  }, []);

  // 🆕 RESTAURARE CONTEXT DIN localStorage
  const restoreContext = useCallback(async () => {
    const saved = localStorage.getItem('blocapp_context');
    if (!saved) return;

    try {
      const { type, id } = JSON.parse(saved);

      if (type === 'organization') {
        const org = userOrganizations.find(o => o.id === id);
        if (org) selectOrganization(org);
        else localStorage.removeItem('blocapp_context');
      } else if (type === 'association') {
        const assoc = userDirectAssociations.find(a => a.id === id);
        if (assoc) selectDirectAssociation(assoc);
        else localStorage.removeItem('blocapp_context');
      }
    } catch (err) {
      localStorage.removeItem('blocapp_context');
    }
  }, [userOrganizations, userDirectAssociations, selectOrganization, selectDirectAssociation]);

  // 🆕 VERIFICĂRI ROL ÎN CONTEXT CURENT
  const isOrgOwner = useCallback(() => {
    return currentContext?.type === 'organization' && currentContext?.role === 'org_owner';
  }, [currentContext]);

  const isOrgAdmin = useCallback(() => {
    return currentContext?.type === 'organization' &&
      (currentContext?.role === 'org_owner' || currentContext?.role === 'org_admin');
  }, [currentContext]);

  const isOrgMember = useCallback(() => {
    return currentContext?.type === 'organization' && currentContext?.role === 'org_member';
  }, [currentContext]);

  const isDirectAssocAdmin = useCallback(() => {
    return currentContext?.type === 'association';
  }, [currentContext]);

  // 🆕 HELPER PENTRU VERIFICARE CONTEXT SELECTION
  const needsContextSelection = useCallback(() => {
    if (loading || contextsLoading) return false;
    if (!currentUser) return false;
    if (userOrganizations.length === 0 && userDirectAssociations.length === 0) return true; // arată selector cu empty state + "Creează Asociație"
    if (currentContext) return false; // deja selectat
    // Dacă user-ul a dat explicit "Schimbă asociația", arată selector chiar și cu 1 asociație
    if (autoSelectDisabledRef.current) return true;
    // O singură asociație directă, fără organizații → auto-select (nu arăta selector)
    if (userOrganizations.length === 0 && userDirectAssociations.length === 1) return false;
    // 2+ asociații sau organizații → arată selector
    return true;
  }, [loading, contextsLoading, currentUser, userOrganizations, userDirectAssociations, currentContext]);

  // 🆕 AUTO-SELECT: dacă userul are exact o singură asociație directă și nicio organizație
  // Nu se activează dacă user-ul a dat explicit "Schimbă asociația"
  useEffect(() => {
    if (loading || contextsLoading || currentContext) return;
    if (!currentUser) return;
    if (autoSelectDisabledRef.current) return;
    if (userOrganizations.length === 0 && userDirectAssociations.length === 1) {
      selectDirectAssociation(userDirectAssociations[0]);
    }
  }, [loading, contextsLoading, currentContext, currentUser, userOrganizations, userDirectAssociations, selectDirectAssociation]);

  // Effect pentru monitorizarea stării de autentificare
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Încarcă profilul cu un mic delay pentru Firestore
        setTimeout(async () => {
          await loadUserProfileEnhanced(user);
          await loadUserContexts(user.uid);
          setLoading(false);
        }, 500);
      } else {
        setUserProfile(null);
        setIsEmailVerified(false);
        setNeedsOnboarding(false);
        setSessionInfo(null);
        setUserOrganizations([]);
        setUserDirectAssociations([]);
        setCurrentContext(null);
        localStorage.removeItem('blocapp_context');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadUserContexts]);

  // 🆕 Effect pentru restaurare context după încărcare
  useEffect(() => {
    if (!contextsLoading && (userOrganizations.length > 0 || userDirectAssociations.length > 0)) {
      restoreContext();
    }
  }, [contextsLoading, userOrganizations, userDirectAssociations, restoreContext]);

  // Listener în timp real pentru profilul utilizatorului
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const profileData = doc.data();
        // console.log('🔄 UserProfile actualizat în timp real:', profileData);
        setUserProfile(profileData);
      }
    }, (error) => {
      console.error('❌ Error listening to user profile:', error);
    });

    return () => unsubscribeProfile();
  }, [currentUser?.uid]);

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

    // 🆕 Context switching state
    currentContext,
    contextsLoading,
    userOrganizations,
    userDirectAssociations,

    // Funcții originale (compatibilitate)
    register,
    login,
    logout,
    signup: register, // Alias
    isMaster,
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

    // 🆕 Context switching funcții
    selectOrganization,
    selectDirectAssociation,
    clearContext,
    loadUserContexts,
    needsContextSelection,

    // 🆕 Role checks pentru context
    isOrgOwner,
    isOrgAdmin,
    isOrgMember,
    isDirectAssocAdmin,

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