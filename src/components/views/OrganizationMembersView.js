/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Building2,
  Home,
  Calendar,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { useOrgMembers } from '../../hooks/useOrgMembers';
import { usePermissions } from '../../hooks/usePermissions';
import OrgHeader from '../common/OrgHeader';

/**
 * 👥 PAGINA GESTIONARE MEMBRI ORGANIZAȚIE
 *
 * Features:
 * - Lista membrilor cu status și rol
 * - Filtrare și căutare
 * - Schimbare rol membru
 * - Alocare/dealocare asociații
 * - Eliminare membru
 * - Invitare membru nou
 */
const OrganizationMembersView = ({
  organization,
  userId,
  userProfile,
  activeUser,
  onBack,
  onBackToSelector,
  onInviteMember,
  onAllocateAssociations
}) => {
  const {
    members,
    loading,
    error,
    loadMembers,
    changeMemberRole,
    removeMember,
    deactivateMember,
    reactivateMember
  } = useOrgMembers(organization?.id);

  const { hasPermission, PERMISSIONS } = usePermissions(userId);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Încarcă membrii la mount
  useEffect(() => {
    if (organization?.id) {
      loadMembers(organization.id);
    }
  }, [organization?.id, loadMembers]);

  // Filtrare membri
  const filteredMembers = members.filter(member => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Permisiuni
  const canManageMembers = hasPermission(PERMISSIONS.ORG_MANAGE_MEMBERS, {
    organizationId: organization?.id
  });
  const canInviteMembers = hasPermission(PERMISSIONS.ORG_INVITE_MEMBERS, {
    organizationId: organization?.id
  });

  // Handler pentru schimbare rol
  const handleRoleChange = async (memberId, newRole) => {
    setActionLoading(true);
    try {
      await changeMemberRole(organization.id, memberId, newRole);
      setShowActionMenu(null);
    } catch (err) {
      console.error('Error changing role:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler pentru eliminare membru
  const handleRemoveMember = async (memberId) => {
    setActionLoading(true);
    try {
      await removeMember(organization.id, memberId, userId);
      setConfirmAction(null);
      setShowActionMenu(null);
    } catch (err) {
      console.error('Error removing member:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler pentru dezactivare/reactivare
  const handleToggleStatus = async (member) => {
    setActionLoading(true);
    try {
      if (member.status === 'active') {
        await deactivateMember(organization.id, member.id);
      } else {
        await reactivateMember(organization.id, member.id);
      }
      setShowActionMenu(null);
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Componenta pentru badge rol
  const RoleBadge = ({ role }) => {
    const roleConfig = {
      org_admin: {
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: ShieldCheck,
        label: 'Administrator'
      },
      org_member: {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: Shield,
        label: 'Membru'
      }
    };

    const config = roleConfig[role] || roleConfig.org_member;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Componenta pentru badge status
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-700', label: 'Activ' },
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'În așteptare' },
      inactive: { color: 'bg-gray-100 text-gray-700', label: 'Inactiv' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Componenta pentru card membru
  const MemberCard = ({ member }) => {
    const isMenuOpen = showActionMenu === member.id;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          {/* Info membru */}
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-blue-600">
                {member.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>

            {/* Detalii */}
            <div>
              <h3 className="font-semibold text-gray-900">
                {member.name || 'Nume necunoscut'}
              </h3>
              <div className="flex items-center space-x-3 mt-1">
                <RoleBadge role={member.role} />
                <StatusBadge status={member.status} />
              </div>

              {/* Contact */}
              <div className="mt-2 space-y-1">
                {member.email && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    {member.email}
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 mr-1.5" />
                    {member.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Meniu acțiuni */}
          {canManageMembers && (
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(isMenuOpen ? null : member.id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {/* Schimbare rol */}
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Schimbă rolul</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => handleRoleChange(member.id, 'org_admin')}
                        disabled={member.role === 'org_admin' || actionLoading}
                        className={`w-full flex items-center px-2 py-1.5 text-sm rounded ${
                          member.role === 'org_admin'
                            ? 'bg-purple-50 text-purple-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Administrator
                        {member.role === 'org_admin' && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                      <button
                        onClick={() => handleRoleChange(member.id, 'org_member')}
                        disabled={member.role === 'org_member' || actionLoading}
                        className={`w-full flex items-center px-2 py-1.5 text-sm rounded ${
                          member.role === 'org_member'
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Membru
                        {member.role === 'org_member' && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    </div>
                  </div>

                  {/* Alte acțiuni */}
                  <div className="py-1">
                    <button
                      onClick={() => onAllocateAssociations && onAllocateAssociations(member)}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Alocă asociații
                    </button>
                    <button
                      onClick={() => handleToggleStatus(member)}
                      disabled={actionLoading}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {member.status === 'active' ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Dezactivează
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Activează
                        </>
                      )}
                    </button>
                  </div>

                  {/* Acțiune periculoasă */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => setConfirmAction({ type: 'remove', member })}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Elimină din organizație
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Asociații alocate */}
        {member.assignedAssociations?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Asociații alocate ({member.assignedAssociations.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {member.assignedAssociations.slice(0, 3).map((assocId, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg"
                >
                  <Home className="w-3 h-3 mr-1" />
                  {assocId.substring(0, 8)}...
                </span>
              ))}
              {member.assignedAssociations.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{member.assignedAssociations.length - 3} altele
                </span>
              )}
            </div>
          </div>
        )}

        {/* Data înscrierii */}
        <div className="mt-3 flex items-center text-xs text-gray-400">
          <Calendar className="w-3 h-3 mr-1" />
          Membru din {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
      </div>
    );
  };

  // Modal confirmare acțiune
  const ConfirmActionModal = () => {
    if (!confirmAction) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Confirmare eliminare
            </h3>
          </div>

          <p className="text-gray-600 mb-6">
            Ești sigur că vrei să elimini pe <strong>{confirmAction.member?.name}</strong> din organizație?
            Această acțiune va revoca accesul la toate asociațiile alocate.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={() => handleRemoveMember(confirmAction.member.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Se elimină...' : 'Elimină'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && members.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă membrii...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <OrgHeader
        userProfile={userProfile}
        activeUser={activeUser}
        onLogoClick={onBackToSelector}
        showBackButton={true}
        onBack={onBack}
        backLabel={organization?.name}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 mr-2 sm:mr-3 text-blue-600 flex-shrink-0" />
                <span className="truncate">Membrii Organizației</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">
                {organization?.name} • {members.length} membri
              </p>
            </div>

            {canInviteMembers && (
              <button
                onClick={onInviteMember}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Invită Membru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Caută după nume sau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">Toate rolurile</option>
                <option value="org_admin">Administratori</option>
                <option value="org_member">Membri</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">Toate statusurile</option>
                <option value="active">Activi</option>
                <option value="pending">În așteptare</option>
                <option value="inactive">Inactivi</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats rapide */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Membri</p>
            <p className="text-2xl font-bold text-gray-900">{members.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Administratori</p>
            <p className="text-2xl font-bold text-purple-600">
              {members.filter(m => m.role === 'org_admin').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Membri</p>
            <p className="text-2xl font-bold text-blue-600">
              {members.filter(m => m.role === 'org_member').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">În așteptare</p>
            <p className="text-2xl font-bold text-yellow-600">
              {members.filter(m => m.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Lista membri */}
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {members.length === 0 ? 'Niciun membru în organizație' : 'Niciun rezultat găsit'}
            </h3>
            <p className="text-gray-500 mb-6">
              {members.length === 0
                ? 'Invită membri pentru a-ți construi echipa.'
                : 'Încearcă să modifici filtrele de căutare.'}
            </p>
            {members.length === 0 && canInviteMembers && (
              <button
                onClick={onInviteMember}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Invită Primul Membru
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* Click outside handler pentru meniu */}
      {showActionMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActionMenu(null)}
        />
      )}

      {/* Modal confirmare */}
      <ConfirmActionModal />
    </div>
  );
};

export default OrganizationMembersView;
