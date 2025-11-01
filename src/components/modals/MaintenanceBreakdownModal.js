import React from 'react';
import { X, Home, User, Users, Receipt, AlertCircle, Info } from 'lucide-react';

const MaintenanceBreakdownModal = ({ isOpen, onClose, apartmentData, expensesList, apartmentParticipations, apartmentSurface, allApartments, allMaintenanceData, getExpenseConfig, stairs }) => {
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
    let receptionMode = expense.receptionMode || expense.expenseEntryMode || 'total';
    if (receptionMode === 'building') receptionMode = 'per_block';
    else if (receptionMode === 'staircase') receptionMode = 'per_stair';
    else if (receptionMode === 'per_blocuri') receptionMode = 'per_block';
    else if (receptionMode === 'per_scari') receptionMode = 'per_stair';

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
  const calculateStandardAmountPerApartment = (expense) => {
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
        const aptAmount = aptData?.expenseDetails?.[expense.name] || 0;
        standardAmount = aptAmount;
        foundIntegralApartment = true;

        console.log(`[PerApartment Debug] ${expense.name}:`, {
          receptionMode: expense.receptionMode || expense.expenseEntryMode || 'total',
          currentBlockId,
          currentStairId,
          groupApartmentsCount: groupApartments.length,
          integralApartment: apt.number,
          integralAptStairId: apt.stairId,
          standardAmount
        });

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
          const aptAmount = aptData?.expenseDetails?.[expense.name] || 0;
          const multiplier = aptParticipation.value < 1 ? aptParticipation.value : (aptParticipation.value / 100);
          standardAmount = multiplier > 0 ? (aptAmount / multiplier) : 0;
          break;
        }
      }
    }

    return standardAmount;
  };

  // Helper function to get distribution info for an expense
  const getDistributionInfo = (expense, consumption, individualAmount, calculatedAmount) => {
    const participation = apartmentParticipations?.[apartmentId]?.[expense.name];

    // Get consumption unit from expense config
    const getConsumptionUnit = () => {
      // Try to get config for this expense
      const config = getExpenseConfig ? getExpenseConfig(expense.name) : null;

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

    // Check if apartment is excluded
    if (participation?.type === 'excluded') {
      return {
        type: 'excluded',
        label: 'Exclus',
        details: null,
        participationBadge: 'Exclus',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    // Build participation badge
    let participationBadge = null;
    if (participation?.type === 'percentage' && participation.value !== 100) {
      participationBadge = `Participare ${participation.value}%`;
    } else if (participation?.type === 'fixed') {
      participationBadge = `Sumă fixă: ${participation.value} lei`;
    }

    // Determine distribution type from expense config
    const distType = expense.distributionType || expense.distribution || expense.type;

    // Debug: log distribution type for cotaParte expenses
    if (expense.name && (expense.name.includes('Cota parte') || expense.name.includes('cota parte'))) {
      console.log('Distribution Type for', expense.name, ':', distType);
    }

    switch (distType) {
      case 'perApartment':
      case 'apartment':
      case 'pe_apartament':
        // Get the standard amount after reweighting (from an integral apartment)
        const standardPerApartment = calculateStandardAmountPerApartment(expense);

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
              const aptAmount = aptData?.expenseDetails?.[expense.name] || 0;

              // Calculate price per person: amount / number of persons
              standardPricePerPerson = aptAmount / apt.persons;

              console.log(`[PerPerson Debug] ${expense.name}:`, {
                receptionMode: expense.receptionMode || expense.expenseEntryMode || 'total',
                currentBlockId,
                currentStairId,
                groupApartmentsCount: groupApartmentsForPerson.length,
                integralApartment: apt.number,
                integralAptStairId: apt.stairId,
                aptAmount,
                persons: apt.persons,
                standardPricePerPerson,
                currentApartmentPersons: persons
              });

              break;
            }
          }
        }

        return {
          type: 'perPerson',
          label: `${standardPricePerPerson.toFixed(2)} lei/persoană`,
          details: persons ? `${persons} persoane × ${standardPricePerPerson.toFixed(2)} lei` : null,
          participationBadge,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'consumption':
      case 'consum':
      case 'pe_consum':
        const pricePerUnit = expense.unitPrice || expense.pricePerUnit || expense.price || 0;
        const units = consumption || 0;
        const unit = getConsumptionUnit();
        return {
          type: 'consumption',
          label: 'Pe consum',
          details: pricePerUnit > 0 && units > 0 ? `${units.toFixed(2)} ${unit} × ${pricePerUnit.toFixed(2)} lei/${unit}` : null,
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
          details: individualAmount ? `${individualAmount.toFixed(2)} lei` : null,
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

        console.log('✓ CotaParte matched:', expense.name, '- Surface:', apartmentSurf, 'Amount:', calculatedAmount, 'Price/mp:', pricePerSqm);

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
    const amount = expenseDetails?.[expense.name] || 0;
    const difference = expenseDifferenceDetails?.[expense.name] || 0;
    const participation = apartmentParticipations?.[apartmentId]?.[expense.name];

    // Get consumption or individual amount for this expense from the expense object
    const consumption = expense.consumption?.[apartmentId] || 0;
    const individualAmount = expense.individualAmounts?.[apartmentId] || 0;

    const distributionInfo = getDistributionInfo(expense, consumption, individualAmount, amount);

    // Include expense if it has amount OR if apartment is excluded (to show exclusions)
    const shouldShow = amount > 0 || difference > 0 || participation?.excluded;

    return {
      name: expense.name,
      amount,
      difference,
      distributionInfo,
      shouldShow
    };
  }).filter(item => item.shouldShow) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Receipt className="w-6 h-6" />
            <h2 className="text-xl font-bold">Detalii Întreținere</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Apartment Info Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 mb-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-blue-600" />
              Informații Apartament
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Apartament</p>
                <p className="text-lg font-bold text-blue-600">{apartment}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Proprietar
                </p>
                <p className="text-lg font-semibold text-gray-800">{owner}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Persoane
                </p>
                <p className="text-lg font-bold text-gray-800">{persons}</p>
              </div>
            </div>
          </div>

          {/* Expense Breakdown Section */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Detalii Cheltuieli
            </h3>

            {expenseBreakdown.length > 0 ? (
              <div className="space-y-3">
                {expenseBreakdown.map((expense, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: expense.distributionInfo.color.replace('text-', '#') }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-base mb-2">
                          {expense.name}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${expense.distributionInfo.bgColor} ${expense.distributionInfo.color} border ${expense.distributionInfo.borderColor}`}>
                              <Info className="w-3 h-3" />
                              {expense.distributionInfo.label}
                            </div>
                            {expense.distributionInfo.participationBadge && (
                              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200">
                                {expense.distributionInfo.participationBadge}
                              </div>
                            )}
                          </div>
                          {expense.distributionInfo.details && (
                            <div className="text-xs text-gray-600 mt-1 ml-1">
                              📊 {expense.distributionInfo.details}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${expense.distributionInfo.type === 'excluded' ? 'text-red-600 line-through' : 'text-blue-600'}`}>
                          {expense.amount.toFixed(2)} lei
                        </div>
                        {expense.difference !== 0 && (
                          <div className="text-xs text-orange-600 font-medium mt-1">
                            Diferență: {expense.difference.toFixed(2)} lei
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nu există detalii despre cheltuieli
              </p>
            )}
          </div>

          {/* Totals Section */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Totaluri</h3>
            <div className="space-y-3">
              {/* Current Maintenance */}
              <div className="flex justify-between items-center py-2 border-b border-gray-300">
                <span className="font-medium text-gray-700">Întreținere Curentă</span>
                <span className="text-xl font-bold text-blue-600">
                  {currentMaintenance?.toFixed(2) || '0.00'} lei
                </span>
              </div>

              {/* Arrears */}
              {restante > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-300">
                  <span className="font-medium text-gray-700 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
                    Restanțe
                  </span>
                  <span className="text-xl font-bold text-red-600">
                    {restante?.toFixed(2) || '0.00'} lei
                  </span>
                </div>
              )}

              {/* Penalties */}
              {penalitati > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-300">
                  <span className="font-medium text-gray-700 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 text-orange-500" />
                    Penalități
                  </span>
                  <span className="text-xl font-bold text-orange-600">
                    {penalitati?.toFixed(2) || '0.00'} lei
                  </span>
                </div>
              )}

              {/* Total Owed */}
              <div className="flex justify-between items-center py-3 bg-gradient-to-r from-blue-100 to-indigo-100 -mx-5 px-5 mt-4 rounded-b-lg">
                <span className="text-lg font-bold text-gray-800">Total Datorat</span>
                <span className="text-2xl font-bold text-blue-700">
                  {totalDatorat?.toFixed(2) || '0.00'} lei
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBreakdownModal;
