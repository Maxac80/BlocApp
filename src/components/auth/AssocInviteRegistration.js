import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  ShieldCheck,
  Loader2,
  UserCheck
} from 'lucide-react';
import { useAuthEnhanced as useAuth } from '../../context/AuthContextEnhanced';
import { useAssocInvitation } from '../../hooks/useAssocInvitation';
import { judeteRomania } from '../../data/counties';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * PAGINA DE ACCEPTARE INVITATIE ASOCIATIE
 *
 * Scenarii:
 * 1. User neautentificat -> Formular register/login + accepta invitatie
 * 2. User autentificat -> Accepta direct invitatia
 * 3. Invitatie invalida/expirata -> Mesaj de eroare
 *
 * URL format: /invite/assoc/{token}
 *
 * Folosește API server-side pentru validare (Vercel).
 * Fallback pe client-side Firestore dacă API-ul nu e disponibil (localhost).
 */
const AssocInviteRegistration = ({ token, onSuccess, onNavigateToLogin }) => {
  const { currentUser, loading: authLoading, signup, login } = useAuth();
  const { acceptInvitation, verifyInvitation } = useAssocInvitation();

  // State pentru verificare invitatie
  const [invitationStatus, setInvitationStatus] = useState('loading');
  const [invitationData, setInvitationData] = useState(null);
  const [associationData, setAssociationData] = useState(null);
  const [errorType, setErrorType] = useState(null);

  // State pentru formular
  const [mode, setMode] = useState('register');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: {
      county: '',
      city: '',
      street: ''
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  // State pentru acceptare
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  // Verifica invitatia (API server-side pe Vercel, fallback client-side pe localhost)
  useEffect(() => {
    // Pe fallback client-side avem nevoie de auth ready
    if (authLoading) return;

    let cancelled = false;

    const checkInvitation = async () => {
      if (!token) {
        setInvitationStatus('invalid');
        setErrorType('NO_TOKEN');
        return;
      }

      try {
        let result = null;

        // 1. Încearcă API server-side (Vercel)
        try {
          const response = await fetch('/api/validate-assoc-invite-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
          }
        } catch (apiErr) {
          console.warn('API not available, trying client-side fallback');
        }

        // 2. Fallback: client-side Firestore (localhost / dev)
        if (!result) {
          console.log('Using client-side verification fallback');
          const clientResult = await verifyInvitation(token);
          if (clientResult.valid) {
            result = {
              valid: true,
              invitation: {
                id: clientResult.invitation.id,
                email: clientResult.invitation.email,
                name: clientResult.invitation.name || '',
                role: clientResult.invitation.role,
                associationId: clientResult.association.id
              },
              association: {
                id: clientResult.association.id,
                name: clientResult.association.name
              }
            };
          } else {
            result = { valid: false, error: clientResult.error };
          }
        }

        if (cancelled) return;

        if (result.valid) {
          setInvitationStatus('valid');
          setInvitationData(result.invitation);
          setAssociationData(result.association);

          // Pre-fill email-ul din invitatie
          setFormData(prev => ({
            ...prev,
            email: result.invitation.email
          }));
        } else {
          setInvitationStatus('invalid');
          setErrorType(result.error || 'VERIFICATION_FAILED');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error verifying invitation:', err);
        setInvitationStatus('invalid');
        setErrorType('VERIFICATION_FAILED');
      }
    };

    checkInvitation();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading]);

  // Daca user-ul e deja autentificat si invitatia e valida, accepta direct
  useEffect(() => {
    if (currentUser && invitationStatus === 'valid' && !accepted && !accepting) {
      handleAcceptInvitation(currentUser.uid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, invitationStatus]);

  // Validare formular
  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Adresa de email nu este valida';
    }

    if (!formData.password) {
      errors.password = 'Parola este obligatorie';
    } else if (formData.password.length < 6) {
      errors.password = 'Parola trebuie sa aiba cel putin 6 caractere';
    }

    if (mode === 'register') {
      if (!formData.firstName.trim()) {
        errors.firstName = 'Prenumele este obligatoriu';
      }
      if (!formData.lastName.trim()) {
        errors.lastName = 'Numele este obligatoriu';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Parolele nu coincid';
      }
      if (!formData.phone.trim()) {
        errors.phone = 'Telefonul este obligatoriu';
      } else if (!/^(\+4|4|0)[0-9]{8,9}$/.test(formData.phone.replace(/\s/g, ''))) {
        errors.phone = 'Numarul de telefon nu este valid (ex: 0721234567)';
      }
      if (!formData.address.county) {
        errors.county = 'Judetul este obligatoriu';
      }
      if (!formData.address.city.trim()) {
        errors.city = 'Localitatea este obligatorie';
      }
      if (!formData.address.street.trim()) {
        errors.street = 'Strada este obligatorie';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler pentru acceptare invitatie
  const handleAcceptInvitation = async (userId) => {
    if (!userId) return;

    setAccepting(true);
    setAcceptError(null);

    try {
      const result = await acceptInvitation(token, userId);
      setAccepted(true);

      // Redirect dupa 2 secunde
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
        const userCredential = await signup(
          formData.email,
          formData.password,
          `${formData.firstName} ${formData.lastName}`
        );
        userId = userCredential.user.uid;

        // Salveaza datele de profil (aceleasi ca onboarding ProfileStep)
        // needsOnboarding: false - datele au fost completate la invite registration
        await setDoc(doc(db, 'users', userId), {
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          phone: formData.phone.trim(),
          needsOnboarding: false,
          onboardingCompletedAt: new Date().toISOString(),
          profile: {
            personalInfo: {
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
              phone: formData.phone.trim(),
              address: {
                street: formData.address.street.trim(),
                city: formData.address.city.trim(),
                county: formData.address.county
              }
            }
          }
        }, { merge: true });
      } else {
        const userCredential = await login(formData.email, formData.password);
        userId = userCredential.user.uid;
      }

      // Accepta invitatia
      await handleAcceptInvitation(userId);
    } catch (err) {
      console.error('Auth error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setFormErrors({ email: 'Acest email este deja folosit. Incercati sa va autentificati.' });
        setMode('login');
      } else if (err.code === 'auth/wrong-password') {
        setFormErrors({ password: 'Parola incorecta' });
      } else if (err.code === 'auth/user-not-found') {
        setFormErrors({ email: 'Nu exista un cont cu acest email. Creati un cont nou.' });
        setMode('register');
      } else {
        setFormErrors({ general: err.message || 'A aparut o eroare' });
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Rol label helper
  const getRoleLabel = (role) => {
    switch (role) {
      case 'assoc_admin': return 'Administrator';
      case 'assoc_president': return 'Presedinte';
      case 'assoc_censor': return 'Cenzor';
      default: return 'Membru';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'assoc_admin': return ShieldCheck;
      case 'assoc_president': return UserCheck;
      case 'assoc_censor': return Shield;
      default: return User;
    }
  };

  // Componenta pentru eroare invitatie
  const InvalidInvitation = () => {
    const errorConfig = {
      NO_TOKEN: {
        icon: AlertCircle,
        title: 'Link invalid',
        message: 'Link-ul de invitatie nu este valid.',
        color: 'text-yellow-600 bg-yellow-100'
      },
      INVITATION_NOT_FOUND: {
        icon: XCircle,
        title: 'Invitatie negasita',
        message: 'Aceasta invitatie nu exista sau a fost stearsa.',
        color: 'text-red-600 bg-red-100'
      },
      INVITATION_EXPIRED: {
        icon: Clock,
        title: 'Invitatie expirata',
        message: 'Aceasta invitatie a expirat. Contacteaza administratorul pentru o invitatie noua.',
        color: 'text-orange-600 bg-orange-100'
      },
      INVITATION_CANCELLED: {
        icon: XCircle,
        title: 'Invitatie anulata',
        message: 'Aceasta invitatie a fost anulata de administrator.',
        color: 'text-red-600 bg-red-100'
      },
      INVITATION_ACCEPTED: {
        icon: CheckCircle,
        title: 'Invitatie deja folosita',
        message: 'Aceasta invitatie a fost deja acceptata.',
        color: 'text-blue-600 bg-blue-100'
      },
      VERIFICATION_FAILED: {
        icon: AlertCircle,
        title: 'Eroare verificare',
        message: 'Nu s-a putut verifica invitatia. Incearca din nou mai tarziu.',
        color: 'text-gray-600 bg-gray-100'
      },
      default: {
        icon: AlertCircle,
        title: 'Eroare',
        message: 'A aparut o eroare la verificarea invitatiei.',
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
  const SuccessState = () => {
    const RoleIcon = getRoleIcon(invitationData?.role);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Bine ai venit!
          </h1>

          <p className="text-gray-600 mb-4">
            Ai fost adaugat cu succes in asociatia <strong>{associationData?.name}</strong>.
          </p>

          <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
            <RoleIcon className="w-5 h-5 mr-2 text-blue-600" />
            Rol: {getRoleLabel(invitationData?.role)}
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Vei fi redirectionat in cateva secunde...
          </p>
        </div>
      </div>
    );
  };

  // Loading state
  if (invitationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se verifica invitatia...</p>
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

  // User autentificat - acceptare in curs
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {accepting ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Se proceseaza invitatia...</p>
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
                Incearca din nou
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(invitationData?.role);

  // Input class helper (same as onboarding ProfileStep)
  const inputClass = (hasError) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

  // Formular register/login
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header cu info asociatie */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center">
            Ai fost invitat in asociatia
          </h1>
          <p className="text-2xl font-bold text-center mt-1">
            {associationData?.name}
          </p>
          <div className="flex items-center justify-center mt-3">
            <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
              <RoleIcon className="w-4 h-4 mr-1" />
              Rol: {getRoleLabel(invitationData?.role)}
            </span>
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
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700">{formErrors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' ? (
              <>
                {/* ========== DATE PERSONALE (same as ProfileStep) ========== */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center text-sm">
                    <User className="w-4 h-4 mr-2" />
                    Date personale
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Prenume */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prenume <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={inputClass(formErrors.firstName)}
                        placeholder="Ion"
                      />
                      {formErrors.firstName && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.firstName}
                        </p>
                      )}
                    </div>

                    {/* Nume */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nume <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={inputClass(formErrors.lastName)}
                        placeholder="Popescu"
                      />
                      {formErrors.lastName && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.lastName}
                        </p>
                      )}
                    </div>

                    {/* Email (read-only, pre-filled) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email-ul nu poate fi modificat</p>
                    </div>

                    {/* Telefon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={inputClass(formErrors.phone)}
                        placeholder="0721234567"
                      />
                      {formErrors.phone && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========== ADRESA (same as ProfileStep) ========== */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    Adresa de domiciliu
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Judetul */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Județul <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.address.county}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, county: e.target.value }
                        })}
                        className={inputClass(formErrors.county)}
                      >
                        <option value="">Selecteaza judetul</option>
                        {judeteRomania.map(county => (
                          <option key={county.cod} value={county.nume}>
                            {county.nume}
                          </option>
                        ))}
                      </select>
                      {formErrors.county && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.county}
                        </p>
                      )}
                    </div>

                    {/* Localitatea */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Localitatea <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value }
                        })}
                        className={inputClass(formErrors.city)}
                        placeholder="Bucuresti, Ploiesti, etc."
                      />
                      {formErrors.city && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.city}
                        </p>
                      )}
                    </div>

                    {/* Strada - full width */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Strada si numarul <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value }
                        })}
                        className={inputClass(formErrors.street)}
                        placeholder="Strada Exemplu nr. 123A"
                      />
                      {formErrors.street && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.street}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========== PAROLA (register) ========== */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center text-sm">
                    <Lock className="w-4 h-4 mr-2" />
                    Securitate cont
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Parola */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parola <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className={`w-full px-3 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                            formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Min 6 caractere"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirma parola */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirma parola <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`w-full px-3 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                            formErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Rescrie parola"
                        />
                      </div>
                      {formErrors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* ========== LOGIN MODE ========== */}
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass(formErrors.email)}
                    placeholder="email@exemplu.ro"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Parola */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parola <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-3 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                        formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Parola ta"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {formErrors.password}
                    </p>
                  )}
                </div>
              </>
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
                  Se proceseaza...
                </>
              ) : (
                <>
                  {mode === 'register' ? 'Creaza cont si accepta' : 'Autentifica-te si accepta'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssocInviteRegistration;
