/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Eye, Layers, Building, Building2, DoorOpen, Home, Users, Receipt, Plus, MessageSquare, Search } from 'lucide-react';
import { generateExcelTemplate } from '../../utils/excelTemplateGeneratorExcelJS';
import ExcelUploadModal from '../modals/ExcelUploadModal';
import ApartmentModal from '../modals/ApartmentModal';
import BlockModal from '../modals/BlockModal';
import StairModal from '../modals/StairModal';
import MaintenanceBreakdownModal from '../modals/MaintenanceBreakdownModal';
import ApartmentMembersModal from '../modals/ApartmentMembersModal';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import StatsCard from '../common/StatsCard';

const SetupView = ({
  association,
  blocks,
  stairs,
  getAssociationApartments, // 🎯 SURSĂ PRINCIPALĂ: citește din sheet-uri bazat pe luna selectată
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  isReadOnlyRole,
  handleNavigation,
  setPendingMaintenanceApartmentId,
  maintenanceData,
  currentSheet,
  publishedSheet, // 🆕 Necesar pentru a identifica sheet-ul corect bazat pe luna selectată
  getApartmentParticipation,
  getExpenseConfig,
  searchTerm,
  setSearchTerm,
  expandedBlocks,
  setExpandedBlocks,
  expandedStairs,
  setExpandedStairs,
  editingItem,
  setEditingItem,
  editingData,
  setEditingData,
  showAddForm,
  setShowAddForm,
  updateBlock,
  deleteBlock,
  updateStair,
  deleteStair,
  updateApartment,
  deleteApartment,
  addBlock,
  addStair,
  addApartment,
  setApartmentBalance,
  saveInitialBalances,
  getMonthType,
  // Pentru actualizarea Sheet 1 cu apartamentele
  updateStructureSnapshot,
  // Navigare la mesaje cu apartament pre-selectat
  onNavigateToApartmentMessages
}) => {
  const cantEdit = isMonthReadOnly || isReadOnlyRole;

  // Obține currentUser pentru invitații proprietari
  const { currentUser } = useAuthEnhanced();

  // State pentru modalul de upload Excel - TREBUIE să fie înainte de orice return
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  // State pentru dropdown-urile hamburger ale blocurilor, scărilor și apartamentelor
  const [openBlockMenus, setOpenBlockMenus] = useState({});
  const [openStairMenus, setOpenStairMenus] = useState({});
  const [openApartmentMenus, setOpenApartmentMenus] = useState({});

  // Filtru scop (dropdown lângă search) — valori: 'all' | 'block:<id>' | 'stair:<id>'
  const [filterScope, setFilterScope] = useState('all');

  // State pentru modalul de apartament
  const [apartmentModalOpen, setApartmentModalOpen] = useState(false);
  const [apartmentModalMode, setApartmentModalMode] = useState('add'); // 'add' sau 'edit'
  const [apartmentModalData, setApartmentModalData] = useState(null);
  const [apartmentModalStair, setApartmentModalStair] = useState(null);

  // State pentru modalul de bloc
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalMode, setBlockModalMode] = useState('add'); // 'add' sau 'edit'
  const [blockModalData, setBlockModalData] = useState(null);

  // State pentru modalul de scară
  const [stairModalOpen, setStairModalOpen] = useState(false);
  const [stairModalMode, setStairModalMode] = useState('add'); // 'add' sau 'edit'
  const [stairModalData, setStairModalData] = useState(null);
  const [stairModalBlock, setStairModalBlock] = useState(null);

  // State pentru apartamentul evidențiat
  const [highlightedApartmentId, setHighlightedApartmentId] = useState(null);

  // State pentru modalul de breakdown întreținere
  const [showMaintenanceBreakdown, setShowMaintenanceBreakdown] = useState(false);
  const [selectedApartmentForBreakdown, setSelectedApartmentForBreakdown] = useState(null);

  // State pentru modalul de membri apartament
  const [showApartmentMembersModal, setShowApartmentMembersModal] = useState(false);
  const [selectedApartmentForMembers, setSelectedApartmentForMembers] = useState(null);
  const [selectedStairForMembers, setSelectedStairForMembers] = useState(null);
  const [selectedBlockForMembers, setSelectedBlockForMembers] = useState(null);

  // Effect pentru închiderea dropdown-urilor când se face click în afara lor
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.block-menu-container') &&
          !event.target.closest('.stair-menu-container') &&
          !event.target.closest('.apartment-menu-container')) {
        setOpenBlockMenus({});
        setOpenStairMenus({});
        setOpenApartmentMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Verifică dacă toate props-urile necesare sunt disponibile
  if (!association || !blocks || !stairs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-20 lg:pt-4 lg:pb-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  const associationBlocks = blocks.filter(block => block.associationId === association?.id);
  const associationStairs = stairs.filter(stair =>
    associationBlocks.some(block => block.id === stair.blockId)
  );
  // 🎯 FOLOSEȘTE getAssociationApartments() pentru a citi din sheet-ul corect
  // Astfel, lunile publicate arată datele "înghețate", iar luna în lucru arată datele live
  const associationApartments = getAssociationApartments ? getAssociationApartments() : [];

  // 🎯 DETERMINĂ SHEET-UL ACTIV bazat pe luna selectată (similar cu logica pentru apartamente)
  const activeSheet = (publishedSheet?.monthYear === currentMonth)
    ? publishedSheet
    : currentSheet;

  // Helper: verifică dacă un apartament corespunde căutării active
  const apartmentMatchesSearch = (apt) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return apt.number.toString().includes(searchTerm) ||
           apt.owner?.toLowerCase().includes(term) ||
           apt.persons?.toString().includes(searchTerm);
  };

  // Filtrez apartamentele pentru căutare
  const filteredApartments = searchTerm
    ? associationApartments.filter(apartmentMatchesSearch)
    : associationApartments;

  // Set-uri cu ID-urile scărilor și blocurilor care conțin apartamente match (sau toate dacă nu e search)
  const matchedStairIds = React.useMemo(() => {
    if (!searchTerm) return null; // null = toate scările
    const ids = new Set();
    filteredApartments.forEach(apt => apt.stairId && ids.add(apt.stairId));
    return ids;
  }, [searchTerm, filteredApartments]);

  const matchedBlockIds = React.useMemo(() => {
    if (!searchTerm) return null; // null = toate blocurile
    const ids = new Set();
    if (matchedStairIds) {
      associationStairs.forEach(s => {
        if (matchedStairIds.has(s.id)) ids.add(s.blockId);
      });
    }
    return ids;
  }, [searchTerm, matchedStairIds, associationStairs]);

  // Parsare filtru scop
  const scopeBlockId = filterScope.startsWith('block:') ? filterScope.slice(6) : null;
  const scopeStairId = filterScope.startsWith('stair:') ? filterScope.slice(6) : null;
  // Dacă filtrul e pe scară, afișează doar blocul care conține scara
  const scopeStairBlockId = scopeStairId
    ? associationStairs.find(s => s.id === scopeStairId)?.blockId
    : null;

  // Helper: aplică filtrul de scop + match search pe lista de blocuri
  const filterBlocks = (allBlocks) => {
    return allBlocks.filter(b => {
      if (scopeBlockId && b.id !== scopeBlockId) return false;
      if (scopeStairBlockId && b.id !== scopeStairBlockId) return false;
      if (matchedBlockIds && !matchedBlockIds.has(b.id)) return false;
      return true;
    });
  };

  // Helper: aplică filtrul de scop + match search pe lista de scări dintr-un bloc
  const filterStairs = (stairs) => {
    let result = stairs;
    if (scopeStairId) result = result.filter(s => s.id === scopeStairId);
    if (matchedStairIds) result = result.filter(s => matchedStairIds.has(s.id));
    return result;
  };

  const totalBlocks = associationBlocks.length;
  const totalStairs = associationStairs.length;
  const totalApartments = associationApartments.length;
  const totalPersons = associationApartments.reduce((sum, apt) => sum + apt.persons, 0);

  // Calculez scările care nu au apartamente definite
  const stairsWithoutApartments = associationStairs.filter(stair => {
    const stairApartments = associationApartments.filter(apt => apt.stairId === stair.id);
    return stairApartments.length === 0;
  }).length;

  // 📊 FUNCȚIE PENTRU DESCĂRCAREA TEMPLATE-ULUI EXCEL
  const handleDownloadExcelTemplate = async () => {
    try {
      // Filtrează doar scările care nu au apartamente definite
      const emptyStairs = stairs.filter(stair => {
        const stairApartments = associationApartments.filter(apt => apt.stairId === stair.id);
        return stairApartments.length === 0;
      });

      await generateExcelTemplate(association, blocks, emptyStairs);
    } catch (error) {
      console.error('❌ Eroare la generarea template-ului Excel:', error);
      alert('Eroare la generarea template-ului Excel: ' + error.message);
    }
  };

  // 📊 FUNCȚIE PENTRU IMPORT ÎN BULK AL APARTAMENTELOR
  const handleImportApartments = async (apartments) => {
    // console.log('📊 Import apartamente în bulk:', apartments.length);

    let successCount = 0;
    let errorCount = 0;
    let apartmentsWithBalances = [];

    // 1. Adaugă apartamentele
    for (const apartment of apartments) {
      try {
        const newApartment = await addApartment(apartment);
        successCount++;

        // Verifică dacă apartamentul are solduri inițiale
        if ((apartment.initialBalance?.restante && apartment.initialBalance.restante > 0) ||
            (apartment.initialBalance?.penalitati && apartment.initialBalance.penalitati > 0)) {
          apartmentsWithBalances.push({
            apartmentId: newApartment.id || `${apartment.stairId}-${apartment.number}`,
            restante: apartment.initialBalance.restante || 0,
            penalitati: apartment.initialBalance.penalitati || 0,
            apartmentNumber: apartment.number,
            owner: apartment.owner
          });
        }
      } catch (error) {
        console.error(`❌ Eroare la adăugarea apartamentului ${apartment.number}:`, error);
        errorCount++;
      }
    }
    
    // 2. Dacă există apartamente cu solduri inițiale, le populez automat
    if (apartmentsWithBalances.length > 0 && setApartmentBalance && saveInitialBalances) {
      // console.log(`💰 Populez automat soldurile inițiale pentru ${apartmentsWithBalances.length} apartamente`);
      
      try {
        // Setează soldurile pentru fiecare apartament
        apartmentsWithBalances.forEach(apt => {
          setApartmentBalance(apt.apartmentId, {
            restante: apt.restante,
            penalitati: apt.penalitati
          });
        });
        
        // Construiește obiectul pentru salvare (similar cu InitialBalancesModal)
        const currentMonth = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
        const monthKey = `${association.id}-${currentMonth}`;
        const monthlyBalances = {
          [monthKey]: {}
        };
        
        apartmentsWithBalances.forEach(apt => {
          monthlyBalances[monthKey][apt.apartmentId] = {
            restante: apt.restante,
            penalitati: apt.penalitati
          };
        });
        
        // Salvează soldurile inițiale
        await saveInitialBalances(monthlyBalances, currentMonth);
        
        // console.log(`✅ Solduri inițiale salvate automat pentru:`, 
        //   apartmentsWithBalances.map(apt => `Ap.${apt.apartmentNumber} (${apt.restante} RON + ${apt.penalitati} RON)`).join(', ')
        // );
        
        // Notificare pentru utilizator
        alert(`✅ Import reușit!\n\n` +
              `📊 ${successCount} apartamente adăugate\n` +
              `💰 ${apartmentsWithBalances.length} apartamente cu solduri inițiale populate automat\n\n` +
              `Soldurile sunt acum disponibile în pagina de calcul întreținere.`);
        
      } catch (balanceError) {
        console.error('❌ Eroare la salvarea soldurilor inițiale:', balanceError);
        alert(`⚠️ Apartamentele au fost importate cu succes, dar soldurile inițiale nu au putut fi salvate automat.\n\n` +
              `Vă rugăm să configurați manual soldurile în pagina de calcul întreținere.`);
      }
    } else {
      // console.log(`✅ Import finalizat: ${successCount} reușite, ${errorCount} erori`);
      alert(`✅ Import reușit!\n\n📊 ${successCount} apartamente adăugate`);
    }

    // 3. ACTUALIZEAZĂ SHEET 1 cu noua structură de apartamente
    if (updateStructureSnapshot && typeof updateStructureSnapshot === 'function') {
      try {
        // Construiește structura completă pentru Sheet 1
        const completeStructureData = {
          name: association.name,
          cui: association.cui,
          address: association.address,
          bankAccount: association.bankAccount,
          // updateStructureSnapshot va prelua apartamentele din Firebase automat
        };

        await updateStructureSnapshot(completeStructureData);

      } catch (updateError) {
        console.error('❌ Eroare la actualizarea Sheet 1:', updateError);
        // Nu blochează procesul - apartamentele sunt deja adăugate
      }
    }

    // Menține blocurile expandate pentru apartamentele nou adăugate
    if (successCount > 0 && apartments.length > 0) {
      const affectedBlockIds = new Set();

      apartments.forEach(apartment => {
        const stair = associationStairs.find(s => s.id === apartment.stairId);
        if (stair) {
          affectedBlockIds.add(stair.blockId);
        }
      });

      // Expandează blocurile afectate
      affectedBlockIds.forEach(blockId => {
        setExpandedBlocks(prev => ({
          ...prev,
          [blockId]: true
        }));
      });
    }

    if (errorCount > 0) {
      throw new Error(`Import parțial: ${successCount} apartamente adăugate, ${errorCount} erori`);
    }
  };

const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });


  // Funcții helper pentru modalul de apartament
  const openAddApartmentModal = (stair) => {
    // Găsește blocul pentru această scară
    const stairBlock = blocks.find(block => block.id === stair.blockId);

    // Auto-expandează blocul dacă nu este expandat
    if (stairBlock && !expandedBlocks[stairBlock.id]) {
      setExpandedBlocks(prev => ({
        ...prev,
        [stairBlock.id]: true
      }));
    }

    // Auto-expandează scara dacă nu este expandată
    if (!expandedStairs[stair.id]) {
      setExpandedStairs(prev => ({
        ...prev,
        [stair.id]: true
      }));
    }

    setApartmentModalMode('add');
    setApartmentModalData(null);
    setApartmentModalStair(stair);
    setApartmentModalOpen(true);
  };

  const openEditApartmentModal = (apartment) => {
    // Folosește getAssociationApartments() pentru a obține datele complete
    // Aceasta citește din colecția Firestore unde sunt salvate toate câmpurile
    const allApartments = getAssociationApartments();

    // Caută apartamentul complet
    const fullApartmentData = allApartments.find(apt => apt.id === apartment.id) || apartment;

    setApartmentModalMode('edit');
    setApartmentModalData(fullApartmentData);
    setApartmentModalStair(null);
    setApartmentModalOpen(true);
  };

  const openViewApartmentModal = (apartment) => {
    // Pentru modul view, folosim direct apartamentul primit ca parametru
    // deoarece acesta conține deja toate datele complete (inclusiv heatingSource, cotaParte)
    // Nu mai căutăm în getAssociationApartments() pentru că snapshot-ul arhivat
    // poate să nu aibă toate câmpurile actualizate
    setApartmentModalMode('view');
    setApartmentModalData(apartment);
    setApartmentModalStair(null);
    setApartmentModalOpen(true);
  };

  const closeApartmentModal = () => {
    setApartmentModalOpen(false);
    setApartmentModalMode('add');
    setApartmentModalData(null);
    setApartmentModalStair(null);
  };

  // Handler pentru deschiderea modalului de breakdown întreținere
  const handleOpenMaintenanceBreakdown = (apartment) => {
    // Găsim datele de întreținere pentru acest apartament
    if (maintenanceData && maintenanceData.length > 0) {
      const apartmentMaintenanceData = maintenanceData.find(
        data => data.apartmentId === apartment.id
      );

      if (apartmentMaintenanceData) {
        // Deschidem modalul cu datele complete
        setSelectedApartmentForBreakdown(apartmentMaintenanceData);
        setShowMaintenanceBreakdown(true);
      } else {
        // Dacă nu există date de întreținere, afișăm un mesaj
        alert('Nu există date de întreținere calculate pentru acest apartament în luna curentă.');
      }
    } else {
      // Dacă nu există deloc date de întreținere calculate
      alert('Nu există date de întreținere calculate pentru luna curentă. Vă rugăm să accesați pagina "Calcul Întreținere" pentru a genera calculele.');
    }

    setOpenApartmentMenus(prev => ({
      ...prev,
      [apartment.id]: false
    }));
  };

  const handleSaveApartment = async (apartmentData) => {
    if (apartmentModalMode === 'edit') {
      await updateApartment(apartmentModalData.id, apartmentData);
    } else {
      await addApartment({
        ...apartmentData,
        stairId: apartmentModalStair.id
      });
    }
  };

  // Funcții helper pentru modalul de bloc
  const openAddBlockModal = () => {
    setBlockModalMode('add');
    setBlockModalData(null);
    setBlockModalOpen(true);
  };

  const openEditBlockModal = (block) => {
    setBlockModalMode('edit');
    setBlockModalData(block);
    setBlockModalOpen(true);
  };

  const closeBlockModal = () => {
    setBlockModalOpen(false);
    setBlockModalMode('add');
    setBlockModalData(null);
  };

  const handleSaveBlock = async (blockData) => {
    if (blockModalMode === 'edit') {
      await updateBlock(blockModalData.id, blockData);
    } else {
      await addBlock({
        ...blockData,
        associationId: association.id
      });
    }
  };

  // Funcții helper pentru modalul de scară
  const openAddStairModal = (block) => {
    // Expandează blocul automat dacă nu este expandat
    setExpandedBlocks(prev => ({ ...prev, [block.id]: true }));

    setStairModalMode('add');
    setStairModalData(null);
    setStairModalBlock(block);
    setStairModalOpen(true);
  };

  const openEditStairModal = (stair) => {
    setStairModalMode('edit');
    setStairModalData(stair);
    setStairModalBlock(null);
    setStairModalOpen(true);
  };

  const closeStairModal = () => {
    setStairModalOpen(false);
    setStairModalMode('add');
    setStairModalData(null);
    setStairModalBlock(null);
  };

  const handleSaveStair = async (stairData) => {
    if (stairModalMode === 'edit') {
      await updateStair(stairModalData.id, stairData);
    } else {
      await addStair(stairData);
    }
  };

