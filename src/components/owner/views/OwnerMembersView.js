import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Mail,
  Send,
  AlertCircle,
  CheckCircle,
  Info,
  Copy,
  Check,
  MoreVertical,
  Home,
  Key,
  Heart,
  User,
  Clock,
  XCircle,
  RefreshCw,
  Trash2,
  Phone,
  Loader2
} from 'lucide-react';
import { useOwnerContext } from '../OwnerApp';
import { useApartmentMembers } from '../../../hooks/useApartmentMembers';
import { useAuthEnhanced } from '../../../context/AuthContextEnhanced';

/**
 * View-ul Membri din Owner Portal
 *
 * Permite:
 * - Vizualizarea membrilor cu acces la apartament
 * - Proprietarii pot invita alți locatari (via modal)
 * - Chiriaș/Membru familie/Altul pot doar vedea lista
 */
export default function OwnerMembersView() {
  const {
    apartmentId,
    apartmentNumber,
    apartmentData,
    associationId,
    associationName,
  } = useOwnerContext();

  const { currentUser } = useAuthEnhanced();

  const {
    members,
    invitations,
    loading,
    ROLES,
    getRoleName,
    getRoleColor,
    loadApartmentMembers,
    loadApartmentInvitations,
    unsubscribeInvitations,
    inviteApartmentMember,
    cancelInvitation,
    resendApartmentInvitation,
    removeMember,
    changeMemberRole
  } = useApartmentMembers();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'proprietar' });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Determine current user's role in this apartment
  const currentUserRole = members.find(
    m => m.email === currentUser?.email || m.firebaseUid === currentUser?.uid
  )?.apartmentRole || 'proprietar';

  const canInvite = currentUserRole === 'proprietar';

  // Load data
  useEffect(() => {
    if (associationId && apartmentId) {
      loadApartmentMembers(associationId, apartmentId);
      loadApartmentInvitations(associationId, apartmentId);
    }
    return () => unsubscribeInvitations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [associationId, apartmentId]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const getRoleIcon = (role) => {
    const iconMap = { proprietar: Key, chirias: Home, membru_familie: Heart, altul: User };
    return iconMap[role] || User;
  };

  const getRoleBadgeClasses = (role) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      gray: 'bg-gray-100 text-gray-700'
    };
    return colorMap[getRoleColor(role)] || colorMap.gray;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Adresa de email nu este validă';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await inviteApartmentMember(
        formData.email.trim().toLowerCase(),
        formData.role,
        {
          id: apartmentId,
          number: apartmentNumber,
          stairId: apartmentData?.stairId,
          blocId: apartmentData?.blocId
        },
        { id: associationId, name: associationName },
        currentUser?.uid
      );

      setSuccess(true);
      setEmailSent(result?.emailSent || false);
      if (result?.inviteLink) setInviteLink(result.inviteLink);

      loadApartmentMembers(associationId, apartmentId);
    } catch (err) {
      if (err.message === 'INVITATION_EXISTS') {
        setErrors({ email: 'Există deja o invitație activă pentru acest email' });
      } else if (err.message === 'USER_ALREADY_MEMBER') {
        setErrors({ email: 'Acest utilizator are deja acces la apartament' });
      } else {
        setErrors({ general: 'A apărut o eroare la trimiterea invitației' });
      }
    }
    setSubmitting(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseModal = () => {
    setShowInviteModal(false);
    setSuccess(false);
    setErrors({});
    setFormData({ email: '', role: 'proprietar' });
    setInviteLink('');
    setEmailSent(false);
  };

  const handleRemoveMember = async (member) => {
    try {
      await removeMember(member.id, associationId, apartmentId);
      setConfirmRemove(null);
      loadApartmentMembers(associationId, apartmentId);
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleRoleChange = async (member, newRole) => {
    try {
      await changeMemberRole(member.id, associationId, apartmentId, newRole);
      setOpenMenuId(null);
      loadApartmentMembers(associationId, apartmentId);
    } catch (err) {
      console.error('Error changing role:', err);
    }
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  const roles = Object.entries(ROLES).map(([id, data]) => ({
    id,
    ...data,
    icon: getRoleIcon(id)
  }));

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Membri Apartament {apartmentNumber}</h2>
          <p className="text-xs sm:text-sm text-gray-500">Persoanele care au acces la datele apartamentului</p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invită Locatar
          </button>
        )}
      </div>

      {/* Members list */}
      {members.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Membri cu acces ({members.length})
          </h3>
          <div className="space-y-2">
            {members.map((member) => {
              const RoleIcon = getRoleIcon(member.apartmentRole);
              const isCurrentUser = member.email === currentUser?.email || member.firebaseUid === currentUser?.uid;

              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isCurrentUser ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrentUser ? 'bg-emerald-200' : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${isCurrentUser ? 'text-emerald-700' : 'text-gray-500'}`} />
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.firstName || member.email}
                        {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(tu)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      {member.phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {member.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClasses(member.apartmentRole)}`}>
                      <RoleIcon className="w-3 h-3" />
                      {getRoleName(member.apartmentRole)}
                    </span>
                    {member.status === 'active' && <span className="w-2 h-2 bg-green-500 rounded-full" title="Activ" />}
                    {member.status === 'invited' && <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Invitat" />}

                    {/* Actions - only proprietar can manage, and can't manage self */}
                    {canInvite && !isCurrentUser && (
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === member.id ? null : member.id); }}
                          className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {openMenuId === member.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <p className="px-3 py-1 text-xs text-gray-400 font-medium">Schimbă rol</p>
                              {Object.entries(ROLES).map(([roleId, roleData]) => (
                                roleId !== member.apartmentRole && (
                                  <button
                                    key={roleId}
                                    onClick={() => handleRoleChange(member, roleId)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    {React.createElement(getRoleIcon(roleId), { className: 'w-3.5 h-3.5' })}
                                    {roleData.label}
                                  </button>
                                )
                              ))}
                              <hr className="my-1" />
                              <button
                                onClick={() => { setConfirmRemove(member); setOpenMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Elimină accesul
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && members.length === 0 && pendingInvitations.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Niciun alt locatar</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            {canInvite
              ? 'Invită alți locatari pentru a le oferi acces la datele apartamentului.'
              : 'Momentan ești singurul locatar cu acces la acest apartament.'}
          </p>
          {canInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invită Locatar
            </button>
          )}
        </div>
      )}

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Invitații în așteptare ({pendingInvitations.length})
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    {getRoleName(inv.role)} • Trimisă {new Date(inv.createdAt).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                {canInvite && (
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => resendApartmentInvitation(associationId, inv.id, currentUser?.uid)}
                      className="p-1.5 text-yellow-700 hover:bg-yellow-100 rounded-lg"
                      title="Retrimite invitația"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => cancelInvitation(associationId, inv.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Anulează invitația"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && members.length === 0 && (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Se încarcă membrii...</p>
        </div>
      )}

      {/* Confirm remove dialog */}
      {confirmRemove && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Elimină acces</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ești sigur că vrei să elimini accesul lui{' '}
              <strong>{confirmRemove.firstName || confirmRemove.email}</strong>{' '}
              la apartamentul {apartmentNumber}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
              >
                Anulează
              </button>
              <button
                onClick={() => handleRemoveMember(confirmRemove)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Elimină
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Invite Modal */}
      {showInviteModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">
                  {success ? 'Invitație trimisă' : 'Invită Locatar'}
                </h3>
                <p className="text-xs text-emerald-100">
                  {success ? 'Invitația a fost creată cu succes' : `Apartament ${apartmentNumber}`}
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-white hover:text-emerald-200 transition-colors">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {success ? (
                /* Success state */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {emailSent ? 'Email trimis cu succes!' : 'Invitație creată!'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {emailSent
                          ? `Un email cu invitația a fost trimis la ${formData.email}`
                          : 'Trimite link-ul de mai jos persoanei invitate:'}
                      </p>
                    </div>
                  </div>

                  {inviteLink && !emailSent && (
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
                      <input type="text" value={inviteLink} readOnly className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate" />
                      <button onClick={handleCopyLink} className="ml-2 p-1.5 hover:bg-gray-200 rounded-lg">
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSuccess(false);
                      setFormData({ email: '', role: 'proprietar' });
                      setInviteLink('');
                      setEmailSent(false);
                      setErrors({});
                    }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Invită alt locatar
                  </button>
                </div>
              ) : (
                /* Invite form */
                <form onSubmit={handleInvite} className="space-y-4">
                  {errors.general && (
                    <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-red-700">{errors.general}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresa de Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({}); }}
                        placeholder="exemplu@email.ro"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm ${
                          errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        autoFocus
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol în Apartament</label>
                    <div className="space-y-2">
                      {roles.map((role) => {
                        const RoleIcon = role.icon;
                        const isSelected = formData.role === role.id;

                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, role: role.id })}
                            className={`w-full flex items-center p-3 border-2 rounded-lg transition-all text-left ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <RoleIcon className={`w-4 h-4 mr-3 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <div>
                              <span className={`font-medium text-sm ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>{role.label}</span>
                              <p className="text-xs text-gray-500">{role.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      Persoana invitată va primi un email cu un link unic. După ce accesează link-ul și își creează contul, va avea acces la datele apartamentului.
                    </p>
                  </div>

                  {/* Footer buttons inside form */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Anulează
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Trimite Invitația
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
