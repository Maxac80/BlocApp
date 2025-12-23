import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import OwnerApp from './OwnerApp';
import OwnerApartmentSelector from './OwnerApartmentSelector';
import { Home, Search, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Wrapper pentru Owner Portal în modul integrat
 *
 * Ordinea de căutare:
 * 1. Căutare în colecția `owners` după firebaseUid (proprietari invitați și activați)
 * 2. Fallback: căutare în sheets după email (pentru proprietari neinvitați)
 */
export default function OwnerPortalWrapper({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [error, setError] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [ownerData, setOwnerData] = useState(null); // Date din colecția owners

  // La montare, caută apartamentele pentru utilizatorul curent
  useEffect(() => {
    if (currentUser?.uid) {
      findOwnerApartments(currentUser.uid, currentUser.email);
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  /**
   * Căutare principală: owners collection → fallback la sheets
   */
  const findOwnerApartments = async (uid, email) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Căutare în colecția owners după firebaseUid
      const ownerApartments = await findApartmentsFromOwnersCollection(uid);

      if (ownerApartments.length > 0) {
        setApartments(ownerApartments);
        if (ownerApartments.length === 1) {
          setSelectedApartment(ownerApartments[0]);
        }
        setLoading(false);
        return;
      }

      // 2. Fallback: căutare după email în sheets
      if (email) {
        await findApartmentsByEmail(email);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('[OwnerPortalWrapper] Eroare:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  /**
   * Căutare în colecția owners după firebaseUid
   */
  const findApartmentsFromOwnersCollection = async (uid) => {
    const foundApartments = [];

    try {
      const ownersQuery = query(
        collection(db, 'owners'),
        where('firebaseUid', '==', uid)
      );
      const ownersSnap = await getDocs(ownersQuery);

      if (ownersSnap.empty) {
        return [];
      }

      const ownerDoc = ownersSnap.docs[0];
      const owner = { id: ownerDoc.id, ...ownerDoc.data() };
      setOwnerData(owner);

      // Iterează prin asociațiile din documentul owner
      for (const assoc of owner.associations || []) {
        // Obține date complete despre asociație
        const associationsRef = collection(db, 'associations');
        const assocSnap = await getDocs(associationsRef);
        const associationDoc = assocSnap.docs.find(doc => doc.id === assoc.associationId);

        if (!associationDoc) continue;

        const associationData = { id: associationDoc.id, ...associationDoc.data() };

        // Obține sheet-ul activ pentru date complete
        const sheetsRef = collection(db, `associations/${assoc.associationId}/sheets`);
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

        const sheetApartments = latestSheet?.associationSnapshot?.apartments || [];

        // Pentru fiecare apartament din owner.associations
        for (const apt of assoc.apartments || []) {
          // Găsește datele complete din sheet
          const fullAptData = sheetApartments.find(a => a.id === apt.apartmentId) || apt;

          // Calculează totalStairSurface
          const sameStairApartments = sheetApartments.filter(a =>
            (fullAptData.stairId && a.stairId === fullAptData.stairId) ||
            (fullAptData.stair && a.stair === fullAptData.stair)
          );
          const totalStairSurface = sameStairApartments.reduce(
            (sum, a) => sum + (parseFloat(a.surface) || 0), 0
          );

          foundApartments.push({
            apartmentId: apt.apartmentId,
            apartmentNumber: apt.number || fullAptData.number,
            apartmentData: {
              ...fullAptData,
              totalStairSurface
            },
            associationId: assoc.associationId,
            associationName: assoc.associationName || associationData.name,
            associationData: associationData,
            sheetId: latestSheet?.id
          });
        }
      }
    } catch (err) {
      console.error('[OwnerPortalWrapper] Eroare la căutare în owners:', err);
    }

    return foundApartments;
  };

  /**
   * Fallback: Căutare în sheets după email
   */
  const findApartmentsByEmail = async (email) => {
    setLoading(true);
    setError(null);

    try {
      const foundApartments = [];
      const associationsRef = collection(db, 'associations');
      const associationsSnap = await getDocs(associationsRef);

      for (const assocDoc of associationsSnap.docs) {
        const associationData = { id: assocDoc.id, ...assocDoc.data() };
        const sheetsRef = collection(db, `associations/${assocDoc.id}/sheets`);
        const sheetsSnap = await getDocs(sheetsRef);

        // Găsește sheet-ul activ (in_progress sau ultimul)
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

        // Apartamentele sunt în associationSnapshot.apartments
        const sheetApartments = latestSheet?.associationSnapshot?.apartments || [];

        sheetApartments.forEach(aptData => {
          // Match pe email (case insensitive)
          if (aptData.email?.toLowerCase() === email.toLowerCase()) {
            // Calculează totalStairSurface pentru apartamentele din aceeași scară
            const sameStairApartments = sheetApartments.filter(apt =>
              (aptData.stairId && apt.stairId === aptData.stairId) ||
              (aptData.stair && apt.stair === aptData.stair)
            );
            const totalStairSurface = sameStairApartments.reduce(
              (sum, apt) => sum + (parseFloat(apt.surface) || 0), 0
            );

            foundApartments.push({
              apartmentId: aptData.id,
              apartmentNumber: aptData.number,
              apartmentData: {
                ...aptData,
                totalStairSurface // Adaugă suprafața totală a scării
              },
              associationId: assocDoc.id,
              associationName: associationData.name,
              associationData: associationData,
              sheetId: latestSheet.id
            });
          }
        });
      }

      setApartments(foundApartments);

      // Dacă are un singur apartament, selectează-l automat
      if (foundApartments.length === 1) {
        setSelectedApartment(foundApartments[0]);
      }

    } catch (err) {
      console.error('[OwnerPortalWrapper] Eroare la căutare:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler căutare manuală
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    await findApartmentsByEmail(searchEmail.trim());
  };

  // Handler schimbare apartament
  const handleChangeApartment = () => {
    setSelectedApartment(null);
  };

  // Handler exit (înapoi la admin)
  const handleExitOwnerMode = () => {
    window.location.href = window.location.pathname; // Elimină ?mode=owner
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se caută apartamentele...</p>
        </div>
      </div>
    );
  }

  // Dacă avem apartament selectat, afișează Owner Portal
  if (selectedApartment) {
    return (
      <OwnerApp
        apartmentInfo={selectedApartment}
        userApartments={apartments}
        onChangeApartment={handleChangeApartment}
        onLogout={handleExitOwnerMode}
        isDevMode={false}
      />
    );
  }

  // Dacă avem mai multe apartamente, afișează selector
  if (apartments.length > 1) {
    return (
      <OwnerApartmentSelector
        apartments={apartments}
        onSelect={setSelectedApartment}
        onLogout={handleExitOwnerMode}
        userEmail={currentUser?.email}
      />
    );
  }

  // Niciun apartament găsit sau mod căutare manuală
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-xl mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Owner Portal</h1>
          <p className="text-gray-600 mt-2">Mod Development</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">

          {/* Status Firebase */}
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center">
              ✓ Conectat ca: <strong>{currentUser?.email}</strong>
            </p>
          </div>

          {/* Eroare */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Mesaj niciun apartament */}
          {apartments.length === 0 && !error && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <p className="text-orange-800 font-medium mb-1">
                Niciun apartament găsit
              </p>
              <p className="text-sm text-orange-600">
                Nu s-a găsit niciun apartament asociat cu {currentUser?.email}
              </p>
            </div>
          )}

          {/* Formular căutare manuală */}
          <form onSubmit={handleManualSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Caută apartament după email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="email@proprietar.ro"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Introdu email-ul proprietarului pentru a simula accesul
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
            >
              <Search className="w-5 h-5 mr-2" />
              Caută Apartament
            </button>
          </form>

          {/* Buton înapoi la admin */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleExitOwnerMode}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Înapoi la Admin App
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Folosești sesiunea Firebase admin pentru a accesa date reale
        </p>
      </div>
    </div>
  );
}
