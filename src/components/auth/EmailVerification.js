import React, { useState, useEffect } from 'react';
import { Mail, Clock, Send, Zap, LogOut } from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import { EmailSimulator } from '../../utils/emailSimulator';

/**
 * 📧 COMPONENTA VERIFICARE EMAIL - Design Minimalist
 *
 * Features:
 * - Auto-check email verification (silent, în background)
 * - Retrimitere email cu cooldown
 * - Cross-tab sync via BroadcastChannel
 */
export default function EmailVerification({ onVerified, user }) {
  const {
    resendEmailVerification,
    checkEmailVerification,
    logoutEnhanced
  } = useAuthEnhanced();

  const [isResending, setIsResending] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [isDevelopment] = useState(process.env.NODE_ENV === 'development');

  // ⏰ COOLDOWN TIMER
  useEffect(() => {
    let interval = null;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime(prev => prev <= 1 ? 0 : prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // 🔄 AUTO-CHECK EMAIL VERIFICATION (silent)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const isVerified = await checkEmailVerification();
        if (isVerified && onVerified) {
          clearInterval(interval);
          onVerified();
        }
      } catch (error) {
        // Silent fail - nu afișăm erori pentru auto-check
      }
    }, 5000); // Check la fiecare 5 secunde

    return () => clearInterval(interval);
  }, [checkEmailVerification, onVerified]);

  // 🔗 LISTENER PENTRU SIMULARE EMAIL VERIFICARE (dev)
  useEffect(() => {
    const handleEmailVerificationSimulated = () => {
      if (onVerified) onVerified();
    };
    window.addEventListener('emailVerificationSimulated', handleEmailVerificationSimulated);
    return () => window.removeEventListener('emailVerificationSimulated', handleEmailVerificationSimulated);
  }, [onVerified]);

  // 📡 BROADCAST CHANNEL - Comunicare între tab-uri
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('blocapp-email-verification');

    channel.onmessage = async (event) => {
      if (event.data.type === 'PING_TABS') {
        channel.postMessage({ type: 'TAB_ACKNOWLEDGED' });
      }
      if (event.data.type === 'EMAIL_VERIFIED' && event.data.email === user?.email) {
        try {
          const isVerified = await checkEmailVerification();
          if (isVerified && onVerified) onVerified();
        } catch (error) {
          // Silent fail
        }
      }
    };

    return () => channel.close();
  }, [user?.email, checkEmailVerification, onVerified]);

  // 📧 RETRIMITERE EMAIL VERIFICARE
  const handleResendEmail = async () => {
    if (isResending || cooldownTime > 0) return;

    setIsResending(true);
    setResendSuccess(false);
    setResendError('');

    try {
      await resendEmailVerification();
      setCooldownTime(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        setResendError('Prea multe cereri. Așteaptă câteva minute.');
        setCooldownTime(300);
      } else {
        setResendError('Nu s-a putut retrimite emailul.');
      }
      setTimeout(() => setResendError(''), 5000);
    } finally {
      setIsResending(false);
    }
  };

  // ⚡ SIMULARE EMAIL VERIFICARE (Development only)
  const handleSimulateEmailVerification = () => {
    if (user?.uid) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* 🏠 HEADER CU LOGO */}
        <div className="text-center mb-4 sm:mb-6">
          <a href="https://blocapp.ro" className="flex items-center justify-center space-x-2 mb-6 hover:opacity-80 transition-opacity">
            <img
              src="/icon-admin.png"
              alt="BlocApp"
              className="w-20 h-20 object-contain"
            />
            <div className="flex flex-col items-start pt-3">
              <span className="text-5xl font-bold text-gray-800 leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>BlocApp</span>
              <span className="text-sm text-gray-600 mt-0 pl-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>administratori</span>
            </div>
          </a>
          <p className="text-gray-600 text-sm">Aproape gata!</p>
        </div>

        {/* 📋 CARD PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">

          {/* 📧 HEADER VERIFICARE */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full mb-3">
              <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Verifică-ți emailul</h2>
            <p className="text-gray-600 text-sm mt-2">
              Am trimis un link de verificare la
            </p>
            <p className="font-semibold text-blue-600 mt-1 text-sm sm:text-base">
              {user?.email}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Verifică inbox-ul sau folderul spam
            </p>
          </div>

          {/* ✅ MESAJ SUCCES */}
          {resendSuccess && (
            <div className="mb-4 p-2.5 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 text-xs">Email retrimis cu succes!</p>
            </div>
          )}

          {/* ❌ MESAJ EROARE */}
          {resendError && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-700 text-xs">{resendError}</p>
            </div>
          )}

          {/* 🔄 BUTON RETRIMITERE */}
          <button
            onClick={handleResendEmail}
            disabled={isResending || cooldownTime > 0}
            className="w-full bg-blue-600 text-white py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Se trimite...
              </div>
            ) : cooldownTime > 0 ? (
              <div className="flex items-center justify-center">
                <Clock className="w-4 h-4 mr-1.5" />
                Retrimite în {formatCooldownTime(cooldownTime)}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Send className="w-4 h-4 mr-1.5" />
                Retrimite emailul
              </div>
            )}
          </button>

          {/* ⚡ SIMULARE EMAIL VERIFICARE (Development Only) */}
          {isDevelopment && (
            <button
              onClick={handleSimulateEmailVerification}
              className="w-full mt-2 bg-orange-500 text-white py-2 px-4 rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
            >
              <div className="flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Simulează verificare (DEV)
              </div>
            </button>
          )}

          {/* 🛠️ FOOTER */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                Nu ai primit emailul?{' '}
                <a
                  href="mailto:support@blocapp.ro"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Contactează suportul
                </a>
              </p>

              <button
                onClick={logoutEnhanced}
                className="inline-flex items-center text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Folosește alt cont
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
