import React, { useState } from 'react';
import {
  Eye, EyeOff, Lock, Mail, AlertCircle, Home
} from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';

/**
 * Landing Page pentru Portal Proprietari
 *
 * Features:
 * - Formular login standard
 * - Proprietarii se loghează cu email și parola setată la înregistrare
 */
export default function OwnerLandingPage() {
  const { loginEnhanced, authError, setAuthError } = useAuthEnhanced();

  // State pentru login
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Handler pentru input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: inputValue }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (authError) {
      setAuthError(null);
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
      await loginEnhanced(formData.email.trim(), formData.password, formData.rememberMe);
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
        <div className="text-center mb-4 sm:mb-6">
          <a href="https://blocapp.ro" className="flex items-center justify-center space-x-2 mb-6 hover:opacity-80 transition-opacity">
            <img
              src="/icon-portal.png"
              alt="BlocApp"
              className="w-20 h-20 object-contain"
            />
            <div className="flex flex-col items-start pt-3">
              <span className="text-5xl font-bold text-gray-800 leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>BlocApp</span>
              <span className="text-sm text-gray-600 mt-0 pl-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>proprietari</span>
            </div>
          </a>
          <p className="text-gray-600 text-sm">Acces rapid la informațiile apartamentului tău</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">

          {/* Header Login */}
          <div className="text-center mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Autentificare</h2>
            <p className="text-gray-600 text-sm mt-1">Conectează-te la contul tău de proprietar/locatar</p>
          </div>

          {/* Erori globale */}
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800 text-sm">{authError}</p>
              </div>
            </div>
          )}

          {/* Formular Login */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
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
                  disabled={isLoading}
                  className={`w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="email@exemplu.ro"
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

            {/* Password */}
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
                  disabled={isLoading}
                  className={`w-full pl-9 pr-10 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Parola ta"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

            {/* Remember Me și Link Resetare Parolă */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="rememberMe" className="ml-2 text-xs text-gray-700">
                  Ține-mă conectat
                </label>
              </div>

              <a
                href="/"
                className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                Am uitat parola
              </a>
            </div>

            {/* Buton Login */}
            <button
              type="submit"
              disabled={isLoading || !formData.email || !formData.password}
              className="w-full bg-emerald-600 text-white py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-[10px] sm:text-xs mt-4">
          Ești proprietar? Contactează administratorul asociației tale.<br />
          Ești locatar? Solicită proprietarului acces la apartament.
        </p>
      </div>

    </div>
  );
}
