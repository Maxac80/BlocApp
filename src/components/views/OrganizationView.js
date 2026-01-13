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
  Link2
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
    totalRestante: 0,
    totalDeIncasat: 0
  });

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

      // Calculează statistici
      setStats({
        totalAssociations: (assocs || []).length,
        totalApartments: 0,
        totalPersons: 0,
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
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {currentOrganization.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {currentOrganization.cui && `CUI: ${currentOrganization.cui}`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <StatusBadge status={billing.status || 'trial'} />

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

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Asociații</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalAssociations}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 font-medium mb-1">Apartamente</p>
              <p className="text-2xl font-bold text-emerald-900">{billing.totalApartments || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 font-medium mb-1">Cost lunar</p>
              <p className="text-2xl font-bold text-purple-900">
                {billing.monthlyAmount || 0} RON
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">Tier</p>
              <p className="text-2xl font-bold text-orange-900 capitalize">
                {billing.tier || 'starter'}
              </p>
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

        {/* Associations List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Home className="w-5 h-5 mr-2 text-emerald-600" />
              Asociații {loadingAssociations ? '' : `(${associations.length})`}
            </h2>
          </div>

          {loadingAssociations ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-500 mt-3 text-sm">Se încarcă asociațiile...</p>
            </div>
          ) : associations.length === 0 ? (
            <div className="px-6 py-12 text-center">
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
          ) : (
            <div className="divide-y divide-gray-100">
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

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">— apt</p>
                      <p className="text-xs text-gray-500">apartamente</p>
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
                  {billing.totalApartments || 0} apartamente
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
