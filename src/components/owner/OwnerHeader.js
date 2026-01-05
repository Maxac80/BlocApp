import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, ChevronDown, LogOut, RefreshCw, Wrench } from 'lucide-react';
import { useOwnerContext } from './OwnerApp';

/**
 * Header pentru Portal Proprietari
 *
 * Features:
 * - Buton menu mobile
 * - Info apartament
 * - Notificări (placeholder)
 * - User menu cu logout și schimbare apartament
 */
export default function OwnerHeader({ onMenuClick }) {
  const {
    apartmentNumber,
    apartmentData,
    associationName,
    hasMultipleApartments,
    onChangeApartment,
    onLogout,
    isDevMode
  } = useOwnerContext();

  // State pentru dropdown menu
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Închide menu-ul când se face click în afară
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-4">
      <div className="flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 mr-2 sm:mr-3"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>

          {/* Info Apartament */}
          <div className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-emerald-700 font-bold text-sm sm:text-base">{apartmentNumber}</span>
            </div>
            <div className="ml-2 sm:ml-3 hidden sm:block">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                Apartamentul {apartmentNumber}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px]">
                {associationName}
              </p>
            </div>
          </div>

          {/* Dev Mode Badge */}
          {isDevMode && (
            <div className="ml-2 sm:ml-3 flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] sm:text-xs font-medium">
              <Wrench className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
              Dev
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
          {/* Notifications */}
          <button className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            {/* Badge notificări - placeholder */}
            <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
              </div>
              <span className="hidden sm:block ml-2 text-xs sm:text-sm font-medium text-gray-700">
                {apartmentData?.owner || 'Proprietar'}
              </span>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 ml-1 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 sm:py-2 z-50">
                {/* User Info */}
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-gray-100">
                  <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                    {apartmentData?.owner || 'Proprietar'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    Ap. {apartmentNumber} • {associationName}
                  </p>
                </div>

                {/* Schimbă apartament */}
                {hasMultipleApartments && onChangeApartment && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onChangeApartment();
                    }}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left flex items-center hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 mr-2 sm:mr-3" />
                    <span className="text-gray-700 text-sm">Schimbă apartamentul</span>
                  </button>
                )}

                {/* Logout */}
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left flex items-center hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-3" />
                    <span className="text-sm">Deconectează-te</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
