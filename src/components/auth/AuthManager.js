import React, { useState, useEffect, useRef } from 'react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import { LoginForm, RegisterForm, ResetPasswordForm, EmailVerification } from './index';
import OnboardingTabs from '../onboarding/OnboardingTabs';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * 🎯 AUTH MANAGER - ORCHESTREAZĂ TOATE FLOWS-URILE DE AUTENTIFICARE
 * 
 * Features:
 * - Switching între Login/Register/Reset
 * - Email verification flow
 * - Onboarding wizard pentru utilizatori noi
 * - Redirect către aplicația principală la final
 */
export default function AuthManager({ onAuthComplete }) {
  const { 
    currentUser, 
    userProfile, 
    isEmailVerified, 
    needsOnboarding,
    loading 
  } = useAuthEnhanced();
  
  const [currentFlow, setCurrentFlow] = useState('login'); // login, register, reset, emailVerify, onboarding
  const [isReady, setIsReady] = useState(false);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // 🎯 DETERMINE FLOW ON MOUNT AND WHEN AUTH STATE CHANGES
  useEffect(() => {
    if (!loading && currentUser) {
      if (!isEmailVerified && currentFlow !== 'emailVerify') {
        setCurrentFlow('emailVerify');
      } else if (needsOnboarding && currentFlow !== 'onboarding') {
        setCurrentFlow('onboarding');
      } else if (!needsOnboarding && isEmailVerified) {
        // User is fully authenticated and onboarded
        if (onAuthComplete) {
          onAuthComplete({ fullyAuthenticated: true });
        }
      }
    }
    
    if (!loading) {
      setIsReady(true);
    }
  }, [loading, currentUser, isEmailVerified, needsOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔄 HANDLE SUCCESSFUL LOGIN/REGISTER
  const handleAuthSuccess = (result) => {
    // console.log('✅ Auth success:', result);
    
    // Dacă trebuie să verifice emailul
    if (!result.emailVerified && result.needsEmailVerification) {
      setCurrentFlow('emailVerify');
      return;
    }
    
    // Dacă e înregistrare nouă sau utilizator care necesită onboarding
    if (needsOnboarding || result.isNewUser) {
      setCurrentFlow('onboarding');
      return;
    }
    
    // Altfel, redirecționează către aplicația principală
    if (onAuthComplete) {
      onAuthComplete(result);
    }
  };

  // ✅ HANDLE EMAIL VERIFIED
  const handleEmailVerified = () => {
    // console.log('✅ Email verified');
    
    // Verifică dacă necesită onboarding
    if (needsOnboarding) {
      setCurrentFlow('onboarding');
    } else {
      // Redirecționează către aplicația principală
      if (onAuthComplete) {
        onAuthComplete({ emailVerified: true });
      }
    }
  };

  // 🎯 HANDLE EMAIL VERIFICATION SKIP
  const handleEmailVerificationSkip = () => {
    // console.log('⏭️ Email verification skipped');
    
    // Permite accesul limitat - merge direct la onboarding sau app
    if (needsOnboarding) {
      setCurrentFlow('onboarding');
    } else {
      if (onAuthComplete) {
        onAuthComplete({ emailVerified: false, limitedAccess: true });
      }
    }
  };

  // 🎉 HANDLE ONBOARDING COMPLETE
  const handleOnboardingComplete = (result) => {
    // console.log('✅ Onboarding complete:', result);
    
    // Afișează mesajul de succes pentru o scurtă perioadă
    setCurrentFlow('completed');
    
    // Redirecționează către aplicația principală după un delay scurt
    setTimeout(() => {
      if (onAuthComplete) {
        // console.log('Calling onAuthComplete with:', { onboardingCompleted: true, ...result });
        onAuthComplete({ 
          onboardingCompleted: true,
          ...result 
        });
      }
    }, 1500); // 1.5 secunde pentru a afișa mesajul de succes
  };

  // ⏭️ HANDLE ONBOARDING SKIP
  const handleOnboardingSkip = () => {
    // console.log('⏭️ Onboarding skipped');
    
    // Permite accesul limitat la aplicația principală
    if (onAuthComplete) {
      onAuthComplete({ 
        onboardingCompleted: false,
        limitedAccess: true 
      });
    }
  };

  // 🔄 SWITCH HANDLERS
  const switchToLogin = () => setCurrentFlow('login');
  const switchToRegister = () => setCurrentFlow('register');
  const switchToReset = () => setCurrentFlow('reset');

  // ⏳ LOADING STATE - Only show if truly loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă sistemul de autentificare...</p>
        </div>
      </div>
    );
  }

  // 🚀 DIRECT CHECK - If user is authenticated and needs onboarding, show it immediately
  if (currentUser && isEmailVerified && needsOnboarding && !loading && isReady) {
    if (renderCountRef.current > 10) {
      console.warn('Too many renders detected, forcing onboarding display');
    }
    return (
      <OnboardingTabs
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // 📧 EMAIL VERIFICATION FLOW
  if (currentFlow === 'emailVerify') {
    return (
      <EmailVerification
        user={currentUser}
        onVerified={handleEmailVerified}
        onSkip={handleEmailVerificationSkip}
      />
    );
  }

  // 🧙‍♂️ ONBOARDING FLOW
  if (currentFlow === 'onboarding' || (currentUser && isEmailVerified && needsOnboarding)) {
    return (
      <OnboardingTabs
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // 🔑 LOGIN FLOW
  if (currentFlow === 'login') {
    return (
      <LoginForm
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={switchToRegister}
        onSwitchToReset={switchToReset}
      />
    );
  }

  // 📝 REGISTER FLOW
  if (currentFlow === 'register') {
    return (
      <RegisterForm
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={switchToLogin}
      />
    );
  }

  // 🔄 RESET PASSWORD FLOW
  if (currentFlow === 'reset') {
    return (
      <ResetPasswordForm
        onSwitchToLogin={switchToLogin}
      />
    );
  }

  // ✅ ONBOARDING COMPLETED FLOW - Afișează un mesaj de loading în timpul tranziției
  if (currentFlow === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Configurarea s-a finalizat cu succes!</p>
          <p className="text-sm text-gray-500 mt-2">Te redirectăm către aplicație...</p>
        </div>
      </div>
    );
  }

  // 🚫 FALLBACK
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-800 mb-2">Eroare în fluxul de autentificare</h2>
        <p className="text-red-600 mb-4">Flow necunoscut: {currentFlow}</p>
        <button
          onClick={switchToLogin}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Înapoi la login
        </button>
      </div>
    </div>
  );
}