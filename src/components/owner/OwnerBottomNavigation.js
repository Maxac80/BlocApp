import React, { useState } from 'react';
import { Home, Gauge, MessageSquare, MoreHorizontal, History, Users, User, X, ClipboardList } from 'lucide-react';

/**
 * Bottom Navigation pentru Owner Portal (mobil)
 *
 * Pattern identic cu BottomNavigation.js admin.
 * Vizibil doar pe mobile (lg:hidden).
 */
const OwnerBottomNavigation = ({ currentView, handleNavigation, unreadMessages = 0 }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Primary nav items (4 visible buttons)
  const mainNavItems = [
    { id: 'dashboard', label: 'Întreținere', icon: ClipboardList },
    { id: 'meters', label: 'Contoare', icon: Gauge },
    { id: 'messages', label: 'Mesaje', icon: MessageSquare, badge: unreadMessages },
  ];

  // Secondary items in "More" menu
  const moreNavItems = [
    { id: 'history', label: 'Istoric', icon: History, description: 'Luni anterioare & plăți' },
    { id: 'members', label: 'Membri', icon: Users, description: 'Locatarii apartamentului' },
    { id: 'profile', label: 'Profilul meu', icon: User, description: 'Setări profil' },
  ];

  const isMoreActive = moreNavItems.some(item => item.id === currentView);

  const handleMoreClick = () => {
    setShowMoreMenu(true);
  };

  const handleMenuItemClick = (viewId) => {
    handleNavigation(viewId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Overlay for "More" menu */}
      {showMoreMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* "More" menu - slide up */}
      {showMoreMenu && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-800">Mai multe opțiuni</h3>
            <button
              onClick={() => setShowMoreMenu(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Items list */}
          <div className="py-2 max-h-[60vh] overflow-y-auto">
            {moreNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    isActive ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-gray-800'}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Safe area for iPhone */}
          <div className="h-safe-area-inset-bottom bg-white"></div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Main buttons */}
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600"></div>
                )}
              </button>
            );
          })}

          {/* "More" button */}
          <button
            onClick={handleMoreClick}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              isMoreActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 mb-0.5 ${isMoreActive ? 'text-emerald-600' : 'text-gray-500'}`} />
            <span className={`text-[10px] font-medium ${isMoreActive ? 'text-emerald-600' : 'text-gray-500'}`}>
              Mai mult
            </span>
            {isMoreActive && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600"></div>
            )}
          </button>
        </div>

        {/* Safe area for iPhone */}
        <div className="h-safe-area-inset-bottom bg-white"></div>
      </nav>

      {/* CSS for slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
        .h-safe-area-inset-bottom {
          height: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  );
};

export default OwnerBottomNavigation;
