import React from 'react';

const MobileHeader = ({ onLogoClick, onAvatarClick, association, userProfile, activeUser }) => {
  // Get avatar URL or first letter for fallback
  const avatarURL = association?.adminProfile?.avatarURL;
  const initials = userProfile?.displayName?.charAt(0)?.toUpperCase()
    || activeUser?.email?.charAt(0)?.toUpperCase()
    || 'U';
  const userName = userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator';

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-600 text-white h-14 flex items-center justify-between px-4 shadow-lg">
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

      {/* Avatar utilizator */}
      <button
        onClick={onAvatarClick}
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
    </header>
  );
};

export default MobileHeader;
