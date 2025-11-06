import React from 'react';
import { Building2, Home, Calculator, Settings, ClipboardList, X, User, FileText, Wallet, Users, Building, BookOpen, Coins } from 'lucide-react';

const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  sidebarExpanded, 
  setSidebarExpanded,
  currentView,
  handleNavigation,
  association,
  getAssociationApartments,
  deleteAllBlocAppData,
  userProfile,
  activeUser,
  setCurrentMonth
}) => {
  // Funcția pentru a naviga la Dashboard
  const handleBlocAppClick = () => {
    // Nu mai resetăm luna - păstrăm luna selectată de utilizator
    // Navighează la Dashboard
    handleNavigation("dashboard");
  };

  return (
  <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } ${sidebarExpanded ? 'w-64' : 'w-16'}`}>
    
    {/* Header Sidebar cu buton expand/collapse */}
    <div className="flex items-center justify-between h-16 px-4 bg-blue-600 text-white">
      {sidebarExpanded ? (
        <button 
          onClick={handleBlocAppClick}
          className="flex items-center hover:bg-blue-700 rounded-lg p-2 transition-colors cursor-pointer"
          title="Mergi la Dashboard - luna curentă"
        >
          <Building2 className="w-8 h-8 mr-2 text-white" />
          <div>
            <h1 className="text-lg font-bold text-white">BlocApp</h1>
          </div>
        </button>
      ) : (
        <button 
          onClick={handleBlocAppClick}
          className="flex items-center justify-center w-full hover:bg-blue-700 rounded-lg p-2 transition-colors cursor-pointer"
          title="Mergi la Dashboard - luna curentă"
        >
          <Building2 className="w-8 h-8 text-white" />
        </button>
      )}
      
      {/* Buton expand/collapse pentru desktop */}
      <button
        onClick={() => setSidebarExpanded(!sidebarExpanded)}
        className="hidden lg:block p-1 rounded-md hover:bg-blue-700 transition-colors ml-2"
        title={sidebarExpanded ? "Micșorează meniul" : "Mărește meniul"}
      >
        {sidebarExpanded ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )}
      </button>
      
      {/* Buton închidere pentru mobile */}
      <button
        onClick={() => setSidebarOpen(false)}
        className="lg:hidden p-1 rounded-md hover:bg-blue-700"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Meniu Navigare */}
    <nav className="flex-1 mt-6">
      <div className="px-2 space-y-1">
        {/* Tabel întreținere */}
        <button
          onClick={() => handleNavigation("dashboard")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "dashboard"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Tabel întreținere</div>
              <div className="text-xs text-gray-500">Întreţinere luna curentă</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Tabel întreținere
            </div>
          )}
        </button>

        {/* Calcul întreținere */}
        <button
          onClick={() => handleNavigation("maintenance")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "maintenance"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Calculator className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Calcul întreținere</div>
              <div className="text-xs text-gray-500">Calculează întreţinerea curentă</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Calcul întreținere
            </div>
          )}
        </button>

        {/* Apartamente */}
        <button
          onClick={() => handleNavigation("setup")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "setup"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Building className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Apartamente</div>
              <div className="text-xs text-gray-500">Blocuri, scări, apartamente</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Apartamente
            </div>
          )}
        </button>

        {/* Cheltuieli */}
        <button
          onClick={() => handleNavigation("expenses")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "expenses"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Wallet className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Configurare cheltuieli</div>
              <div className="text-xs text-gray-500">Cheltuieli & furnizori</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Configurare cheltuieli
            </div>
          )}
        </button>

        {/* Contabilitate */}
        <button
          onClick={() => handleNavigation("accounting")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "accounting"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Coins className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Contabilitate</div>
              <div className="text-xs text-gray-500">Încasări & chitanțe</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Contabilitate
            </div>
          )}
        </button>

        {/* Date Asociație */}
        <button
          onClick={() => handleNavigation("association")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "association"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Users className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Date Asociație</div>
              <div className="text-xs text-gray-500">Informații generale</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Date Asociație
            </div>
          )}
        </button>

        {/* Profil Administrator */}
        <button
          onClick={() => handleNavigation("profile")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "profile"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <User className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Profil Administrator</div>
              <div className="text-xs text-gray-500">Date personale și setări</div>
            </div>
          )}
          
          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Profil Administrator
            </div>
          )}
        </button>

        {/* Setări */}
        <button
          onClick={() => handleNavigation("settings")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "settings"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Setări</div>
              <div className="text-xs text-gray-500">Configurări aplicație</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Setări
            </div>
          )}
        </button>

        {/* Tutoriale */}
        <button
          onClick={() => handleNavigation("tutorials")}
          className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-all duration-200 group ${
            currentView === "tutorials"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <div className="ml-3">
              <div className="font-medium">Tutoriale</div>
              <div className="text-xs text-gray-500">Ghiduri și învățare</div>
            </div>
          )}

          {!sidebarExpanded && (
            <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Tutoriale
            </div>
          )}
        </button>
      </div>

      {/* Separator și Development Tools */}
      {sidebarExpanded && (
        <>
          <div className="mx-4 my-6 border-t border-gray-200"></div>

          {/* Buton ștergere toate datele */}
          {association && (
            <div className="px-4 space-y-3">
              <div className="space-y-2">
                <button
                  onClick={deleteAllBlocAppData}
                  className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center justify-center"
                  title="Șterge toate datele aplicației"
                >
                  🗑️ Șterge TOATE datele
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </nav>

    {/* Footer cu utilizatorul */}
    <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-white">
      {sidebarExpanded ? (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden">
            {association?.adminProfile?.avatarURL ? (
              <img 
                src={association.adminProfile.avatarURL.startsWith('data:') ? association.adminProfile.avatarURL : association.adminProfile.avatarURL} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              userProfile?.displayName?.charAt(0)?.toUpperCase() || activeUser?.email?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
  {userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator'}
</div>
            <div className="text-xs text-gray-500 truncate">
              Administrator
            </div>
          </div>
          <button 
            onClick={async () => {
              try {
                const { signOut } = await import('firebase/auth');
                const { auth } = await import('../../firebase');
                await signOut(auth);
                window.location.reload();
              } catch (error) {
                console.error('❌ Eroare la deconectare:', error);
              }
            }}
            className="text-gray-400 hover:text-red-600 transition-colors" 
            title="Deconectare"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3v1" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex justify-center group relative">
          <button
            onClick={async () => {
              try {
                const { signOut } = await import('firebase/auth');
                const { auth } = await import('../../firebase');
                await signOut(auth);
                window.location.reload();
              } catch (error) {
                console.error('❌ Eroare la deconectare:', error);
              }
            }}
            className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm hover:bg-red-500 transition-colors overflow-hidden"
            title={`Click pentru deconectare - ${userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator'}`}
          >
            {association?.adminProfile?.avatarURL ? (
              <img 
                src={association.adminProfile.avatarURL} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              userProfile?.displayName?.charAt(0)?.toUpperCase() || activeUser?.email?.charAt(0)?.toUpperCase() || 'U'
            )}
          </button>
          
<div className="absolute left-12 bottom-0 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
  Click pentru deconectare - {userProfile?.name || userProfile?.displayName || activeUser?.displayName || activeUser?.email?.split('@')[0] || 'Utilizator'}
</div>
        </div>
      )}
    </div>
  </div>
  );
};

export default Sidebar;