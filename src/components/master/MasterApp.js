import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MasterDashboard from './MasterDashboard';
import UserManagement from './UserManagement';
import UserBillingDetails from './UserBillingDetails';
import PendingPayments from './PendingPayments';

/**
 * 👑 MASTER APP - BLOCAPP OWNER PORTAL
 *
 * Aplicația principală pentru master (master.blocapp.ro).
 * Aceasta este zona ta de master ca owner BlocApp.
 *
 * Include:
 * - Sidebar navigation
 * - Verificare rol master
 * - Routing între pagini
 *
 * IMPORTANT: Această componentă trebuie protejată să fie accesibilă
 * DOAR pentru userii cu rol master!
 *
 * Notă: "admin" în BlocApp = administratorii de asociații (clienții)
 *       "master" = tu, owner-ul BlocApp
 */

// Configurare navigare
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Useri', icon: Users },
  { id: 'payments', label: 'Plăți Pending', icon: CreditCard }
];

/**
 * Master Login Form
 */
const MasterLogin = ({ onLogin }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      if (onLogin) onLogin();
    } catch (err) {
      setError(err.message || 'Email sau parolă incorectă');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-violet-100 p-4">
      <div className="w-full max-w-md">
        {/* Header cu Logo */}
        <div className="text-center mb-4 sm:mb-6">
          <a href="https://blocapp.ro" className="flex items-center justify-center mb-4 hover:opacity-80 transition-opacity">
            <img
              src="/logo-master.png"
              alt="BlocApp Master"
              className="h-20 object-contain"
            />
          </a>
          <p className="text-gray-500 text-xs">Master Portal - Gestionare utilizatori și billing</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">
          {/* Header Login */}
          <div className="text-center mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Autentificare</h2>
            <p className="text-gray-600 text-sm mt-1">Conectează-te la contul tău de master</p>
          </div>

          {/* Erori globale */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Formular Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={`w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors border-gray-300 bg-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="email@exemplu.ro"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Parolă
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={`w-full pl-9 pr-10 py-2 sm:py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors border-gray-300 bg-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Parola ta"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="rememberMe" className="ml-2 text-xs text-gray-700">
                Ține-mă conectat
              </label>
            </div>

            {/* Buton Login */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-purple-600 text-white py-2 sm:py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Se conectează...
                </div>
              ) : (
                'Conectează-te'
              )}
            </button>
          </form>

          {/* Securitate Info */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center text-[10px] sm:text-xs text-gray-500">
              <Shield className="w-3.5 h-3.5 mr-1" />
              Conexiune securizată SSL • Acces restricționat
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Sidebar Navigation
 */
const Sidebar = ({ currentPage, onNavigate, onLogout, isOpen, onClose }) => (
  <>
    {/* Mobile overlay */}
    {isOpen && (
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
    )}

    {/* Sidebar */}
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300
      lg:translate-x-0 lg:static lg:inset-auto
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        {/* Header with Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src="/blocapp-logo-master.png"
              alt="BlocApp Master"
              className="h-10 object-contain"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                  ${isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500
              hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Deconectare
          </button>
        </div>
      </div>
    </aside>
  </>
);

/**
 * Access Denied Component
 */
const AccessDenied = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <Shield className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Acces restricționat
      </h1>
      <p className="text-gray-500 mb-6">
        Nu ai permisiunea de a accesa această pagină. Doar administratorii de sistem au acces.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg
          hover:bg-blue-700 transition-colors"
      >
        Înapoi la aplicație
      </a>
    </div>
  </div>
);

/**
 * Main Master App Component
 */
const MasterApp = () => {
  const { currentUser, userProfile, logout, loading } = useAuth();

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verifică dacă user-ul este master
  const isMaster = userProfile?.role === 'master';

  // Handler pentru navigare
  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSelectedUser(null);
  };

  // Handler pentru selectare user
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setCurrentPage('user_details');
  };

  // Handler pentru logout
  const handleLogout = async () => {
    if (window.confirm('Sigur vrei să te deconectezi?')) {
      await logout();
    }
  };

  // Loading state - also wait for userProfile when user is logged in
  const isProfileLoading = currentUser && !userProfile;

  if (loading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-700">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!currentUser) {
    return <MasterLogin />;
  }

  // Access denied if not master (only show after profile is loaded)
  if (!isMaster) {
    return <AccessDenied />;
  }

  // Render content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <MasterDashboard onNavigate={handleNavigate} />;

      case 'users':
        return (
          <UserManagement
            onSelectUser={handleSelectUser}
            adminUserId={currentUser.uid}
          />
        );

      case 'user_details':
        return selectedUser ? (
          <UserBillingDetails
            userId={selectedUser.id}
            onBack={() => handleNavigate('users')}
            adminUserId={currentUser.uid}
          />
        ) : (
          handleNavigate('users')
        );

      case 'payments':
        return <PendingPayments adminUserId={currentUser.uid} />;

      default:
        return <MasterDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="font-bold text-gray-900">BlocApp Master</div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <div className="overflow-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default MasterApp;
