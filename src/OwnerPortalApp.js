/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { AuthProviderEnhanced, useAuthEnhanced } from "./context/AuthContextEnhanced";
import OwnerApp from "./components/owner/OwnerApp";
import OwnerLandingPage from "./components/owner/OwnerLandingPage";
import OwnerApartmentSelector from "./components/owner/OwnerApartmentSelector";
import OwnerInviteRegistration from "./components/auth/OwnerInviteRegistration";
import OwnerStandaloneProfile from "./components/owner/OwnerStandaloneProfile";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { collection, getDocs, query, where } from 'firebase/firestore';
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

  // Profilul owner-ului logat (firstName, lastName, phone, email)
  const [ownerProfile, setOwnerProfile] = useState(null);

  // State pentru pagini standalone (Profil)
  const [standalonePage, setStandalonePage] = useState(null);

  const handleStandaloneNavigate = (page) => setStandalonePage(page);
  const handleStandaloneBack = () => setStandalonePage(null);

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

  // Încarcă profilul owner-ului (necesar după refresh când selectedApartment vine din localStorage)
  useEffect(() => {
    if (currentUser?.uid && !ownerProfile && !quickAccessApartment) {
      loadOwnerProfileOnly(currentUser.uid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // Când user-ul se loghează, caută apartamentele
  // Prioritate: 1. owners collection (firebaseUid) → 2. sheets (email match)
  useEffect(() => {
    if (currentUser?.uid && !quickAccessApartment && !selectedApartment) {
      findOwnerApartments(currentUser.uid, currentUser.email);
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

  /**
   * Încarcă doar profilul owner-ului (fără apartamente) — folosit la refresh
   */
  const loadOwnerProfileOnly = async (uid) => {
    try {
      const ownersQuery = query(collection(db, 'owners'), where('firebaseUid', '==', uid));
      const ownersSnap = await getDocs(ownersQuery);
      if (!ownersSnap.empty) {
        const owner = { id: ownersSnap.docs[0].id, ...ownersSnap.docs[0].data() };
        setOwnerProfile({
          id: owner.id,
          firstName: owner.firstName || '',
          lastName: owner.lastName || '',
          phone: owner.phone || '',
          email: owner.email || ''
        });
      }
    } catch (err) {
      console.error('[OwnerPortal] Error loading owner profile:', err);
    }
  };

  /**
   * Căutare principală: owners collection (firebaseUid) → fallback sheets (email)
   */
  const findOwnerApartments = async (uid, email) => {
    setLoadingApartments(true);
    try {
      // 1. Caută în colecția owners după firebaseUid
      const ownerApartments = await findApartmentsFromOwnersCollection(uid);

      if (ownerApartments.length > 0) {
        setUserApartments(ownerApartments);
        if (ownerApartments.length === 1) {
          setSelectedApartment(ownerApartments[0]);
          localStorage.setItem('ownerPortal_selectedApartment', JSON.stringify(ownerApartments[0]));
        }
        return;
      }

      // 2. Fallback: caută după email în sheets
      if (email) {
        await findApartmentsByEmail(email);
      }
    } catch (error) {
      console.error('[OwnerPortal] Error finding apartments:', error);
    } finally {
      setLoadingApartments(false);
    }
  };

  /**
   * Caută în colecția owners după firebaseUid (proprietari invitați și activați)
   */
  const findApartmentsFromOwnersCollection = async (uid) => {
    const foundApartments = [];
    try {
      const ownersQuery = query(
        collection(db, 'owners'),
        where('firebaseUid', '==', uid)
      );
      const ownersSnap = await getDocs(ownersQuery);

      if (ownersSnap.empty) return [];

      const ownerDoc = ownersSnap.docs[0];
      const owner = { id: ownerDoc.id, ...ownerDoc.data() };

      // Salvează profilul owner-ului logat
      setOwnerProfile({
        id: owner.id,
        firstName: owner.firstName || '',
        lastName: owner.lastName || '',
        phone: owner.phone || '',
        email: owner.email || ''
      });

      for (const assoc of owner.associations || []) {
        // Obține date asociație
        const associationsRef = collection(db, 'associations');
        const assocSnap = await getDocs(associationsRef);
        const associationDoc = assocSnap.docs.find(doc => doc.id === assoc.associationId);
        if (!associationDoc) continue;

        const associationData = { id: associationDoc.id, ...associationDoc.data() };

        // Obține sheet-ul activ
        const sheetsRef = collection(db, `associations/${assoc.associationId}/sheets`);
        const sheetsSnap = await getDocs(sheetsRef);

        const allSheets = sheetsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const inProgressSheet = allSheets.find(s => s.status === 'in_progress');
        const sortedPublished = allSheets
          .filter(s => s.status === 'published')
          .sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        const latestPublishedSheet = sortedPublished[0] || null;
        const latestSheet = inProgressSheet || latestPublishedSheet || allSheets[0] || null;
        // Sursa pentru maintenanceTable cu date financiare: preferă published (are totalDatorat)
        // Identic cu logica din useOwnerData.js: activeSheet = published || current
        const maintenanceSource = latestPublishedSheet || inProgressSheet || latestSheet;

        const sheetApartments = latestSheet?.associationSnapshot?.apartments || [];
        const sheetStairs = latestSheet?.associationSnapshot?.stairs || [];
        const sheetBlocks = latestSheet?.associationSnapshot?.blocks || [];

        // Fallback: load from Firestore root collections if sheet snapshot doesn't have stairs/blocks
        let allStairs = sheetStairs;
        let allBlocks = sheetBlocks;
        if (sheetStairs.length === 0 || sheetBlocks.length === 0) {
          try {
            const blocksQuery = query(collection(db, 'blocks'), where('associationId', '==', assoc.associationId));
            const blocksSnap = await getDocs(blocksQuery);
            const fbBlocks = blocksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (fbBlocks.length > 0) {
              const blockIds = fbBlocks.map(b => b.id);
              const stairsQuery = query(collection(db, 'stairs'), where('blockId', 'in', blockIds));
              const stairsSnap = await getDocs(stairsQuery);
              const fbStairs = stairsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
              if (sheetStairs.length === 0) allStairs = fbStairs;
              if (sheetBlocks.length === 0) allBlocks = fbBlocks;
            }
          } catch (e) {
            console.warn('[OwnerPortal] Could not load stairs/blocks:', e);
          }
        }

        for (const apt of assoc.apartments || []) {
          const fullAptData = sheetApartments.find(a => a.id === apt.apartmentId) || apt;

          // Resolve block/stair names
          let blockName = fullAptData.block || '';
          let stairName = fullAptData.stair || '';

          if ((!blockName || !stairName) && fullAptData.stairId) {
            const stairObj = allStairs.find(s => s.id === fullAptData.stairId);
            if (stairObj) {
              if (!stairName) stairName = stairObj.name || '';
              if (!blockName && stairObj.blockId) {
                const blockObj = allBlocks.find(b => b.id === stairObj.blockId);
                if (blockObj) blockName = blockObj.name || '';
              }
            }
          }

          // Calculează totalStairSurface
          const sameStairApartments = sheetApartments.filter(a =>
            (fullAptData.stairId && a.stairId === fullAptData.stairId) ||
            (fullAptData.stair && a.stair === fullAptData.stair)
          );
          const totalStairSurface = sameStairApartments.reduce(
            (sum, a) => sum + (parseFloat(a.surface) || 0), 0
          );

          const aptId = apt.apartmentId;
          const maintenanceEntry = maintenanceSource?.maintenanceTable?.find(row =>
            row.apartmentId === aptId ||
            String(row.apartmentNumber) === String(apt.number || fullAptData.number)
          );
          foundApartments.push({
            apartmentId: apt.apartmentId,
            apartmentNumber: apt.number || fullAptData.number,
            apartmentData: { ...fullAptData, blockName, stairName, totalStairSurface },
            associationId: assoc.associationId,
            associationName: assoc.associationName || associationData.name,
            associationData: associationData,
            sheetId: latestSheet?.id,
            role: apt.role || 'proprietar',
            totalDatorat: maintenanceEntry?.totalDatorat ?? null,
            monthYear: maintenanceEntry ? (maintenanceSource?.monthYear ?? null) : (latestSheet?.monthYear ?? null),
            currentMaintenance: maintenanceEntry?.currentMaintenance ?? null,
            paymentRemaining: latestSheet?.balances?.apartmentBalances?.[apt.apartmentId]?.remaining ?? null,
          });
        }
      }
    } catch (err) {
      console.error('[OwnerPortal] Error searching owners collection:', err);
    }
    return foundApartments;
  };

  /**
   * Fallback: caută în sheets după email
   */
  const findApartmentsByEmail = async (email) => {
    try {
      const foundApartments = [];
      const associationsRef = collection(db, 'associations');
      const associationsSnap = await getDocs(associationsRef);

      for (const assocDoc of associationsSnap.docs) {
        const associationData = { id: assocDoc.id, ...assocDoc.data() };
        const sheetsRef = collection(db, `associations/${assocDoc.id}/sheets`);
        const sheetsSnap = await getDocs(sheetsRef);

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
        const sheetStairs2 = latestSheet?.associationSnapshot?.stairs || [];
        const sheetBlocks2 = latestSheet?.associationSnapshot?.blocks || [];

        // Fallback: load from Firestore if sheet doesn't have stairs/blocks
        let allStairs2 = sheetStairs2;
        let allBlocks2 = sheetBlocks2;
        if (sheetStairs2.length === 0 || sheetBlocks2.length === 0) {
          try {
            const blQuery = query(collection(db, 'blocks'), where('associationId', '==', assocDoc.id));
            const blSnap = await getDocs(blQuery);
            const fbBlocks = blSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (fbBlocks.length > 0) {
              const bIds = fbBlocks.map(b => b.id);
              const stQuery = query(collection(db, 'stairs'), where('blockId', 'in', bIds));
              const stSnap = await getDocs(stQuery);
              const fbStairs = stSnap.docs.map(d => ({ id: d.id, ...d.data() }));
              if (sheetStairs2.length === 0) allStairs2 = fbStairs;
              if (sheetBlocks2.length === 0) allBlocks2 = fbBlocks;
            }
          } catch (e) { /* ignore */ }
        }

        apartments.forEach(aptData => {
          if (aptData.email?.toLowerCase() === email.toLowerCase()) {
            // Resolve block/stair names
            let blockName = aptData.block || '';
            let stairName = aptData.stair || '';
            if ((!blockName || !stairName) && aptData.stairId) {
              const stairObj = allStairs2.find(s => s.id === aptData.stairId);
              if (stairObj) {
                if (!stairName) stairName = stairObj.name || '';
                if (!blockName && stairObj.blockId) {
                  const blockObj = allBlocks2.find(b => b.id === stairObj.blockId);
                  if (blockObj) blockName = blockObj.name || '';
                }
              }
            }

            const sameStairApartments = apartments.filter(a =>
              (aptData.stairId && a.stairId === aptData.stairId) ||
              (aptData.stair && a.stair === aptData.stair)
            );
            const totalStairSurface = sameStairApartments.reduce(
              (sum, a) => sum + (parseFloat(a.surface) || 0), 0
            );

            const maintenanceEntry2 = latestSheet?.maintenanceTable?.find(row => row.apartmentId === aptData.id);
            foundApartments.push({
              apartmentId: aptData.id,
              apartmentNumber: aptData.number,
              apartmentData: { ...aptData, blockName, stairName, totalStairSurface },
              associationId: assocDoc.id,
              associationName: associationData.name,
              associationData: associationData,
              sheetId: latestSheet.id,
              role: 'proprietar',
              totalDatorat: maintenanceEntry2?.totalDatorat ?? null,
              monthYear: latestSheet?.monthYear ?? null,
              currentMaintenance: maintenanceEntry2?.currentMaintenance ?? null,
              paymentRemaining: latestSheet?.balances?.apartmentBalances?.[aptData.id]?.remaining ?? null,
            });
          }
        });
      }

      setUserApartments(foundApartments);
      if (foundApartments.length === 1) {
        setSelectedApartment(foundApartments[0]);
        localStorage.setItem('ownerPortal_selectedApartment', JSON.stringify(foundApartments[0]));
      }
    } catch (error) {
      console.error('[OwnerPortal] Error finding apartments by email:', error);
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

  // Pagina standalone de profil (accesibilă din selector și din aplicație)
  if (standalonePage === 'profile' && currentUser) {
    return (
      <OwnerStandaloneProfile
        ownerProfile={ownerProfile}
        selectedApartment={selectedApartment}
        onBack={handleStandaloneBack}
        onLogout={handleLogout}
        userEmail={currentUser.email}
        onProfileUpdated={(updated) => setOwnerProfile(prev => ({ ...prev, ...updated }))}
      />
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
        ownerProfile={ownerProfile}
        onNavigateStandalone={handleStandaloneNavigate}
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
        ownerProfile={ownerProfile}
        onNavigateStandalone={handleStandaloneNavigate}
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
