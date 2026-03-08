/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  ChevronRight,
  Users,
  Settings,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useAssociations } from '../../hooks/useAssociations';
import { usePermissions } from '../../hooks/usePermissions';
import OrgHeader from '../common/OrgHeader';

/**
 * 🏠 PAGINA DE SELECȚIE CONTEXT
 *
 * Afișează:
 * - Organizațiile utilizatorului (firme de administrare)
 * - Asociațiile administrate direct (fără firmă)
 * - Opțiuni pentru creare organizație/asociație nouă
 *
 * Pattern UI:
 * - 0 items → CTA mare pentru creare
 * - 1-3 items → Cards mari cu detalii
 * - 4+ items → Cards compacte cu scroll
 */
const ContextSelectorView = ({
  userId,
  userProfile,
  activeUser,
  onSelectOrganization,
  onSelectAssociation,
  onCreateOrganization,
  onCreateAssociation,
  // Dropdown props pentru OrgHeader
  onNavigate,
  onDeleteData,
  isAdmin = false
}) => {
  const { organizations, loading: orgsLoading, loadUserOrganizations } = useOrganizations(userId);
  const { associations, loading: assocsLoading, loadUserDirectAssociations } = useAssociations(userId);
  const { hasPermission, PERMISSIONS } = usePermissions(userId);

  const [stats, setStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);

  // Încarcă datele la mount
  useEffect(() => {
    if (userId) {
      loadUserOrganizations(userId);
      loadUserDirectAssociations(userId);
    }
  }, [userId, loadUserOrganizations, loadUserDirectAssociations]);

  const loading = orgsLoading || assocsLoading;

  // Filtrăm asociațiile care NU au organizationId (doar cele directe)
  // Aceasta previne duplicări când o asociație a fost mutată într-o organizație
  const directAssociations = (associations || []).filter(assoc => !assoc.organizationId);

  // La lansare: doar asociații directe (organizațiile sunt ascunse din UI)
  const totalItems = directAssociations.length;

  // Determină layout-ul bazat pe numărul de items
  const getLayoutStyle = () => {
    if (totalItems === 0) return 'empty';
    if (totalItems <= 3) return 'large';
    return 'compact';
  };

  const layoutStyle = getLayoutStyle();

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
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Organization Card Component
  const OrganizationCard = ({ org, isLarge }) => {
    const orgStats = org.billing || {};

    return (
      <div
        onClick={() => onSelectOrganization(org)}
        className={`
          bg-white rounded-xl border-2 border-gray-100 hover:border-blue-300
          hover:shadow-lg transition-all duration-200 cursor-pointer
          border-l-[3px] border-l-blue-500
          ${isLarge ? 'p-6' : 'p-4'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className={`font-semibold text-gray-900 truncate ${isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
                {org.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {org.userRole === 'org_owner' ? 'Proprietar' :
                 org.userRole === 'org_admin' ? 'Administrator' : 'Membru'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={orgStats.status || 'trial'} />
          </div>
        </div>

        {/* Stats */}
        {isLarge && (
          <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-4">
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Asoc</span>
                <span className="hidden sm:inline">Asociații</span>
              </p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {orgStats.totalAssociations || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Apt</span>
                <span className="hidden sm:inline">Apartamente</span>
              </p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {orgStats.totalApartments || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Pers</span>
                <span className="hidden sm:inline">Persoane</span>
              </p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {orgStats.totalPersons || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Bloc</span>
                <span className="hidden sm:inline">Blocuri</span>
              </p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {orgStats.totalBlocks || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Scări</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {orgStats.totalStairs || 0}
              </p>
            </div>
          </div>
        )}

        {/* Contact Info (only large) */}
        {isLarge && org.contact && (
          <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
            {org.contact.phone && (
              <div className="flex items-center">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400" />
                {org.contact.phone}
              </div>
            )}
            {org.contact.email && (
              <div className="flex items-center truncate">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{org.contact.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
          <span className="text-xs sm:text-sm text-gray-500">
            {org.cui && `CUI: ${org.cui}`}
          </span>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </div>
      </div>
    );
  };

  // Association Card Component
  const AssociationCard = ({ assoc, isLarge }) => {
    const assocStats = assoc.stats || {};
    const billing = assoc.billing || {};

    return (
      <div
        onClick={() => onSelectAssociation(assoc)}
        className={`
          bg-white rounded-xl border-2 border-gray-100 hover:border-blue-300
          hover:shadow-lg transition-all duration-200 cursor-pointer
          border-l-[3px] border-l-blue-500
          ${isLarge ? 'p-4 sm:p-6' : 'p-4'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Building className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className={`font-semibold text-gray-900 truncate ${isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
                {assoc.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {assoc.userRole === 'assoc_president' ? 'Președinte' :
                 assoc.userRole === 'assoc_censor' ? 'Cenzor' :
                 'Administrator'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={billing.status || 'trial'} />
          </div>
        </div>

        {/* Stats */}
        {isLarge && (
          <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-3 sm:mb-4">
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Apt</span>
                <span className="hidden sm:inline">Apartamente</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-gray-900">
                {assocStats.totalApartments ?? '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Pers</span>
                <span className="hidden sm:inline">Persoane</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-gray-900">
                {assocStats.totalPersons ?? '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">
                <span className="sm:hidden">Bloc</span>
                <span className="hidden sm:inline">Blocuri</span>
              </p>
              <p className="text-sm sm:text-xl font-bold text-gray-900">
                {assocStats.totalBlocks ?? '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-1.5 sm:p-3 text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Scări</p>
              <p className="text-sm sm:text-xl font-bold text-gray-900">
                {assocStats.totalStairs ?? '—'}
              </p>
            </div>
          </div>
        )}

        {/* Address (only large) */}
        {isLarge && assoc.address && (
          <div className="flex items-start text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-2">
              {assoc.address.street} {assoc.address.number},
              {assoc.address.city}, {assoc.address.county}
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

  // Empty State Component
  const EmptyState = () => (
    <div className="text-center py-16 px-4">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Briefcase className="w-12 h-12 text-blue-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Bine ai venit în BlocApp!
      </h2>

      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Pentru a începe, creează o asociație de proprietari pe care o administrezi.
      </p>

      <div className="flex justify-center">
        {hasPermission(PERMISSIONS.ASSOC_CREATE) && (
          <button
            onClick={onCreateAssociation}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Building className="w-5 h-5 mr-2" />
            Creează Asociație
          </button>
        )}
      </div>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <OrgHeader
        userProfile={userProfile}
        activeUser={activeUser}
        onLogoClick={() => {}}
        isAdmin={isAdmin}
        onNavigate={onNavigate}
        onDeleteData={onDeleteData}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Asociațiile mele
              </p>
            </div>

            {/* Quick Actions */}
            {totalItems > 0 && hasPermission(PERMISSIONS.ASSOC_CREATE) && (
              <div className="flex items-center justify-end flex-shrink-0">
                <button
                  onClick={onCreateAssociation}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Asociație nouă
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {layoutStyle === 'empty' ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {/* Associations Section */}
            {directAssociations.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-blue-600" />
                    Asociațiile mele ({directAssociations.length})
                  </h2>
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {directAssociations.map(assoc => (
                    <AssociationCard
                      key={assoc.id}
                      assoc={assoc}
                      isLarge={true}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextSelectorView;
