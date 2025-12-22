import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle, Clock, Send, Zap, LogOut } from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import { EmailSimulator } from '../../utils/emailSimulator';

/**
 * 📧 COMPONENTA VERIFICARE EMAIL CU FEATURES AVANSATE
 * 
 * Features:
 * - Auto-check email verification la intervale regulate
 * - Retrimitere email cu cooldown
 * - Progress indicator pentru verificare
 * - Instrucțiuni pas cu pas
 * - Skip option pentru accesul de urgență
 */
export default function EmailVerification({ onVerified, onSkip, user }) {
  const {
    resendEmailVerification,
    checkEmailVerification,
    authError,
    setAuthError,
    logoutEnhanced
  } = useAuthEnhanced();
  
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [emailsSent, setEmailsSent] = useState(1); // Prima trimitere la înregistrare
  const [autoCheckInterval, setAutoCheckInterval] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const [isDevelopment] = useState(process.env.NODE_ENV === 'development');

  // ⏰ COOLDOWN TIMER
  useEffect(() => {
    let interval = null;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // 🔄 AUTO-CHECK EMAIL VERIFICATION
  useEffect(() => {
    const startAutoCheck = () => {
      const interval = setInterval(async () => {
        try {
          setIsChecking(true);
          const isVerified = await checkEmailVerification();
          setLastCheckTime(Date.now());
          
          if (isVerified) {
            clearInterval(interval);
            if (onVerified) {
              onVerified();
            }
          }
        } catch (error) {
          console.error('❌ Auto-check email verification error:', error);
        } finally {
          setIsChecking(false);
        }
      }, 10000); // Check la fiecare 10 secunde

      setAutoCheckInterval(interval);
      return interval;
    };

    const interval = startAutoCheck();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkEmailVerification, onVerified]);

  // 🧹 CLEANUP
  useEffect(() => {
    return () => {
      if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
      }
    };
  }, [autoCheckInterval]);

  // 🔗 LISTENER PENTRU SIMULARE EMAIL VERIFICARE
  useEffect(() => {
    const handleEmailVerificationSimulated = (event) => {
      // console.log('📧 Email verification simulated:', event.detail);
      if (onVerified) {
        onVerified();
      }
    };

    window.addEventListener('emailVerificationSimulated', handleEmailVerificationSimulated);
    
    return () => {
      window.removeEventListener('emailVerificationSimulated', handleEmailVerificationSimulated);
    };
  }, [onVerified]);

  // 🔄 VERIFICARE MANUALĂ EMAIL
  const handleManualCheck = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    setAuthError(null);
    
    try {
      const isVerified = await checkEmailVerification();
      setLastCheckTime(Date.now());
      
      if (isVerified) {
        if (onVerified) {
          onVerified();
        }
      } else {
        // Feedback pentru utilizator că încă nu e verificat
        setTimeout(() => {
          setAuthError('Email-ul nu a fost încă verificat. Verifică inbox-ul și spam-ul.');
        }, 500);
      }
    } catch (error) {
      console.error('❌ Manual email verification error:', error);
      setAuthError('Nu s-a putut verifica starea emailului. Te rugăm să încerci din nou.');
    } finally {
      setIsChecking(false);
    }
  };

  // 📧 RETRIMITERE EMAIL VERIFICARE
  const handleResendEmail = async () => {
    if (isResending || cooldownTime > 0) return;
    
    setIsResending(true);
    setAuthError(null);
    
    try {
      await resendEmailVerification();
      
      setEmailsSent(prev => prev + 1);
      setCooldownTime(60); // 60 secunde cooldown
      
      // Feedback pozitiv
      setAuthError(null);
      
    } catch (error) {
      console.error('❌ Resend email verification error:', error);
      
      let errorMessage = 'Nu s-a putut retrimite emailul. Te rugăm să încerci din nou.';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Prea multe cereri. Te rugăm să aștepți înainte să încerci din nou.';
        setCooldownTime(300); // 5 minute pentru too many requests
      }
      
      setAuthError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // ⚡ SIMULARE EMAIL VERIFICARE (Development only)
  const handleSimulateEmailVerification = () => {
    if (user && user.uid) {
      // Setează flag în localStorage pentru simulare
      localStorage.setItem(`email_verified_simulated_${user.uid}`, 'true');
    }
    EmailSimulator.simulateEmailVerificationClick();
  };

  // 🎨 FORMATARE TIMP
  const formatCooldownTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const formatLastCheck = () => {
    const secondsAgo = Math.floor((Date.now() - lastCheckTime) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s în urmă`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo}m în urmă`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* 🏠 HEADER CU LOGO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BlocApp</h1>
          <p className="text-gray-600 mt-2">Aproape gata!</p>
        </div>

        {/* 📋 CARD PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          
          {/* 📧 HEADER VERIFICARE */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verifică-ți emailul</h2>
            <p className="text-gray-600 mt-2">
              Am trimis un email de verificare la
            </p>
            <p className="font-semibold text-blue-600 mt-1">
              {user?.email}
            </p>
          </div>

          {/* 📊 STATUS AUTO-CHECK */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isChecking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
                )}
                <span className="text-sm font-medium text-blue-900">
                  {isChecking ? 'Se verifică...' : 'Verificare automată activă'}
                </span>
              </div>
              <span className="text-xs text-blue-600">
                Ultima verificare: {formatLastCheck()}
              </span>
            </div>
          </div>

          {/* 📋 INSTRUCȚIUNI */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Pași pentru verificare:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Verifică inbox-ul pentru emailul de la BlocApp</li>
              <li>Dacă nu găsești emailul, verifică folderul spam</li>
              <li>Deschide emailul și apasă pe butonul "Verifică email"</li>
              <li>Vei fi redirecționat automat înapoi la aplicație</li>
            </ol>
          </div>

          {/* 🚨 AFIȘARE ERORI */}
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800">{authError}</p>
              </div>
            </div>
          )}

          {/* 🔄 BUTOANE ACȚIUNE */}
          <div className="space-y-4">
            
            {/* VERIFICARE MANUALĂ */}
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Se verifică emailul...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Am verificat emailul
                </div>
              )}
            </button>

            {/* RETRIMITERE EMAIL */}
            <div className="relative">
              <button
                onClick={handleResendEmail}
                disabled={isResending || cooldownTime > 0}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                    Se retrimite...
                  </div>
                ) : cooldownTime > 0 ? (
                  <div className="flex items-center justify-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Așteaptă {formatCooldownTime(cooldownTime)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Send className="w-5 h-5 mr-2" />
                    Retrimite emailul ({emailsSent}/5)
                  </div>
                )}
              </button>
              
              {/* PROGRESS BAR PENTRU EMAILURI TRIMISE */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(emailsSent / 5) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {emailsSent}/5 emailuri trimise
                </p>
              </div>
            </div>

            {/* ⚡ SIMULARE EMAIL VERIFICARE (Development Only) */}
            {isDevelopment && (
              <button
                onClick={handleSimulateEmailVerification}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors border-2 border-orange-400"
              >
                <div className="flex items-center justify-center">
                  <Zap className="w-4 h-4 mr-2" />
                  ⚡ Simulează verificare email (DEV)
                </div>
              </button>
            )}
          </div>

          {/* ⚠️ SKIP OPTION (cu condiții) */}
          {emailsSent >= 2 && onSkip && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Acces temporar</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Poți continua fără verificare, dar unele funcții vor fi limitate până la confirmarea emailului.
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={onSkip}
                className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
              >
                Continuă fără verificare (Acces limitat)
              </button>
            </div>
          )}

          {/* 🛠️ SUPORT */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Probleme cu verificarea?{' '}
                <a
                  href="mailto:support@blocapp.ro"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Contactează suportul
                </a>
              </p>

              {/* 🚪 LOGOUT - pentru utilizatorii care au greșit emailul */}
              <button
                onClick={logoutEnhanced}
                className="inline-flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Folosește alt cont
              </button>
            </div>
          </div>

          {/* 📊 STATISTICI DEBUG (doar pentru dev) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
              <p>Debug: Emailuri trimise: {emailsSent}</p>
              <p>Debug: Cooldown: {cooldownTime}s</p>
              <p>Debug: Auto-check activ: {!!autoCheckInterval}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}