import React, { useState, useEffect } from "react";
import { AuthProviderEnhanced, useAuthEnhanced } from "./context/AuthContextEnhanced";
import AuthManager from "./components/auth/AuthManager";
import BlocApp from "./BlocApp";
import OwnerPortalWrapper from "./components/owner/OwnerPortalWrapper";
import { AlertCircle } from "lucide-react";
import ErrorBoundary from "./components/common/ErrorBoundary";
import './services/appCheck'; // Initialize App Check for security

/**
 * Detectează modul aplicației din URL parameter
 * ?mode=owner → Owner Portal (pentru development/testing)
 */
function useAppMode() {
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || 'admin';
  });

  useEffect(() => {
    // Ascultă schimbări în URL (pentru navigare browser back/forward)
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setMode(params.get('mode') || 'admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return mode;
}

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

  // Detectează modul din URL (?mode=owner)
  const appMode = useAppMode();

  // 🔄 HANDLE AUTH COMPLETE
  const handleAuthComplete = async (result) => {
    // console.log('✅ Auth flow complete:', result);
    
    // Dacă onboarding-ul s-a completat, forțează reload-ul profilului
    if (result.onboardingCompleted && currentUser) {
      // console.log('🔄 Reloading user profile after onboarding...');
      
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
    return (
      <AuthManager
        onAuthComplete={handleAuthComplete}
      />
    );
  }

  // 🏠 OWNER MODE: Afișează Owner Portal (folosește sesiunea Firebase curentă)
  // Acces: http://localhost:3000?mode=owner
  if (appMode === 'owner') {
    return <OwnerPortalWrapper currentUser={currentUser} />;
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

  // 👥 DACĂ E PROPRIETAR - PORTAL PROPRIETARI
  if (userProfile.role === 'proprietar') {
    return <OwnerApp />;
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

// App principală cu Error Boundary
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProviderEnhanced>
        <AppContent />
      </AuthProviderEnhanced>
    </ErrorBoundary>
  );
}