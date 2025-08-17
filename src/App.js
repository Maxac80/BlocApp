import React from "react";
import { AuthProviderEnhanced, useAuthEnhanced } from "./context/AuthContextEnhanced";
import AuthManager from "./components/auth/AuthManager";
import BlocApp from "./BlocApp";
import { AlertCircle } from "lucide-react";

// Componenta principală care decide ce să afișeze
function AppContent() {
  const { 
    currentUser, 
    userProfile, 
    loading,
    isEmailVerified,
    needsOnboarding,
    logoutEnhanced
  } = useAuthEnhanced();

  // 🔄 HANDLE AUTH COMPLETE
  const handleAuthComplete = async (result) => {
    console.log('✅ Auth flow complete:', result);
    
    // Dacă onboarding-ul s-a completat, forțează reload-ul profilului
    if (result.onboardingCompleted && currentUser) {
      console.log('🔄 Reloading user profile after onboarding...');
      
      // Forțează un reload al paginii după un mic delay pentru a permite actualizarea Firestore
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // ⏳ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă aplicația...</p>
        </div>
      </div>
    );
  }

  // 🔐 NU E LOGAT - SHOW AUTH MANAGER
  if (!currentUser) {
    return <AuthManager onAuthComplete={handleAuthComplete} />;
  }

  // 📧 EMAIL NECONFIRMAT SAU ONBOARDING NECESAR
  if (!isEmailVerified || needsOnboarding) {
    return <AuthManager onAuthComplete={handleAuthComplete} />;
  }

  // 📋 NU AVEM ÎNCĂ PROFILUL COMPLET
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă profilul...</p>
        </div>
      </div>
    );
  }

  // 👥 DACĂ E PROPRIETAR - DASHBOARD DEDICAT
  if (userProfile.role === 'proprietar') {
    return <ProprietarDashboard />;
  }

  // 🏢 DACĂ POATE GESTIONA - APLICAȚIA PRINCIPALĂ (FĂRĂ HEADER!)
  if (userProfile.role === 'admin_asociatie' || userProfile.role === 'super_admin' || userProfile.role === 'presedinte' || userProfile.role === 'cenzor') {
    return <BlocApp />;
  }

  // 🚫 FALLBACK - ACCES RESTRICȚIONAT
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-800 mb-2">Acces restricționat</h2>
        <p className="text-red-600 mb-4">
          Contul tău nu are permisiunile necesare pentru această aplicație.
        </p>
        <p className="text-sm text-red-500 mb-6">
          Rol curent: {userProfile.role}
        </p>
        <button 
          onClick={logoutEnhanced}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Deconectează-te
        </button>
      </div>
    </div>
  );
}

// Dashboard pentru proprietari
function ProprietarDashboard() {
  const { userProfile, logoutEnhanced } = useAuthEnhanced();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Bine ai venit, {userProfile.name}! 👋
              </h1>
              <p className="text-gray-600">Dashboard proprietar - dezvoltat în FAZA 5</p>
            </div>
            <button
              onClick={logoutEnhanced}
              className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              Ieșire
            </button>
          </div>
        </div>

        {/* CONȚINUT */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Portal Proprietari
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Aici vei vedea apartamentul tău, facturile de întreținere, istoricul plăților, 
            și vei putea plăti online direct din aplicație.
          </p>
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">
              🚧 În dezvoltare activă - FAZA 5 din roadmap
            </p>
            <p className="text-green-700 text-sm mt-1">
              Disponibil în aproximativ 8-10 săptămâni
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="bg-gray-50 p-3 rounded-lg">
              <strong>Plăți online</strong><br/>
              Card, transfer bancar
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <strong>Istoric complet</strong><br/>
              Toate facturile tale
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <strong>Notificări</strong><br/>
              Email, SMS alerts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// App principală
export default function App() {
  return (
    <AuthProviderEnhanced>
      <AppContent />
    </AuthProviderEnhanced>
  );
}