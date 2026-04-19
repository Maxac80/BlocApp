/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React from 'react';
import { X, Home, User, Users, Receipt, AlertCircle, Info, ClipboardList, DoorOpen, Download } from 'lucide-react';
import { downloadMaintenancePdf } from '../../utils/maintenancePdfGenerator';

const MaintenanceBreakdownModal = ({ isOpen, onClose, apartmentData, expensesList, apartmentParticipations, apartmentSurface, allApartments, allMaintenanceData, getExpenseConfig, stairs, blocks, payments, currentMonth, consumptionMonth, association, stats }) => {
  if (!isOpen || !apartmentData) return null;

  const {
    apartmentId,
    apartment,
    owner,
    persons,
    currentMaintenance,
    restante,
    penalitati,
    totalDatorat,
    expenseDetails,
    expenseDifferenceDetails,
    surface
  } = apartmentData;

  // 🆕 Filtrează încasările pentru acest apartament
  const apartmentPayments = payments?.filter(p => p.apartmentId === apartmentId) || [];

  // Calculează totalurile pe categorii (ce s-a plătit)
  const totalIncasatIntretinere = apartmentPayments.reduce((sum, p) => sum + (p.intretinere || 0), 0);
  const totalIncasatRestante = apartmentPayments.reduce((sum, p) => sum + (p.restante || 0), 0);
  const totalIncasatPenalitati = apartmentPayments.reduce((sum, p) => sum + (p.penalitati || 0), 0);
  const totalIncasat = totalIncasatIntretinere + totalIncasatRestante + totalIncasatPenalitati;

  // Calculează valorile INIȚIALE (înainte de plată)
  // Valori actuale + ce s-a plătit = valori inițiale
  const initialCurrentMaintenance = (currentMaintenance || 0) + totalIncasatIntretinere;
  const initialRestante = (restante || 0) + totalIncasatRestante;
  const initialPenalitati = (penalitati || 0) + totalIncasatPenalitati;
  const initialTotalDatorat = (totalDatorat || 0) + totalIncasat;


  // Get current apartment details
  const currentApartment = allApartments?.find(apt => apt.id === apartmentId);
  const apartmentSurfaceFromList = currentApartment?.surface || 0;
  const finalSurface = surface || apartmentSurfaceFromList || apartmentSurface || 0;

  // Get current apartment's stair and block
  const currentStairId = currentApartment?.stairId;
  const currentStair = stairs?.find(s => s.id === currentStairId);
  const currentBlockId = currentStair?.blockId;

  // Helper function to get apartments from the same group (bloc/scară/asociație) as current apartment
  const getApartmentsInSameGroup = (expense) => {
    if (!allApartments || !stairs) return allApartments || [];

    // Determine reception mode
    let receptionMode = expense.receptionMode || expense.expenseEntryMode || 'per_association';

    // Backward compatibility: map old values to new ones
    if (receptionMode === 'building') receptionMode = 'per_block';
    else if (receptionMode === 'staircase') receptionMode = 'per_stair';
    else if (receptionMode === 'per_blocuri') receptionMode = 'per_block';
    else if (receptionMode === 'per_scari') receptionMode = 'per_stair';
    else if (receptionMode === 'total') receptionMode = 'per_association';

    // Filter apartments based on reception mode
    if (receptionMode === 'per_block' && currentBlockId) {
      // Return only apartments from the same block
      return allApartments.filter(apt => {
        const aptStair = stairs.find(s => s.id === apt.stairId);
        return aptStair?.blockId === currentBlockId;
      });
    } else if (receptionMode === 'per_stair' && currentStairId) {
      // Return only apartments from the same stair
      return allApartments.filter(apt => apt.stairId === currentStairId);
    } else {
      // Total mode - return all apartments
      return allApartments;
    }
  };

  // Helper function to calculate standard amount per apartment after reweighting
  const calculateStandardAmountPerApartment = (expense, currentAptAmount) => {
    if (!allApartments || !Array.isArray(allApartments) || !allMaintenanceData) {
      return expense.amount || 0; // Fallback
    }

    // Get apartments from the same group (bloc/scară/asociație) as current apartment
    const groupApartments = getApartmentsInSameGroup(expense);

    // Find an apartment with integral participation (100%) to get the standard amount
    let standardAmount = 0;
    let foundIntegralApartment = false;

    for (const apt of groupApartments) {
      const aptParticipation = apartmentParticipations?.[apt.id]?.[expense.name];

      // Skip excluded and fixed apartments
      if (aptParticipation?.type === 'excluded' || aptParticipation?.type === 'fixed') {
        continue;
      }

      // Check if this is an integral apartment (no participation or 100%)
      const isIntegral = !aptParticipation?.type ||
                         aptParticipation?.type === 'integral' ||
                         (aptParticipation?.type === 'percentage' && aptParticipation?.value === 100);

      if (isIntegral) {
        // Get the calculated amount for this apartment from allMaintenanceData
        const aptData = allMaintenanceData.find(data => data.apartmentId === apt.id);
        // Folosește aceeași cheie ca în useMaintenanceCalculation
        const expenseKey = expense.expenseTypeId || expense.id || expense.name;
        const expenseDetail = aptData?.expenseDetails?.[expenseKey];
        const aptAmount = typeof expenseDetail === 'object' ? (expenseDetail?.amount || 0) : (expenseDetail || 0);
        standardAmount = aptAmount;
        foundIntegralApartment = true;


        break;
      }
    }

    // If no integral apartment found, try to reverse calculate from a percentage apartment
    if (!foundIntegralApartment) {
      for (const apt of groupApartments) {
        const aptParticipation = apartmentParticipations?.[apt.id]?.[expense.name];

        if (aptParticipation?.type === 'percentage' && aptParticipation?.value > 0 && aptParticipation?.value !== 100) {
          // Reverse calculate: if apartment pays X with Y% participation, standard is X / (Y/100)
          const aptData = allMaintenanceData.find(data => data.apartmentId === apt.id);
          // Folosește aceeași cheie ca în useMaintenanceCalculation
          const expKey = expense.expenseTypeId || expense.id || expense.name;
          const expDetail = aptData?.expenseDetails?.[expKey];
          const aptAmount = typeof expDetail === 'object' ? (expDetail?.amount || 0) : (expDetail || 0);
          const multiplier = aptParticipation.value < 1 ? aptParticipation.value : (aptParticipation.value / 100);
          standardAmount = multiplier > 0 ? (aptAmount / multiplier) : 0;
          break;
        }
      }
    }

    // FALLBACK: Dacă nu găsim apartament integral sau cu procentaj, folosește apartamentul curent
    if (standardAmount === 0 && currentAptAmount > 0) {
      standardAmount = currentAptAmount;
    }

    return standardAmount;
  };

  // Helper function to get distribution info for an expense
  const getDistributionInfo = (expense, consumption, individualAmount, calculatedAmount) => {
    const participation = apartmentParticipations?.[apartmentId]?.[expense.name];

    // Get consumption unit from expense config
    const getConsumptionUnit = () => {
      // Try to get config for this expense
      const config = getExpenseConfig ? getExpenseConfig(expense) : null;  // Folosește obiectul complet pentru expenseTypeId

      if (config) {
        if (config.consumptionUnit === 'custom' && config.customConsumptionUnit) {
          return config.customConsumptionUnit;
        }
        if (config.consumptionUnit) {
          return config.consumptionUnit;
        }
      }

      // Fallback to expense object
      if (expense.consumptionUnit === 'custom' && expense.customConsumptionUnit) {
        return expense.customConsumptionUnit;
      }
      return expense.consumptionUnit || 'unități';
    };

    // Build participation badge FIRST (înainte de a verifica tipul de distribuție)
    let participationBadge = null;
    const isExcluded = participation?.type === 'excluded';

    if (isExcluded) {
      participationBadge = 'Exclus';
    } else if (participation?.type === 'percentage' && participation.value !== 100) {
      participationBadge = `Participare ${participation.value}%`;
    } else if (participation?.type === 'fixed') {
      participationBadge = `Sumă fixă: ${participation.value} lei`;
    }

    // Determine distribution type from expense config
    const distType = expense.distributionType || expense.distribution || expense.type;

    // Debug: log distribution type for cotaParte expenses
    if (expense.name && (expense.name.includes('Cota parte') || expense.name.includes('cota parte'))) {
    }

    switch (distType) {
      case 'perApartment':
      case 'apartment':
      case 'pe_apartament':
        // Get the standard amount after reweighting (from an integral apartment)
        const standardPerApartment = calculateStandardAmountPerApartment(expense, calculatedAmount);

        return {
          type: 'perApartment',
          label: `${standardPerApartment.toFixed(2)} lei/apartament`,
          details: null,
          participationBadge,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'perPerson':
      case 'person':
      case 'pe_persoana':
        // For perPerson distribution, find an apartment with integral participation
        // and calculate the price per person from its amount and number of persons
        let standardPricePerPerson = 0;

        if (allMaintenanceData && allApartments) {
          // Get apartments from the same group (bloc/scară/asociație) as current apartment
          const groupApartmentsForPerson = getApartmentsInSameGroup(expense);

          // Find an apartment with integral participation from the same group
          for (const apt of groupApartmentsForPerson) {
            const aptParticipation = apartmentParticipations?.[apt.id]?.[expense.name];

            // Skip excluded and fixed apartments
            if (aptParticipation?.type === 'excluded' || aptParticipation?.type === 'fixed') {
              continue;
            }

            // Check if this is an integral apartment
            const isIntegral = !aptParticipation?.type ||
                               aptParticipation?.type === 'integral' ||
                               (aptParticipation?.type === 'percentage' && aptParticipation?.value === 100);

            if (isIntegral && apt.persons > 0) {
              // Get the calculated amount for this apartment
              const aptData = allMaintenanceData.find(data => data.apartmentId === apt.id);
              // Folosește aceeași cheie ca în useMaintenanceCalculation
              const expKey = expense.expenseTypeId || expense.id || expense.name;
              const expDetail = aptData?.expenseDetails?.[expKey];
              const aptAmount = typeof expDetail === 'object' ? (expDetail?.amount || 0) : (expDetail || 0);

              // Calculate price per person: amount / number of persons
              standardPricePerPerson = aptAmount / apt.persons;


              break;
            }
          }

          // FALLBACK: Dacă nu găsim apartament integral, folosește apartamentul curent
          if (standardPricePerPerson === 0 && persons > 0 && calculatedAmount > 0) {
            standardPricePerPerson = calculatedAmount / persons;
          }
        }

        return {
          type: 'perPerson',
          label: `${standardPricePerPerson.toFixed(2)} lei/persoană`,
          details: persons ? `${persons} ${persons === 1 ? 'persoană' : 'persoane'} × ${standardPricePerPerson.toFixed(2)} lei = ${(persons * standardPricePerPerson).toFixed(2)} lei` : null,
          participationBadge,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'consumption':
      case 'consumption_cumulative':
      case 'consum':
      case 'pe_consum':
        const pricePerUnit = expense.unitPrice || expense.pricePerUnit || expense.price || 0;
        const units = consumption || 0;
        const unit = getConsumptionUnit();
        const isCumulative = distType === 'consumption_cumulative';
        const consumptionSubtotal = units * pricePerUnit;
        return {
          type: 'consumption',
          label: isCumulative ? 'Pe consum cumulat' : 'Pe consum',
          details: pricePerUnit > 0
            ? `${units.toFixed(2)} ${unit} × ${pricePerUnit.toFixed(2)} lei/${unit} = ${consumptionSubtotal.toFixed(2)} lei`
            : null,
          participationBadge,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'individual':
      case 'suma_individuala':
        return {
          type: 'individual',
          label: 'Sumă individuală',
          details: null,
          participationBadge,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-200'
        };
      case 'cotaParte':
      case 'cota_parte':
        // Get apartment surface - use finalSurface which includes fallback to allApartments
        const apartmentSurf = finalSurface;

        // For cotaParte, we want to show: "X mp × Y lei/mp"
        // The calculation is based on surface area, not on cotaParte percentage
        // If we have the surface and the calculated amount, we can derive the price per sqm
        const pricePerSqm = apartmentSurf > 0 && calculatedAmount > 0 ? (calculatedAmount / apartmentSurf) : 0;


        return {
          type: 'cotaParte',
          label: 'Cotă parte',
          details: apartmentSurf > 0 ? `${apartmentSurf.toFixed(2)} mp × ${pricePerSqm.toFixed(2)} lei/mp` : null,
          participationBadge,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
          borderColor: 'border-teal-200'
        };
      default:
        return {
          type: 'unknown',
          label: 'Nedefinit',
          details: null,
          participationBadge,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Calculate expense breakdown - include ALL expenses (even excluded ones)

  const expenseBreakdown = expensesList?.map(expense => {
    // Folosește ID-ul cheltuielii pentru a găsi datele (expenseTypeId sau id)
    const expenseKey = expense.expenseTypeId || expense.id || expense.name;
    const expenseData = expenseDetails?.[expenseKey];

    // Compatibilitate: verifică și structura veche (doar amount ca număr)
    const amount = typeof expenseData === 'object' ? expenseData.amount : (expenseData || 0);
    // Folosește același ID pentru differences
    const difference = expenseDifferenceDetails?.[expenseKey] || 0;
    const participation = apartmentParticipations?.[apartmentId]?.[expense.name];


    // Get consumption or individual amount for this expense from the expense object
    const consumption = expense.consumption?.[apartmentId] || 0;
    const individualAmount = expense.individualAmounts?.[apartmentId] || 0;

    const distributionInfo = getDistributionInfo(expense, consumption, individualAmount, amount);

    // Include expense if it has amount, any difference (+/-), or apartment is excluded
    const shouldShow = amount !== 0 || difference !== 0 || participation?.type === 'excluded';

    return {
      name: expense.name,
      amount,
      difference,
      distributionType: expense.distributionType || expense.distribution || expense.type,
      distributionInfo,
      isExcluded: participation?.type === 'excluded',
      shouldShow
    };
  }).filter(item => item.shouldShow).sort((a, b) => {
    const typeOrder = {
      consumption: 1, byConsumption: 1, consum: 1, pe_consum: 1,
      consumption_cumulative: 2,
      person: 3, perPerson: 3, byPersons: 3, pe_persoana: 3,
      apartment: 4, perApartament: 4, equal: 4, pe_apartament: 4,
      individual: 5, suma_individuala: 5,
      cotaParte: 6, cota_parte: 6, byArea: 6,
      fixed: 7
    };
    const orderA = typeOrder[a.distributionType] || 99;
    const orderB = typeOrder[b.distributionType] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return (b.amount + (b.difference || 0)) - (a.amount + (a.difference || 0));
  }) || [];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold">
                Întreținere · Apartament {apartment}
              </h2>
              {currentMonth && (
                <p className="text-white/80 text-[11px] sm:text-xs">
                  <span>{currentMonth}</span>
                  {consumptionMonth && (
                    <>
                      <span className="mx-1">·</span>
                      <span>consum {consumptionMonth}</span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Apartment Info + Total Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-5 mb-4 sm:mb-6 border border-blue-100">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
              <DoorOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-500" />
              Apartament {apartment}
            </h3>
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm mb-3 sm:mb-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                <span className="text-sm sm:text-base font-semibold text-gray-800 break-words">
                  {owner}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span className="text-[10px] sm:text-xs bg-orange-200 text-orange-800 px-1.5 sm:px-2 py-0.5 rounded">
                  {persons} {persons === 1 ? 'persoană' : 'persoane'}
                </span>
                {currentApartment?.apartmentType ? (
                  <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded">
                    🏠 {currentApartment.apartmentType}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-400 px-1.5 sm:px-2 py-0.5 rounded">
                    🏠 -
                  </span>
                )}
                {finalSurface > 0 ? (
                  <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded">
                    📐 {finalSurface} mp
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-400 px-1.5 sm:px-2 py-0.5 rounded">
                    📐 - mp
                  </span>
                )}
                {currentApartment?.heatingSource ? (
                  <span className="text-[10px] sm:text-xs bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 rounded">
                    🔥 {currentApartment.heatingSource}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-400 px-1.5 sm:px-2 py-0.5 rounded">
                    🔥 -
                  </span>
                )}
              </div>
            </div>
            {/* Breakdown financiar: Întreținere curentă + Restanțe + Penalități */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-base">
                <span className="text-gray-700">Întreținere Curentă</span>
                <span className="font-semibold text-blue-600">
                  {initialCurrentMaintenance?.toFixed(2) || '0.00'} lei
                </span>
              </div>
              {initialRestante > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-base">
                  <span className="text-gray-700">Restanțe</span>
                  <span className="font-semibold text-red-600">
                    {initialRestante.toFixed(2)} lei
                  </span>
                </div>
              )}
              {initialPenalitati > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-base">
                  <span className="text-gray-700">Penalități</span>
                  <span className="font-semibold text-orange-600">
                    {initialPenalitati.toFixed(2)} lei
                  </span>
                </div>
              )}
              {apartmentPayments.length > 0 && (
                <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center text-xs sm:text-base mb-1">
                    <span className="flex items-center text-gray-700">
                      <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-green-600" />
                      Încasări ({apartmentPayments.length})
                    </span>
                    <span className="font-semibold text-green-600">
                      −{totalIncasat.toFixed(2)} lei
                    </span>
                  </div>
                  <div className="ml-4 sm:ml-5 space-y-0.5 text-[10px] sm:text-xs text-gray-600">
                    {totalIncasatIntretinere > 0 && (
                      <div className="flex justify-between">
                        <span>• Întreținere</span>
                        <span>−{totalIncasatIntretinere.toFixed(2)} lei</span>
                      </div>
                    )}
                    {totalIncasatRestante > 0 && (
                      <div className="flex justify-between">
                        <span>• Restanță</span>
                        <span>−{totalIncasatRestante.toFixed(2)} lei</span>
                      </div>
                    )}
                    {totalIncasatPenalitati > 0 && (
                      <div className="flex justify-between">
                        <span>• Penalități</span>
                        <span>−{totalIncasatPenalitati.toFixed(2)} lei</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-3 sm:p-4 shadow-md flex justify-between items-center mt-3 sm:mt-4">
              <span className="text-sm sm:text-base font-semibold text-white">
                {apartmentPayments.length > 0 ? 'Rest de plată' : 'Total de plată'}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-white">
                {totalDatorat?.toFixed(2) || '0.00'} lei
              </span>
            </div>
          </div>

          {/* Expense Breakdown Section */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-5 mb-4 sm:mb-6">
            <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">
                  Cheltuieli întreținere
                </h3>
                {currentMonth && (
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    <span>{currentMonth}</span>
                    {consumptionMonth && (
                      <>
                        <span className="mx-1">·</span>
                        <span>consum {consumptionMonth}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 bg-blue-100 border border-blue-300 rounded-lg px-2.5 sm:px-4 py-1 sm:py-1.5 shadow-sm">
                <span className="text-base sm:text-2xl font-bold text-blue-700">
                  {initialCurrentMaintenance?.toFixed(2) || '0.00'} lei
                </span>
              </div>
            </div>

            {expenseBreakdown.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {expenseBreakdown.map((expense, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-2 sm:p-4 shadow-sm hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: expense.isExcluded ? '#9ca3af' : ({
                      'text-orange-600': '#f97316',
                      'text-green-600': '#16a34a',
                      'text-blue-600': '#2563eb',
                      'text-teal-600': '#14b8a6',
                      'text-indigo-600': '#6366f1',
                      'text-red-600': '#dc2626',
                      'text-gray-600': '#9ca3af'
                    }[expense.distributionInfo.color] || '#9ca3af') }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-xs sm:text-base mb-1 sm:mb-2 truncate">
                          {expense.name}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <div className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium ${expense.distributionInfo.bgColor} ${expense.distributionInfo.color} border ${expense.distributionInfo.borderColor}`}>
                              {expense.distributionInfo.label}
                            </div>
                            {expense.distributionInfo.participationBadge && (
                              <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200">
                                {expense.distributionInfo.participationBadge}
                              </div>
                            )}
                          </div>
                          {expense.distributionInfo.details && !expense.isExcluded && (
                            <div className="text-[10px] sm:text-xs text-gray-600 mt-1 ml-1 truncate">
                              {expense.distributionInfo.details}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm sm:text-lg font-bold ${expense.isExcluded ? 'text-gray-400 line-through' : 'text-blue-600'}`}>
                          {(expense.amount + expense.difference).toFixed(2)} lei
                        </div>
                        {!expense.isExcluded && expense.difference !== 0 && (
                          <div className="text-[10px] sm:text-xs text-gray-500 mt-1 whitespace-nowrap">
                            {expense.amount.toFixed(2)}
                            <span className={expense.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {' '}{expense.difference >= 0 ? '+' : '−'} {Math.abs(expense.difference).toFixed(2)}
                            </span>
                            <span className="text-gray-400"> dif.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-xs sm:text-base">
                Nu există detalii despre cheltuieli
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={async () => {
              try {
                const aptId = apartmentData?.apartmentId;
                const pdfExpenses = (expensesList || []).map((expense) => {
                  const details = apartmentData?.expenseDetails || {};
                  const diffDetails = apartmentData?.expenseDifferenceDetails || {};
                  const detail = details[expense.expenseTypeId]
                    || details[expense.id]
                    || details[expense.name];
                  const difference = diffDetails[expense.expenseTypeId]
                    || diffDetails[expense.id]
                    || diffDetails[expense.name]
                    || 0;
                  const participation = apartmentParticipations?.[aptId]?.[expense.name];
                  const isExcluded = participation?.type === 'excluded';
                  const amount = typeof detail === 'object' ? (detail?.amount || 0) : (detail || 0);

                  // Consum per apartament: e pe expense.consumption[apartmentId]
                  const consumption = (typeof detail === 'object' && detail?.consumption)
                    || expense.consumption?.[aptId]
                    || 0;
                  const unitPrice = (typeof detail === 'object' && detail?.unitPrice)
                    || expense.unitPrice
                    || expense.pricePerUnit
                    || expense.price
                    || 0;
                  const individualAmount = (typeof detail === 'object' && detail?.individualAmount)
                    || expense.individualAmounts?.[aptId]
                    || 0;

                  return {
                    name: expense.name,
                    distributionType: expense.distributionType,
                    amount,
                    difference,
                    isExcluded,
                    persons: apartmentData?.persons,
                    consumption,
                    unitPrice,
                    consumptionUnit: expense.consumptionUnit,
                    surface: apartmentData?.surface,
                    individualAmount
                  };
                });

                // Lookup apartament complet + bloc + scara
                const currentApt = (allApartments || []).find(a => a.id === apartmentData?.apartmentId);
                const currentStair = (stairs || []).find(s => s.id === currentApt?.stairId);
                const currentBlock = (blocks || []).find(b => b.id === currentStair?.blockId);

                await downloadMaintenancePdf({
                  association: association || {},
                  stats: stats || {},
                  apartment: {
                    number: apartmentData?.apartment,
                    owner: apartmentData?.owner || currentApt?.owner || '',
                    persons: apartmentData?.persons ?? currentApt?.persons,
                    apartmentType: currentApt?.apartmentType,
                    surface: apartmentData?.surface ?? currentApt?.surface,
                    heatingType: currentApt?.heatingSource || currentApt?.heatingType,
                    blockName: currentBlock?.name,
                    stairName: currentStair?.name
                  },
                  monthYear: currentMonth,
                  consumptionMonth,
                  expenses: pdfExpenses,
                  totals: {
                    currentMaintenance: apartmentData?.currentMaintenance || 0,
                    restante: apartmentData?.restante || 0,
                    penalitati: apartmentData?.penalitati || 0,
                    totalDatorat: apartmentData?.totalDatorat || 0
                  }
                });
              } catch (err) {
                console.error('Eroare generare PDF:', err);
                alert('Eroare la generarea PDF-ului. Verifică consola pentru detalii.');
              }
            }}
            className="flex items-center gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm sm:text-base"
          >
            <Download className="w-4 h-4" />
            Descarcă PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-1.5 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBreakdownModal;
