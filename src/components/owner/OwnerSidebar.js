import React from 'react';
import {
  Home, History, CreditCard, LogOut, X, Building2, Gauge
} from 'lucide-react';
import { useOwnerContext } from './OwnerApp';

/**
 * Sidebar pentru Portal Proprietari
 *
 * Features:
 * - Navigare între views
 * - Responsive (drawer pe mobile)
 * - Info apartament
 */
export default function OwnerSidebar({ currentView, onNavigate, isOpen, onClose }) {
  const {
    apartmentNumber,
    associationName,
    hasMultipleApartments,
    onChangeApartment,
    onLogout,
    isDevMode
  } = useOwnerContext();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Situația curentă'
    },
    {
      id: 'meters',
      label: 'Contoare',
      icon: Gauge,
      description: 'Transmite indexuri'
    },
    {
      id: 'history',
      label: 'Istoric',
      icon: History,
      description: 'Luni anterioare'
    },
    {
      id: 'payments',
      label: 'Plăți',
      icon: CreditCard,
      description: 'Istoric & plată online'
    }
  ];

  const handleNavigation = (viewId) => {
    onNavigate(viewId);
    onClose();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header Sidebar */}
      <div className="bg-emerald-600 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center">
            <img
              src="/logo-portal.png"
              alt="BlocApp Portal Proprietari"
              className="h-10 object-contain"
            />
          </div>
          {/* Close button - doar pe mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-emerald-500 text-white transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Info Apartament */}
        <div className="bg-emerald-500 bg-opacity-50 rounded-lg p-2.5 sm:p-3">
          <div className="flex items-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-xs sm:text-sm">{apartmentNumber}</span>
            </div>
            <div className="ml-2 sm:ml-3">
              <p className="text-white font-medium text-sm sm:text-base">Apartamentul {apartmentNumber}</p>
              <p className="text-emerald-100 text-[10px] sm:text-xs truncate">{associationName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2.5 sm:mr-3 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className={`font-medium text-sm sm:text-base ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {item.label}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">{item.description}</p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200">
        {/* Schimbă apartament - doar dacă are mai multe */}
        {hasMultipleApartments && onChangeApartment && (
          <button
            onClick={() => {
              onChangeApartment();
              onClose();
            }}
            className="w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors mb-2"
          >
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2.5 sm:mr-3 text-gray-400" />
            <span className="text-sm sm:text-base">Schimbă apartamentul</span>
          </button>
        )}

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2.5 sm:mr-3" />
            <span className="text-sm sm:text-base">Deconectează-te</span>
          </button>
        )}

        {/* Development Badge - doar în dev mode */}
        {isDevMode && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 sm:p-3 mt-3 sm:mt-4">
            <p className="text-orange-800 text-[10px] sm:text-xs font-medium">Development Mode</p>
            <p className="text-orange-600 text-[10px] sm:text-xs">Bypass activ pentru testare</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <div className="relative w-72 max-w-full bg-white flex flex-col animate-slide-in-left">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
