import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Building2,
  MoreVertical,
  RefreshCw,
  Mail,
  Eye,
  Gift,
  Percent,
  Ban,
  Play
} from 'lucide-react';
import { useAdminBilling } from '../../hooks/useAdminBilling';

/**
 * 👥 USER MANAGEMENT COMPONENT
 *
 * Lista și gestionare useri pentru admin:
 * - Lista useri cu filtrare și căutare
 * - Acțiuni rapide (extend trial, discount, suspend)
 * - Statistici per user
 */

// Configurare status-uri
const STATUS_CONFIG = {
  trial: {
    label: 'Trial',
    icon: Clock,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500'
  },
  active: {
    label: 'Activ',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500'
  },
  past_due: {
    label: 'Expirat',
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500'
  },
  suspended: {
    label: 'Suspendat',
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500'
  },
  cancelled: {
    label: 'Anulat',
    icon: XCircle,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    dotColor: 'bg-gray-400'
  }
};

/**
 * Formatează data
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Calculează zilele rămase din trial
 */
const getTrialDaysRemaining = (trialEndsAt) => {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
};

/**
 * Badge status
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.trial;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${config.bgColor} ${config.textColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
};

/**
 * Dropdown menu pentru acțiuni
 */
const ActionMenu = ({ user, onAction, isOpen, onToggle }) => {
  if (!isOpen) return null;

  const actions = [
    { id: 'view', label: 'Vezi detalii', icon: Eye },
    { id: 'extend_trial', label: 'Extinde trial', icon: Gift },
    { id: 'set_discount', label: 'Setează discount', icon: Percent },
    { divider: true },
    user.subscription?.status === 'suspended'
      ? { id: 'reactivate', label: 'Reactivează', icon: Play }
      : { id: 'suspend', label: 'Suspendă', icon: Ban, danger: true }
  ];

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onToggle} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-20 py-1">
        {actions.map((action, idx) => {
          if (action.divider) {
            return <div key={idx} className="border-t my-1" />;
          }

          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => { onAction(action.id, user); onToggle(); }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50
                ${action.danger ? 'text-red-600' : 'text-gray-700'}`}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </>
  );
};

/**
 * Rând pentru un user
 */
const UserRow = ({ user, onAction, onSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const status = user.subscription?.status || user.subscriptionStatus || 'trial';
  const trialDays = getTrialDaysRemaining(user.subscription?.trialEndsAt);
  const hasCustomPricing = user.subscription?.customPricing?.enabled;

  // Verifică dacă trial-ul a expirat
  const effectiveStatus = status === 'trial' && trialDays !== null && trialDays <= 0
    ? 'past_due'
    : status;

  return (
    <tr className="hover:bg-gray-50">
      {/* User info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {user.profile?.personalInfo?.firstName} {user.profile?.personalInfo?.lastName}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {user.email}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <StatusBadge status={effectiveStatus} />
        {status === 'trial' && trialDays !== null && trialDays > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {trialDays} zile rămase
          </div>
        )}
      </td>

      {/* Asociații */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 text-gray-700">
          <Building2 className="w-4 h-4 text-gray-400" />
          {user.associationsCount || 0}
        </div>
      </td>

      {/* Pricing */}
      <td className="px-6 py-4">
        {hasCustomPricing ? (
          <div className="text-sm">
            <span className="text-green-600 font-medium">
              {user.subscription.customPricing.pricePerApartment} RON
            </span>
            {user.subscription.customPricing.discountPercent > 0 && (
              <span className="text-xs text-green-500 ml-1">
                (-{user.subscription.customPricing.discountPercent}%)
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500">Standard (5 RON)</span>
        )}
      </td>

      {/* Data înregistrare */}
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDate(user.createdAt)}
      </td>

      {/* Acțiuni */}
      <td className="px-6 py-4">
        <div className="relative flex items-center justify-end gap-2">
          <button
            onClick={() => onSelect(user)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Vezi detalii"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <ActionMenu
            user={user}
            isOpen={menuOpen}
            onToggle={() => setMenuOpen(false)}
            onAction={onAction}
          />
        </div>
      </td>
    </tr>
  );
};

/**
 * Modal pentru extend trial
 */
const ExtendTrialModal = ({ user, isOpen, onClose, onConfirm, loading }) => {
  const [days, setDays] = useState(30);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-blue-500" />
          Extinde Trial
        </h3>

        <p className="text-gray-600 mb-4">
          Extinde trial-ul pentru <strong>{user?.email}</strong>
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Număr de zile
          </label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            min="1"
            max="365"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            onClick={() => onConfirm(days)}
            disabled={loading || days <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Se procesează...' : 'Extinde'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal pentru setare discount
 */
const SetDiscountModal = ({ user, isOpen, onClose, onConfirm, loading }) => {
  const [pricing, setPricing] = useState({
    pricePerApartment: user?.subscription?.customPricing?.pricePerApartment || 5,
    discountPercent: user?.subscription?.customPricing?.discountPercent || 0,
    discountReason: user?.subscription?.customPricing?.discountReason || ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-500" />
          Setează Pricing Custom
        </h3>

        <p className="text-gray-600 mb-4">
          Pricing pentru <strong>{user?.email}</strong>
        </p>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preț per apartament (RON)
            </label>
            <input
              type="number"
              value={pricing.pricePerApartment}
              onChange={(e) => setPricing(p => ({ ...p, pricePerApartment: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.5"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount (%)
            </label>
            <input
              type="number"
              value={pricing.discountPercent}
              onChange={(e) => setPricing(p => ({ ...p, discountPercent: parseInt(e.target.value) || 0 }))}
              min="0"
              max="100"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motiv (opțional)
            </label>
            <input
              type="text"
              value={pricing.discountReason}
              onChange={(e) => setPricing(p => ({ ...p, discountReason: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Contract negociat manual"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Anulează
          </button>
          <button
            onClick={() => onConfirm(pricing)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Se procesează...' : 'Salvează'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Componenta principală UserManagement
 */
const UserManagement = ({ onSelectUser, adminUserId }) => {
  const {
    getUsers,
    extendUserTrial,
    setCustomPricing,
    suspendUser,
    reactivateUser,
    loading
  } = useAdminBilling();

  const [users, setUsers] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [extendTrialModal, setExtendTrialModal] = useState({ open: false, user: null });
  const [discountModal, setDiscountModal] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Încarcă userii
  const loadUsers = useCallback(async (append = false) => {
    setIsRefreshing(true);

    try {
      const result = await getUsers({
        pageSize: 20,
        lastDoc: append ? lastDoc : null,
        status: filterStatus !== 'all' ? filterStatus : null
      });

      if (append) {
        setUsers(prev => [...prev, ...result.users]);
      } else {
        setUsers(result.users);
      }
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [getUsers, filterStatus, lastDoc]);

  useEffect(() => {
    loadUsers(false);
  }, [filterStatus]);

  // Handler pentru acțiuni
  const handleAction = async (actionId, user) => {
    switch (actionId) {
      case 'view':
        onSelectUser?.(user);
        break;
      case 'extend_trial':
        setExtendTrialModal({ open: true, user });
        break;
      case 'set_discount':
        setDiscountModal({ open: true, user });
        break;
      case 'suspend':
        if (window.confirm(`Sigur vrei să suspendezi ${user.email}?`)) {
          setActionLoading(true);
          try {
            await suspendUser(user.id, 'Suspendat de admin', adminUserId);
            loadUsers(false);
          } catch (err) {
            alert('Eroare: ' + err.message);
          } finally {
            setActionLoading(false);
          }
        }
        break;
      case 'reactivate':
        if (window.confirm(`Sigur vrei să reactivezi ${user.email}?`)) {
          setActionLoading(true);
          try {
            await reactivateUser(user.id, adminUserId);
            loadUsers(false);
          } catch (err) {
            alert('Eroare: ' + err.message);
          } finally {
            setActionLoading(false);
          }
        }
        break;
      default:
        break;
    }
  };

  // Handler extend trial
  const handleExtendTrial = async (days) => {
    setActionLoading(true);
    try {
      await extendUserTrial(extendTrialModal.user.id, days, adminUserId);
      setExtendTrialModal({ open: false, user: null });
      loadUsers(false);
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler set discount
  const handleSetDiscount = async (pricing) => {
    setActionLoading(true);
    try {
      await setCustomPricing(discountModal.user.id, pricing, adminUserId);
      setDiscountModal({ open: false, user: null });
      loadUsers(false);
    } catch (err) {
      alert('Eroare: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrare client-side pentru search
  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.profile?.personalInfo?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.profile?.personalInfo?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Gestionare Useri
          </h1>
          <p className="text-gray-500">
            {users.length} useri încărcați
          </p>
        </div>
        <button
          onClick={() => loadUsers(false)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg
            text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizează
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după email sau nume..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toate statusurile</option>
            <option value="trial">Trial</option>
            <option value="active">Activ</option>
            <option value="past_due">Expirat</option>
            <option value="suspended">Suspendat</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asociații
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pricing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Înregistrat
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acțiuni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onAction={handleAction}
                onSelect={() => onSelectUser?.(user)}
              />
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredUsers.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Nu au fost găsiți useri</p>
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 border-t text-center">
            <button
              onClick={() => loadUsers(true)}
              disabled={isRefreshing}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isRefreshing ? 'Se încarcă...' : 'Încarcă mai mulți'}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <ExtendTrialModal
        user={extendTrialModal.user}
        isOpen={extendTrialModal.open}
        onClose={() => setExtendTrialModal({ open: false, user: null })}
        onConfirm={handleExtendTrial}
        loading={actionLoading}
      />

      <SetDiscountModal
        user={discountModal.user}
        isOpen={discountModal.open}
        onClose={() => setDiscountModal({ open: false, user: null })}
        onConfirm={handleSetDiscount}
        loading={actionLoading}
      />
    </div>
  );
};

export default UserManagement;
