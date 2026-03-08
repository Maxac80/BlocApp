import React from 'react';
import {
  User,
  CreditCard,
  BookOpen,
  ArrowLeftRight,
  Trash2,
  LogOut
} from 'lucide-react';

/**
 * Dropdown menu partajat pentru utilizator.
 * Folosit in Sidebar, MobileHeader si OrgHeader.
 *
 * position="above" → meniu deschis in sus (Sidebar footer)
 * position="below" → meniu deschis in jos (OrgHeader / MobileHeader)
 */
const UserDropdownMenu = ({
  userProfile,
  activeUser,
  isAdmin = false,
  position = 'below',
  onNavigate,
  onSwitchAssociation,
  onDeleteData,
  onLogout,
  onClose
}) => {
  // Rezolvare nume din user doc (profile.personalInfo prioritar)
  const userName = userProfile?.profile?.personalInfo?.firstName
    ? `${userProfile.profile.personalInfo.firstName} ${userProfile.profile.personalInfo.lastName || ''}`.trim()
    : userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator';

  const userEmail = activeUser?.email || userProfile?.email || '';

  const handleItemClick = (action) => {
    onClose();
    action();
  };

  const positionClasses = position === 'above'
    ? 'bottom-full mb-2 left-0 right-0'
    : 'top-full mt-2 right-0';

  return (
    <div className={`absolute ${positionClasses} w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden`}>
      {/* User info header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
        {userEmail && (
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
        )}
      </div>

      {/* Profilul meu */}
      <button
        onClick={() => handleItemClick(() => onNavigate('profile'))}
        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <User className="w-4 h-4 mr-3 text-gray-500" />
        Profilul meu
      </button>

      {/* Abonament - doar admin */}
      {isAdmin && (
        <button
          onClick={() => handleItemClick(() => onNavigate('subscription'))}
          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <CreditCard className="w-4 h-4 mr-3 text-gray-500" />
          Abonament
        </button>
      )}

      {/* Tutoriale */}
      <button
        onClick={() => handleItemClick(() => onNavigate('tutorials'))}
        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <BookOpen className="w-4 h-4 mr-3 text-gray-500" />
        Tutoriale
      </button>

      {/* Schimba asociatia - ascuns pe Dashboard */}
      {onSwitchAssociation && (
        <button
          onClick={() => handleItemClick(onSwitchAssociation)}
          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4 mr-3 text-gray-500" />
          Schimba asociatia
        </button>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 my-1" />

      {/* Sterge datele - doar admin */}
      {isAdmin && onDeleteData && (
        <button
          onClick={() => handleItemClick(onDeleteData)}
          className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-3" />
          Sterge TOATE datele
        </button>
      )}

      {/* Deconectare */}
      <button
        onClick={() => handleItemClick(onLogout)}
        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4 mr-3" />
        Deconectare
      </button>
    </div>
  );
};

export default UserDropdownMenu;
