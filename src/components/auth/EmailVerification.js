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
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <img
              src="/logo.png"
              alt="BlocApp"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600">Aproape gata!</p>
        </div>

        {/* 📋 CARD PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">

          {/* 📧 HEADER VERIFICARE */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verifică-ți emailul</h2>
            <p className="text-gray-600 mt-3">
              Am trimis un link de verificare la
            </p>
            <p className="font-semibold text-blue-600 mt-1 text-lg">
              {user?.email}
            </p>
            <p className="text-gray-500 text-sm mt-3">
              Verifică inbox-ul sau folderul spam
            </p>
          </div>

          {/* ✅ MESAJ SUCCES */}
          {resendSuccess && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 text-sm">Email retrimis cu succes!</p>
            </div>
          )}

          {/* ❌ MESAJ EROARE */}
          {resendError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-700 text-sm">{resendError}</p>
            </div>
          )}

          {/* 🔄 BUTON RETRIMITERE */}
          <button
            onClick={handleResendEmail}
            disabled={isResending || cooldownTime > 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Se trimite...
              </div>
            ) : cooldownTime > 0 ? (
              <div className="flex items-center justify-center">
                <Clock className="w-5 h-5 mr-2" />
                Retrimite în {formatCooldownTime(cooldownTime)}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Send className="w-5 h-5 mr-2" />
                Retrimite emailul
              </div>
            )}
          </button>

          {/* ⚡ SIMULARE EMAIL VERIFICARE (Development Only) */}
          {isDevelopment && (
            <button
              onClick={handleSimulateEmailVerification}
              className="w-full mt-3 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              <div className="flex items-center justify-center">
                <Zap className="w-4 h-4 mr-2" />
                Simulează verificare (DEV)
              </div>
            </button>
          )}

          {/* 🛠️ FOOTER */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500">
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
                className="inline-flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Folosește alt cont
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
