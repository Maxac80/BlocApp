import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Mail,
  User,
  Shield,
  ShieldCheck,
  UserCheck,
  Send,
  AlertCircle,
  CheckCircle,
  Info,
  Copy,
  Check
} from 'lucide-react';

/**
 * MODAL INVITARE MEMBRU IN ASOCIATIE
 *
 * Roluri disponibile:
 * - assoc_admin: Administrator (acces complet)
 * - assoc_president: Presedinte (read-only)
 * - assoc_censor: Cenzor (read-only)
 *
 * Fara limite pe numarul de membri per rol.
 */
const InviteAssocMemberModal = ({
  isOpen,
  onClose,
  association,
  onInvite,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'assoc_admin'
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset la inchidere
  const handleClose = () => {
    setFormData({ email: '', name: '', role: 'assoc_admin' });
    setErrors({});
    setSuccess(false);
    setInviteLink('');
    setEmailSent(false);
    setCopied(false);
    onClose();
  };

  // Validare formular
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Adresa de email nu este valida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await onInvite({
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        role: formData.role,
        associationId: association?.id,
        associationName: association?.name
      });

      setSuccess(true);
      setEmailSent(result?.emailSent || false);
      if (result?.inviteLink) {
        setInviteLink(result.inviteLink);
      }
    } catch (err) {
      if (err.message === 'INVITATION_EXISTS') {
        setErrors({ email: 'Exista deja o invitatie activa pentru acest email' });
      } else if (err.message === 'USER_ALREADY_MEMBER') {
        setErrors({ email: 'Acest utilizator este deja membru al asociatiei' });
      } else {
        setErrors({ general: 'A aparut o eroare la trimiterea invitatiei' });
      }
    }
  };

  // Copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const roles = [
    {
      id: 'assoc_admin',
      label: 'Administrator',
      description: 'Acces complet la editare',
      icon: ShieldCheck,
      color: 'purple'
    },
    {
      id: 'assoc_president',
      label: 'Presedinte',
      description: 'Vizualizare date (read-only)',
      icon: UserCheck,
      color: 'blue'
    },
    {
      id: 'assoc_censor',
      label: 'Cenzor',
      description: 'Audit si vizualizare (read-only)',
      icon: Shield,
      color: 'green'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Invita Membru
              </h2>
              <p className="text-sm text-gray-500">
                {association?.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {emailSent ? (
                <Mail className="w-8 h-8 text-green-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emailSent ? 'Invitație trimisă pe email!' : 'Invitație creată!'}
            </h3>
            <p className="text-gray-600 mb-4">
              {emailSent
                ? `Un email cu invitația a fost trimis la ${formData.email}`
                : 'Trimite link-ul de mai jos persoanei invitate:'
              }
            </p>

            {inviteLink && (
              <div className="mt-4">
                {emailSent && (
                  <p className="text-xs text-gray-500 mb-2">
                    Poți copia și link-ul direct:
                  </p>
                )}
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="ml-2 p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    title="Copiaza link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Link copiat!</p>
                )}
              </div>
            )}

            <button
              onClick={handleClose}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Inchide
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Error general */}
            {errors.general && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{errors.general}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresa de Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="exemplu@email.ro"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Nume (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nume (optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Numele persoanei"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol in Asociatie
              </label>
              <div className="space-y-2">
                {roles.map((role) => {
                  const RoleIcon = role.icon;
                  const isSelected = formData.role === role.id;
                  const borderColor = isSelected
                    ? role.color === 'purple' ? 'border-purple-500 bg-purple-50'
                    : role.color === 'blue' ? 'border-blue-500 bg-blue-50'
                    : 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300';
                  const iconColor = isSelected
                    ? role.color === 'purple' ? 'text-purple-600'
                    : role.color === 'blue' ? 'text-blue-600'
                    : 'text-green-600'
                    : 'text-gray-400';

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.id })}
                      className={`w-full flex items-center p-3 border-2 rounded-xl transition-all ${borderColor}`}
                    >
                      <RoleIcon className={`w-6 h-6 mr-3 ${iconColor}`} />
                      <div className="text-left">
                        <span className={`font-medium text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {role.label}
                        </span>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Cum functioneaza?</p>
                <p className="mt-1">
                  Persoana invitata va primi un email cu un link unic.
                  Dupa ce acceseaza link-ul si isi creaza contul (sau se logheaza),
                  va fi adaugata automat ca membru in asociatie.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Anuleaza
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Se trimite...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Trimite Invitația
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteAssocMemberModal;
