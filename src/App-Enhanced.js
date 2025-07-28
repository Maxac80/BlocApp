import React from "react";
import { AuthProviderEnhanced, useAuthEnhanced } from "./context/AuthContextEnhanced";
import AuthManager from "./components/auth/AuthManager";
import BlocApp from "./BlocApp"; // Aplicația ta existentă
import { LogOut, User, Building2, AlertCircle } from "lucide-react";

/**
 * 🚀 APP ENHANCED CU NOUL SISTEM DE AUTENTIFICARE
 * 
 * Features:
 * - AuthContextEnhanced cu toate funcționalitățile avansate
 * - AuthManager pentru orchestrarea flow-urilor
 * - OnboardingWizard complet integrat
 * - Compatibilitate completă cu aplicația existentă
 */

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

  // 👥 DACĂ E PROPRIETAR - DASHBOARD DEDICAT (DEZVOLTĂM ÎN FAZA 5)
  if (userProfile.role === 'proprietar') {
    return <ProprietarDashboard />;
  }

  // 🏢 DACĂ POATE GESTIONA - APLICAȚIA PRINCIPALĂ
  if (userProfile.role === 'admin_asociatie' || userProfile.role === 'super_admin' || userProfile.role === 'presedinte' || userProfile.role === 'cenzor') {
    return <BlocAppWithHeaderEnhanced />;
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

// Wrapper enhanced pentru aplicația principală
function BlocAppWithHeaderEnhanced() {
  const { 
    currentUser,
    userProfile, 
    logoutEnhanced,
    isEmailVerified,
    profileManager
  } = useAuthEnhanced();

  // 📊 STATUS INDICATORS
  const getStatusIndicators = () => {
    const indicators = [];
    
    if (!isEmailVerified) {
      indicators.push({
        type: 'warning',
        message: 'Email neconfirmat - funcționalități limitate',
        action: 'Confirmă emailul'
      });
    }
    
    if (profileManager.profileCompletion < 80) {
      indicators.push({
        type: 'info',
        message: `Profil ${profileManager.profileCompletion}% complet`,
        action: 'Completează profilul'
      });
    }
    
    return indicators;
  };

  const statusIndicators = getStatusIndicators();

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER ENHANCED */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* LOGO ȘI INFO */}
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">BlocApp Enhanced</h1>
                <p className="text-sm text-gray-500">
                  {userProfile.organizationName || 'Sistem de administrare modern'}
                </p>
              </div>
            </div>

            {/* INFO UTILIZATOR ENHANCED */}
            <div className="flex items-center space-x-4">
              
              {/* STATUS INDICATORS */}
              {statusIndicators.length > 0 && (
                <div className="flex items-center space-x-2">
                  {statusIndicators.map((indicator, index) => (
                    <div 
                      key={index}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        indicator.type === 'warning' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}
                      title={indicator.message}
                    >
                      {indicator.action}
                    </div>
                  ))}
                </div>
              )}
              
              {/* ROLUL UTILIZATORULUI */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile.name || currentUser.displayName || 'Administrator'}
                </p>
                <p className="text-xs text-gray-500">
                  {userProfile.role === 'admin_asociatie' && 'Administrator Asociație'}
                  {userProfile.role === 'presedinte' && 'Președinte'}
                  {userProfile.role === 'cenzor' && 'Cenzor'}
                  {userProfile.role === 'super_admin' && 'Super Administrator'}
                  {!userProfile.role && 'Utilizator'}
                </p>
              </div>

              {/* AVATAR ENHANCED */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                  <User className="w-6 h-6 text-blue-600" />
                  {isEmailVerified && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
              </div>

              {/* BUTON LOGOUT ENHANCED */}
              <button
                onClick={logoutEnhanced}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Deconectează-te (Enhanced)"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* STATUS BANNER */}
        {statusIndicators.length > 0 && (
          <div className="bg-yellow-50 border-t border-yellow-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <div className="flex items-center space-x-4 text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-800">
                  Pentru funcționalitate completă: {statusIndicators.map(i => i.action).join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* APLICAȚIA PRINCIPALĂ */}
      <BlocApp />
    </div>
  );
}

// Dashboard pentru proprietari (FAZA 5)
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
              <LogOut className="w-5 h-5 mr-2" />
              Ieșire
            </button>
          </div>
        </div>

        {/* CONȚINUT */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Building2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
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

// App principală Enhanced
export default function AppEnhanced() {
  return (
    <AuthProviderEnhanced>
      <AppContent />
    </AuthProviderEnhanced>
  );
}