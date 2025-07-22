import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import BlocApp from "./BlocApp"; // Aplicația ta existentă
import { LogOut, User, Building2 } from "lucide-react";

// Componenta principală care decide ce să afișeze
function AppContent() {
  const { currentUser, userProfile, logout, canManage } = useAuth();

  // Dacă nu e logat, arată pagina de login
  if (!currentUser) {
    return <LoginPage />;
  }

  // Dacă e logat dar nu avem încă profilul, arată loading
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă profilul...</p>
        </div>
      </div>
    );
  }

  // Dacă e proprietar, arată dashboard pentru proprietari (dezvoltăm mai târziu)
  if (userProfile.role === 'proprietar') {
    return <ProprietarDashboard />;
  }

  // Dacă poate gestiona (admin, președinte, cenzor), arată aplicația principală
  if (canManage()) {
    return <BlocAppWithHeader />;
  }

  // Fallback - nu ar trebui să ajungă aici
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-800 mb-2">Acces restricționat</h2>
        <p className="text-red-600">Nu ai permisiunile necesare pentru această aplicație.</p>
        <button 
          onClick={logout}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Deconectează-te
        </button>
      </div>
    </div>
  );
}

// Wrapper pentru aplicația principală cu header de utilizator
function BlocAppWithHeader() {
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header cu info utilizator */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo și info organizație */}
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">BlocApp</h1>
                <p className="text-sm text-gray-500">{userProfile.organizationName}</p>
              </div>
            </div>

            {/* Info utilizator și logout */}
            <div className="flex items-center space-x-4">
              {/* Rolul utilizatorului */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-xs text-gray-500">
                  {userProfile.role === 'admin_asociatie' && 'Administrator'}
                  {userProfile.role === 'presedinte' && 'Președinte'}
                  {userProfile.role === 'cenzor' && 'Cenzor'}
                  {userProfile.role === 'super_admin' && 'Super Admin'}
                </p>
              </div>

              {/* Avatar */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              {/* Buton logout */}
              <button
                onClick={logout}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                title="Deconectează-te"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aplicația principală */}
      <BlocApp />
    </div>
  );
}

// Dashboard simplu pentru proprietari (dezvoltăm mai târziu)
function ProprietarDashboard() {
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bun venit, {userProfile.name}!</h1>
              <p className="text-gray-600">Dashboard proprietar - în dezvoltare</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Ieșire
            </button>
          </div>
        </div>

        {/* Conținut proprietar */}
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <Building2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Dashboard Proprietar</h2>
          <p className="text-gray-600 mb-4">
            Aici vei vedea apartamentul tău, facturile și istoricul plăților.
          </p>
          <p className="text-sm text-green-600 font-medium">
            🚧 În dezvoltare - disponibil în curând!
          </p>
        </div>
      </div>
    </div>
  );
}

// Componenta App principală cu AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}