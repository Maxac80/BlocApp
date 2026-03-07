/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { AuthProviderEnhanced, useAuthEnhanced } from "./context/AuthContextEnhanced";
import AuthManager from "./components/auth/AuthManager";
import BlocApp from "./BlocApp";
import OwnerPortalWrapper from "./components/owner/OwnerPortalWrapper";
import OwnerInviteRegistration from "./components/auth/OwnerInviteRegistration";
import OrgInviteRegistration from "./components/auth/OrgInviteRegistration";
import AssocInviteRegistration from "./components/auth/AssocInviteRegistration";
import EmailVerifiedSuccess from "./components/auth/EmailVerifiedSuccess";
import ContextSelectorView from "./components/views/ContextSelectorView";
import OrganizationView from "./components/views/OrganizationView";
import OrganizationMembersView from "./components/views/OrganizationMembersView";
import OrganizationSettingsView from "./components/views/OrganizationSettingsView";
import CreateOrganizationModal from "./components/modals/CreateOrganizationModal";
import CreateAssociationModal from "./components/modals/CreateAssociationModal";
import InviteMemberModal from "./components/modals/InviteMemberModal";
import AllocateExistingAssociationModal from "./components/modals/AllocateExistingAssociationModal";
import { AlertCircle } from "lucide-react";
import { useOrgInvitation } from "./hooks/useOrgInvitation";
import ErrorBoundary from "./components/common/ErrorBoundary";
import './services/appCheck'; // Initialize App Check for security

/**
 * Detectează magic link pentru invitații proprietari
 * URL format: /invite/{token}
 */
function useInviteToken() {
  const [token] = useState(() => {
    // Skip - e pentru organizație (format: /invite/org/{token})
    const orgMatch = window.location.pathname.match(/\/invite\/org\/(.+)/);
    if (orgMatch) return null;

    // Skip - e pentru asociație (format: /invite/assoc/{token})
    const assocMatch = window.location.pathname.match(/\/invite\/assoc\/(.+)/);
    if (assocMatch) return null;

    // Invitație pentru proprietari (format: /invite/{token})
    const match = window.location.pathname.match(/\/invite\/(.+)/);
    return match ? match[1] : null;
  });

  return token;
}

/**
 * Detectează magic link pentru invitații organizație
 * URL format: /invite/org/{token}
 */
function useOrgInviteToken() {
  const [token] = useState(() => {
    const match = window.location.pathname.match(/\/invite\/org\/(.+)/);
    return match ? match[1] : null;
  });

  return token;
}

/**
 * Detectează magic link pentru invitații asociație
 * URL format: /invite/assoc/{token}
 */
function useAssocInviteToken() {
  const [token] = useState(() => {
    const match = window.location.pathname.match(/\/invite\/assoc\/(.+)/);
    return match ? match[1] : null;
  });

  return token;
}

/**
 * Detectează link-uri Firebase Auth (verificare email, resetare parolă)
 * URL format: ?mode=verifyEmail&oobCode=XXX sau /email-verified
 */
function useFirebaseAuthAction() {
  const [authAction, setAuthAction] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const pathname = window.location.pathname;

    // Verifică dacă e link de verificare email
    if (mode === 'verifyEmail' && oobCode) {
      return { type: 'verifyEmail', oobCode };
    }

    // Verifică dacă e link de resetare parolă
    if (mode === 'resetPassword' && oobCode) {
      return { type: 'resetPassword', oobCode };
    }

    // Verifică path-ul /email-verified
    if (pathname === '/email-verified') {
      return { type: 'emailVerified' };
    }

    return null;
  });

  return authAction;
}

