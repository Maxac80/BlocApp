import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ArrowLeft, ChevronDown } from 'lucide-react';

/**
 * Header component for organization-related pages
 * Shows BlocApp logo on left and user dropdown on right
 * Works on both mobile and desktop
 */
const OrgHeader = ({
  onLogoClick,
  onBack,
  userProfile,
  activeUser,
  showBackButton = false,
  backLabel = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get avatar URL or first letter for fallback
  const avatarURL = userProfile?.profile?.documents?.avatar?.url;
  const initials = userProfile?.displayName?.charAt(0)?.toUpperCase()
    || userProfile?.profile?.personalInfo?.firstName?.charAt(0)?.toUpperCase()
    || activeUser?.email?.charAt(0)?.toUpperCase()
    || 'U';

  const userName = userProfile?.profile?.personalInfo?.firstName
    ? `${userProfile.profile.personalInfo.firstName} ${userProfile.profile.personalInfo.lastName || ''}`
    : userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator';

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
      console.error('Eroare la deconectare:', error);
    }
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
            paddingBottom: '0.75rem',
            minHeight: '3.5rem'
          }}
        >
          {/* Left side: Back button or Logo */}
          <div className="flex items-center">
            {showBackButton && onBack ? (
              <button
                onClick={onBack}
                className="flex items-center hover:bg-blue-700 rounded-lg p-2 transition-colors mr-2"
                title="Înapoi"
              >
                <ArrowLeft className="w-5 h-5" />
                {backLabel && (
                  <span className="ml-2 text-sm font-medium hidden sm:inline">
                    {backLabel}
                  </span>
                )}
              </button>
            ) : null}

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
          </div>

          {/* Right side: User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 hover:bg-blue-700 rounded-lg p-1.5 transition-colors"
              title={userName}
            >
              <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden ring-2 ring-white/30">
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
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white truncate max-w-[150px]">
                  {userName}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 hidden sm:block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{activeUser?.email}</p>
                </div>

                {/* Profile link */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    // Navigate to profile - could be passed as prop if needed
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User className="w-4 h-4 mr-3 text-gray-500" />
                  Profil
                </button>

                {/* Divider */}
                <div className="border-t border-gray-100 my-1" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Deconectare
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default OrgHeader;
