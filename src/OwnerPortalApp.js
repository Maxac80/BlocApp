import React, { useState, useEffect } from "react";
import { AuthProviderEnhanced, useAuthEnhanced } from "./context/AuthContextEnhanced";
import OwnerApp from "./components/owner/OwnerApp";
import OwnerLandingPage from "./components/owner/OwnerLandingPage";
import OwnerApartmentSelector from "./components/owner/OwnerApartmentSelector";
import OwnerInviteRegistration from "./components/auth/OwnerInviteRegistration";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import './services/appCheck';

/**
 * Detectează magic link pentru invitații proprietari
 * URL format: /invite/{token}
 */
function useInviteToken() {
  const [token] = useState(() => {
    const match = window.location.pathname.match(/\/invite\/(.+)/);
    return match ? match[1] : null;
  });
  return token;
}

/**
 * Conținutul principal al portalului proprietarilor
 */
function OwnerPortalContent() {
  const { currentUser, loading: authLoading, logoutEnhanced } = useAuthEnhanced();

  // 🎫 MAGIC LINK: Detectează token de invitație din URL
  const inviteToken = useInviteToken();

  // State pentru apartamente găsite după email
  const [userApartments, setUserApartments] = useState([]);
  const [loadingApartments, setLoadingApartments] = useState(false);

  // Restaurează apartamentul din localStorage la încărcare
  const [selectedApartment, setSelectedApartment] = useState(() => {
    try {
      const saved = localStorage.getItem('ownerPortal_selectedApartment');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // State pentru acces rapid (fără autentificare)
  const [quickAccessApartment, setQuickAccessApartment] = useState(() => {
    try {
      const saved = localStorage.getItem('ownerPortal_quickAccess');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Când user-ul se loghează, caută apartamentele după email
  // Dar nu caută dacă deja avem un apartament selectat (restaurat din localStorage)
  useEffect(() => {
    if (currentUser?.email && !quickAccessApartment && !selectedApartment) {
      findApartmentsByEmail(currentUser.email);
    }
  }, [currentUser, quickAccessApartment, selectedApartment]);

  // Curăță localStorage dacă sesiunea a expirat (user nu e logat dar avem date salvate)
  useEffect(() => {
    if (!authLoading && !currentUser && selectedApartment) {
      setSelectedApartment(null);
      setQuickAccessApartment(null);
      localStorage.removeItem('ownerPortal_selectedApartment');
      localStorage.removeItem('ownerPortal_quickAccess');
    }
  }, [authLoading, currentUser, selectedApartment]);

  // 🎫 PRIORITATE MAXIMĂ: Magic link - afișează pagina de înregistrare
  // Această verificare TREBUIE să fie DUPĂ toate hook-urile (Rules of Hooks)
  if (inviteToken) {
    return <OwnerInviteRegistration token={inviteToken} />;
  }

  // Caută apartamentele în toate asociațiile unde email-ul match-uiește
  const findApartmentsByEmail = async (email) => {
    setLoadingApartments(true);
    try {
      const foundApartments = [];

      // Obține toate asociațiile
      const associationsRef = collection(db, 'associations');
      const associationsSnap = await getDocs(associationsRef);

      // Pentru fiecare asociație, caută în sheets pentru apartamente cu acest email
      for (const assocDoc of associationsSnap.docs) {
        const associationData = { id: assocDoc.id, ...assocDoc.data() };

        // Caută în sheets - apartamentele sunt stocate acolo
        const sheetsRef = collection(db, `associations/${assocDoc.id}/sheets`);
        const sheetsSnap = await getDocs(sheetsRef);

        // Ia cel mai recent sheet (in_progress sau ultimul)
        let latestSheet = null;
        for (const sheetDoc of sheetsSnap.docs) {
          const sheetData = sheetDoc.data();
          if (sheetData.status === 'in_progress') {
            latestSheet = { id: sheetDoc.id, ...sheetData };
            break;
          }
          if (!latestSheet || (sheetData.createdAt > latestSheet.createdAt)) {
            latestSheet = { id: sheetDoc.id, ...sheetData };
          }
        }

        // Apartamentele sunt în associationSnapshot.apartments (array)
        const apartments = latestSheet?.associationSnapshot?.apartments || [];

        apartments.forEach(aptData => {
          // Match pe email (case insensitive)
          if (aptData.email?.toLowerCase() === email.toLowerCase()) {
            foundApartments.push({
              apartmentId: aptData.id,
              apartmentNumber: aptData.number,
              apartmentData: aptData,
              associationId: assocDoc.id,
              associationName: associationData.name,
              associationData: associationData,
              sheetId: latestSheet.id
            });
          }
        });
      }

      setUserApartments(foundApartments);

      // Dacă are un singur apartament, selectează-l automat
      if (foundApartments.length === 1) {
        setSelectedApartment(foundApartments[0]);
        localStorage.setItem('ownerPortal_selectedApartment', JSON.stringify(foundApartments[0]));
      }

    } catch (error) {
      console.error('Error finding apartments:', error);
    } finally {
      setLoadingApartments(false);
    }
  };

  // Handler pentru acces rapid (selectare din dropdowns)
  const handleQuickAccessSelect = (apartmentInfo) => {
    setQuickAccessApartment(apartmentInfo);
    setSelectedApartment(apartmentInfo);
    // Salvează în localStorage pentru persistență la refresh
    localStorage.setItem('ownerPortal_selectedApartment', JSON.stringify(apartmentInfo));
    localStorage.setItem('ownerPortal_quickAccess', JSON.stringify(apartmentInfo));
  };

  // Handler pentru selectare apartament (când are mai multe)
  const handleSelectApartment = (apartment) => {
    setSelectedApartment(apartment);
    // Salvează în localStorage pentru persistență la refresh
    localStorage.setItem('ownerPortal_selectedApartment', JSON.stringify(apartment));
  };

  // Handler pentru schimbare apartament
  const handleChangeApartment = () => {
    setSelectedApartment(null);
    setQuickAccessApartment(null);
    localStorage.removeItem('ownerPortal_selectedApartment');
    localStorage.removeItem('ownerPortal_quickAccess');
  };

  // Handler pentru logout
  const handleLogout = async () => {
    // Curăță state-urile și localStorage
    setSelectedApartment(null);
    setUserApartments([]);
    setQuickAccessApartment(null);
    localStorage.removeItem('ownerPortal_selectedApartment');
    localStorage.removeItem('ownerPortal_quickAccess');

    // Așteptăm un tick pentru ca OwnerApp să se demonteze și
    // listener-urile Firestore să se oprească înainte de logout
    await new Promise(resolve => setTimeout(resolve, 150));

    await logoutEnhanced();
  };

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Dacă avem apartament selectat (din login real sau acces rapid), afișează aplicația
  // IMPORTANT: verifică și că userul e autentificat (previne erori la revenire cu sesiune expirată)
  if (selectedApartment && currentUser) {
    return (
      <OwnerApp
        apartmentInfo={selectedApartment}
        userApartments={userApartments}
        onChangeApartment={handleChangeApartment}
        onLogout={handleLogout}
        isDevMode={false}
      />
    );
  }

  // Dacă user-ul e logat și încă se caută apartamentele
  if (currentUser && loadingApartments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se caută apartamentele tale...</p>
        </div>
      </div>
    );
  }

  // Dacă user-ul e logat dar nu are apartamente asociate
  if (currentUser && userApartments.length === 0 && !loadingApartments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Niciun apartament găsit</h2>
          <p className="text-gray-600 mb-6">
            Nu am găsit niciun apartament asociat cu adresa <strong>{currentUser.email}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Contactează administratorul asociației tale pentru a primi o invitație de acces.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Deconectează-te
          </button>
        </div>
      </div>
    );
  }

  // Dacă user-ul e logat și are mai multe apartamente, afișează selector
  if (currentUser && userApartments.length > 1) {
    return (
      <OwnerApartmentSelector
        apartments={userApartments}
        onSelect={handleSelectApartment}
        onLogout={handleLogout}
        userEmail={currentUser.email}
      />
    );
  }

  // Handler pentru bypass - caută în Firebase cu sesiunea curentă (admin)
  const handleBypassSearch = async (email) => {
    console.log('[OwnerPortal] Bypass: căutăm apartament pentru email:', email);
    console.log('[OwnerPortal] User curent Firebase:', currentUser?.email || 'neautentificat');

    // Caută apartamentul folosind sesiunea Firebase existentă
    const foundApartments = [];
    try {
      const associationsRef = collection(db, 'associations');
      const associationsSnap = await getDocs(associationsRef);

      for (const assocDoc of associationsSnap.docs) {
        const associationData = { id: assocDoc.id, ...assocDoc.data() };
        const sheetsRef = collection(db, `associations/${assocDoc.id}/sheets`);
        const sheetsSnap = await getDocs(sheetsRef);

        // Găsește sheet-ul activ
        let latestSheet = null;
        for (const sheetDoc of sheetsSnap.docs) {
          const sheetData = sheetDoc.data();
          if (sheetData.status === 'in_progress') {
            latestSheet = { id: sheetDoc.id, ...sheetData };
            break;
          }
          if (!latestSheet || (sheetData.createdAt > latestSheet.createdAt)) {
            latestSheet = { id: sheetDoc.id, ...sheetData };
          }
        }

        const apartments = latestSheet?.associationSnapshot?.apartments || [];
        console.log(`[OwnerPortal] Asociația ${associationData.name}: ${apartments.length} apartamente`);

        apartments.forEach(aptData => {
          console.log(`  - Ap ${aptData.number}: ${aptData.email} (ID: ${aptData.id})`);
          if (aptData.email?.toLowerCase() === email.toLowerCase()) {
            foundApartments.push({
              apartmentId: aptData.id,
              apartmentNumber: aptData.number,
              apartmentData: aptData,
              associationId: assocDoc.id,
              associationName: associationData.name,
              associationData: associationData,
              sheetId: latestSheet.id
            });
          }
        });
      }

      if (foundApartments.length > 0) {
        console.log('[OwnerPortal] Găsit apartament:', foundApartments[0]);
        handleQuickAccessSelect(foundApartments[0]);
        return { success: true };
      } else {
        return { success: false, error: `Nu s-a găsit apartament pentru ${email}` };
      }
    } catch (error) {
      console.error('[OwnerPortal] Eroare la căutare:', error);
      return { success: false, error: error.message };
    }
  };

  // Nu e logat - afișează landing page
  return <OwnerLandingPage />;
}

/**
 * Aplicație standalone pentru Portal Locatari
 */
export default function OwnerPortalApp() {
  return (
    <ErrorBoundary>
      <AuthProviderEnhanced>
        <OwnerPortalContent />
      </AuthProviderEnhanced>
    </ErrorBoundary>
  );
}
