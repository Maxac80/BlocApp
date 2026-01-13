import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  Send,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

/**
 * 📧 MODAL INVITARE MEMBRU ÎN ORGANIZAȚIE
 *
 * Features:
 * - Formular pentru email
 * - Selectare rol (admin/member)
 * - Trimitere invitație prin email
 * - Validare email
 */
const InviteMemberModal = ({
  isOpen,
  onClose,
  organization,
  onInvite,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'org_member',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Reset la închidere
  const handleClose = () => {
    setFormData({ email: '', role: 'org_member', message: '' });
    setErrors({});
    setSuccess(false);
    onClose();
  };

  // Validare email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validare formular
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Adresa de email nu este validă';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onInvite({
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        message: formData.message.trim(),
        organizationId: organization?.id,
        organizationName: organization?.name
      });
      setSuccess(true);
      // Auto close după 2 secunde
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      if (err.message === 'INVITATION_EXISTS') {
        setErrors({ email: 'Există deja o invitație activă pentru acest email' });
      } else if (err.message === 'USER_ALREADY_MEMBER') {
        setErrors({ email: 'Acest utilizator este deja membru al organizației' });
      } else {
        setErrors({ general: 'A apărut o eroare la trimiterea invitației' });
      }
    }
  };

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
                Invită Membru Nou
              </h2>
              <p className="text-sm text-gray-500">
                {organization?.name}
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
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Invitație trimisă!
            </h3>
            <p className="text-gray-600">
              Un email cu invitația a fost trimis la {formData.email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  placeholder="exemplu@firma.ro"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol în Organizație
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'org_member' })}
                  className={`flex flex-col items-center p-4 border-2 rounded-xl transition-all ${
                    formData.role === 'org_member'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Shield className={`w-8 h-8 mb-2 ${
                    formData.role === 'org_member' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    formData.role === 'org_member' ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    Membru
                  </span>
                  <span className="text-xs text-gray-500 mt-1 text-center">
                    Acces la asociații alocate
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'org_admin' })}
                  className={`flex flex-col items-center p-4 border-2 rounded-xl transition-all ${
                    formData.role === 'org_admin'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ShieldCheck className={`w-8 h-8 mb-2 ${
                    formData.role === 'org_admin' ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    formData.role === 'org_admin' ? 'text-purple-900' : 'text-gray-700'
                  }`}>
                    Administrator
                  </span>
                  <span className="text-xs text-gray-500 mt-1 text-center">
                    Gestionare completă
                  </span>
                </button>
              </div>
            </div>

            {/* Mesaj personalizat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mesaj Personalizat (opțional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Adaugă un mesaj personalizat pentru invitație..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Info box */}
            <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Cum funcționează?</p>
                <p className="mt-1">
                  Persoana va primi un email cu un link unic. După ce accesează link-ul
                  și își creează contul, va fi automat adăugat ca membru în organizație.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Anulează
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

export default InviteMemberModal;
