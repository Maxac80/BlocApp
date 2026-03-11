import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Users,
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
  Phone
} from 'lucide-react';
import { useApartmentMembers } from '../../hooks/useApartmentMembers';

/**
 * MODAL MEMBRI APARTAMENT
 *
 * Afiseaza membrii apartamentului + invitatii pending + formular invitare.
 * Pattern similar cu InviteAssocMemberModal + tab Membri din AssociationView.
 */
const ApartmentMembersModal = ({
  isOpen,
  onClose,
  apartment,
  association,
  currentUserId,
  cantEdit = false,
  stair,
  block
}) => {
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

  const [view, setView] = useState('list'); // 'list' | 'invite'
  const [formData, setFormData] = useState({ email: '', role: 'proprietar' });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Load members and invitations when modal opens
  useEffect(() => {
    if (isOpen && apartment?.id && association?.id) {
      loadApartmentMembers(association.id, apartment.id);
      loadApartmentInvitations(association.id, apartment.id);
    }

    return () => {
      unsubscribeInvitations();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, apartment?.id, association?.id]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const handleClose = useCallback(() => {
    setView('list');
    setFormData({ email: '', role: 'proprietar' });
    setErrors({});
    setSuccess(false);
    setInviteLink('');
    setEmailSent(false);
    setCopied(false);
    setOpenMenuId(null);
    setConfirmRemove(null);
    onClose();
  }, [onClose]);

  // Validate invite form
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

  // Send invitation
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const result = await inviteApartmentMember(
        formData.email.trim().toLowerCase(),
        formData.role,
        {
          id: apartment.id,
          number: apartment.number,
          stairId: apartment.stairId || stair?.id,
          blocId: apartment.blocId || block?.id
        },
        { id: association.id, name: association.name },
        currentUserId
      );

      setSuccess(true);
      setEmailSent(result?.emailSent || false);
      if (result?.inviteLink) {
        setInviteLink(result.inviteLink);
      }

      // Refresh members
      loadApartmentMembers(association.id, apartment.id);
    } catch (err) {
      if (err.message === 'INVITATION_EXISTS') {
        setErrors({ email: 'Există deja o invitație activă pentru acest email' });
      } else if (err.message === 'USER_ALREADY_MEMBER') {
        setErrors({ email: 'Acest utilizator are deja acces la apartament' });
      } else {
        setErrors({ general: 'A apărut o eroare la trimiterea invitației' });
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

  // Handle remove member
  const handleRemoveMember = async (member) => {
    try {
      await removeMember(member.id, association.id, apartment.id);
      setConfirmRemove(null);
      loadApartmentMembers(association.id, apartment.id);
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  // Handle role change
  const handleRoleChange = async (member, newRole) => {
    try {
      await changeMemberRole(member.id, association.id, apartment.id, newRole);
      setOpenMenuId(null);
      loadApartmentMembers(association.id, apartment.id);
    } catch (err) {
      console.error('Error changing role:', err);
    }
  };

  // Handle cancel invitation
  const handleCancelInvitation = async (invitationId) => {
    try {
      await cancelInvitation(association.id, invitationId);
    } catch (err) {
      console.error('Error cancelling invitation:', err);
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (invitationId) => {
    try {
      await resendApartmentInvitation(association.id, invitationId, currentUserId);
    } catch (err) {
      console.error('Error resending invitation:', err);
    }
  };

  // Role badge colors
  const getRoleBadgeClasses = (role) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      gray: 'bg-gray-100 text-gray-700'
    };
    return colorMap[getRoleColor(role)] || colorMap.gray;
  };

  // Role icon
  const getRoleIcon = (role) => {
    const iconMap = {
      proprietar: Key,
      chirias: Home,
      membru_familie: Heart,
      altul: User
    };
    return iconMap[role] || User;
  };

  const roles = Object.entries(ROLES).map(([id, data]) => ({
    id,
    ...data,
    icon: getRoleIcon(id)
  }));

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const expiredInvitations = invitations.filter(i => i.status === 'expired');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-2xl">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Membri Apartament {apartment?.number}
              </h2>
              <p className="text-sm text-purple-200">
                {block?.name || apartment?.block} - {stair?.name || apartment?.stair}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* View: Success after invite */}
          {success ? (
            <div className="text-center py-4">
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
                  : 'Trimite link-ul de mai jos persoanei invitate:'}
              </p>

              {inviteLink && !emailSent && (
                <div className="mt-4">
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
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {copied && <p className="text-xs text-green-600 mt-1">Link copiat!</p>}
                </div>
              )}

              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setFormData({ email: '', role: 'proprietar' });
                    setInviteLink('');
                    setEmailSent(false);
                  }}
                  className="px-4 py-2 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  Invită alt locatar
                </button>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setView('list');
                    setFormData({ email: '', role: 'proprietar' });
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Vezi membri
                </button>
              </div>
            </div>
          ) : view === 'invite' ? (
            /* View: Invite form */
            <form onSubmit={handleInvite} className="space-y-5">
              <button
                type="button"
                onClick={() => { setView('list'); setErrors({}); }}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                ← Înapoi la listă
              </button>

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
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Role selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol în Apartament
                </label>
                <div className="space-y-2">
                  {roles.map((role) => {
                    const RoleIcon = role.icon;
                    const isSelected = formData.role === role.id;
                    const colorClasses = {
                      blue: isSelected ? 'border-blue-500 bg-blue-50' : '',
                      green: isSelected ? 'border-green-500 bg-green-50' : '',
                      orange: isSelected ? 'border-orange-500 bg-orange-50' : '',
                      gray: isSelected ? 'border-gray-500 bg-gray-50' : ''
                    };
                    const iconColorClasses = {
                      blue: isSelected ? 'text-blue-600' : 'text-gray-400',
                      green: isSelected ? 'text-green-600' : 'text-gray-400',
                      orange: isSelected ? 'text-orange-600' : 'text-gray-400',
                      gray: isSelected ? 'text-gray-600' : 'text-gray-400'
                    };

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.id })}
                        className={`w-full flex items-center p-3 border-2 rounded-xl transition-all ${
                          isSelected
                            ? colorClasses[role.color]
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <RoleIcon className={`w-5 h-5 mr-3 ${iconColorClasses[role.color]}`} />
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
              <div className="flex items-start p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Info className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-700">
                  <p className="font-medium">Cum funcționează?</p>
                  <p className="mt-1">
                    Persoana invitată va primi un email cu un link unic.
                    După ce accesează link-ul și își creează contul,
                    va avea acces la datele apartamentului în portalul de locatari.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setView('list'); setErrors({}); }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
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
          ) : (
            /* View: Members list */
            <div className="space-y-4">
              {/* Invite button */}
              {!cantEdit && (
                <button
                  onClick={() => setView('invite')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50 hover:border-purple-400 transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="font-medium">Invită Locatar</span>
                </button>
              )}

              {/* Active members */}
              {members.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Membri cu acces ({members.length})
                  </h3>
                  <div className="space-y-2">
                    {members.map((member) => {
                      const RoleIcon = getRoleIcon(member.apartmentRole);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                        >
                          <div className="flex items-center min-w-0">
                            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="ml-3 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {member.firstName && member.lastName
                                  ? `${member.firstName} ${member.lastName}`
                                  : member.firstName || member.email}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{member.email}</p>
                              {member.phone && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {member.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClasses(member.apartmentRole)}`}>
                              <RoleIcon className="w-3 h-3" />
                              {getRoleName(member.apartmentRole)}
                            </span>
                            {member.status === 'active' && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" title="Activ" />
                            )}
                            {member.status === 'invited' && (
                              <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Invitat" />
                            )}

                            {/* Actions menu */}
                            {!cantEdit && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === member.id ? null : member.id);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>

                                {openMenuId === member.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
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
                                        onClick={() => {
                                          setConfirmRemove(member);
                                          setOpenMenuId(null);
                                        }}
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
              ) : (
                !loading && pendingInvitations.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Niciun locatar înregistrat
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Invită locatarii pentru a le oferi acces la datele apartamentului în portalul de locatari.
                    </p>
                    {!cantEdit && (
                      <button
                        onClick={() => setView('invite')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invită primul locatar
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Pending invitations */}
              {pendingInvitations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Invitații în așteptare ({pendingInvitations.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                          <p className="text-xs text-gray-500">
                            {getRoleName(inv.role)} • Trimisă {new Date(inv.createdAt).toLocaleDateString('ro-RO')}
                          </p>
                        </div>
                        {!cantEdit && (
                          <div className="flex gap-1 flex-shrink-0 ml-2">
                            <button
                              onClick={() => handleResendInvitation(inv.id)}
                              className="p-1.5 text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors"
                              title="Retrimite invitația"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(inv.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

              {/* Expired invitations */}
              {expiredInvitations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    Invitații expirate ({expiredInvitations.length})
                  </h3>
                  <div className="space-y-2">
                    {expiredInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-60"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600 truncate">{inv.email}</p>
                          <p className="text-xs text-gray-400">
                            {getRoleName(inv.role)} • Expirată
                          </p>
                        </div>
                        {!cantEdit && (
                          <button
                            onClick={() => handleResendInvitation(inv.id)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0"
                            title="Retrimite invitația"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && members.length === 0 && invitations.length === 0 && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Se încarcă membrii...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm remove dialog */}
        {confirmRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Elimină acces</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ești sigur că vrei să elimini accesul lui{' '}
                <strong>{confirmRemove.firstName || confirmRemove.email}</strong>{' '}
                la apartamentul {apartment?.number}?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={() => handleRemoveMember(confirmRemove)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Elimină
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApartmentMembersModal;
