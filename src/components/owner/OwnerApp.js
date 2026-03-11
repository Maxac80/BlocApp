import React, { useState, createContext, useContext } from 'react';
import { Building2, MapPin, User } from 'lucide-react';
import OwnerSidebar from './OwnerSidebar';
import OwnerHeader from './OwnerHeader';
import OwnerBottomNavigation from './OwnerBottomNavigation';
import OwnerDashboardView from './views/OwnerDashboardView';
import OwnerHistoryView from './views/OwnerHistoryView';
import OwnerMetersView from './views/OwnerMetersView';
import OwnerMembersView from './views/OwnerMembersView';
import OwnerMessagesView from './views/OwnerMessagesView';
import OwnerProfileView from './views/OwnerProfileView';
import { useOwnerMessaging } from '../../hooks/useOwnerMessaging';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';

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
 * Aplicația principală pentru Portal Locatari
 *
 * Layout pattern identic cu BlocApp.js:
 * - Desktop: Sidebar stânga (hidden lg:flex) + content
 * - Mobile: Mobile header (lg:hidden) + content + bottom nav (lg:hidden)
 */
export default function OwnerApp({
  apartmentInfo,
  userApartments = [],
  onChangeApartment,
  onLogout,
  isDevMode = false,
  ownerProfile = null,
  onNavigateStandalone = null
}) {
  const [currentView, setCurrentView] = useState('dashboard');
  const { currentUser } = useAuthEnhanced();

  // Context value
  const contextValue = {
    apartmentId: apartmentInfo.apartmentId,
    apartmentNumber: apartmentInfo.apartmentNumber,
    apartmentData: apartmentInfo.apartmentData,
    associationId: apartmentInfo.associationId,
    associationName: apartmentInfo.associationName,
    associationData: apartmentInfo.associationData,
    userApartments,
    hasMultipleApartments: userApartments.length > 1,
    role: apartmentInfo.role || 'proprietar',
    onChangeApartment,
    onLogout,
    isDevMode,
    ownerProfile,
    onNavigateStandalone
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <OwnerDashboardView onNavigate={setCurrentView} />;
      case 'history':
        return <OwnerHistoryView onNavigate={setCurrentView} />;
      case 'payments':
        return <OwnerHistoryView onNavigate={setCurrentView} />;
      case 'meters':
        return <OwnerMetersView onNavigate={setCurrentView} />;
      case 'members':
        return <OwnerMembersView />;
      case 'messages':
        return <OwnerMessagesView />;
      case 'profile':
        return <OwnerProfileView />;
      default:
        return <OwnerDashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <OwnerContext.Provider value={contextValue}>
      <UnreadBadgeProvider associationId={apartmentInfo.associationId} apartmentId={apartmentInfo.apartmentId}>
        {(unreadMessages) => (
          <div className="flex h-screen bg-gray-50">
            {/* Sidebar - desktop only */}
            <OwnerSidebar
              currentView={currentView}
              onNavigate={setCurrentView}
            />

            {/* Mobile Header - mobile only */}
            <OwnerHeader onNavigate={setCurrentView} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
              <main className="flex-1 overflow-y-auto owner-content-padding" style={{ scrollbarGutter: 'stable' }}>
                <style>{`
                  .owner-content-padding {
                    padding-top: calc(3.5rem + env(safe-area-inset-top, 0px));
                    padding-bottom: 5rem;
                  }
                  @media (min-width: 1024px) {
                    .owner-content-padding {
                      padding-top: 0;
                      padding-bottom: 0;
                    }
                  }
                `}</style>
                {/* Header card - apartment info (like admin DashboardHeader) */}
                <OwnerContentHeader apartmentInfo={apartmentInfo} ownerProfile={ownerProfile} />
                {renderCurrentView()}
              </main>
            </div>

            {/* Bottom Navigation - mobile only */}
            <OwnerBottomNavigation
              currentView={currentView}
              handleNavigation={setCurrentView}
              unreadMessages={unreadMessages}
            />
          </div>
        )}
      </UnreadBadgeProvider>
    </OwnerContext.Provider>
  );
}

/**
 * Content header card - apartment info (pattern identic cu DashboardHeader din admin)
 * Pe mobil: compact. Pe desktop: card cu shadow.
 */
function OwnerContentHeader({ apartmentInfo, ownerProfile }) {
  const address = apartmentInfo.associationData?.address;
  const ownerName = apartmentInfo.apartmentData?.ownerName || apartmentInfo.apartmentData?.owner || null;

  const aptData = apartmentInfo.apartmentData;
  const blockName = aptData?.block || aptData?.blockName || null;
  const stairName = aptData?.stair || aptData?.stairName || null;

  // Build location: street, bloc, scara, city, county
  const locationParts = [];
  if (typeof address === 'string') {
    locationParts.push(address);
  } else if (address) {
    const streetPart = [address.street, address.number].filter(Boolean).join(' ');
    if (streetPart) locationParts.push(streetPart);
    if (blockName) locationParts.push(blockName);
    if (stairName) locationParts.push(stairName);
    const cityCounty = [address.city, address.county].filter(Boolean).join(', ');
    if (cityCounty) locationParts.push(cityCounty);
  } else {
    if (blockName) locationParts.push(blockName);
    if (stairName) locationParts.push(stairName);
  }

  return (
    <header className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-4 mb-2 sm:mb-4">
      <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-lg border border-emerald-100">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Apartment number badge */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 font-bold text-lg sm:text-xl">
              {apartmentInfo.apartmentNumber}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
              Ap. {apartmentInfo.apartmentNumber}{ownerName ? ` — ${ownerName}` : ''}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">
              {[apartmentInfo.associationName, locationParts.join(', ')].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Helper component to provide unread count without duplicating messaging subscription
 */
function UnreadBadgeProvider({ associationId, apartmentId, children }) {
  const { currentUser } = useAuthEnhanced();
  const { subscribeToConversations, getOwnerUnreadCount } = useOwnerMessaging(associationId, apartmentId);

  React.useEffect(() => {
    if (associationId) {
      const unsub = subscribeToConversations({ archiveField: 'isArchivedOwner' });
      return () => { if (unsub) unsub(); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [associationId]);

  const unreadMessages = currentUser?.uid ? getOwnerUnreadCount(currentUser.uid) : 0;
  return children(unreadMessages);
}
