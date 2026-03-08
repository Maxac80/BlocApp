import React, { useState, useRef, useEffect } from 'react';
import UserDropdownMenu from './UserDropdownMenu';

const MobileHeader = ({
  onLogoClick,
  onAvatarClick,
  onSwitchContext,
  association,
  userProfile,
  activeUser,
  handleNavigation,
  deleteAllBlocAppData,
  userRole
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isReadOnlyRole = userRole === 'assoc_president' || userRole === 'assoc_censor';
  const isAdmin = !isReadOnlyRole;

  // Rezolvare avatar din user doc cu fallback
  const avatarURL = userProfile?.avatarURL
    || userProfile?.profile?.documents?.avatar?.url
    || association?.adminProfile?.avatarURL;

  const initials = userProfile?.profile?.personalInfo?.firstName?.charAt(0)?.toUpperCase()
    || userProfile?.displayName?.charAt(0)?.toUpperCase()
    || activeUser?.email?.charAt(0)?.toUpperCase()
    || 'U';

  const userName = userProfile?.profile?.personalInfo?.firstName
    ? `${userProfile.profile.personalInfo.firstName} ${userProfile.profile.personalInfo.lastName || ''}`.trim()
    : userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator';

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
    <>
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        paddingBottom: '0.5rem',
        minHeight: '3.5rem'
      }}
    >
      {/* Logo si nume aplicatie */}
      <button
        onClick={onLogoClick}
        className="flex items-center hover:bg-gray-100 rounded-lg p-1 transition-colors"
        title="Mergi la Dashboard"
      >
        <img
          src="/blocapp-logo.png"
          alt="BlocApp"
          className="h-8 object-contain"
        />
      </button>

      {/* Avatar utilizator cu dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden hover:ring-2 hover:ring-blue-300 transition-all"
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
          <UserDropdownMenu
            userProfile={userProfile}
            activeUser={activeUser}
            isAdmin={isAdmin}
            position="below"
            onNavigate={(view) => {
              if (handleNavigation) handleNavigation(view);
              else if (view === 'profile' && onAvatarClick) onAvatarClick();
            }}
            onSwitchAssociation={onSwitchContext || null}
            onDeleteData={isAdmin && association && deleteAllBlocAppData ? deleteAllBlocAppData : null}
            onLogout={handleLogout}
            onClose={() => setIsDropdownOpen(false)}
          />
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
