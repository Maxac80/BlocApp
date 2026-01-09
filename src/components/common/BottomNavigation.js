import React, { useState } from 'react';
import { FileText, Calculator, Wallet, Coins, MoreHorizontal, Building, Users, User, Settings, BookOpen, X } from 'lucide-react';

const BottomNavigation = ({ currentView, handleNavigation }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Paginile principale din bottom nav
  const mainNavItems = [
    { id: 'dashboard', label: 'Întreținere', icon: FileText },
    { id: 'maintenance', label: 'Calcul', icon: Calculator },
    { id: 'setup', label: 'Apartamente', icon: Building },
    { id: 'expenses', label: 'Cheltuieli', icon: Wallet },
  ];

  // Paginile secundare din meniul "Mai multe"
  const moreNavItems = [
    { id: 'accounting', label: 'Contabilitate', icon: Coins, description: 'Încasări și chitanțe' },
    { id: 'association', label: 'Date asociație', icon: Users, description: 'Informații asociație' },
    { id: 'profile', label: 'Profil Administrator', icon: User, description: 'Setări profil' },
    { id: 'settings', label: 'Setări', icon: Settings, description: 'Configurări aplicație' },
    { id: 'tutorials', label: 'Tutoriale', icon: BookOpen, description: 'Ghiduri și învățare' },
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
      {/* Overlay pentru meniul "Mai multe" */}
      {showMoreMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Meniul "Mai multe" - slide up */}
      {showMoreMenu && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
          {/* Header meniu */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-800">Mai multe opțiuni</h3>
            <button
              onClick={() => setShowMoreMenu(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Lista de opțiuni */}
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
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    isActive ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-800'}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Safe area pentru iPhone */}
          <div className="h-safe-area-inset-bottom bg-white"></div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Butoane principale */}
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600"></div>
                )}
              </button>
            );
          })}

          {/* Buton "Mai multe" */}
          <button
            onClick={handleMoreClick}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              isMoreActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 mb-0.5 ${isMoreActive ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className={`text-[10px] font-medium ${isMoreActive ? 'text-blue-600' : 'text-gray-500'}`}>
              Mai mult
            </span>
            {isMoreActive && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Safe area pentru iPhone */}
        <div className="h-safe-area-inset-bottom bg-white"></div>
      </nav>

      {/* CSS pentru animația slide-up */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
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

export default BottomNavigation;