return (
  <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
    <div className="w-full">
      {/* Header cu dropdown luni */}
      {/* Page Title */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🏢 Configurare apartamente</h1>
      </div>

        {/* Statistici */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatsCard label="Blocuri" value={totalBlocks} borderColor="border-blue-500" />
          <StatsCard label="Scări" value={totalStairs} borderColor="border-purple-500" />
          <StatsCard label="Apartamente" value={totalApartments} borderColor="border-orange-500" />
          <StatsCard label="Persoane" value={totalPersons} borderColor="border-green-500" />
        </div>

        {/* Mesaj informativ pentru template Excel când nu există apartamente */}
        {stairsWithoutApartments > 0 && !searchTerm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6">
            <h4 className="font-medium text-blue-800 mb-1.5 flex items-center gap-2 text-sm sm:text-base">
              <span className="text-xl">📥</span> Import masiv cu Excel
            </h4>
            <p className="text-xs sm:text-sm text-blue-700 mb-3">
              Poți să adaugi apartamentele manual unul câte unul, sau să folosești import-ul masiv cu Excel pentru scările care nu au apartamente definite. <strong>Notă:</strong> Template-ul Excel va conține doar scările care nu au apartamente și se poate folosi pentru import doar în aceste scări.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadExcelTemplate}
                className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 flex items-center text-xs sm:text-sm font-medium"
                title="Descarcă template Excel pentru import masiv apartamente"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Template Excel
              </button>
              <button
                onClick={() => setShowExcelUploadModal(true)}
                className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 flex items-center text-xs sm:text-sm font-medium"
                title="Încarcă fișier Excel completat pentru import masiv"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Încarcă Excel
              </button>
            </div>
          </div>
        )}

        {/* Structura ierarhică */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          {/* Bara de căutare, filtru și buton acțiune */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Caută după număr apartament, proprietar sau persoane..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toate apartamentele</option>
              {associationBlocks.length > 1 && associationBlocks.map(b => (
                <option key={`block-${b.id}`} value={`block:${b.id}`}>📦 {b.name}</option>
              ))}
              {associationStairs.map(s => {
                const block = associationBlocks.find(b => b.id === s.blockId);
                const label = associationBlocks.length > 1 && block
                  ? `${block.name} - ${s.name}`
                  : s.name;
                return (
                  <option key={`stair-${s.id}`} value={`stair:${s.id}`}>🪜 {label}</option>
                );
              })}
            </select>
            <button
              onClick={() => {
                if (cantEdit) {
                  alert('Nu poți adăuga blocuri într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                  return;
                }
                openAddBlockModal();
              }}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                cantEdit
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              disabled={cantEdit}
              title={cantEdit ? 'Adăugare blocată - lună publicată' : 'Adaugă bloc'}
            >
              <Plus className="w-4 h-4" />
              Adaugă bloc
            </button>
          </div>

          {associationBlocks.length > 3 && (
            <div className="flex justify-end gap-2 mb-3 sm:mb-4">
              <button
                onClick={() => {
                  const allExpanded = {};
                  associationBlocks.forEach(block => {
                    allExpanded[block.id] = true;
                  });
                  setExpandedBlocks(allExpanded);

                  const allStairsExpanded = {};
                  associationStairs.forEach(stair => {
                    allStairsExpanded[stair.id] = true;
                  });
                  setExpandedStairs(allStairsExpanded);
                }}
                className="bg-green-500 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-green-600 text-xs sm:text-sm"
              >
                Expandează Tot
              </button>
              <button
                onClick={() => {
                  setExpandedBlocks({});
                  setExpandedStairs({});
                }}
                className="bg-gray-500 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-gray-600 text-xs sm:text-sm"
              >
                Închide Tot
              </button>
            </div>
          )}

          {/* Lista blocurilor */}
          <div className="space-y-4">
            {/* Form adăugare bloc */}
            {showAddForm?.type === 'block' && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3 text-lg">➕ Adaugă Bloc</h4>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const name = formData.get('name')?.trim();
                    
                    if (!name) {
                      alert('Introduceți numele blocului');
                      return;
                    }

                    try {
                      await addBlock({ name: name });
                      setShowAddForm(null);
                    } catch (error) {
                      console.error('❌ Error adding block:', error);
                      alert('Eroare la adăugarea blocului: ' + error.message);
                    }
                  }}
                  className="flex items-center space-x-3"
                >
                  <input
                    name="name"
                    type="text"
                    placeholder="Numele blocului (ex: Bloc A, B4, Clădirea 1)"
                    required
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddForm(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Salvează Bloc
                  </button>
                </form>
              </div>
            )}

            {associationBlocks.length === 0 && !(showAddForm?.type === 'block') ? (
              <div className="py-3 px-3 sm:py-4 sm:px-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="hidden sm:flex w-12 h-12 bg-blue-100 rounded-full items-center justify-center flex-shrink-0">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                        BLOCURI NECESARE
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-blue-800">Nu există blocuri configurate</span>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-600">Poți genera template Excel cu blocurile și scările și upload de fișier Excel cu apartamentele</p>
                  </div>
                </div>
              </div>
            ) : (() => {
              const visibleBlocks = filterBlocks(associationBlocks);
              if (visibleBlocks.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    Niciun bloc nu corespunde filtrelor
                  </div>
                );
              }
              return visibleBlocks.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                  return new Date(a.createdAt) - new Date(b.createdAt);
                }
                return a.id.localeCompare(b.id);
              }).map(block => {
                const allBlockStairs = associationStairs.filter(stair => stair.blockId === block.id);
                const blockStairs = filterStairs(allBlockStairs);
                // Reguli inteligente de expandare pentru blocuri
                const shouldExpandBlock = () => {
                  // Dacă nu există blocuri - expandează pentru mesaje
                  if (associationBlocks.length === 0) {
                    return true;
                  }

                  // Dacă există un singur bloc - expandează automat
                  if (associationBlocks.length === 1) {
                    return true;
                  }

                  // Dacă blocul nu are scări - expandează să se vadă mesajul
                  if (blockStairs.length === 0) {
                    return true;
                  }

                  // Dacă blocul are cel puțin o scară fără apartamente - expandează să se vadă scara
                  const hasStairsWithoutApartments = blockStairs.some(stair => {
                    const stairApartments = associationApartments.filter(apt => apt.stairId === stair.id);
                    return stairApartments.length === 0;
                  });

                  if (hasStairsWithoutApartments) {
                    return true;
                  }

                  // În rest, nu expandează
                  return false;
                };

                // Când search e activ, forțează expandarea blocurilor cu match
                const isExpanded = searchTerm
                  ? true
                  : (expandedBlocks[block.id] ?? shouldExpandBlock());

                return (
                  <div key={block.id} className="border border-gray-200 rounded-lg">
                    {/* Header Bloc */}
                    <div
                      className="px-2 pt-2 pb-0.5 sm:p-4 bg-blue-50 border-b cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        setExpandedBlocks(prev => ({
                          ...prev,
                          [block.id]: !isExpanded
                        }));
                      }}
                    >
                      {/* Rând 1: săgeată + nume + butoane (pe mobil și desktop) */}
                      <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                        <div className="text-blue-600 text-base sm:text-xl flex-shrink-0">
                          {isExpanded ? '▼' : '▸'}
                        </div>

                        <span className="text-sm sm:text-lg font-medium text-gray-800 whitespace-nowrap flex items-center gap-1.5">
                          <Building className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" /> {block.name}
                        </span>

                        {/* Info scări/apartamente - doar pe desktop, inline */}
                        <span className="hidden sm:inline text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {blockStairs.length === 1 ? '1 scară' : `${blockStairs.length} scări`} • {(() => { const count = blockStairs.reduce((sum, currentStair) => sum + associationApartments.filter(apt => apt.stairId === currentStair.id).length, 0); return count === 1 ? '1 apartament' : `${count} apartamente`; })()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        {blockStairs.length > 0 ? (
                          // Menu hamburger pentru blocuri cu scări
                          <div className="relative block-menu-container">
                            <button
                              onClick={() => {
                                // Dacă acest menu este deschis, îl închide
                                if (openBlockMenus[block.id]) {
                                  setOpenBlockMenus({});
                                } else {
                                  // Închide toate menu-urile și deschide doar pe acesta
                                  setOpenBlockMenus({});
                                  setOpenStairMenus({});
                                  setOpenApartmentMenus({});
                                  setOpenBlockMenus({ [block.id]: true });
                                }
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-200 hover:text-blue-800 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                              title={`Acțiuni pentru ${block.name}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {openBlockMenus[block.id] && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      if (cantEdit) {
                                        alert('Nu poți edita blocuri într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                        return;
                                      }
                                      openEditBlockModal(block);
                                      setOpenBlockMenus(prev => ({ ...prev, [block.id]: false }));
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                      cantEdit
                                        ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    disabled={cantEdit}
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editează Bloc
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (cantEdit) {
                                        alert('Nu poți adăuga scări într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                        return;
                                      }
                                      openAddStairModal(block);
                                      setOpenBlockMenus(prev => ({ ...prev, [block.id]: false }));
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                      cantEdit
                                        ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                    disabled={cantEdit}
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Adaugă Scară
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => {
                                      if (cantEdit) {
                                        alert('Nu poți șterge blocuri într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                        return;
                                      }
                                      if (window.confirm(`Ești sigur că vrei să ștergi blocul "${block.name}"?\n\nAceasta va șterge și toate scările și apartamentele din bloc!`)) {
                                        deleteBlock(block.id);
                                      }
                                      setOpenBlockMenus(prev => ({ ...prev, [block.id]: false }));
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                      cantEdit
                                        ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                        : 'text-red-600 hover:bg-red-50'
                                    }`}
                                    disabled={cantEdit}
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Șterge Bloc
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Butoane individuale pentru blocuri fără scări
                          <>
                            <button
                              onClick={() => {
                                if (cantEdit) {
                                  alert('Nu poți edita blocuri într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                  return;
                                }
                                openEditBlockModal(block);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                cantEdit
                                  ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                  : 'text-blue-600 hover:bg-blue-100'
                              }`}
                              title={cantEdit ? 'Editare blocat - lună publicată' : `Editează blocul ${block.name}`}
                              disabled={cantEdit}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (cantEdit) {
                                  alert('Nu poți șterge blocuri într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                  return;
                                }
                                if (window.confirm(`Ești sigur că vrei să ștergi blocul "${block.name}"?\n\nAceasta va șterge și toate scările și apartamentele din bloc!`)) {
                                  deleteBlock(block.id);
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                cantEdit
                                  ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-100'
                              }`}
                              title={cantEdit ? 'Ștergere blocată - lună publicată' : `Șterge blocul ${block.name}`}
                              disabled={cantEdit}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (cantEdit) {
                                  alert('Nu poți adăuga scări într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                  return;
                                }
                                openAddStairModal(block);
                              }}
                              className={`p-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors flex items-center text-sm ${
                                cantEdit
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={cantEdit ? 'Adăugare blocată - lună publicată' : `Adaugă scară în ${block.name}`}
                              disabled={cantEdit}
                            >
                              <Plus className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Adaugă Scară</span>
                            </button>
                          </>
                        )}
                      </div>
                      </div>

                      {/* Rând 2: info scări/apartamente - doar pe mobil */}
                      <div className="sm:hidden ml-7">
                        <span className="text-[10px] text-gray-500">
                          {blockStairs.length === 1 ? '1 scară' : `${blockStairs.length} scări`} • {(() => { const count = blockStairs.reduce((sum, currentStair) => sum + associationApartments.filter(apt => apt.stairId === currentStair.id).length, 0); return count === 1 ? '1 apartament' : `${count} apartamente`; })()}
                        </span>
                      </div>
                    </div>

                    {/* Conținutul blocului */}
                    {isExpanded && (
                      <div className="p-2 sm:p-4">
                        {/* Form adăugare scară */}
                        {showAddForm?.type === 'stair' && showAddForm?.parentId === block.id && (
                          <div className="mb-4 bg-green-50 border-2 border-green-300 rounded-lg p-4">
                            <h4 className="font-medium text-gray-800 mb-3">➕ Adaugă Scară pentru {block.name}</h4>
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const name = formData.get('name')?.trim();
                                
                                if (!name) {
                                  alert('Introduceți numele scării');
                                  return;
                                }

                                try {
                                  await addStair({ 
                                    name: name,
                                    blockId: block.id 
                                  });
                                  setShowAddForm(null);
                                } catch (error) {
                                  console.error('❌ Error adding stair:', error);
                                  alert('Eroare la adăugarea scării: ' + error.message);
                                }
                              }}
                              className="flex items-center space-x-3"
                            >
                              <input
                                name="name"
                                type="text"
                                placeholder="Numele scării (ex: Scara A, Intrarea 1)"
                                required
                                className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowAddForm(null)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                              >
                                Anulează
                              </button>
                              <button
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                              >
                                Salvează Scară
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Afișează scările existente */}
                        {blockStairs.length > 0 ? (
                          <div className="space-y-4">
                            {blockStairs.sort((a, b) => {
                              if (a.createdAt && b.createdAt) {
                                return new Date(a.createdAt) - new Date(b.createdAt);
                              }
                              return a.id.localeCompare(b.id);
                            }).map(currentStair => {
                              const allStairApartments = associationApartments.filter(apt => apt.stairId === currentStair.id);
                              // Când search e activ, păstrează doar apartamentele care fac match
                              const stairApartments = searchTerm
                                ? allStairApartments.filter(apartmentMatchesSearch)
                                : allStairApartments;
                              // Reguli inteligente de expandare pentru scări
                              const shouldExpandStair = () => {
                                // Dacă scara nu are apartamente - expandează să se vadă mesajul
                                if (stairApartments.length === 0) {
                                  return true;
                                }

                                // Dacă blocul are o singură scară cu apartamente - expandează să se vadă apartamentele
                                if (blockStairs.length === 1 && stairApartments.length > 0) {
                                  return true;
                                }

                                // În rest, nu expandează
                                return false;
                              };

                              // Când search e activ, forțează expandarea scărilor cu match
                              const isStairExpanded = searchTerm
                                ? true
                                : (expandedStairs[currentStair.id] ?? shouldExpandStair());
                              
                              return (
                                <div key={currentStair.id} className="sm:ml-6 border-l-2 border-green-200 pl-0.5 sm:pl-4">
                                  <div
                                    className="px-2 pt-2 pb-0.5 sm:p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                                    onClick={() => {
                                      setExpandedStairs(prev => ({
                                        ...prev,
                                        [currentStair.id]: !isStairExpanded
                                      }));
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
                                      <div className="text-green-600 text-sm sm:text-base flex-shrink-0">
                                        {isStairExpanded ? '▼' : '▸'}
                                      </div>
                                      <Home className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                                      
                                      {editingItem?.type === 'stair' && editingItem?.id === currentStair.id ? (
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="text"
                                            value={editingData.name || ''}
                                            onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                                            className="px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            autoFocus
                                            placeholder="Numele scării"
                                          />
                                          <button
                                            onClick={async () => {
                                              if (!editingData.name?.trim()) {
                                                alert('Introduceți numele scării');
                                                return;
                                              }
                                              try {
                                                await updateStair(editingItem.id, { name: editingData.name.trim() });
                                                setEditingItem(null);
                                                setEditingData({});
                                              } catch (error) {
                                                console.error('Error updating stair:', error);
                                                alert('Eroare la actualizarea scării: ' + error.message);
                                              }
                                            }}
                                            className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingItem(null);
                                              setEditingData({});
                                            }}
                                            className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                        <span className="font-medium text-gray-800 text-sm sm:text-lg whitespace-nowrap">
                                          {currentStair.name}
                                        </span>

                                        {/* Info apartamente/persoane - doar pe desktop, inline */}
                                        <span className="hidden sm:inline text-sm text-gray-600 bg-green-100 px-2 py-1 rounded-full whitespace-nowrap">
                                          {stairApartments.length === 1 ? '1 apartament' : `${stairApartments.length} apartamente`} • {stairApartments.reduce((sum, apt) => sum + apt.persons, 0) === 1 ? '1 persoană' : `${stairApartments.reduce((sum, apt) => sum + apt.persons, 0)} persoane`}
                                        </span>
                                        </>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                      {stairApartments.length > 0 ? (
                                        // Menu hamburger pentru scări cu apartamente
                                        <div className="relative stair-menu-container">
                                          <button
                                            onClick={() => {
                                              // Dacă acest menu este deschis, îl închide
                                              if (openStairMenus[currentStair.id]) {
                                                setOpenStairMenus({});
                                              } else {
                                                // Închide toate menu-urile și deschide doar pe acesta
                                                setOpenBlockMenus({});
                                                setOpenStairMenus({});
                                                setOpenApartmentMenus({});
                                                setOpenStairMenus({ [currentStair.id]: true });
                                              }
                                            }}
                                            className="p-2 text-green-600 hover:bg-green-200 hover:text-green-800 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                            title={`Acțiuni pentru ${currentStair.name}`}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                            </svg>
                                          </button>

                                          {openStairMenus[currentStair.id] && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                              <div className="py-1">
                                                <button
                                                  onClick={() => {
                                                    if (cantEdit) {
                                                      alert('Nu poți edita scări într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                      return;
                                                    }
                                                    openEditStairModal(currentStair);
                                                    setOpenStairMenus(prev => ({ ...prev, [currentStair.id]: false }));
                                                  }}
                                                  className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                                    cantEdit
                                                      ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                                      : 'text-gray-700 hover:bg-gray-100'
                                                  }`}
                                                  disabled={cantEdit}
                                                >
                                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                  </svg>
                                                  Editează Scară
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (cantEdit) {
                                                      alert('Nu poți adăuga apartamente într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                      return;
                                                    }
                                                    openAddApartmentModal(currentStair);
                                                    setOpenStairMenus(prev => ({ ...prev, [currentStair.id]: false }));
                                                  }}
                                                  className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                                    cantEdit
                                                      ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                                      : 'text-gray-700 hover:bg-gray-100'
                                                  }`}
                                                  disabled={cantEdit}
                                                >
                                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                  </svg>
                                                  Adaugă Apartament
                                                </button>
                                                <hr className="my-1" />
                                                <button
                                                  onClick={() => {
                                                    if (cantEdit) {
                                                      alert('Nu poți șterge scări într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                      return;
                                                    }
                                                    if (window.confirm(`Ești sigur că vrei să ștergi scara "${currentStair.name}"?\n\nAceasta va șterge și toate apartamentele din scară!`)) {
                                                      deleteStair(currentStair.id);
                                                    }
                                                    setOpenStairMenus(prev => ({ ...prev, [currentStair.id]: false }));
                                                  }}
                                                  className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                                    cantEdit
                                                      ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                                      : 'text-red-600 hover:bg-red-50'
                                                  }`}
                                                  disabled={cantEdit}
                                                >
                                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                  Șterge Scară
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        // Butoane individuale pentru scări fără apartamente
                                        <>
                                          <button
                                            onClick={() => {
                                              if (cantEdit) {
                                                alert('Nu poți edita scări într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                return;
                                              }
                                              openEditStairModal(currentStair);
                                            }}
                                            className={`p-2 rounded-lg transition-all duration-200 ${
                                              cantEdit
                                                ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                                : 'text-green-600 hover:bg-green-200 hover:text-green-800 hover:shadow-md hover:scale-105'
                                            }`}
                                            title={cantEdit ? 'Editare blocată - lună publicată' : `Editează ${currentStair.name}`}
                                            disabled={cantEdit}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (cantEdit) {
                                                alert('Nu poți șterge scări într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                return;
                                              }
                                              if (window.confirm(`Ești sigur că vrei să ștergi scara "${currentStair.name}"?\n\nAceasta va șterge și toate apartamentele din scară!`)) {
                                                deleteStair(currentStair.id);
                                              }
                                            }}
                                            className={`p-2 rounded-lg transition-all duration-200 ${
                                              cantEdit
                                                ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                                : 'text-red-600 hover:bg-red-200 hover:text-red-800 hover:shadow-md hover:scale-105'
                                            }`}
                                            title={cantEdit ? 'Ștergere blocată - lună publicată' : `Șterge ${currentStair.name}`}
                                            disabled={cantEdit}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (cantEdit) {
                                                alert('Nu poți adăuga apartamente într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                return;
                                              }
                                              openAddApartmentModal(currentStair);
                                            }}
                                            className={`p-1.5 sm:px-3 sm:py-2 rounded-lg transition-all duration-200 flex items-center text-sm ${
                                              cantEdit
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md hover:scale-105'
                                            }`}
                                            title={cantEdit ? 'Adăugare blocată - lună publicată' : `Adaugă apartament în ${currentStair.name}`}
                                            disabled={cantEdit}
                                          >
                                            <Plus className="w-4 h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Adaugă Apartament</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    </div>

                                    {/* Rând 2: info apartamente/persoane - doar pe mobil */}
                                    <div className="sm:hidden ml-7">
                                      <span className="text-[10px] text-gray-500">
                                        {stairApartments.length === 1 ? '1 apartament' : `${stairApartments.length} apartamente`} • {stairApartments.reduce((sum, apt) => sum + apt.persons, 0) === 1 ? '1 persoană' : `${stairApartments.reduce((sum, apt) => sum + apt.persons, 0)} persoane`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Conținutul scării expandat */}
                                  {isStairExpanded && (
                                    <div className="mt-2 sm:mt-3 ml-1 sm:ml-6 space-y-2 sm:space-y-3">
                                      {/* Form adăugare apartament */}
                                      {showAddForm?.type === 'apartment' && showAddForm.parentId === currentStair.id && (
                                        <div className="bg-white border-2 border-orange-400 rounded-xl p-6 shadow-lg ring-2 ring-orange-200">
                                          <div className="bg-orange-100 -m-6 mb-4 p-4 rounded-t-xl border-b border-orange-200">
                                            <h4 className="font-semibold text-orange-800 text-lg">➕ Adaugă Apartament la {currentStair.name}</h4>
                                          </div>
                                          <form 
                                            onSubmit={async (e) => {
                                              e.preventDefault();
                                              const formData = new FormData(e.target);
                                              
                                              const apartmentData = {
                                                number: parseInt(formData.get('number')),
                                                owner: formData.get('owner')?.trim(),
                                                persons: parseInt(formData.get('persons')),
                                                stairId: showAddForm.parentId,
                                                apartmentType: formData.get('apartmentType')?.trim() || null,
                                                surface: formData.get('surface') ? parseFloat(formData.get('surface')) : null,
                                                heatingSource: formData.get('heatingSource')?.trim() || null
                                              };

                                              if (!apartmentData.number || !apartmentData.owner || !apartmentData.persons) {
                                                alert('Completați câmpurile obligatorii (numărul apartamentului, proprietarul și numărul de persoane)');
                                                return;
                                              }

                                              try {
                                                await addApartment(apartmentData);
                                                setShowAddForm(null);

                                                // Menține blocul expandat după adăugarea apartamentului
                                                const stair = associationStairs.find(s => s.id === currentStair.id);
                                                if (stair) {
                                                  const block = associationBlocks.find(b => b.id === stair.blockId);
                                                  if (block) {
                                                    setExpandedBlocks(prev => ({
                                                      ...prev,
                                                      [block.id]: true
                                                    }));
                                                  }
                                                }
                                              } catch (error) {
                                                console.error('❌ Error adding apartment:', error);
                                                alert('Eroare la adăugarea apartamentului: ' + error.message);
                                              }
                                            }}
                                            className="space-y-4"
                                          >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Numărul apartamentului *
                                                </label>
                                                <input
                                                  name="number"
                                                  type="number"
                                                  min="1"
                                                  placeholder="ex: 15"
                                                  required
                                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Nume proprietar *
                                                </label>
                                                <input
                                                  name="owner"
                                                  type="text"
                                                  placeholder="ex: Ion Popescu"
                                                  required
                                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Numărul de persoane *
                                                </label>
                                                <input
                                                  name="persons"
                                                  type="number"
                                                  min="1"
                                                  placeholder="ex: 3"
                                                  required
                                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Tipul apartamentului
                                                </label>
                                                <select
                                                  name="apartmentType"
                                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                >
                                                  <option value="">Selectează tipul</option>
                                                  <option value="Garsoniera">Garsoniera</option>
                                                  <option value="2 camere">2 camere</option>
                                                  <option value="3 camere">3 camere</option>
                                                  <option value="4 camere">4 camere</option>
                                                  <option value="5 camere">5 camere</option>
                                                  <option value="Penthouse">Penthouse</option>
                                                </select>
                                              </div>
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Suprafața (mp)
                                                </label>
                                                <input
                                                  name="surface"
                                                  type="number"
                                                  step="0.1"
                                                  min="0"
                                                  placeholder="ex: 65.5"
                                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                              </div>
                                            </div>

                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Sursa de încălzire
                                              </label>
                                              <select
                                                name="heatingSource"
                                                className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                              >
                                                <option value="">Selectează sursa de încălzire</option>
                                                <option value="Termoficare">Termoficare</option>
                                                <option value="Centrala proprie">Centrală proprie</option>
                                                <option value="Centrala bloc">Centrală bloc</option>
                                                <option value="Debransat">Debranșat</option>
                                              </select>
                                            </div>

                                            <div className="flex justify-end space-x-3 pt-4">
                                              <button
                                                type="button"
                                                onClick={() => setShowAddForm(null)}
                                                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                                              >
                                                Anulează
                                              </button>
                                              <button
                                                type="submit"
                                                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
                                              >
                                                Salvează Apartament
                                              </button>
                                            </div>
                                          </form>
                                        </div>
                                      )}

                                      {/* Lista apartamentelor */}
                                      {stairApartments.length === 0 && !(showAddForm?.type === 'apartment' && showAddForm.parentId === currentStair.id) ? (
                                        <div className="py-2 sm:py-4 px-3 sm:px-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                            <div className="hidden sm:flex w-12 h-12 bg-orange-100 rounded-full items-center justify-center flex-shrink-0">
                                              <DoorOpen className="w-6 h-6 text-orange-600" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                                <span className="bg-orange-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                                                  APARTAMENTE NECESARE
                                                </span>
                                                <span className="text-xs sm:text-sm font-semibold text-orange-800">Nu există apartamente</span>
                                              </div>
                                              <p className="text-xs sm:text-sm text-orange-600">Adaugă apartamentele manual sau folosește Import masiv cu Excel</p>
                                            </div>
                                          </div>
                                        </div>
                                      ) : stairApartments.length > 0 ? (
                                        <div className="space-y-2 sm:space-y-3">
                                          {stairApartments.sort((a, b) => {
                                            const numberDiff = a.number - b.number;
                                            if (numberDiff !== 0) return numberDiff;
                                            if (a.createdAt && b.createdAt) {
                                              return new Date(a.createdAt) - new Date(b.createdAt);
                                            }
                                            return a.id.localeCompare(b.id);
                                          }).map(apartment => (
                                            <div key={apartment.id} className={`${
                                              editingItem?.type === 'apartment' && editingItem?.id === apartment.id
                                                ? "bg-white border-2 border-orange-400 rounded-xl p-4 shadow-lg ring-2 ring-orange-200"
                                                : highlightedApartmentId === apartment.id
                                                ? "bg-yellow-100 border-2 border-yellow-400 rounded-xl p-4 shadow-lg ring-2 ring-yellow-200 animate-pulse"
                                                : "bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 hover:bg-orange-100"
                                            } transition-all duration-200`}>
                                              {editingItem?.type === 'apartment' && editingItem?.id === apartment.id ? (
                                                /* Form editare apartament */
                                                <div className="space-y-4">
                                                  <div className="flex items-center justify-between mb-4 bg-orange-100 -m-4 mb-4 p-4 rounded-t-xl border-b border-orange-200">
                                                    <h4 className="font-semibold text-orange-800 text-lg">✏️ Editează Apartamentul {apartment.number}</h4>
                                                    <div className="flex gap-2">
                                                      <button
                                                        onClick={async () => {
                                                          if (!editingData.owner?.trim() || !editingData.persons) {
                                                            alert('Completați câmpurile obligatorii (proprietar și numărul de persoane)');
                                                            return;
                                                          }
                                                          try {
                                                            await updateApartment(editingItem.id, {
                                                              owner: editingData.owner.trim(),
                                                              persons: parseInt(editingData.persons),
                                                              apartmentType: editingData.apartmentType?.trim() || null,
                                                              surface: editingData.surface ? parseFloat(editingData.surface) : null,
                                                              heatingSource: editingData.heatingSource?.trim() || null
                                                            });
                                                            setEditingItem(null);
                                                            setEditingData({});
                                                          } catch (error) {
                                                            console.error('Error updating apartment:', error);
                                                            alert('Eroare la actualizarea apartamentului: ' + error.message);
                                                          }
                                                        }}
                                                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                                                      >
                                                        ✓ Salvează
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setEditingItem(null);
                                                          setEditingData({});
                                                        }}
                                                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                                                      >
                                                        ✕ Anulează
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Nume proprietar *
                                                      </label>
                                                      <input
                                                        type="text"
                                                        value={editingData.owner || ''}
                                                        onChange={(e) => setEditingData({...editingData, owner: e.target.value})}
                                                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                        placeholder="Numele proprietarului"
                                                        required
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Numărul de persoane *
                                                      </label>
                                                      <input
                                                        type="number"
                                                        min="1"
                                                        value={editingData.persons || ''}
                                                        onChange={(e) => setEditingData({...editingData, persons: e.target.value})}
                                                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                        placeholder="Nr persoane"
                                                        required
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Tipul apartamentului
                                                      </label>
                                                      <select
                                                        value={editingData.apartmentType || ''}
                                                        onChange={(e) => setEditingData({...editingData, apartmentType: e.target.value})}
                                                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                      >
                                                        <option value="">Selectează tipul</option>
                                                        <option value="Garsoniera">Garsoniera</option>
                                                        <option value="2 camere">2 camere</option>
                                                        <option value="3 camere">3 camere</option>
                                                        <option value="4 camere">4 camere</option>
                                                        <option value="5 camere">5 camere</option>
                                                        <option value="Penthouse">Penthouse</option>
                                                      </select>
                                                    </div>
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Suprafața (mp)
                                                      </label>
                                                      <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={editingData.surface || ''}
                                                        onChange={(e) => setEditingData({...editingData, surface: e.target.value})}
                                                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                        placeholder="ex: 65.5"
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Sursa de încălzire
                                                      </label>
                                                      <select
                                                        value={editingData.heatingSource || ''}
                                                        onChange={(e) => setEditingData({...editingData, heatingSource: e.target.value})}
                                                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                                      >
                                                        <option value="">Selectează sursa</option>
                                                        <option value="Termoficare">Termoficare</option>
                                                        <option value="Centrala proprie">Centrală proprie</option>
                                                        <option value="Centrala bloc">Centrală bloc</option>
                                                        <option value="Debransat">Debranșat</option>
                                                      </select>
                                                    </div>
                                                  </div>
                                                </div>
                                              ) : (
                                                /* Afișare normală apartament */
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1">
                                                    {/* Desktop: o singură linie cu numele și etichetele alinate */}
                                                    <div className="hidden lg:flex items-center">
                                                      {/* Numele cu lățime fixă pentru aliniere */}
                                                      <div className="w-96 flex-shrink-0">
                                                        <span className="font-medium text-gray-800 text-lg flex items-center gap-1.5">
                                                          <DoorOpen className="w-5 h-5 text-orange-500 flex-shrink-0" /> Apt {apartment.number} - {apartment.owner}
                                                        </span>
                                                      </div>

                                                      {/* Etichetele cu formatare tabelară flexibilă - responsive */}
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded w-32 text-center">
                                                          {apartment.persons} {apartment.persons === 1 ? 'persoană' : 'persoane'}
                                                        </span>

                                                        {apartment.apartmentType ? (
                                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded w-28 text-center">
                                                            🏠 {apartment.apartmentType}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded w-28 text-center">
                                                            🏠 -
                                                          </span>
                                                        )}

                                                        {apartment.surface ? (
                                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded w-24 text-center">
                                                            📐 {apartment.surface} mp
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded w-24 text-center">
                                                            📐 - mp
                                                          </span>
                                                        )}

                                                        {apartment.heatingSource ? (
                                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded w-40 text-center">
                                                            🔥 {apartment.heatingSource}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded w-40 text-center">
                                                            🔥 -
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>

                                                    {/* Mobile: numele sus, etichetele jos - compact */}
                                                    <div className="lg:hidden">
                                                      <div className="mb-1.5">
                                                        <span className="font-medium text-gray-800 text-sm sm:text-base flex items-center gap-1.5">
                                                          <DoorOpen className="w-4 h-4 text-orange-500 flex-shrink-0" /> Apt {apartment.number} - <span className="truncate">{apartment.owner}</span>
                                                        </span>
                                                      </div>

                                                      <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                                                        <span className="text-[9px] sm:text-xs bg-orange-200 text-orange-800 px-1 sm:px-1.5 py-0.5 rounded">
                                                          {apartment.persons} pers.
                                                        </span>

                                                        {apartment.apartmentType && (
                                                          <span className="text-[9px] sm:text-xs bg-blue-100 text-blue-700 px-1 sm:px-1.5 py-0.5 rounded">
                                                            🏠 {apartment.apartmentType}
                                                          </span>
                                                        )}

                                                        {apartment.surface && (
                                                          <span className="text-[9px] sm:text-xs bg-green-100 text-green-700 px-1 sm:px-1.5 py-0.5 rounded">
                                                            📐 {apartment.surface} mp
                                                          </span>
                                                        )}

                                                        {apartment.heatingSource && (
                                                          <span className="text-[9px] sm:text-xs bg-red-100 text-red-700 px-1 sm:px-1.5 py-0.5 rounded">
                                                            🔥 {apartment.heatingSource}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Hamburger menu pentru apartament */}
                                                  <div className="relative ml-1 sm:ml-4 apartment-menu-container">
                                                    <button
                                                      onClick={(e) => {
                                                        // Arată meniul pentru TOATE apartamentele
                                                        if (openApartmentMenus[apartment.id]) {
                                                          setOpenApartmentMenus({});
                                                        } else {
                                                          // Detectează dacă butonul e aproape de josul viewport-ului
                                                          const rect = e.currentTarget.getBoundingClientRect();
                                                          const spaceBelow = window.innerHeight - rect.bottom;
                                                          setOpenBlockMenus({});
                                                          setOpenStairMenus({});
                                                          setOpenApartmentMenus({
                                                            [apartment.id]: spaceBelow < 200 ? 'up' : 'down'
                                                          });
                                                        }
                                                      }}
                                                      className="p-2 text-orange-600 hover:bg-orange-200 hover:text-orange-800 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                                      title="Acțiuni pentru apartament"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                      </svg>
                                                    </button>

                                                    {openApartmentMenus[apartment.id] && (
                                                      <div className={`absolute right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ${openApartmentMenus[apartment.id] === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                                                        <div className="py-1">
                                                          <button
                                                            onClick={() => handleOpenMaintenanceBreakdown(apartment)}
                                                            className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                                                          >
                                                            <Receipt className="w-4 h-4" />
                                                            Vezi Detalii Întreținere
                                                          </button>
                                                          {cantEdit ? (
                                                            <button
                                                              onClick={() => {
                                                                openViewApartmentModal(apartment);
                                                                setOpenApartmentMenus(prev => ({
                                                                  ...prev,
                                                                  [apartment.id]: false
                                                                }));
                                                              }}
                                                              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-blue-700 hover:bg-blue-50 cursor-pointer"
                                                            >
                                                              👁️ Vizualizează Apartament
                                                            </button>
                                                          ) : (
                                                            <button
                                                              onClick={() => {
                                                                openEditApartmentModal(apartment);
                                                                setOpenApartmentMenus(prev => ({
                                                                  ...prev,
                                                                  [apartment.id]: false
                                                                }));
                                                              }}
                                                              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-orange-700 hover:bg-orange-50 cursor-pointer"
                                                            >
                                                              ✏️ Editează Apartament
                                                            </button>
                                                          )}

                                                          {/* Membri Apartament */}
                                                          <button
                                                            onClick={() => {
                                                              setSelectedApartmentForMembers(apartment);
                                                              setSelectedStairForMembers(currentStair);
                                                              setSelectedBlockForMembers(block);
                                                              setShowApartmentMembersModal(true);
                                                              setOpenApartmentMenus({});
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-purple-700 hover:bg-purple-50 cursor-pointer"
                                                          >
                                                            <Users className="w-4 h-4" />
                                                            Membri Apartament
                                                          </button>

                                                          {/* Mesaje Apartament */}
                                                          <button
                                                            onClick={() => {
                                                              if (onNavigateToApartmentMessages) {
                                                                onNavigateToApartmentMessages(apartment.id);
                                                              } else {
                                                                handleNavigation('messages');
                                                              }
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-teal-700 hover:bg-teal-50 cursor-pointer"
                                                          >
                                                            <MessageSquare className="w-4 h-4" />
                                                            Mesaje Apartament
                                                          </button>

                                                          {(() => {
                                                            const stairApts = stairApartments.sort((a, b) => {
                                                              const numberDiff = a.number - b.number;
                                                              if (numberDiff !== 0) return numberDiff;
                                                              if (a.createdAt && b.createdAt) {
                                                                return new Date(a.createdAt) - new Date(b.createdAt);
                                                              }
                                                              return a.id.localeCompare(b.id);
                                                            });
                                                            const isLastApartment = stairApts[stairApts.length - 1]?.id === apartment.id;
                                                            const canDelete = isLastApartment && !cantEdit;

                                                            return (
                                                              <button
                                                                onClick={() => {
                                                                  if (cantEdit) {
                                                                    alert('Nu poți șterge apartamente într-o lună publicată.\n\nPentru a face modificări, mergi la luna în lucru (decembrie).');
                                                                    return;
                                                                  }
                                                                  if (isLastApartment) {
                                                                    if (window.confirm(`Ești sigur că vrei să ștergi apartamentul ${apartment.number} (${apartment.owner})?\n\nAcest lucru este ireversibil!`)) {
                                                                      deleteApartment(apartment.id);
                                                                    }
                                                                  } else {
                                                                    alert('Doar ultimul apartament din scară poate fi șters.\n\nPentru a șterge acest apartament, șterge mai întâi apartamentele ulterioare.');
                                                                  }
                                                                  setOpenApartmentMenus(prev => ({
                                                                    ...prev,
                                                                    [apartment.id]: false
                                                                  }));
                                                                }}
                                                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                                                                  canDelete
                                                                    ? 'text-red-700 hover:bg-red-50 cursor-pointer'
                                                                    : 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                                                                }`}
                                                                disabled={!canDelete}
                                                              >
                                                                🗑️ Șterge Apartament
                                                              </button>
                                                            );
                                                          })()}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : !(showAddForm?.type === 'stair' && showAddForm?.parentId === block.id) ? (
                          <div className="py-2 sm:py-4 px-3 sm:px-6 bg-green-50 border-2 border-green-200 rounded-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <div className="hidden sm:flex w-12 h-12 bg-green-100 rounded-full items-center justify-center flex-shrink-0">
                                <Home className="w-7 h-7 text-green-600" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                  <span className="bg-green-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                                    SCĂRI NECESARE
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-green-800">Nu există scări în acest bloc</span>
                                </div>
                                <p className="text-xs sm:text-sm text-green-600">Adaugă scările pentru a putea configura apartamentele</p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Modal pentru Upload Excel */}
      <ExcelUploadModal
        isOpen={showExcelUploadModal}
        onClose={() => setShowExcelUploadModal(false)}
        association={association}
        blocks={blocks}
        stairs={stairs.filter(stair => {
          const stairApartments = associationApartments.filter(apt => apt.stairId === stair.id);
          return stairApartments.length === 0;
        })}
        onImportApartments={handleImportApartments}
      />

      {/* Modal pentru blocuri */}
      <BlockModal
        isOpen={blockModalOpen}
        onClose={closeBlockModal}
        mode={blockModalMode}
        block={blockModalData}
        associationName={association?.name}
        onSave={handleSaveBlock}
      />

      {/* Modal pentru scări */}
      <StairModal
        isOpen={stairModalOpen}
        onClose={closeStairModal}
        mode={stairModalMode}
        stair={stairModalData}
        block={stairModalBlock}
        onSave={handleSaveStair}
      />

      {/* Modal pentru apartamente */}
      <ApartmentModal
        isOpen={apartmentModalOpen}
        onClose={closeApartmentModal}
        mode={apartmentModalMode}
        apartment={apartmentModalData}
        stair={apartmentModalStair}
        blocks={blocks}
        stairs={stairs}
        apartments={associationApartments}
        onSave={handleSaveApartment}
      />

      {/* Modal pentru detalii întreținere */}
      <MaintenanceBreakdownModal
        isOpen={showMaintenanceBreakdown}
        onClose={() => setShowMaintenanceBreakdown(false)}
        apartmentData={selectedApartmentForBreakdown}
        expensesList={activeSheet?.expenses || []}
        apartmentParticipations={
          // Build participations for ALL apartments, not just the selected one
          associationApartments.reduce((acc, apt) => {
            acc[apt.id] = (activeSheet?.expenses || []).reduce((expAcc, expense) => {
              expAcc[expense.name] = getApartmentParticipation?.(apt.id, expense.name) || {};
              return expAcc;
            }, {});
            return acc;
          }, {})
        }
        allApartments={associationApartments}
        allMaintenanceData={maintenanceData}
        getExpenseConfig={getExpenseConfig}
        stairs={stairs}
        payments={activeSheet?.payments || []} // 🆕 Trimite plățile din sheet-ul activ
        currentMonth={currentMonth}
      />

      {/* Modal Membri Apartament */}
      <ApartmentMembersModal
        isOpen={showApartmentMembersModal}
        onClose={() => {
          setShowApartmentMembersModal(false);
          setSelectedApartmentForMembers(null);
        }}
        apartment={selectedApartmentForMembers}
        association={association}
        currentUserId={currentUser?.uid}
        cantEdit={cantEdit}
        stair={selectedStairForMembers}
        block={selectedBlockForMembers}
      />
    </div>
  );
};

export default SetupView;