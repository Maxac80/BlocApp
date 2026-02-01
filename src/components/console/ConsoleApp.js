import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConsoleDashboard from './ConsoleDashboard';
import UserManagement from './UserManagement';
import UserBillingDetails from './UserBillingDetails';
import PendingPayments from './PendingPayments';

/**
 * 👑 CONSOLE APP - BLOCAPP OWNER PORTAL
 *
 * Aplicația principală pentru console (console.blocapp.ro).
 * Aceasta este zona ta de super-admin ca owner BlocApp.
 *
 * Include:
 * - Sidebar navigation
 * - Verificare rol super_admin
 * - Routing între pagini
 *
 * IMPORTANT: Această componentă trebuie protejată să fie accesibilă
 * DOAR pentru userii cu rol super_admin!
 *
 * Notă: "admin" în BlocApp = administratorii de asociații (clienții)
 *       "console/super_admin" = tu, owner-ul BlocApp
 */

// Configurare navigare
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Useri', icon: Users },
  { id: 'payments', label: 'Plăți Pending', icon: CreditCard },
  // { id: 'invoices', label: 'Facturi', icon: FileText },
  // { id: 'settings', label: 'Setări', icon: Settings }
];

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
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300
      lg:translate-x-0 lg:static lg:inset-auto
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-white">BlocApp</div>
              <div className="text-xs text-gray-400">Console</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white lg:hidden"
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
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400
              hover:text-white hover:bg-gray-800 transition-colors"
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
 * Main Console App Component
 */
const ConsoleApp = () => {
  const { currentUser, userProfile, logout } = useAuth();

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verifică dacă user-ul este super_admin
  const isSuperAdmin = userProfile?.role === 'super_admin';

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

  // Verifică acces
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied />;
  }

  // Render content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ConsoleDashboard onNavigate={handleNavigate} />;

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
        return <ConsoleDashboard onNavigate={handleNavigate} />;
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
          <div className="font-bold text-gray-900">BlocApp Console</div>
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

export default ConsoleApp;
