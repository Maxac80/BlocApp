import React, { useState, useEffect } from 'react';
import { Building2, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Home, Mail } from 'lucide-react';
import { useOwnerInvitation } from '../../hooks/useOwnerInvitation';

/**
 * Pagina de înregistrare pentru proprietari invitați
 *
 * Flow:
 * 1. Proprietar click pe magic link → /invite/{token}
 * 2. Token validat → afișează datele + formular parolă
 * 3. Proprietar setează parola → cont creat → redirect la portal
 */
export default function OwnerInviteRegistration({ token }) {
  const { validateToken, completeRegistration, loading } = useOwnerInvitation();

  const [validationState, setValidationState] = useState('loading'); // loading, valid, invalid, already-active
  const [owner, setOwner] = useState(null);
  const [validationError, setValidationError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Validează token-ul la mount
  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setValidationState('invalid');
        setValidationError('Link invalid. Verifică dacă ai copiat link-ul corect.');
        return;
      }

      const result = await validateToken(token);

      if (result.valid) {
        setValidationState('valid');
        setOwner(result.owner);
      } else if (result.alreadyActive) {
        setValidationState('already-active');
        setValidationError(result.error);
      } else {
        setValidationState('invalid');
        setValidationError(result.error);
      }
    };

    validate();
  }, [token]);

  // Validare parolă
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' };

    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, label: 'Slabă', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Medie', color: 'bg-yellow-500' };
    return { score, label: 'Puternică', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const canSubmit = password.length >= 6 && passwordsMatch && !loading;

  // Handler pentru înregistrare
  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegistrationError('');

    if (!canSubmit) return;

    const result = await completeRegistration(token, password);

    if (result.success) {
      setRegistrationSuccess(true);
      // Redirect după 2 secunde
      setTimeout(() => {
        window.location.href = process.env.NODE_ENV === 'production'
          ? 'https://portal.blocapp.ro'
          : 'http://localhost:3000?mode=owner';
      }, 2000);
    } else {
      setRegistrationError(result.error);
    }
  };

  // Loading state
  if (validationState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Se verifică invitația...</h2>
          <p className="text-gray-600">Te rugăm să aștepți.</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (validationState === 'invalid') {
    // Detectează tipul erorii pentru debug
    const isServerError = validationError?.includes('server') ||
                          validationError?.includes('Configurare') ||
                          validationError?.includes('credențiale');

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isServerError ? 'Eroare server' : 'Invitație invalidă'}
          </h2>
          <p className="text-gray-600 mb-6">{validationError}</p>
          <p className="text-sm text-gray-500">
            {isServerError
              ? 'Te rugăm să încerci din nou mai târziu sau contactează suportul tehnic.'
              : 'Contactează administratorul asociației pentru a primi o nouă invitație.'}
          </p>
          {/* Debug info pentru development */}
          <p className="text-xs text-gray-400 mt-4">
            Token: {token?.substring(0, 20)}...
          </p>
        </div>
      </div>
    );
  }

  // Already active state
  if (validationState === 'already-active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cont deja activ</h2>
          <p className="text-gray-600 mb-6">{validationError}</p>
          <a
            href={process.env.NODE_ENV === 'production' ? 'https://portal.blocapp.ro' : 'http://localhost:3000?mode=owner'}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Accesează Portalul
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cont creat cu succes!</h2>
          <p className="text-gray-600 mb-4">Vei fi redirecționat către portalul proprietarilor...</p>
          <Loader2 className="w-6 h-6 text-green-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Valid token - show registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bine ai venit în BlocApp!</h1>
          <p className="text-gray-600">Finalizează înregistrarea pentru a accesa portalul proprietarilor.</p>
        </div>

        {/* Owner Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center mb-3">
            <Mail className="w-5 h-5 text-gray-500 mr-2" />
            <span className="text-gray-900 font-medium">{owner?.email}</span>
          </div>

          {owner?.associations?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Apartamentele tale:</p>
              {owner.associations.map((assoc, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="font-medium text-gray-900 text-sm">{assoc.associationName}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {assoc.apartments.map((apt, aptIdx) => (
                      <span
                        key={aptIdx}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        <Home className="w-3 h-3 mr-1" />
                        Ap. {apt.number}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setează parola
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minim 6 caractere"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.score <= 2 ? 'text-red-600' :
                  passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  Putere parolă: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmă parola
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetă parola"
                className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {confirmPassword && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-600 mt-1">Parolele nu coincid</p>
            )}
          </div>

          {/* Error message */}
          {registrationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{registrationError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
              canSubmit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Se creează contul...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Finalizează înregistrarea
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Prin finalizarea înregistrării, ești de acord cu{' '}
          <a href="/terms" className="text-blue-600 hover:underline">Termenii și Condițiile</a>
          {' '}BlocApp.
        </p>
      </div>
    </div>
  );
}