// Componenta principală care decide ce să afișeze
function AppContent() {
  const {
    currentUser,
    userProfile,
    loading,
    isEmailVerified,
    needsOnboarding,
    logoutEnhanced,
    // 🆕 Context switching
    currentContext,
    contextsLoading,
    userOrganizations,
    userDirectAssociations,
    selectOrganization,
    selectDirectAssociation,
    clearContext,
    needsContextSelection
  } = useAuthEnhanced();

  // State pentru navigare organizație
  const [orgView, setOrgView] = useState('dashboard'); // dashboard, settings, members

  // 🆕 State pentru modale creare
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showCreateAssocModal, setShowCreateAssocModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showAllocateAssocModal, setShowAllocateAssocModal] = useState(false);

  // Hook pentru invitații
  const { createInvitation, loading: invitationLoading } = useOrgInvitation();

  // 📡 BROADCAST CHANNEL - Sincronizare între tab-uri
  // Detectează când onboarding-ul s-a completat în alt tab și reîncarcă pagina
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('blocapp-session-sync');

    channel.onmessage = (event) => {
      // Când onboarding-ul s-a completat în alt tab, reîncarcă pentru a sincroniza starea
      if (event.data.type === 'ONBOARDING_COMPLETED') {
        console.log('📡 Onboarding completed in another tab, reloading...');
        window.location.reload();
      }
    };

    return () => channel.close();
  }, []);

  // Detectează magic link pentru invitații proprietari
  const inviteToken = useInviteToken();

  // Detectează magic link pentru invitații organizație
  const orgInviteToken = useOrgInviteToken();

  // Detectează magic link pentru invitații asociație
  const assocInviteToken = useAssocInviteToken();

  // Detectează link-uri Firebase Auth (verificare email, resetare parolă)
  const firebaseAuthAction = useFirebaseAuthAction();

  // 🔗 FIREBASE AUTH ACTION: Verificare email sau resetare parolă
  // Aceasta are prioritate maximă
  if (firebaseAuthAction && (firebaseAuthAction.type === 'verifyEmail' || firebaseAuthAction.type === 'emailVerified' || firebaseAuthAction.type === 'resetPassword')) {
    return <EmailVerifiedSuccess />;
  }

  // 🎫 MAGIC LINK: Afișează pagina de înregistrare pentru proprietari
  // Aceasta are prioritate maximă - chiar și dacă user-ul e logat
  if (inviteToken) {
    return <OwnerInviteRegistration token={inviteToken} />;
  }

  // 🏢 MAGIC LINK: Afișează pagina de înregistrare pentru invitații organizație
  if (orgInviteToken) {
    return (
      <OrgInviteRegistration
        token={orgInviteToken}
        onSuccess={(result) => {
          // Redirecționează la organizație după acceptare
          window.location.href = '/';
        }}
        onNavigateToLogin={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // 🏠 MAGIC LINK: Afișează pagina de acceptare invitație asociație
  if (assocInviteToken) {
    return (
      <AssocInviteRegistration
        token={assocInviteToken}
        onSuccess={(result) => {
          window.location.href = '/';
        }}
        onNavigateToLogin={() => {
          window.location.href = '/';
        }}
      />
    );
  }

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
    return <OwnerPortalWrapper currentUser={currentUser} />;
  }

  // 🆕 CONTEXT SELECTOR - Dacă utilizatorul trebuie să aleagă o asociație
  if (needsContextSelection()) {
    return (
      <>
        <ContextSelectorView
          userId={currentUser?.uid}
          userProfile={userProfile}
          activeUser={currentUser}
          onSelectAssociation={(assoc) => {
            selectDirectAssociation(assoc);
          }}
          onCreateAssociation={() => setShowCreateAssocModal(true)}
        />

        <CreateAssociationModal
          isOpen={showCreateAssocModal}
          onClose={() => setShowCreateAssocModal(false)}
          userId={currentUser?.uid}
          onSuccess={(assoc) => {
            selectDirectAssociation(assoc);
          }}
        />
      </>
    );
  }

  // Organizațiile sunt dezactivate la lansare - dacă cumva ajunge aici, redirect la selector
  if (currentContext?.type === 'organization') {
    clearContext();
    return null;
  }

  // 🏢 DACĂ POATE GESTIONA - APLICAȚIA PRINCIPALĂ (necesită context setat!)
  if ((userProfile.role === 'admin_asociatie' || userProfile.role === 'master' || userProfile.role === 'presedinte' || userProfile.role === 'cenzor') && currentContext?.type === 'association') {
    return <BlocApp associationId={currentContext.data.id} userRole={currentContext.role} onSwitchContext={clearContext} />;
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