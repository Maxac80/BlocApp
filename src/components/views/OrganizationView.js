/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  Users,
  Settings,
  CreditCard,
  Plus,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Link2,
  LayoutGrid,
  List,
  MapPin,
  Briefcase
} from 'lucide-react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useOrgMembers } from '../../hooks/useOrgMembers';
import OrgHeader from '../common/OrgHeader';

/**
 * 🏢 DASHBOARD ORGANIZAȚIE
 *
 * Afișează:
 * - Statistici generale (asociații, apartamente, restanțe)
 * - Lista asociațiilor din organizație
 * - Quick actions pentru owner/admin
 * - Status billing
 */
const OrganizationView = ({
  organization,        // Obiect organizație complet (din currentContext.data)
  userId,
  userProfile,
  activeUser,
  userRole: propUserRole,  // Rol venit din App.js (din currentContext.role)
  onBackToSelector,    // Funcția pentru a reveni la selector
  onSelectAssociation,
  onOpenSettings,
  onOpenMembers,
  onInviteMember,
  onAllocateAssociation,
  onCreateAssociation
}) => {
  const {
    getOrganizationAssociations
  } = useOrganizations(userId);

  const organizationId = organization?.id;
  const { members, loading: membersLoading, loadMembers } = useOrgMembers(organizationId);

  const [associations, setAssociations] = useState([]);
  const [loadingAssociations, setLoadingAssociations] = useState(true);
  const [stats, setStats] = useState({
    totalAssociations: 0,
    totalApartments: 0,
    totalPersons: 0,
    totalBlocks: 0,
    totalStairs: 0,
    totalRestante: 0,
    totalDeIncasat: 0
  });
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'

  // Folosim rolul venit din props (din AuthContext) sau calculăm din organization
  const userRole = propUserRole || organization?.userRole || 'org_member';
  const isOwner = userRole === 'org_owner';
  const isAdmin = userRole === 'org_admin' || isOwner;

  // Încarcă asociațiile organizației
  useEffect(() => {
    if (organizationId) {
      loadMembers(organizationId);
      loadAssociations();
    }
  }, [organizationId]);

  const loadAssociations = async () => {
    if (!organizationId) {
      setLoadingAssociations(false);
      return;
    }
    setLoadingAssociations(true);
    try {
      const assocs = await getOrganizationAssociations(organizationId);
      setAssociations(assocs || []);

      // Calculează statistici din asociațiile încărcate
      let totalApartments = 0;
      let totalPersons = 0;
      let totalBlocks = 0;
      let totalStairs = 0;
      (assocs || []).forEach(assoc => {
        if (assoc.stats) {
          totalApartments += assoc.stats.totalApartments || 0;
          totalPersons += assoc.stats.totalPersons || 0;
          totalBlocks += assoc.stats.totalBlocks || 0;
          totalStairs += assoc.stats.totalStairs || 0;
        }
      });

      setStats({
        totalAssociations: (assocs || []).length,
        totalApartments,
        totalPersons,
        totalBlocks,
        totalStairs,
        totalRestante: 0,
        totalDeIncasat: 0
      });
    } catch (err) {
      console.error('Error loading associations:', err);
      setAssociations([]);
    } finally {
      setLoadingAssociations(false);
    }
  };

  // Folosim organizația direct din props (deja încărcată)
  const currentOrganization = organization;
  const loading = loadingAssociations && !currentOrganization;

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      trial: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Trial' },
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Activ' },
      overdue: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'Restant' },
      suspended: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Suspendat' }
    };

    const config = statusConfig[status] || statusConfig.trial;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3.5 h-3.5 mr-1" />
        {config.label}
      </span>
    );
  };

  // Health indicator for associations
  const HealthIndicator = ({ association }) => {
    // Calculează health bazat pe restanțe
    const restantePercent = 0; // Ar trebui calculat din date reale

    if (restantePercent > 20) {
      return <div className="w-3 h-3 rounded-full bg-red-500" title="Restanțe > 20%" />;
    }
    if (restantePercent > 5) {
      return <div className="w-3 h-3 rounded-full bg-yellow-500" title="Restanțe > 5%" />;
    }
    return <div className="w-3 h-3 rounded-full bg-green-500" title="OK" />;
  };

  // Association Card Component (pentru view cards)
  const AssociationCard = ({ assoc }) => {
    const assocStats = assoc.stats || {};
    const billing = assoc.billing || {};

    return (
      <div
        onClick={() => onSelectAssociation(assoc)}
        className="bg-white rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-[3px] border-l-emerald-500 p-4 sm:p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-base sm:text-lg">
                {assoc.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {assoc.address?.city}, {assoc.address?.county}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <HealthIndicator association={assoc} />
          </div>
        </div>

        {/* Stats - 4 on one line */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-3 sm:mb-4">
          <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
              <span className="sm:hidden">Apt</span>
              <span className="hidden sm:inline">Apartamente</span>
            </p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">
              {assocStats.totalApartments ?? '—'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
              <span className="sm:hidden">Pers</span>
              <span className="hidden sm:inline">Persoane</span>
            </p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">
              {assocStats.totalPersons ?? '—'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
              <span className="sm:hidden">Bloc</span>
              <span className="hidden sm:inline">Blocuri</span>
            </p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">
              {assocStats.totalBlocks ?? '—'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
            <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
              <span className="sm:hidden">Scări</span>
              <span className="hidden sm:inline">Scări</span>
            </p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">
              {assocStats.totalStairs ?? '—'}
            </p>
          </div>
        </div>

        {/* Address */}
        {assoc.address && (
          <div className="flex items-start text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-2">
              {assoc.address.street} {assoc.address.number}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
          <span className="text-xs sm:text-sm text-gray-500">
            {assoc.cui && `CUI: ${assoc.cui}`}
          </span>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </div>
      </div>
    );
  };

  if (loading && !currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă organizația...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Organizație negăsită</h2>
          <p className="text-gray-600 mb-4">Nu am putut încărca datele organizației.</p>
          <button
            onClick={onBackToSelector}
            className="text-blue-600 hover:underline"
          >
            Înapoi la dashboard
          </button>
        </div>
      </div>
    );
  }

  const billing = currentOrganization.billing || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <OrgHeader
        userProfile={userProfile}
        activeUser={activeUser}
        onLogoClick={onBackToSelector}
        showBackButton={true}
        onBack={onBackToSelector}
        backLabel="Dashboard"
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 sm:truncate">
                  {currentOrganization.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {currentOrganization.cui && `CUI: ${currentOrganization.cui}`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <StatusBadge status={billing.status || 'trial'} />
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {billing.tier || 'Starter'}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {billing.monthlyAmount || 0} RON/lună
              </span>

              {isAdmin && (
                <button
                  onClick={onOpenMembers}
                  className="inline-flex items-center px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Users className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Echipă ({members.length})</span>
                  <span className="sm:hidden ml-1">{members.length}</span>
                </button>
              )}

              {isOwner && (
                <button
                  onClick={onOpenSettings}
                  className="inline-flex items-center px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Setări</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar - 5 stats on one line */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            <div className="bg-blue-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium mb-0.5">
                <span className="sm:hidden">Asoc</span>
                <span className="hidden sm:inline">Asociații</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-blue-900">{stats.totalAssociations}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-emerald-600 font-medium mb-0.5">
                <span className="sm:hidden">Apt</span>
                <span className="hidden sm:inline">Apartamente</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-emerald-900">{stats.totalApartments || 0}</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-cyan-600 font-medium mb-0.5">
                <span className="sm:hidden">Pers</span>
                <span className="hidden sm:inline">Persoane</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-cyan-900">{stats.totalPersons || 0}</p>
            </div>
            <div className="bg-violet-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-violet-600 font-medium mb-0.5">
                <span className="sm:hidden">Bloc</span>
                <span className="hidden sm:inline">Blocuri</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-violet-900">{stats.totalBlocks || 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-amber-600 font-medium mb-0.5">
                <span className="sm:hidden">Scări</span>
                <span className="hidden sm:inline">Scări</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-amber-900">{stats.totalStairs || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Actions */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
            {isOwner && (
              <button
                onClick={onInviteMember}
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Invită membru</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={onAllocateAssociation}
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-white text-gray-700 text-sm sm:text-base font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Link2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Alocă asociație</span>
              </button>
            )}

            <button
              onClick={onCreateAssociation}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-white text-gray-700 text-sm sm:text-base font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Asociație nouă</span>
            </button>
          </div>
        )}

        {/* Associations Section */}
        <div>
          {/* Section Header with View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Home className="w-5 h-5 mr-2 text-emerald-600" />
              Asociații {loadingAssociations ? '' : `(${associations.length})`}
            </h2>

            {/* View Toggle Buttons */}
            {associations.length > 0 && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Afișare carduri"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Afișare listă"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {loadingAssociations ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-500 mt-3 text-sm">Se încarcă asociațiile...</p>
            </div>
          ) : associations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-12 text-center">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nicio asociație încă
              </h3>
              <p className="text-gray-500 mb-4">
                Adaugă prima asociație în organizație pentru a începe.
              </p>
              {isAdmin && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={onAllocateAssociation}
                    className="inline-flex items-center px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Alocă existentă
                  </button>
                  <button
                    onClick={onCreateAssociation}
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Creează nouă
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* Card View */
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {associations.map(assoc => (
                <AssociationCard key={assoc.id} assoc={assoc} />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              {associations.map(assoc => (
                <div
                  key={assoc.id}
                  onClick={() => onSelectAssociation(assoc)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <HealthIndicator association={assoc} />
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900">{assoc.name}</h3>
                      <p className="text-sm text-gray-500">
                        {assoc.address?.city}, {assoc.address?.county}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6">
                    {/* Stats - full on desktop, compact on mobile */}
                    <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-500" />
                        {assoc.stats?.totalApartments ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {assoc.stats?.totalPersons ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-500" />
                        {assoc.stats?.totalBlocks ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-orange-500 font-medium text-xs">Sc</span>
                        {assoc.stats?.totalStairs ?? 0}
                      </span>
                    </div>

                    {/* Mobile compact stats */}
                    <div className="sm:hidden text-xs text-gray-600">
                      <span>{assoc.stats?.totalApartments ?? 0} apt</span>
                      <span className="mx-1">•</span>
                      <span>{assoc.stats?.totalPersons ?? 0} pers</span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Info Card */}
        {isOwner && billing.status && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                  Informații Facturare
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Plan: <span className="font-medium capitalize">{billing.tier || 'Starter'}</span>
                  {' • '}
                  {stats.totalApartments || 0} apartamente
                </p>
              </div>

              {billing.status === 'trial' && billing.trialEndsAt && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Trial expiră în</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.ceil((new Date(billing.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))} zile
                  </p>
                </div>
              )}
            </div>

            {billing.status === 'overdue' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-yellow-800">Plată restantă</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Contul tău are o plată restantă. Te rugăm să efectuezi plata pentru a evita suspendarea.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationView;
