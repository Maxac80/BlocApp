import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle, Shield, Clock } from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';

/**
 * 🔑 FORMULER LOGIN AVANSAT CU SECURITATE MAXIMĂ
 * 
 * Features:
 * - Validări în timp real
 * - Afișare încercări rămase
 * - Remember me cu persistare
 * - Indicators vizuali pentru securitate
 * - Device nou detection
 * - Block timer pentru prea multe încercări
 */
export default function LoginForm({ onSuccess, onSwitchToRegister, onSwitchToReset, onDevOwnerMode }) {
  const { loginEnhanced, authError, setAuthError, security } = useAuthEnhanced();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // ⏰ COUNTDOWN PENTRU BLOCARE
  useEffect(() => {
    let interval = null;
    if (blockTimeRemaining > 0) {
      interval = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [blockTimeRemaining]);

  // 🔍 VERIFICARE LIMITĂRI LOGIN LA SCHIMBAREA EMAIL-ULUI
  useEffect(() => {
    const checkLimitations = async () => {
      if (formData.email && formData.email.includes('@')) {
        const result = await security.checkLoginAttempts(formData.email);
        if (result.blocked) {
          setIsBlocked(true);
          setBlockTimeRemaining(Math.ceil(result.remainingTime / 1000));
        } else {
          setLoginAttempts(result.attempts);
          setIsBlocked(false);
        }
      }
    };

    const debounceTimer = setTimeout(checkLimitations, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.email, security]);

  // 📝 GESTIONARE SCHIMBĂRI INPUT
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: inputValue
    }));
    
    // Șterge eroarea pentru câmpul curent
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Șterge eroarea globală
    if (authError) {
      setAuthError(null);
    }
  };

  // ✅ VALIDARE FORMULAR
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email-ul este obligatoriu';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email-ul nu este valid';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Parola este obligatorie';
    } else if (formData.password.length < 6) {
      errors.password = 'Parola trebuie să aibă minim 6 caractere';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 🚀 SUBMIT FORMULAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (isBlocked) return;
    
    setIsLoading(true);
    
    try {
      const result = await loginEnhanced(
        formData.email.trim(),
        formData.password,
        formData.rememberMe
      );

      // NU resetăm formularul - lăsăm Chrome să captureze credențialele
      // Componenta se va unmount oricum după login reușit

      if (onSuccess) {
        onSuccess(result);
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      // Error-ul este gestionat automat de AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 FORMATARE TIMP RĂMAS
  const formatBlockTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 🎯 CALCUL CULOARE PROGRESS BAR ÎNCERCĂRI
  const getAttemptsColor = () => {
    if (loginAttempts <= 1) return 'bg-green-500';
    if (loginAttempts <= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* 🏠 HEADER CU LOGO */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <img
              src="/icon-admin.png"
              alt="BlocApp"
              className="w-20 h-20 object-contain"
            />
            <span className="text-5xl font-bold text-gray-800 pt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>BlocApp</span>
          </div>
          <p className="text-gray-600 text-sm mt-1">Administrarea eficientă a asociațiilor de proprietari</p>
        </div>

        {/* 📋 CARD PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">

          {/* 🔐 HEADER LOGIN */}
          <div className="text-center mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Autentificare</h2>
            <p className="text-gray-600 text-sm mt-1">Conectează-te la contul tău</p>
          </div>

          {/* ⚠️ AFIȘARE BLOCARE */}
          {isBlocked && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-semibold text-sm">Cont temporar blocat</p>
                  <p className="text-red-600 text-xs">
                    Prea multe încercări eșuate. Încearcă din nou în {formatBlockTime(blockTimeRemaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 📊 AFIȘARE ÎNCERCĂRI RĂMASE */}
          {!isBlocked && loginAttempts > 0 && (
            <div className="mb-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="w-3.5 h-3.5 text-yellow-600 mr-1.5" />
                  <span className="text-yellow-800 text-xs font-medium">
                    {5 - loginAttempts} încercări rămase
                  </span>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${getAttemptsColor()}`}
                    style={{ width: `${((5 - loginAttempts) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* 🚨 AFIȘARE ERORI GLOBALE */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800 text-sm">{authError}</p>
              </div>
            </div>
          )}

          {/* 📝 FORMULAR */}
          <form onSubmit={handleSubmit} method="post" className="space-y-4">

            {/* 📧 EMAIL INPUT */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading || isBlocked}
                  className={`w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationErrors.email
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                  } ${(isLoading || isBlocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="nume@exemplu.ro"
                  autoComplete="email"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* 🔒 PASSWORD INPUT */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
                Parolă
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading || isBlocked}
                  className={`w-full pl-9 pr-10 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    validationErrors.password
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                  } ${(isLoading || isBlocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Parola ta"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isBlocked}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* ✅ REMEMBER ME */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={isLoading || isBlocked}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-xs text-gray-700">
                  Ține-mă conectat
                </label>
              </div>

              <button
                type="button"
                onClick={onSwitchToReset}
                disabled={isLoading}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Am uitat parola
              </button>
            </div>

            {/* 🚀 BUTON LOGIN */}
            <button
              type="submit"
              disabled={isLoading || isBlocked || !formData.email || !formData.password}
              className="w-full bg-blue-600 text-white py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Se conectează...
                </div>
              ) : (
                'Conectează-te'
              )}
            </button>
          </form>

          {/* 🔗 LINK ÎNREGISTRARE */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Nu ai cont încă?{' '}
              <button
                onClick={onSwitchToRegister}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                Înregistrează-te
              </button>
            </p>
          </div>

          {/* 🛡️ SECURITATE INFO */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center text-[10px] sm:text-xs text-gray-500">
              <Shield className="w-3.5 h-3.5 mr-1" />
              Conexiune securizată SSL • Device tracking • Audit logging
            </div>
          </div>
        </div>

        {/* 🔧 DEV MODE: Portal Proprietari - doar în development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-xs text-emerald-700 text-center mb-2">
              Mod dezvoltare - Testare Portal Proprietari
            </p>
            <button
              onClick={() => {
                // Redirect la Owner Portal mode - va cere login dacă nu e autentificat
                window.location.href = window.location.pathname + '?mode=owner';
              }}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Deschide Portal Proprietari (Dev)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}