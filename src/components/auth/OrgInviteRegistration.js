import React, { useState, useEffect } from 'react';
import {
  Building2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrgInvitation } from '../../hooks/useOrgInvitation';

/**
 * 🎫 PAGINA DE ACCEPTARE INVITAȚIE ORGANIZAȚIE
 *
 * Scenarii:
 * 1. User neautentificat → Arată formular register/login + acceptă invitație
 * 2. User autentificat → Acceptă direct invitația
 * 3. Invitație invalidă/expirată → Arată mesaj de eroare
 *
 * URL format: /invite/{token}
 */
const OrgInviteRegistration = ({ token, onSuccess, onNavigateToLogin }) => {
  const { currentUser, signup, login } = useAuth();
  const { verifyInvitation, acceptInvitation, loading: invLoading } = useOrgInvitation();

  // State pentru verificare invitație
  const [invitationStatus, setInvitationStatus] = useState('loading'); // loading, valid, invalid
  const [invitationData, setInvitationData] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);
  const [errorType, setErrorType] = useState(null);

  // State pentru formular
  const [mode, setMode] = useState('register'); // register, login
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  // State pentru acceptare
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  // Verifică invitația la mount
  useEffect(() => {
    const checkInvitation = async () => {
      if (!token) {
        setInvitationStatus('invalid');
        setErrorType('NO_TOKEN');
        return;
      }

      try {
        const result = await verifyInvitation(token);

        if (result.valid) {
          setInvitationStatus('valid');
          setInvitationData(result.invitation);
          setOrganizationData(result.organization);

          // Pre-fill email-ul din invitație
          setFormData(prev => ({
            ...prev,
            email: result.invitation.email
          }));
        } else {
          setInvitationStatus('invalid');
          setErrorType(result.error);
        }
      } catch (err) {
        console.error('Error verifying invitation:', err);
        setInvitationStatus('invalid');
        setErrorType('VERIFICATION_FAILED');
      }
    };

    checkInvitation();
  }, [token, verifyInvitation]);

  // Dacă user-ul e deja autentificat, acceptă direct
  useEffect(() => {
    const autoAccept = async () => {
      if (currentUser && invitationStatus === 'valid' && !accepted && !accepting) {
        await handleAcceptInvitation();
      }
    };

    autoAccept();
  }, [currentUser, invitationStatus]);

  // Validare formular
  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Adresa de email nu este validă';
    }

    if (!formData.password) {
      errors.password = 'Parola este obligatorie';
    } else if (formData.password.length < 6) {
      errors.password = 'Parola trebuie să aibă cel puțin 6 caractere';
    }

    if (mode === 'register') {
      if (!formData.firstName) {
        errors.firstName = 'Prenumele este obligatoriu';
      }
      if (!formData.lastName) {
        errors.lastName = 'Numele este obligatoriu';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Parolele nu coincid';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler pentru acceptare invitație
  const handleAcceptInvitation = async (userId = currentUser?.uid) => {
    if (!userId) return;

    setAccepting(true);
    setAcceptError(null);

    try {
      const result = await acceptInvitation(token, userId);
      setAccepted(true);

      // Redirect după 2 secunde
      setTimeout(() => {
        onSuccess && onSuccess(result);
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setAcceptError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  // Handler pentru submit formular
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormLoading(true);
    setFormErrors({});

    try {
      let userId;

      if (mode === 'register') {
        // Înregistrare
        const userCredential = await signup(
          formData.email,
          formData.password,
          `${formData.firstName} ${formData.lastName}`
        );
        userId = userCredential.user.uid;
      } else {
        // Login
        const userCredential = await login(formData.email, formData.password);
        userId = userCredential.user.uid;
      }

      // Acceptă invitația
      await handleAcceptInvitation(userId);
    } catch (err) {
      console.error('Auth error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setFormErrors({ email: 'Acest email este deja folosit. Încercați să vă autentificați.' });
        setMode('login');
      } else if (err.code === 'auth/wrong-password') {
        setFormErrors({ password: 'Parolă incorectă' });
      } else if (err.code === 'auth/user-not-found') {
        setFormErrors({ email: 'Nu există un cont cu acest email. Creați un cont nou.' });
        setMode('register');
      } else {
        setFormErrors({ general: err.message || 'A apărut o eroare' });
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Componenta pentru eroare invitație
  const InvalidInvitation = () => {
    const errorConfig = {
      NO_TOKEN: {
        icon: AlertCircle,
        title: 'Link invalid',
        message: 'Link-ul de invitație nu este valid.',
        color: 'text-yellow-600 bg-yellow-100'
      },
      INVITATION_NOT_FOUND: {
        icon: XCircle,
        title: 'Invitație negăsită',
        message: 'Această invitație nu există sau a fost ștearsă.',
        color: 'text-red-600 bg-red-100'
      },
      INVITATION_EXPIRED: {
        icon: Clock,
        title: 'Invitație expirată',
        message: 'Această invitație a expirat. Contactează administratorul pentru o invitație nouă.',
        color: 'text-orange-600 bg-orange-100'
      },
      INVITATION_CANCELLED: {
        icon: XCircle,
        title: 'Invitație anulată',
        message: 'Această invitație a fost anulată de administrator.',
        color: 'text-red-600 bg-red-100'
      },
      INVITATION_ACCEPTED: {
        icon: CheckCircle,
        title: 'Invitație deja folosită',
        message: 'Această invitație a fost deja acceptată.',
        color: 'text-blue-600 bg-blue-100'
      },
      default: {
        icon: AlertCircle,
        title: 'Eroare',
        message: 'A apărut o eroare la verificarea invitației.',
        color: 'text-gray-600 bg-gray-100'
      }
    };

    const config = errorConfig[errorType] || errorConfig.default;
    const Icon = config.icon;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 ${config.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <Icon className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {config.title}
          </h1>

          <p className="text-gray-600 mb-8">
            {config.message}
          </p>

          <button
            onClick={onNavigateToLogin}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Mergi la Login
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Componenta pentru succes
  const SuccessState = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Bine ai venit în echipă!
        </h1>

        <p className="text-gray-600 mb-4">
          Ai fost adăugat cu succes în <strong>{organizationData?.name}</strong>.
        </p>

        <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
          {invitationData?.role === 'org_admin' ? (
            <>
              <ShieldCheck className="w-5 h-5 mr-2 text-purple-600" />
              Rol: Administrator
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Rol: Membru
            </>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Vei fi redirecționat în câteva secunde...
        </p>
      </div>
    </div>
  );

  // Loading state
  if (invitationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se verifică invitația...</p>
        </div>
      </div>
    );
  }

  // Invalid invitation
  if (invitationStatus === 'invalid') {
    return <InvalidInvitation />;
  }

  // Succes
  if (accepted) {
    return <SuccessState />;
  }

  // User autentificat - acceptare în curs
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {accepting ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Se procesează invitația...</p>
            </>
          ) : acceptError ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                Eroare la acceptare
              </h1>
              <p className="text-gray-600 mb-6">{acceptError}</p>
              <button
                onClick={() => handleAcceptInvitation(currentUser.uid)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Încearcă din nou
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // Formular register/login
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header cu info organizație */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center">
            Ai fost invitat în
          </h1>
          <p className="text-2xl font-bold text-center mt-1">
            {organizationData?.name}
          </p>
          <div className="flex items-center justify-center mt-3">
            {invitationData?.role === 'org_admin' ? (
              <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                <ShieldCheck className="w-4 h-4 mr-1" />
                Rol: Administrator
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                <Shield className="w-4 h-4 mr-1" />
                Rol: Membru
              </span>
            )}
          </div>
        </div>

        {/* Formular */}
        <div className="p-6">
          {/* Toggle register/login */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cont nou
            </button>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Am deja cont
            </button>
          </div>

          {/* Error general */}
          {formErrors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{formErrors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nume (doar register) */}
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prenume
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.firstName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ion"
                    />
                  </div>
                  {formErrors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nume
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Popescu"
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.lastName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="email@exemplu.ro"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>

            {/* Parolă */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parolă
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
              )}
            </div>

            {/* Confirmare parolă (doar register) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmă parola
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Se procesează...
                </>
              ) : (
                <>
                  {mode === 'register' ? 'Creează cont și acceptă' : 'Autentifică-te și acceptă'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Mesaj invitație */}
          {invitationData?.message && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Mesaj de la administrator:</p>
              <p className="text-gray-700 italic">"{invitationData.message}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgInviteRegistration;
