import React, { useState, createContext, useContext } from 'react';
import OwnerSidebar from './OwnerSidebar';
import OwnerHeader from './OwnerHeader';
import OwnerDashboardView from './views/OwnerDashboardView';
import OwnerHistoryView from './views/OwnerHistoryView';
import OwnerPaymentsView from './views/OwnerPaymentsView';
import OwnerMetersView from './views/OwnerMetersView';

/**
 * Context pentru datele apartamentului selectat
 */
export const OwnerContext = createContext(null);

export const useOwnerContext = () => {
  const context = useContext(OwnerContext);
  if (!context) {
    throw new Error('useOwnerContext must be used within OwnerApp');
  }
  return context;
};

/**
 * Aplicația principală pentru Portal Proprietari
 *
 * Props:
 * - apartmentInfo: Informații despre apartamentul selectat
 * - userApartments: Lista tuturor apartamentelor utilizatorului (pentru switch)
 * - onChangeApartment: Handler pentru schimbare apartament (null dacă are doar unul)
 * - onLogout: Handler pentru deconectare
 * - isDevMode: Flag dacă e în modul development (bypass)
 */
export default function OwnerApp({
  apartmentInfo,
  userApartments = [],
  onChangeApartment,
  onLogout,
  isDevMode = false
}) {
  // State pentru navigare între views
  const [currentView, setCurrentView] = useState('dashboard');

  // State pentru sidebar pe mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Context value pentru proprietar
  const contextValue = {
    // Date apartament
    apartmentId: apartmentInfo.apartmentId,
    apartmentNumber: apartmentInfo.apartmentNumber,
    apartmentData: apartmentInfo.apartmentData,
    associationId: apartmentInfo.associationId,
    associationName: apartmentInfo.associationName,
    associationData: apartmentInfo.associationData,
    // Lista apartamente (pentru afișare în UI dacă are mai multe)
    userApartments,
    hasMultipleApartments: userApartments.length > 1,
    // Acțiuni
    onChangeApartment,
    onLogout,
    // Mod development
    isDevMode
  };

  // Render view curent
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <OwnerDashboardView onNavigate={setCurrentView} />;
      case 'history':
        return <OwnerHistoryView onNavigate={setCurrentView} />;
      case 'payments':
        return <OwnerPaymentsView onNavigate={setCurrentView} />;
      case 'meters':
        return <OwnerMetersView onNavigate={setCurrentView} />;
      default:
        return <OwnerDashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <OwnerContext.Provider value={contextValue}>
      <div className="h-screen flex overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <OwnerSidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <OwnerHeader
            onMenuClick={() => setSidebarOpen(true)}
          />

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto">
            {renderCurrentView()}
          </main>
        </div>
      </div>
    </OwnerContext.Provider>
  );
}
