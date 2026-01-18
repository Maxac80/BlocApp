import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Send, Clock } from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';

/**
 * 🔄 FORMULER RESETARE PAROLĂ CU FEATURES AVANSATE
 * 
 * Features:
 * - Validare email în timp real
 * - Cooldown între cereri pentru anti-spam
 * - Feedback vizual pentru progres
 * - Logging pentru securitate
 * - Instrucțiuni clare pentru utilizator
 */
export default function ResetPasswordForm({ onSwitchToLogin }) {
  const { security, authError, setAuthError } = useAuthEnhanced();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [cooldownTime, setCooldownTime] = useState(0);
  const [lastEmailSent, setLastEmailSent] = useState(null);

  // ⏰ COOLDOWN TIMER
  React.useEffect(() => {
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

  // 📝 GESTIONARE SCHIMBARE EMAIL
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Șterge erorile la schimbarea inputului
    if (validationError) setValidationError('');
    if (authError) setAuthError(null);
    
    // Validare în timp real
    if (value && !/\S+@\S+\.\S+/.test(value)) {
      setValidationError('Email-ul nu este valid');
    }
  };

  // ✅ VALIDARE FORMULAR
  const validateForm = () => {
    if (!email.trim()) {
      setValidationError('Email-ul este obligatoriu');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Email-ul nu este valid');
      return false;
    }
    
    return true;
  };

  // 🚀 SUBMIT FORMULAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (cooldownTime > 0) return;
    
    setIsLoading(true);
    
    try {
      await security.sendPasswordResetWithLogging(email.trim());
      
      setEmailSent(true);
      setLastEmailSent(new Date());
      setCooldownTime(60); // 60 secunde cooldown
      
      // Reset form
      setEmail('');
      setValidationError('');
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      // Mapare erori Firebase la mesaje user-friendly
      let errorMessage = 'A apărut o eroare. Te rugăm să încerci din nou.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Nu există cont cu acest email. Verifică adresa introdusă.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email-ul introdus nu este valid.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Prea multe cereri. Te rugăm să încerci din nou mai târziu.';
        setCooldownTime(300); // 5 minute cooldown pentru too many requests
      }
      
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 📧 RETRIMITERE EMAIL
  const handleResendEmail = async () => {
    if (cooldownTime > 0 || !lastEmailSent) return;
    
    setIsLoading(true);
    
    try {
      // Folosește emailul de la ultima trimitere stocată
      const lastEmail = sessionStorage.getItem('resetEmail') || email;
      await security.sendPasswordResetWithLogging(lastEmail);
      
      setCooldownTime(60);
      setAuthError(null);
      
    } catch (error) {
      console.error('❌ Resend password reset error:', error);
      setAuthError('Nu s-a putut retrimite emailul. Te rugăm să încerci din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 FORMATARE TIMP COOLDOWN
  const formatCooldownTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  // 📧 SUCCESS STATE - EMAIL TRIMIS
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* 🏠 HEADER CU LOGO */}
          <div className="text-center mb-4 sm:mb-6">
            <a href="https://blocapp.ro" className="flex items-center justify-center mb-4 hover:opacity-80 transition-opacity">
              <img
                src="/logo-admin.png"
                alt="BlocApp Administratori"
                className="h-16 object-contain"
              />
            </a>
          </div>

          {/* 📋 CARD SUCCESS */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">

            {/* ✅ SUCCESS ICON */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full mb-3">
                <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Email trimis!</h2>
              <p className="text-gray-600 text-sm mt-1">
                Verifică-ți inbox-ul și spam-ul pentru instrucțiunile de resetare
              </p>
            </div>

            {/* 📋 INSTRUCȚIUNI */}
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <h3 className="font-semibold text-blue-900 text-sm mb-1.5">Pași următori:</h3>
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-800">
                <li>Verifică inbox-ul și folderul spam</li>
                <li>Deschide emailul de la BlocApp</li>
                <li>Apasă pe linkul pentru resetare</li>
                <li>Introdu noua parolă</li>
                <li>Conectează-te cu noua parolă</li>
              </ol>
            </div>

            {/* ⏰ COOLDOWN ȘI RETRIMITERE */}
            <div className="text-center mb-4">
              {cooldownTime > 0 ? (
                <div className="flex items-center justify-center text-gray-600">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  <span className="text-xs">
                    Poți retrimite emailul în {formatCooldownTime(cooldownTime)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleResendEmail}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600 mr-1.5"></div>
                      Se retrimite...
                    </span>
                  ) : (
                    'Nu ai primit emailul? Retrimite'
                  )}
                </button>
              )}
            </div>

            {/* 🚨 ERORI LA RETRIMITERE */}
            {authError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 mr-1.5 flex-shrink-0" />
                  <p className="text-red-800 text-xs">{authError}</p>
                </div>
              </div>
            )}

            {/* 🔙 ÎNAPOI LA LOGIN */}
            <button
              onClick={onSwitchToLogin}
              className="w-full bg-gray-100 text-gray-700 py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Înapoi la autentificare
            </button>

            {/* ⚠️ IMPORTANT NOTE */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] sm:text-xs text-gray-500 text-center">
                Linkul de resetare expiră în 24 de ore din motive de securitate
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 📝 FORM STATE - INTRODUCERE EMAIL
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* 🏠 HEADER CU LOGO */}
        <div className="text-center mb-4 sm:mb-6">
          <a href="https://blocapp.ro" className="flex items-center justify-center mb-4 hover:opacity-80 transition-opacity">
            <img
              src="/logo-admin.png"
              alt="BlocApp Administratori"
              className="h-16 object-contain"
            />
          </a>
          <p className="text-gray-500 text-xs">Resetează-ți parola</p>
        </div>

        {/* 📋 CARD PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">

          {/* 🔐 HEADER RESET */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full mb-3">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Resetare parolă</h2>
            <p className="text-gray-600 text-sm mt-1">
              Introdu adresa de email pentru a primi instrucțiunile de resetare
            </p>
          </div>

          {/* 🚨 AFIȘARE ERORI GLOBALE */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800 text-sm">{authError}</p>
              </div>
            </div>
          )}

          {/* ⏰ COOLDOWN WARNING */}
          {cooldownTime > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-yellow-800 font-medium text-sm">Așteaptă între cereri</p>
                  <p className="text-yellow-700 text-xs">
                    Poți trimite o nouă cerere în {formatCooldownTime(cooldownTime)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 📝 FORMULAR */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 📧 EMAIL INPUT */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                Adresa de email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isLoading || cooldownTime > 0}
                  className={`w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationError
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                  } ${(isLoading || cooldownTime > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="nume@exemplu.ro"
                  autoComplete="email"
                />
              </div>
              {validationError && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {validationError}
                </p>
              )}
            </div>

            {/* ℹ️ INFO SECURITATE */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="font-medium text-blue-900 text-sm mb-1.5">Despre procesul de resetare:</h3>
              <ul className="text-xs text-blue-800 space-y-0.5">
                <li>• Vei primi un email cu link securizat</li>
                <li>• Linkul este valid 24 de ore</li>
                <li>• Poți folosi linkul o singură dată</li>
                <li>• După resetare, toate sesiunile vor fi închise</li>
              </ul>
            </div>

            {/* 🚀 BUTON TRIMITERE */}
            <button
              type="submit"
              disabled={isLoading || !email || cooldownTime > 0 || validationError}
              className="w-full bg-blue-600 text-white py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Se trimite emailul...
                </div>
              ) : cooldownTime > 0 ? (
                `Așteaptă ${formatCooldownTime(cooldownTime)}`
              ) : (
                'Trimite email de resetare'
              )}
            </button>
          </form>

          {/* 🔙 ÎNAPOI LA LOGIN */}
          <div className="mt-4 text-center">
            <button
              onClick={onSwitchToLogin}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-800 text-sm transition-colors flex items-center justify-center w-full"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Înapoi la autentificare
            </button>
          </div>

          {/* 🛡️ SECURITATE INFO */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center text-[10px] sm:text-xs text-gray-500">
              <Send className="w-3.5 h-3.5 mr-1" />
              Proces securizat • Logging complet • Rate limiting
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}