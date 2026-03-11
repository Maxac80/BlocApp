import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Building2, ChevronDown } from 'lucide-react';
import { useOwnerContext } from './OwnerApp';

/**
 * Mobile Header pentru Portal Locatari
 *
 * Vizibil DOAR pe mobile (lg:hidden). Pe desktop se folosește OwnerSidebar.
 * Pattern identic cu MobileHeader.js din admin.
 */
export default function OwnerHeader({ onNavigate }) {
  const {
    hasMultipleApartments,
    onChangeApartment,
    onLogout,
    ownerProfile
  } = useOwnerContext();

  const displayName = ownerProfile?.firstName && ownerProfile?.lastName
    ? `${ownerProfile.firstName} ${ownerProfile.lastName}`
    : ownerProfile?.firstName || 'Locatar';

  const initials = ownerProfile?.firstName
    ? ownerProfile.firstName.charAt(0).toUpperCase()
    : displayName.charAt(0).toUpperCase();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  const handleAction = (action) => {
    setShowDropdown(false);
    if (action === 'profile' && onNavigate) {
      onNavigate('profile');
    } else if (action === 'switch' && onChangeApartment) {
      onChangeApartment();
    } else if (action === 'logout' && onLogout) {
      onLogout();
    }
  };

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        paddingBottom: '0.5rem',
        minHeight: '3.5rem'
      }}
    >
      {/* Left: Logo */}
      <button
        onClick={() => onNavigate && onNavigate('dashboard')}
        className="flex items-center hover:bg-gray-100 rounded-lg p-1 transition-colors"
        title="Mergi la Întreținere"
      >
        <img
          src="/blocapp-logo-locatari.png"
          alt="BlocApp"
          className="h-8 object-contain"
        />
      </button>

      {/* Right: User avatar with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden hover:ring-2 hover:ring-emerald-300 transition-all"
          title={`${displayName} - Meniu`}
        >
          {initials}
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">
                {ownerProfile?.email || ''}
              </p>
            </div>

            {/* Profile */}
            <button
              onClick={() => handleAction('profile')}
              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-gray-500" />
              Profilul meu
            </button>

            {/* Switch apartment */}
            {hasMultipleApartments && onChangeApartment && (
              <button
                onClick={() => handleAction('switch')}
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
              onClick={() => handleAction('logout')}
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Deconectare
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
