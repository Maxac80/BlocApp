import React, { useState, useEffect, useRef } from 'react';
import {
  Home, History, LogOut, X, Building2, Gauge, Users, MessageSquare,
  ChevronUp, User
} from 'lucide-react';
import { useOwnerContext } from './OwnerApp';
import { useOwnerMessaging } from '../../hooks/useOwnerMessaging';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';

/**
 * Sidebar pentru Portal Locatari
 *
 * Desktop only (hidden lg:flex). Pe mobil se folosește OwnerBottomNavigation.
 * Pattern identic cu Sidebar.js admin:
 * - Logo sus
 * - Nav items la mijloc
 * - User menu jos cu dropdown
 */
export default function OwnerSidebar({ currentView, onNavigate }) {
  const {
    apartmentId,
    apartmentNumber,
    associationId,
    associationName,
    hasMultipleApartments,
    role,
    onChangeApartment,
    onLogout,
    ownerProfile,
    onNavigateStandalone
  } = useOwnerContext();

  const getRoleLabel = (r) => ({
    proprietar: 'Proprietar',
    chirias: 'Chiriaș',
    membru_familie: 'Membru familie',
    altul: 'Alt rol',
  }[r] || 'Proprietar');

  const { currentUser } = useAuthEnhanced();
  const { subscribeToConversations, getOwnerUnreadCount } = useOwnerMessaging(associationId, apartmentId);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (associationId) {
      const unsub = subscribeToConversations({ archiveField: 'isArchivedOwner' });
      return () => { if (unsub) unsub(); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [associationId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadMessages = currentUser?.uid ? getOwnerUnreadCount(currentUser.uid) : 0;

  // User display info
  const userName = ownerProfile?.firstName && ownerProfile?.lastName
    ? `${ownerProfile.firstName} ${ownerProfile.lastName}`
    : ownerProfile?.firstName || currentUser?.displayName || currentUser?.email || 'Locatar';
  const userEmail = ownerProfile?.email || currentUser?.email || '';
  const initials = ownerProfile?.firstName
    ? ownerProfile.firstName.charAt(0).toUpperCase()
    : userName.charAt(0).toUpperCase();

  const menuItems = [
    { id: 'dashboard', label: 'Întreținere', icon: Home, description: 'Situația curentă' },
    { id: 'meters', label: 'Contoare', icon: Gauge, description: 'Transmite indexuri' },
    { id: 'history', label: 'Istoric', icon: History, description: 'Luni anterioare & plăți' },
    { id: 'members', label: 'Membri', icon: Users, description: 'Locatarii apartamentului' }
  ];

  const bottomMenuItems = [
    { id: 'messages', label: 'Mesaje', icon: MessageSquare, description: 'Contactează administrația', badge: unreadMessages }
  ];

  const handleNavigation = (viewId) => {
    onNavigate(viewId);
  };

  const handleDropdownAction = (action) => {
    setUserMenuOpen(false);
    if (action === 'profile') {
      if (onNavigateStandalone) onNavigateStandalone('profile');
      else onNavigate('profile');
    } else if (action === 'switch') {
      if (onChangeApartment) onChangeApartment();
    } else if (action === 'logout') {
      if (onLogout) onLogout();
    }
  };

  const renderNavButton = (item) => {
    const isActive = currentView === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.id)}
        className={`w-full flex items-center px-2 lg:px-3 py-2 lg:py-3 rounded-lg text-left transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-100 text-emerald-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm lg:text-base font-medium ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
            {item.label}
          </div>
          <div className="text-xs text-gray-500">{item.description}</div>
        </div>
        {item.badge > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        {/* Header - Logo only */}
        <div className="flex items-center h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => handleNavigation('dashboard')}
            className="flex items-center hover:bg-gray-100 rounded-lg p-1 transition-colors cursor-pointer"
          >
            <img src="/blocapp-logo-locatari.png" alt="BlocApp" className="h-10 object-contain" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 mt-4 overflow-y-auto">
          <div className="px-3 space-y-1">
            {menuItems.map(renderNavButton)}
            {bottomMenuItems.map(renderNavButton)}
          </div>
        </nav>

        {/* Footer - User menu */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white relative" ref={dropdownRef}>
          {/* Dropdown menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 w-56 mx-auto bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>

              {/* Profile */}
              <button
                onClick={() => handleDropdownAction('profile')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <User className="w-4 h-4 mr-3 text-gray-500" />
                Profilul meu
              </button>

              {/* Switch apartment */}
              {hasMultipleApartments && onChangeApartment && (
                <button
                  onClick={() => handleDropdownAction('switch')}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Building2 className="w-4 h-4 mr-3 text-gray-500" />
                  Schimbă apartamentul
                </button>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 my-1" />

              {/* Logout */}
              <button
                onClick={() => handleDropdownAction('logout')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Deconectare
              </button>
            </div>
          )}

          {/* User button */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center p-3 lg:p-4 hover:bg-gray-50 transition-colors text-left"
            title="Meniu utilizator"
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-xs lg:text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="ml-2 lg:ml-3 flex-1 min-w-0">
              <div className="text-xs lg:text-sm font-medium text-gray-900 truncate">{userName}</div>
              <div className="text-xs text-gray-500 truncate">{getRoleLabel(role)}</div>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
