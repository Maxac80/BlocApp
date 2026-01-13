import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, RefreshCw } from 'lucide-react';

const MobileHeader = ({ onLogoClick, onAvatarClick, onSwitchContext, association, userProfile, activeUser }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get avatar URL or first letter for fallback
  const avatarURL = association?.adminProfile?.avatarURL;
  const initials = userProfile?.displayName?.charAt(0)?.toUpperCase()
    || activeUser?.email?.charAt(0)?.toUpperCase()
    || 'U';
  const userName = userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('../../firebase');
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error('❌ Eroare la deconectare:', error);
    }
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    onAvatarClick();
  };

  return (
    <>
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-600 text-white flex items-center justify-between px-4 shadow-lg"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        paddingBottom: '0.5rem',
        minHeight: '3.5rem'
      }}
    >
      {/* Logo și nume aplicație */}
      <button
        onClick={onLogoClick}
        className="flex items-center space-x-2 hover:bg-blue-700 rounded-lg p-1.5 transition-colors"
        title="Mergi la Dashboard"
      >
        <img
          src="/icon-admin.png"
          alt="BlocApp"
          className="w-8 h-8 rounded-lg object-contain bg-white/90 p-0.5"
        />
        <span
          className="text-lg font-bold text-white"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          BlocApp
        </span>
      </button>

      {/* Avatar utilizator cu dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden hover:ring-2 hover:ring-white/50 transition-all"
          title={userName}
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

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
            {/* Nume utilizator */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{activeUser?.email}</p>
            </div>

            {/* Profil */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-gray-500" />
              Profil
            </button>

            {/* Schimbă asociația */}
            {onSwitchContext && (
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  onSwitchContext();
                }}
                className="w-full flex items-center px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-3" />
                Schimbă asociația
              </button>
            )}

            {/* Deconectare */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Deconectare
            </button>
          </div>
        )}
      </div>
    </header>
    {/* Spacer pentru safe-area pe dispozitive cu notch */}
    <style>{`
      @supports (padding-top: env(safe-area-inset-top)) {
        .mobile-header-spacer {
          height: calc(3.5rem + env(safe-area-inset-top, 0px));
        }
      }
    `}</style>
    </>
  );
};

export default MobileHeader;
