import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { generateExcelTemplate } from '../../utils/excelTemplateGenerator';
import ExcelUploadModal from '../modals/ExcelUploadModal';
import ApartmentModal from '../modals/ApartmentModal';
import BlockModal from '../modals/BlockModal';
import StairModal from '../modals/StairModal';
import DashboardHeader from '../dashboard/DashboardHeader';

const SetupView = ({
  association,
  blocks,
  stairs,
  apartments,
  getAssociationApartments,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  handleNavigation,
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
  updateStructureSnapshot
}) => {
  // State pentru modalul de upload Excel - TREBUIE să fie înainte de orice return
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  // State pentru dropdown-urile hamburger ale blocurilor, scărilor și apartamentelor
  const [openBlockMenus, setOpenBlockMenus] = useState({});
  const [openStairMenus, setOpenStairMenus] = useState({});
  const [openApartmentMenus, setOpenApartmentMenus] = useState({});

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

  // Effect pentru auto-expand la încărcarea paginii
  useEffect(() => {
    if (!association?.id || !blocks || !stairs || !apartments) return;

    const associationBlocks = blocks.filter(block => block.associationId === association.id);
    const associationStairs = stairs.filter(stair =>
      associationBlocks.some(block => block.id === stair.blockId)
    );
    const associationApartments = apartments || [];

    const newExpandedBlocks = {};
    const newExpandedStairs = {};

    associationBlocks.forEach(block => {
      const blockStairs = associationStairs.filter(stair => stair.blockId === block.id);

      // Logica de expandare pentru blocuri
      const shouldExpandBlock = () => {
        if (associationBlocks.length === 0) return true;
        if (associationBlocks.length === 1) return true; // Un singur bloc -> expandează automat
        if (blockStairs.length === 0) return true;

        const hasStairsWithoutApartments = blockStairs.some(stair => {
          const stairApartments = associationApartments.filter(apt => apt.stairId === stair.id);
          return stairApartments.length === 0;
        });

        if (hasStairsWithoutApartments) return true;
        return false;
      };

      if (shouldExpandBlock()) {
        newExpandedBlocks[block.id] = true;
      }

      // Logica de expandare pentru scări
      blockStairs.forEach(stair => {
        const stairApartments = associationApartments.filter(apt => apt.stairId === stair.id);

        const shouldExpandStair = () => {
          if (stairApartments.length === 0) return true;
          if (blockStairs.length === 1 && stairApartments.length > 0) return true;
          return false;
        };

        if (shouldExpandStair()) {
          newExpandedStairs[stair.id] = true;
        }
      });
    });

    setExpandedBlocks(newExpandedBlocks);
    setExpandedStairs(newExpandedStairs);
  }, [association?.id, blocks, stairs, apartments, setExpandedBlocks, setExpandedStairs]);

  // Verifică dacă toate props-urile necesare sunt disponibile
  if (!association || !blocks || !stairs || !apartments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex items-center justify-center">
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
  // Folosim direct apartments care sunt deja filtrate pentru asociația curentă
  const associationApartments = apartments || [];

  // Filtrez apartamentele pentru căutare
  const filteredApartments = searchTerm 
    ? associationApartments.filter(apt => 
        apt.number.toString().includes(searchTerm) ||
        apt.owner.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : associationApartments;

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

        console.log('🏢 Actualizez Sheet 1 cu apartamentele importate...');
        await updateStructureSnapshot(completeStructureData);
        console.log('✅ Sheet 1 actualizat cu succes după importul Excel');

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

const monthType = getMonthType ? getMonthType(currentMonth) : null;

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
    setApartmentModalMode('edit');
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
  <div className={`min-h-screen pt-2 px-6 pb-6 ${
    monthType === 'current'
      ? "bg-gradient-to-br from-indigo-50 to-blue-100"
      : monthType === 'next'
      ? "bg-gradient-to-br from-green-50 to-emerald-100"
      : monthType === 'historic'
      ? "bg-gradient-to-br from-gray-50 to-gray-100"
      : "bg-gradient-to-br from-indigo-50 to-blue-100"
  }`}>
    <div className="w-full">
      {/* Header cu dropdown luni */}
      <DashboardHeader
        association={association}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        getAvailableMonths={getAvailableMonths}
        expenses={expenses}
        isMonthReadOnly={isMonthReadOnly}
        getAssociationApartments={getAssociationApartments}
        handleNavigation={handleNavigation}
        getMonthType={getMonthType}
      />

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏢 Configurare apartamente</h1>
      </div>

        {/* Statistici și căutare */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalBlocks}</div>
                <div className="text-sm text-gray-600">Blocuri</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalStairs}</div>
                <div className="text-sm text-gray-600">Scări</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalApartments}</div>
                <div className="text-sm text-gray-600">Apartamente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalPersons}</div>
                <div className="text-sm text-gray-600">Persoane</div>
              </div>
            </div>

            <div className="flex gap-3">
              {/* Butoane Excel - vizibile doar când există cel puțin o scară fără apartamente */}
              {stairsWithoutApartments > 0 && (
                <>
                  <button
                    onClick={handleDownloadExcelTemplate}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm font-medium shadow-lg"
                    title="Descarcă template Excel pentru import masiv apartamente"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Template Excel
                  </button>
                  <button
                    onClick={() => setShowExcelUploadModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium shadow-lg"
                    title="Încarcă fișier Excel completat pentru import masiv"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Încarcă Excel
                  </button>
                </>
              )}
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Caută apartament sau proprietar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-80"
                />
                <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600"
                >
                  Șterge căutare
                </button>
              )}
            </div>
          </div>

          {/* Mesaj informativ pentru template Excel când nu există apartamente */}
          {stairsWithoutApartments > 0 && !searchTerm && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">📥</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800 mb-2">Import masiv cu Excel</h4>
                    <p className="text-sm text-blue-700">
                      Poți să adaugi apartamentele manual unul câte unul, sau să folosești import-ul masiv cu Excel pentru scările care nu au apartamente definite. <strong>Notă:</strong> Template-ul Excel va conține doar scările care nu au apartamente și se poate folosi pentru import doar în aceste scări.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">
                Rezultate căutare "{searchTerm}": {filteredApartments.length} apartamente
                {filteredApartments.length > 3 && (
                  <span className="text-gray-500"> (afișez doar primele 3)</span>
                )}
              </div>
              {filteredApartments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredApartments.sort((a, b) => {
                    const numberDiff = a.number - b.number;
                    if (numberDiff !== 0) return numberDiff;

                    if (a.createdAt && b.createdAt) {
                      return new Date(a.createdAt) - new Date(b.createdAt);
                    }
                    return a.id.localeCompare(b.id);
                  }).slice(0, 3).map(apartment => {
                    const stairForApartment = stairs.find(s => s.id === apartment.stairId);
                    const blockForApartment = blocks.find(b => b.id === stairForApartment?.blockId);
                    return (
                      <div key={apartment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="font-medium text-blue-800">
                          Apt {apartment.number} - {apartment.owner}
                        </div>
                        <div className="text-sm text-blue-600">
                          {blockForApartment?.name} - {stairForApartment?.name} • {apartment.persons} persoane
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              // Colapsează toate blocurile și scările
                              setExpandedBlocks({});
                              setExpandedStairs({});

                              // Expandează doar blocul și scara unde este apartamentul
                              setExpandedBlocks(prev => ({ ...prev, [blockForApartment.id]: true }));
                              setExpandedStairs(prev => ({ ...prev, [stairForApartment.id]: true }));

                              // Evidențiază apartamentul
                              setHighlightedApartmentId(apartment.id);

                              // Elimină highlighting după 3 secunde
                              setTimeout(() => {
                                setHighlightedApartmentId(null);
                              }, 3000);

                              // Deschide modalul de editare pentru apartament
                              setApartmentModalMode('edit');
                              setApartmentModalData(apartment);
                              setApartmentModalStair(stairForApartment);
                              setApartmentModalOpen(true);
                            }}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Editează
                          </button>
                          <button
                            onClick={() => {
                              // Colapsează toate blocurile și scările
                              setExpandedBlocks({});
                              setExpandedStairs({});

                              // Expandează doar blocul și scara unde este apartamentul
                              setExpandedBlocks(prev => ({ ...prev, [blockForApartment.id]: true }));
                              setExpandedStairs(prev => ({ ...prev, [stairForApartment.id]: true }));

                              // Evidențiază apartamentul
                              setHighlightedApartmentId(apartment.id);

                              // Elimină orice highlighting după 3 secunde
                              setTimeout(() => {
                                setHighlightedApartmentId(null);
                              }, 3000);
                            }}
                            className="bg-green-500 text-white p-2 rounded hover:bg-green-600 flex items-center justify-center"
                            title="Vezi în structură"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nu s-au găsit apartamente care să corespundă căutării
                </div>
              )}
            </div>
          )}
        </div>

        {/* Structura ierarhică */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">📋 Structura Asociației</h3>
            <div className="flex gap-3">
              {associationBlocks.length > 3 && (
                <div className="flex gap-2">
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
                    className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-sm"
                  >
                    Expandează Tot
                  </button>
                  <button
                    onClick={() => {
                      setExpandedBlocks({});
                      setExpandedStairs({});
                    }}
                    className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 text-sm"
                  >
                    Închide Tot
                  </button>
                </div>
              )}
              <button
                onClick={openAddBlockModal}
                className={`bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-all duration-200 hover:shadow-md hover:scale-105 ${
                  associationBlocks.length > 0 ? 'p-2' : 'px-4 py-2'
                }`}
                title="Adaugă Bloc"
              >
                {associationBlocks.length > 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ) : (
                  'Adaugă Bloc'
                )}
              </button>
            </div>
          </div>

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
              <div className="py-4 px-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🏢</span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          BLOCURI NECESARE
                        </span>
                        <span className="text-sm font-semibold text-blue-800">Nu există blocuri configurate</span>
                      </div>
                      <p className="text-sm text-blue-600">Poți genera template Excel cu blocurile și scările și upload de fișier Excel cu apartamentele</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              associationBlocks.sort((a, b) => {
                if (a.createdAt && b.createdAt) {
                  return new Date(a.createdAt) - new Date(b.createdAt);
                }
                return a.id.localeCompare(b.id);
              }).map(block => {
                const blockStairs = associationStairs.filter(stair => stair.blockId === block.id);
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

                const isExpanded = expandedBlocks[block.id] ?? shouldExpandBlock();

                return (
                  <div key={block.id} className="border border-gray-200 rounded-lg">
                    {/* Header Bloc */}
                    <div
                      className="flex items-center justify-between p-4 bg-blue-50 border-b cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        setExpandedBlocks(prev => ({
                          ...prev,
                          [block.id]: !isExpanded
                        }));
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-blue-600 text-xl">
                          {isExpanded ? '▼' : '▸'}
                        </div>
                        
                        <div
                          className="flex items-center space-x-2 cursor-pointer hover:bg-blue-100 rounded-lg p-2 -m-2 transition-colors"
                          onClick={() => {
                            setExpandedBlocks(prev => ({
                              ...prev,
                              [block.id]: !isExpanded
                            }));
                          }}
                        >
                          <span className="text-lg font-medium text-gray-800">
                            🏢 {block.name}
                          </span>
                          <span className="text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded-full">
                            {blockStairs.length} scări • {blockStairs.reduce((sum, currentStair) => {
                              return sum + associationApartments.filter(apt => apt.stairId === currentStair.id).length;
                            }, 0)} apartamente
                          </span>
                        </div>
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
                                      openEditBlockModal(block);
                                      setOpenBlockMenus(prev => ({ ...prev, [block.id]: false }));
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editează Bloc
                                  </button>
                                  <button
                                    onClick={() => {
                                      openAddStairModal(block);
                                      setOpenBlockMenus(prev => ({ ...prev, [block.id]: false }));
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Adaugă Scară
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Ești sigur că vrei să ștergi blocul "${block.name}"?\n\nAceasta va șterge și toate scările și apartamentele din bloc!`)) {
                                        deleteBlock(block.id);
                                      }
                                      setOpenBlockMenus(prev => ({ ...prev, [block.id]: false }));
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
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
                              onClick={() => openEditBlockModal(block)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title={`Editează blocul ${block.name}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Ești sigur că vrei să ștergi blocul "${block.name}"?\n\nAceasta va șterge și toate scările și apartamentele din bloc!`)) {
                                  deleteBlock(block.id);
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title={`Șterge blocul ${block.name}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openAddStairModal(block)}
                              className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center text-sm"
                              title={`Adaugă scară în ${block.name}`}
                            >
                              Adaugă Scară
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Conținutul blocului */}
                    {isExpanded && (
                      <div className="p-4">
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
                              const stairApartments = associationApartments.filter(apt => apt.stairId === currentStair.id);
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

                              const isStairExpanded = expandedStairs[currentStair.id] ?? shouldExpandStair();
                              
                              return (
                                <div key={currentStair.id} className="ml-6 border-l-2 border-green-200 pl-4">
                                  <div
                                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                                    onClick={() => {
                                      setExpandedStairs(prev => ({
                                        ...prev,
                                        [currentStair.id]: !isStairExpanded
                                      }));
                                    }}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="text-green-600">
                                        {isStairExpanded ? '▼' : '▸'}
                                      </div>
                                      <span className="text-green-600 text-lg">🪜</span>
                                      
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
                                        <div
                                          className="flex items-center space-x-2 cursor-pointer hover:bg-green-100 rounded-lg p-2 -m-2 transition-colors"
                                          onClick={() => {
                                            setExpandedStairs(prev => ({
                                              ...prev,
                                              [currentStair.id]: !isStairExpanded
                                            }));
                                          }}
                                        >
                                          <span className="font-medium text-gray-800 text-lg">
                                            {currentStair.name}
                                          </span>
                                          <span className="text-sm text-gray-600 bg-green-100 px-2 py-1 rounded-full">
                                            {stairApartments.length} apartamente • {stairApartments.reduce((sum, apt) => sum + apt.persons, 0)} persoane
                                          </span>
                                        </div>
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
                                                    openEditStairModal(currentStair);
                                                    setOpenStairMenus(prev => ({ ...prev, [currentStair.id]: false }));
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                                >
                                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                  </svg>
                                                  Editează Scară
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    openAddApartmentModal(currentStair);
                                                    setOpenStairMenus(prev => ({ ...prev, [currentStair.id]: false }));
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                                >
                                                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                  </svg>
                                                  Adaugă Apartament
                                                </button>
                                                <hr className="my-1" />
                                                <button
                                                  onClick={() => {
                                                    if (window.confirm(`Ești sigur că vrei să ștergi scara "${currentStair.name}"?\n\nAceasta va șterge și toate apartamentele din scară!`)) {
                                                      deleteStair(currentStair.id);
                                                    }
                                                    setOpenStairMenus(prev => ({ ...prev, [currentStair.id]: false }));
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
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
                                            onClick={() => openEditStairModal(currentStair)}
                                            className="p-2 text-green-600 hover:bg-green-200 hover:text-green-800 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                            title={`Editează ${currentStair.name}`}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (window.confirm(`Ești sigur că vrei să ștergi scara "${currentStair.name}"?\n\nAceasta va șterge și toate apartamentele din scară!`)) {
                                                deleteStair(currentStair.id);
                                              }
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-200 hover:text-red-800 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                            title={`Șterge ${currentStair.name}`}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              openAddApartmentModal(currentStair);
                                            }}
                                            className="px-3 py-2 bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md rounded-lg transition-all duration-200 hover:scale-105 flex items-center text-sm"
                                            title={`Adaugă apartament în ${currentStair.name}`}
                                          >
                                            Adaugă Apartament
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Conținutul scării expandat */}
                                  {isStairExpanded && (
                                    <div className="mt-3 ml-6 space-y-3">
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
                                        <div className="py-4 px-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                                <span className="text-2xl">👥</span>
                                              </div>
                                              <div className="text-left">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                    APARTAMENTE NECESARE
                                                  </span>
                                                  <span className="text-sm font-semibold text-orange-800">Nu există apartamente în această scară</span>
                                                </div>
                                                <p className="text-sm text-orange-600">Adaugă apartamentele manual pentru această scară sau folosește Import masiv cu Excel pentru scările fără apartamente</p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : stairApartments.length > 0 ? (
                                        <div className="space-y-3">
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
                                                : "bg-orange-50 border border-orange-200 rounded-lg p-3 hover:bg-orange-100"
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
                                                        <span className="font-medium text-gray-800 text-lg">
                                                          👥 Apt {apartment.number} - {apartment.owner}
                                                        </span>
                                                      </div>

                                                      {/* Etichetele cu formatare tabelară fixă - pornesc de la același punct */}
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full w-24 text-center">
                                                          {apartment.persons} {apartment.persons === 1 ? 'persoană' : 'persoane'}
                                                        </span>

                                                        {apartment.apartmentType ? (
                                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full w-24 text-center">
                                                            🏠 {apartment.apartmentType}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-24 text-center">
                                                            🏠 -
                                                          </span>
                                                        )}

                                                        {apartment.surface ? (
                                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full w-20 text-center">
                                                            📐 {apartment.surface} mp
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-20 text-center">
                                                            📐 - mp
                                                          </span>
                                                        )}

                                                        {apartment.heatingSource ? (
                                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full w-36 text-center">
                                                            🔥 {apartment.heatingSource}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-36 text-center">
                                                            🔥 -
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>

                                                    {/* Mobile: numele sus, etichetele jos */}
                                                    <div className="lg:hidden">
                                                      <div className="mb-2">
                                                        <span className="font-medium text-gray-800 text-lg">
                                                          👥 Apt {apartment.number} - {apartment.owner}
                                                        </span>
                                                      </div>

                                                      <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full w-24 text-center">
                                                          {apartment.persons} {apartment.persons === 1 ? 'persoană' : 'persoane'}
                                                        </span>

                                                        {apartment.apartmentType ? (
                                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full w-24 text-center">
                                                            🏠 {apartment.apartmentType}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-24 text-center">
                                                            🏠 -
                                                          </span>
                                                        )}

                                                        {apartment.surface ? (
                                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full w-20 text-center">
                                                            📐 {apartment.surface} mp
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-20 text-center">
                                                            📐 - mp
                                                          </span>
                                                        )}

                                                        {apartment.heatingSource ? (
                                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full w-36 text-center">
                                                            🔥 {apartment.heatingSource}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full w-36 text-center">
                                                            🔥 -
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Hamburger menu pentru apartament */}
                                                  <div className="relative ml-4 apartment-menu-container">
                                                    <button
                                                      onClick={() => {
                                                        // Determină dacă este ultimul apartament din scară
                                                        const stairApts = stairApartments.sort((a, b) => {
                                                          const numberDiff = a.number - b.number;
                                                          if (numberDiff !== 0) return numberDiff;
                                                          if (a.createdAt && b.createdAt) {
                                                            return new Date(a.createdAt) - new Date(b.createdAt);
                                                          }
                                                          return a.id.localeCompare(b.id);
                                                        });
                                                        const isLastApartment = stairApts[stairApts.length - 1]?.id === apartment.id;

                                                        if (isLastApartment) {
                                                          // Pentru ultimul apartament, arată meniul cu opțiuni (editează + șterge)
                                                          if (openApartmentMenus[apartment.id]) {
                                                            setOpenApartmentMenus({});
                                                          } else {
                                                            setOpenBlockMenus({});
                                                            setOpenStairMenus({});
                                                            setOpenApartmentMenus({});
                                                            setOpenApartmentMenus({ [apartment.id]: true });
                                                          }
                                                        } else {
                                                          // Pentru celelalte apartamente, deschide direct edit-ul
                                                          openEditApartmentModal(apartment);
                                                        }
                                                      }}
                                                      className="p-2 text-orange-600 hover:bg-orange-200 hover:text-orange-800 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105"
                                                      title={(() => {
                                                        const stairApts = stairApartments.sort((a, b) => {
                                                          const numberDiff = a.number - b.number;
                                                          if (numberDiff !== 0) return numberDiff;
                                                          if (a.createdAt && b.createdAt) {
                                                            return new Date(a.createdAt) - new Date(b.createdAt);
                                                          }
                                                          return a.id.localeCompare(b.id);
                                                        });
                                                        const isLastApartment = stairApts[stairApts.length - 1]?.id === apartment.id;
                                                        return isLastApartment ? "Acțiuni pentru apartament" : "Editează apartament";
                                                      })()}
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                      </svg>
                                                    </button>

                                                    {openApartmentMenus[apartment.id] && (
                                                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                                        <div className="py-1">
                                                          <button
                                                            onClick={() => {
                                                              openEditApartmentModal(apartment);
                                                              setOpenApartmentMenus(prev => ({
                                                                ...prev,
                                                                [apartment.id]: false
                                                              }));
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                                                          >
                                                            ✏️ Editează Apartament
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

                                                            return isLastApartment && (
                                                              <button
                                                                onClick={() => {
                                                                  if (window.confirm(`Ești sigur că vrei să ștergi apartamentul ${apartment.number} (${apartment.owner})?\n\nAcest lucru este ireversibil!`)) {
                                                                    deleteApartment(apartment.id);
                                                                  }
                                                                  setOpenApartmentMenus(prev => ({
                                                                    ...prev,
                                                                    [apartment.id]: false
                                                                  }));
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
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
                          <div className="py-4 px-6 bg-green-50 border-2 border-green-200 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-2xl">🪜</span>
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                      SCĂRI NECESARE
                                    </span>
                                    <span className="text-sm font-semibold text-green-800">Nu există scări în acest bloc</span>
                                  </div>
                                  <p className="text-sm text-green-600">Adaugă scările pentru acest bloc pentru a putea configura apartamentele</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
        onSave={handleSaveApartment}
      />
    </div>
  );
};

export default SetupView;