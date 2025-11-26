import React, { useState } from 'react';
import {
  Eye, EyeOff, Lock, Mail, AlertCircle, Home, Building2, Loader2
} from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Landing Page pentru Portal Proprietari
 *
 * Features:
 * - Formular login standard
 * - Buton "Treci peste" pentru development - caută apartamentul în Firebase după email
 */
export default function OwnerLandingPage({ onDevModeSelect, onBypassSearch, isFirebaseAuthenticated }) {
  const { loginEnhanced, authError, setAuthError } = useAuthEnhanced();

  // State pentru login
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // State pentru bypass (development)
  const [bypassLoading, setBypassLoading] = useState(false);
  const [bypassError, setBypassError] = useState(null);

  // Handler pentru "Treci peste" - folosește hardcode pentru development
  // Firebase Auth nu e shared între porturi, deci folosim mapping local
  const handleDevBypass = async () => {
    const email = formData.email.trim();

    if (!email) {
      setBypassError('Introdu adresa de email pentru a continua');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setBypassError('Adresa de email nu este validă');
      return;
    }

    setBypassLoading(true);
    setBypassError(null);

    // Mapping hardcodat pentru development
    // useOwnerData.js va căuta în maintenanceTable după apartmentNumber
    const devMapping = {
      'misu@blocapp.ro': {
        apartmentId: '3',  // Folosim NUMBER, nu ID - useOwnerData face match pe apartmentNumber
        apartmentNumber: '3',
        apartmentData: {
          id: '3',
          number: 3,
          owner: 'Liviu',
          email: 'misu@blocapp.ro'
        },
        associationId: 'Jr6titqAa2hYxeRhwvGJ',  // ID-ul REAL din Firebase
        associationName: 'Vulturul B4',
        associationData: {
          id: 'Jr6titqAa2hYxeRhwvGJ',
          name: 'Vulturul B4'
        }
      }
    };

    const apartmentInfo = devMapping[email.toLowerCase()];

    if (apartmentInfo) {
      console.log('[OwnerLandingPage] DEV BYPASS - Apartament găsit:', apartmentInfo);
      if (onDevModeSelect) {
        onDevModeSelect(apartmentInfo);
      }
    } else {
      setBypassError(`Email-ul "${email}" nu este configurat. Folosește: liviu@blocapp.ro`);
    }

    setBypassLoading(false);
  };

  // Handler pentru input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (authError) {
      setAuthError(null);
    }
    if (bypassError) {
      setBypassError(null);
    }
  };

  // Validare formular
  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email-ul este obligatoriu';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email-ul nu este valid';
    }
    if (!formData.password.trim()) {
      errors.password = 'Parola este obligatorie';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit login
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await loginEnhanced(formData.email.trim(), formData.password, false);
      // Success-ul va fi gestionat de App.js care verifică rolul
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header cu Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-xl mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BlocApp</h1>
          <p className="text-gray-600 mt-2">Portal Proprietari</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">

          {/* Header Login */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Autentificare</h2>
            <p className="text-gray-600 mt-1">Conectează-te la contul tău</p>
          </div>

          {/* Erori globale */}
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800">{authError}</p>
              </div>
            </div>
          )}

          {/* Formular Login */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading || bypassLoading}
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                  } ${isLoading || bypassLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="email@exemplu.ro"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Parolă
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading || bypassLoading}
                  className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                  } ${isLoading || bypassLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Parola ta"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Buton Login */}
            <button
              type="submit"
              disabled={isLoading || bypassLoading || !formData.email || !formData.password}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Se conectează...
                </div>
              ) : (
                'Conectează-te'
              )}
            </button>
          </form>

          {/* Separator */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">sau</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Eroare bypass */}
          {bypassError && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-orange-800">{bypassError}</p>
              </div>
            </div>
          )}

          {/* Status Firebase */}
          {isFirebaseAuthenticated && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 text-center">
                ✓ Firebase conectat (sesiune admin)
              </p>
            </div>
          )}

          {/* Buton "Treci peste" pentru Development */}
          <button
            onClick={handleDevBypass}
            disabled={bypassLoading || isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
              isFirebaseAuthenticated
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {bypassLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Se caută în Firebase...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5 mr-2" />
                Caută apartament (Development)
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-2">
            Introdu email-ul proprietarului și apasă pentru a căuta în Firebase
          </p>

        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Nu ai cont? Contactează administratorul asociației tale.
        </p>
      </div>

    </div>
  );
}
