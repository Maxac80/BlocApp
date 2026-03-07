import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db, cloudFunctions } from '../firebase';

/**
 * 🔐 HOOK PENTRU FEATURES AVANSATE DE SECURITATE
 * 
 * Funcționalități:
 * - Limitări login (max 5 încercări)
 * - Audit logging complet
 * - Detectare device nou
 * - Session management
 * - Password strength validation
 * - Email notifications securitate
 */
export const useSecurity = () => {
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockUntil, setBlockUntil] = useState(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);

  // 🔒 LIMITĂRI LOGIN ATTEMPTS
  const MAX_LOGIN_ATTEMPTS = 5;
  const BLOCK_DURATION = 15 * 60 * 1000; // 15 minute

  // 📱 GENERARE DEVICE FINGERPRINT
  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = {
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent.substring(0, 100), // Primele 100 caractere
      canvas: canvas.toDataURL().substring(0, 50), // Primele 50 caractere
      cookieEnabled: navigator.cookieEnabled,
      timestamp: Date.now()
    };
    
    return btoa(JSON.stringify(fingerprint)).substring(0, 32);
  };

  // 🎯 INIȚIALIZARE DEVICE FINGERPRINT
  useEffect(() => {
    const fp = generateDeviceFingerprint();
    setDeviceFingerprint(fp);
  }, []);

  // 📊 AUDIT LOG - Înregistrare activitate utilizator
  const logActivity = async (userId, action, details = {}, associationId = null) => {
    try {
      const activityData = {
        userId,
        action,
        details,
        timestamp: new Date().toISOString(),
        ip: await getUserIP(),
        deviceFingerprint,
        userAgent: navigator.userAgent,
        sessionId: sessionStorage.getItem('sessionId') || 'no-session'
      };

      // Write în locația nested dacă avem associationId
      if (associationId) {
        await addDoc(collection(db, `associations/${associationId}/audit_logs`), activityData);
      } else {
        // Fallback la root pentru acțiuni globale (login, register, etc.)
        await addDoc(collection(db, 'audit_logs'), activityData);
      }
      // console.log('✅ Activity logged:', action, details);
    } catch (error) {
      console.error('❌ Error logging activity:', error);
    }
  };

  // 🌐 OBȚINERE IP UTILIZATOR (prin serviciu extern)
  const getUserIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('❌ Error getting IP:', error);
      return 'unknown';
    }
  };

  // 🔐 VERIFICARE ȘI GESTIONARE LOGIN ATTEMPTS
  const checkLoginAttempts = async (email) => {
    try {
      const attemptsRef = doc(db, 'login_attempts', email);
      const attemptsDoc = await getDoc(attemptsRef);
      
      if (attemptsDoc.exists()) {
        const data = attemptsDoc.data();
        const now = Date.now();
        
        // Verifică dacă e încă blocat
        if (data.blockedUntil && now < data.blockedUntil) {
          setIsBlocked(true);
          setBlockUntil(new Date(data.blockedUntil));
          return { blocked: true, remainingTime: data.blockedUntil - now };
        }
        
        // Resetează dacă a trecut timpul de block
        if (data.blockedUntil && now >= data.blockedUntil) {
          await updateDoc(attemptsRef, {
            attempts: 0,
            blockedUntil: null,
            lastAttempt: null
          });
          setLoginAttempts(0);
          setIsBlocked(false);
          setBlockUntil(null);
          return { blocked: false, attempts: 0 };
        }
        
        setLoginAttempts(data.attempts || 0);
        return { blocked: false, attempts: data.attempts || 0 };
      }
      
      // Primul login - creează documentul
      await setDoc(attemptsRef, {
        email,
        attempts: 0,
        createdAt: new Date().toISOString()
      });
      
      return { blocked: false, attempts: 0 };
    } catch (error) {
      console.error('❌ Error checking login attempts:', error);
      return { blocked: false, attempts: 0 };
    }
  };

  // 📈 INCREMENT LOGIN ATTEMPTS
  const incrementLoginAttempts = async (email) => {
    try {
      const attemptsRef = doc(db, 'login_attempts', email);
      const newAttempts = loginAttempts + 1;
      
      const updateData = {
        attempts: newAttempts,
        lastAttempt: new Date().toISOString(),
        deviceFingerprint,
        ip: await getUserIP()
      };
      
      // Dacă a atins limita, blochează contul
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const blockedUntil = Date.now() + BLOCK_DURATION;
        updateData.blockedUntil = blockedUntil;
        setIsBlocked(true);
        setBlockUntil(new Date(blockedUntil));
        
        // Log încercare suspectă
        await logActivity('system', 'ACCOUNT_BLOCKED', {
          email,
          attempts: newAttempts,
          reason: 'Too many failed login attempts'
        });
      }
      
      await updateDoc(attemptsRef, updateData);
      setLoginAttempts(newAttempts);
      
      return {
        attempts: newAttempts,
        blocked: newAttempts >= MAX_LOGIN_ATTEMPTS,
        remainingAttempts: MAX_LOGIN_ATTEMPTS - newAttempts
      };
    } catch (error) {
      console.error('❌ Error incrementing login attempts:', error);
      return { attempts: loginAttempts, blocked: false };
    }
  };

  // ✅ RESETARE LOGIN ATTEMPTS (la login reușit)
  const resetLoginAttempts = async (email) => {
    try {
      const attemptsRef = doc(db, 'login_attempts', email);
      await updateDoc(attemptsRef, {
        attempts: 0,
        blockedUntil: null,
        lastSuccessfulLogin: new Date().toISOString(),
        lastSuccessDevice: deviceFingerprint
      });
      
      setLoginAttempts(0);
      setIsBlocked(false);
      setBlockUntil(null);
    } catch (error) {
      console.error('❌ Error resetting login attempts:', error);
    }
  };

  // 🔍 DETECTARE DEVICE NOU
  const checkNewDevice = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const knownDevices = userData.knownDevices || [];
        
        const isKnownDevice = knownDevices.some(device => 
          device.fingerprint === deviceFingerprint
        );
        
        if (!isKnownDevice) {
          // Device nou detectat
          await logActivity(userId, 'NEW_DEVICE_LOGIN', {
            deviceFingerprint,
            deviceInfo: {
              platform: navigator.platform,
              userAgent: navigator.userAgent.substring(0, 100)
            }
          });
          
          // Adaugă device-ul la lista cunoscută
          const newDevice = {
            fingerprint: deviceFingerprint,
            name: `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`,
            firstSeen: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          };
          
          await updateDoc(userRef, {
            knownDevices: [...knownDevices, newDevice]
          });
          
          return { isNewDevice: true, deviceInfo: newDevice };
        } else {
          // Device cunoscut - actualizează lastUsed
          const updatedDevices = knownDevices.map(device => 
            device.fingerprint === deviceFingerprint 
              ? { ...device, lastUsed: new Date().toISOString() }
              : device
          );
          
          await updateDoc(userRef, {
            knownDevices: updatedDevices
          });
          
          return { isNewDevice: false };
        }
      }
      
      return { isNewDevice: false };
    } catch (error) {
      console.error('❌ Error checking new device:', error);
      return { isNewDevice: false };
    }
  };

  // 🔑 VALIDARE PUTERE PAROLĂ
  const validatePasswordStrength = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    const strength = score <= 2 ? 'weak' : score <= 3 ? 'medium' : score <= 4 ? 'strong' : 'very-strong';
    
    return {
      score,
      strength,
      checks,
      isValid: score >= 3 // Minim medium
    };
  };

  // 📧 TRIMITERE EMAIL RESETARE PAROLĂ CU CLOUD FUNCTIONS + RESEND
  const sendPasswordResetWithLogging = async (email) => {
    try {
      // Folosește Cloud Function pentru email profesionist via Resend
      const result = await cloudFunctions.sendPasswordResetEmail({ email, origin: window.location.origin });
      await logActivity('system', 'PASSWORD_RESET_REQUESTED', {
        email,
        method: 'cloud_function_resend'
      });

      return { success: true, message: result.data?.message };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      await logActivity('system', 'PASSWORD_RESET_FAILED', {
        email,
        error: error.message || error.code
      });
      throw error;
    }
  };

  // ✉️ TRIMITERE EMAIL VERIFICARE CU CLOUD FUNCTIONS + RESEND
  const sendEmailVerificationWithLogging = async (user, userName = null) => {
    try {
      // Folosește Cloud Function pentru email profesionist via Resend
      const result = await cloudFunctions.sendVerificationEmail({
        email: user.email,
        userName: userName || user.displayName || 'Utilizator',
        origin: window.location.origin
      });

      await logActivity(user.uid, 'EMAIL_VERIFICATION_SENT', {
        email: user.email,
        method: 'cloud_function_resend'
      });

      return { success: true, message: result.data?.message };
    } catch (error) {
      console.error('Error sending verification email:', error);
      await logActivity(user.uid, 'EMAIL_VERIFICATION_FAILED', {
        email: user.email,
        error: error.message || error.code
      });
      throw error;
    }
  };

  // 🔄 SCHIMBARE PAROLĂ CU VALIDARE ȘI LOGGING
  const changePasswordWithValidation = async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Nu există utilizator autentificat');
      
      // Validează puterea noii parole
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error('Parola nu îndeplinește cerințele de securitate');
      }
      
      // Re-autentificare pentru schimbarea parolei
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Schimbă parola
      await updatePassword(user, newPassword);
      
      // Log activitatea
      await logActivity(user.uid, 'PASSWORD_CHANGED', {
        strength: passwordValidation.strength
      });
      
      return { success: true, strength: passwordValidation.strength };
    } catch (error) {
      if (auth.currentUser) {
        await logActivity(auth.currentUser.uid, 'PASSWORD_CHANGE_FAILED', {
          error: error.code
        });
      }
      throw error;
    }
  };

  // 📋 OBȚINERE ISTORIC ACTIVITATE UTILIZATOR
  const getUserActivityHistory = async (userId, associationId = null, limitCount = 50) => {
    try {
      let activities = [];

      // Citește din locația nested dacă avem associationId
      if (associationId) {
        const logsQuery = query(
          collection(db, `associations/${associationId}/audit_logs`),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );

        const logsSnapshot = await getDocs(logsQuery);
        activities = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Fallback: dacă nu găsim logs în nested sau nu avem associationId, citește din root
      if (activities.length === 0) {
        const rootLogsQuery = query(
          collection(db, 'audit_logs'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );

        const rootLogsSnapshot = await getDocs(rootLogsQuery);
        activities = rootLogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      return activities;
    } catch (error) {
      console.error('❌ Error getting user activity:', error);
      return [];
    }
  };

  // 🧹 CLEANUP SESIUNI EXPIRATE
  const cleanupExpiredSessions = async () => {
    try {
      // Implementare cleanup pentru sesiuni vechi (24 ore)
      // const expiredTime = Date.now() - (24 * 60 * 60 * 1000);
      // console.log('🧹 Cleaning up expired sessions older than', new Date(expiredTime));
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
    }
  };

  return {
    // State
    loginAttempts,
    isBlocked,
    blockUntil,
    deviceFingerprint,
    
    // Functions
    logActivity,
    checkLoginAttempts,
    incrementLoginAttempts,
    resetLoginAttempts,
    checkNewDevice,
    validatePasswordStrength,
    sendPasswordResetWithLogging,
    sendEmailVerificationWithLogging,
    changePasswordWithValidation,
    getUserActivityHistory,
    cleanupExpiredSessions,
    getUserIP
  };
};