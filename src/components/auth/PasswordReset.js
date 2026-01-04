import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../firebase';

/**
 * 🔐 PAGINĂ RESETARE PAROLĂ
 *
 * Formular pentru introducerea parolei noi după click pe link-ul din email
 *
 * Features:
 * - Verifică validitatea codului oobCode
 * - Formular cu validare parolă
 * - Confirmare parolă
 * - Feedback vizual pentru cerințe parolă
 */
export default function PasswordReset({ oobCode }) {
  const [status, setStatus] = useState('verifying'); // verifying, form, success, error
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Verifică validitatea codului la încărcare
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setStatus('error');
        setErrorMessage('Link invalid. Te rugăm să soliciți un nou link de resetare.');
        return;
      }

      try {
        // Verifică codul și obține email-ul asociat
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setStatus('form');
      } catch (error) {
        console.error('Password reset code verification error:', error);
        setStatus('error');

        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('Link-ul de resetare a expirat sau a fost deja folosit.');
        } else if (error.code === 'auth/expired-action-code') {
          setErrorMessage('Link-ul de resetare a expirat. Te rugăm să soliciți unul nou.');
        } else {
          setErrorMessage('A apărut o eroare. Te rugăm să soliciți un nou link de resetare.');
        }
      }
    };

    verifyCode();
  }, [oobCode]);

  // Validare cerințe parolă
  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password)
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Submit resetare parolă
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid || !passwordsMatch) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (error) {
      console.error('Password reset error:', error);

      if (error.code === 'auth/weak-password') {
        setErrorMessage('Parola este prea slabă. Te rugăm să alegi o parolă mai puternică.');
      } else if (error.code === 'auth/invalid-action-code') {
        setErrorMessage('Link-ul a expirat. Te rugăm să soliciți un nou link de resetare.');
      } else {
        setErrorMessage('A apărut o eroare. Te rugăm să încerci din nou.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state - verificare cod
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-amber-600 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Se verifică link-ul...</h1>
          <p className="text-gray-600">Te rugăm să aștepți câteva secunde.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link invalid</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Înapoi la autentificare
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          {/* Header cu logo */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4">
              <img
                src="/logo.png"
                alt="BlocApp"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          {/* Mesaj succes */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Parolă resetată cu succes!
            </h1>
            <p className="text-gray-600">
              Parola ta a fost schimbată. Acum te poți autentifica cu noua parolă.
            </p>
          </div>

          {/* Buton login */}
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
          >
            Mergi la autentificare
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            © {new Date().getFullYear()} BlocApp. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    );
  }

  // Form state - formular resetare parolă
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header cu logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <img
              src="/logo.png"
              alt="BlocApp"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600">Resetare parolă</p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Parolă nouă</h2>
            <p className="text-gray-600 mt-2 text-sm">
              pentru <span className="font-medium text-amber-600">{email}</span>
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm text-center">{errorMessage}</p>
            </div>
          )}

          {/* Formular */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parolă nouă */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parolă nouă
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Introdu parola nouă"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Cerințe parolă */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-gray-700 mb-2">Cerințe parolă:</p>
              <div className="grid grid-cols-2 gap-1">
                <RequirementItem met={passwordRequirements.length} text="Min. 8 caractere" />
                <RequirementItem met={passwordRequirements.uppercase} text="Literă mare" />
                <RequirementItem met={passwordRequirements.lowercase} text="Literă mică" />
                <RequirementItem met={passwordRequirements.number} text="Cifră" />
              </div>
            </div>

            {/* Confirmare parolă */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmă parola
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-300 bg-red-50'
                      : confirmPassword && passwordsMatch
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                  }`}
                  placeholder="Confirmă parola nouă"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-red-600 text-xs mt-1">Parolele nu coincid</p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-green-600 text-xs mt-1">Parolele coincid</p>
              )}
            </div>

            {/* Buton submit */}
            <button
              type="submit"
              disabled={!isPasswordValid || !passwordsMatch || isSubmitting}
              className="w-full bg-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Se salvează...
                </div>
              ) : (
                'Salvează parola nouă'
              )}
            </button>
          </form>

          {/* Link înapoi */}
          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm text-gray-500 hover:text-amber-600 transition-colors"
            >
              Înapoi la autentificare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componenta pentru afișarea cerințelor parolă
function RequirementItem({ met, text }) {
  return (
    <div className={`flex items-center text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
      <CheckCircle className={`w-3 h-3 mr-1 ${met ? 'text-green-500' : 'text-gray-300'}`} />
      {text}
    </div>
  );
}
