import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, Share2, X, FileText, Coins, Settings, Building, Truck, ChevronUp, MessageSquare } from 'lucide-react';
import UserDropdownMenu from './UserDropdownMenu';
import { useMessaging } from '../../hooks/useMessaging';

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarExpanded,
  setSidebarExpanded,
  currentView,
  handleNavigation,
  association,
  getAssociationApartments,
  deleteAllBlocAppData,
  userProfile,
  activeUser,
  setCurrentMonth,
  publishedSheet,
  currentSheet,
  onSwitchContext,
  userRole
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Roluri read-only: presedinte si cenzor nu pot edita
  const isReadOnlyRole = userRole === 'assoc_president' || userRole === 'assoc_censor';
  const isAdmin = !isReadOnlyRole;
  const isFounder = association?.adminId === activeUser?.uid;
  const roleLabel = userRole === 'assoc_president' ? 'Președinte'
    : userRole === 'assoc_censor' ? 'Cenzor'
    : isFounder ? 'Administrator Fondator'
    : 'Administrator';

  // Rezolvare nume din user doc (profile.personalInfo prioritar)
  const userName = userProfile?.profile?.personalInfo?.firstName
    ? `${userProfile.profile.personalInfo.firstName} ${userProfile.profile.personalInfo.lastName || ''}`.trim()
    : userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator';

  // Rezolvare avatar din user doc cu fallback pe association
  const avatarURL = userProfile?.avatarURL
    || userProfile?.profile?.documents?.avatar?.url
    || association?.adminProfile?.avatarURL;

  const initials = userProfile?.profile?.personalInfo?.firstName?.charAt(0)?.toUpperCase()
    || userProfile?.displayName?.charAt(0)?.toUpperCase()
    || activeUser?.email?.charAt(0)?.toUpperCase()
    || 'U';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Mesaje necitite
  const { conversations, subscribeToConversations, getUnreadCount } = useMessaging(association?.id);
  useEffect(() => {
    if (association?.id) {
      const unsub = subscribeToConversations();
      return () => { if (unsub) unsub(); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [association?.id]);
  const unreadMessages = activeUser?.uid ? getUnreadCount(activeUser.uid) : 0;

  // Functia pentru a naviga la Dashboard si la luna publicata activa
  const handleBlocAppClick = () => {
    if (publishedSheet?.monthYear) {
      setCurrentMonth(publishedSheet.monthYear);
    } else if (currentSheet?.monthYear) {
      setCurrentMonth(currentSheet.monthYear);
    }
    handleNavigation("dashboard");
  };

  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('../../firebase');
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error('Eroare la deconectare:', error);
    }
  };

  return (
  <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } ${sidebarExpanded ? 'w-64' : 'w-16'}`}>

    {/* Header Sidebar cu buton expand/collapse */}
    <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
      {sidebarExpanded ? (
        <button
          onClick={handleBlocAppClick}
          className="flex items-center hover:bg-gray-100 rounded-lg p-1 transition-colors cursor-pointer"
          title="Mergi la Dashboard - luna publicata activa"
        >
          <img
            src="/blocapp-logo.png"
            alt="BlocApp"
            className="h-10 object-contain"
          />
        </button>
      ) : (
        <button
          onClick={handleBlocAppClick}
          className="flex items-center justify-center w-full hover:bg-gray-100 rounded-lg p-1 transition-colors cursor-pointer"
          title="Mergi la Dashboard - luna publicata activa"
        >
          <img
            src="/blocapp-logo.png"
            alt="BlocApp"
            className="h-8 object-contain"
          />
        </button>
      )}

      {/* Buton expand/collapse pentru desktop */}
      <button
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
        className="hidden lg:block p-1 rounded-md hover:bg-gray-100 transition-colors ml-2 text-gray-600"
        title={sidebarExpanded ? "Micsoreste meniul" : "Mareste meniul"}
      >
        {sidebarExpanded ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {/* Buton inchidere pentru mobile */}
      <button
        onClick={() => setSidebarOpen(false)}
        className="lg:hidden p-1 rounded-md hover:bg-gray-100 text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Meniu Navigare - scrollabil */}
    <nav className="flex-1 mt-4 lg:mt-6 overflow-y-auto">
      <div className="px-2 space-y-1">
        {/* Întreținere */}
        <button
          onClick={() => handleNavigation("dashboard")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "dashboard"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ClipboardList className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Întreținere</div>
              <div className="text-xs text-gray-500 hidden lg:block">Tabel & încasări</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Întreținere
            </div>
          )}
        </button>

        {/* Distribuție cheltuieli */}
        <button
          onClick={() => handleNavigation("maintenance")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "maintenance"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Share2 className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Distribuție cheltuieli</div>
              <div className="text-xs text-gray-500 hidden lg:block">Distribuie cheltuielile lunare</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Distribuție cheltuieli
            </div>
          )}
        </button>

        {/* Apartamente */}
        <button
          onClick={() => handleNavigation("setup")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "setup"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Building className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Apartamente</div>
              <div className="text-xs text-gray-500 hidden lg:block">Blocuri, scari, apartamente</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Apartamente
            </div>
          )}
        </button>

        {/* Cheltuieli */}
        <button
          onClick={() => handleNavigation("expenses")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "expenses"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Coins className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Cheltuieli</div>
              <div className="text-xs text-gray-500 hidden lg:block">Configurare cheltuieli</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Cheltuieli
            </div>
          )}
        </button>

        {/* Furnizori */}
        <button
          onClick={() => handleNavigation("suppliers")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "suppliers"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Truck className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Furnizori</div>
              <div className="text-xs text-gray-500 hidden lg:block">Gestionare furnizori</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Furnizori
            </div>
          )}
        </button>

        {/* Facturi */}
        <button
          onClick={() => handleNavigation("accounting")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "accounting"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Facturi</div>
              <div className="text-xs text-gray-500 hidden lg:block">Gestionare facturi</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Facturi
            </div>
          )}
        </button>

        {/* Date Asociatie */}
        <button
          onClick={() => handleNavigation("association")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "association"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Settings className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3">
              <div className="text-sm lg:text-base font-medium">Setări Asociație</div>
              <div className="text-xs text-gray-500 hidden lg:block">Date și configurări</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Setări Asociație
            </div>
          )}
        </button>

        {/* Separator */}
        <div className="my-1 mx-2 lg:mx-3 border-t border-gray-200"></div>

        {/* Mesaje */}
        <button
          onClick={() => handleNavigation("messages")}
          className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "messages"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            {unreadMessages > 0 && !sidebarExpanded && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </div>
          {sidebarExpanded && (
            <div className="ml-2 lg:ml-3 flex-1 flex items-center justify-between">
              <div>
                <div className="text-sm lg:text-base font-medium">Mesaje</div>
                <div className="text-xs text-gray-500 hidden lg:block">Comunicare cu locatarii</div>
              </div>
              {unreadMessages > 0 && (
                <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Mesaje
            </div>
          )}
        </button>

      </div>
    </nav>

    {/* Footer cu utilizatorul - click deschide dropdown */}
    <div className="flex-shrink-0 border-t border-gray-200 bg-white relative" ref={dropdownRef}>
      {/* Dropdown menu */}
      {userMenuOpen && (
        <UserDropdownMenu
          userProfile={userProfile}
          activeUser={activeUser}
          isAdmin={isAdmin}
          position="above"
          onNavigate={(view) => {
            handleNavigation(view);
            setSidebarOpen(false);
          }}
          onSwitchAssociation={onSwitchContext || null}
          onDeleteData={isAdmin && association ? deleteAllBlocAppData : null}
          onLogout={handleLogout}
          onClose={() => setUserMenuOpen(false)}
        />
      )}

      {sidebarExpanded ? (
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center p-3 lg:p-4 hover:bg-gray-50 transition-colors text-left"
          title="Meniu utilizator"
        >
          <div className="w-7 h-7 lg:w-8 lg:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-xs lg:text-sm overflow-hidden flex-shrink-0">
            {avatarURL ? (
              <img
                src={avatarURL}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="ml-2 lg:ml-3 flex-1 min-w-0">
            <div className="text-xs lg:text-sm font-medium text-gray-900 truncate">
              {userName}
            </div>
            <div className="text-xs text-gray-500 truncate hidden lg:block">
              {roleLabel}
            </div>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <div className="p-3 flex justify-center">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden hover:ring-2 hover:ring-blue-300 transition-all"
            title={`${userName} - Meniu utilizator`}
          >
            {avatarURL ? (
              <img
                src={avatarURL}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </button>
        </div>
      )}
    </div>
  </div>
  );
};

export default Sidebar;
