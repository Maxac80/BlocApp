/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { ClipboardList, Coins, HandCoins, ChevronDown, ChevronUp } from 'lucide-react';

const MaintenanceTableSimple = ({
  maintenanceData,
  isMonthReadOnly,
  togglePayment,
  onOpenPaymentModal,
  onOpenMaintenanceBreakdown,
  isHistoricMonth = false,
  getPaymentStats,
  isLoadingPayments = false,
  disableSticky = false,
  payments = [],
  handleNavigation
}) => {
  const [expandedId, setExpandedId] = useState(null);

  // Helper: status vizual (culoare bara + procent)
  const getStatusVisual = (data) => {
    const totalDatorat = Number(data.totalDatorat) || 0;
    const totalPaid = Number(data.paymentInfo?.totalPaid) || 0;
    const totalInitial = totalDatorat + totalPaid;
    const paidPct = totalInitial > 0 ? Math.round((totalPaid / totalInitial) * 100) : 0;

    if (data.isPaid || totalDatorat < 0.01) {
      return { color: 'bg-green-500', text: '✓ Încasat', textColor: 'text-green-600', paidPct: 100 };
    }
    if (data.isPartiallyPaid || paidPct > 0) {
      return { color: 'bg-orange-500', text: `${paidPct}% încasat`, textColor: 'text-orange-600', paidPct };
    }
    return { color: 'bg-red-500', text: 'Neîncasat', textColor: 'text-red-600', paidPct: 0 };
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    const pad = (x) => String(x).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  };

  const getApartmentPayments = (apartmentId) =>
    (payments || []).filter(p => p.apartmentId === apartmentId)
      .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

  return (
    <table className="w-full text-xs sm:text-sm table-auto" style={{ minWidth: '100%' }}>
      <colgroup>
        <col style={{ width: '4px' }} />
        <col style={{ width: '52px' }} />
        <col className="w-[99%] xl:w-[180px]" />
        <col style={{ width: '70px' }} />
        <col style={{ width: '120px' }} />
        <col style={{ width: '110px' }} />
        <col style={{ width: '110px' }} />
        <col style={{ width: '130px' }} />
        {isMonthReadOnly && !isHistoricMonth && <col style={{ width: '120px' }} />}
      </colgroup>
      <thead className={`${disableSticky ? '' : 'sticky top-[52px] z-30'} ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
        <tr>
          <th className={`p-0 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></th>
          <th className={`px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Ap.</th>
          <th className={`px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap w-full sm:w-auto ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Proprietar</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Pers.</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Întreținere</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Restanță</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Penalități</th>
          <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Total Datorat</th>
          {isMonthReadOnly && !isHistoricMonth && (
            <th
              className={`pl-3 pr-2 sm:px-3 py-2 sm:py-3 text-center font-medium text-gray-700 whitespace-nowrap sticky right-0 z-30 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}
            >
              Încasează
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y">
        {maintenanceData.map(data => {
          const status = getStatusVisual(data);
          const isExpanded = expandedId === data.apartmentId;
          const aptPayments = getApartmentPayments(data.apartmentId);
          const colCount = 8 + (isMonthReadOnly && !isHistoricMonth ? 1 : 0);

          return (
            <React.Fragment key={data.apartmentId}>
              <tr
                onClick={() => setExpandedId(isExpanded ? null : data.apartmentId)}
                className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                title="Click pentru a vedea încasările apartamentului"
              >
                <td className={`p-0 ${status.color}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
                <td className={`px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap transition-colors ${isExpanded ? 'bg-blue-50' : 'bg-white group-hover:bg-blue-50'}`}>
                  <div className="flex items-center gap-1">
                    <span>{data.apartment}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                  </div>
                </td>
                <td className="px-1 sm:px-3 py-2 sm:py-3 text-blue-600 font-medium">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {onOpenMaintenanceBreakdown && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMaintenanceBreakdown(data);
                        }}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700 hover:shadow-sm transition-colors"
                        title="Detalii cheltuieli"
                      >
                        <ClipboardList className="w-[18px] h-[18px]" />
                      </button>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-xs sm:text-sm">{data.owner}</span>
                      {isMonthReadOnly && (
                        <span className={`text-[10px] mt-0.5 ${status.textColor}`}>
                          {status.text}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right whitespace-nowrap">{data.persons || 0}</td>
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap">{(data.currentMaintenance || 0).toFixed(2)}</td>
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap">{(data.restante || 0).toFixed(2)}</td>
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap">{(data.penalitati || 0).toFixed(2)}</td>
                <td className="pl-1 pr-3 sm:px-3 py-2 sm:py-3 text-right whitespace-nowrap align-top xl:align-middle">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-gray-800 text-sm sm:text-base">{(data.totalDatorat || 0).toFixed(2)}</span>
                    {/* Breakdown mic vizibil doar pe mobile (sub md) */}
                    <div className="xl:hidden text-[10px] leading-tight text-gray-500 mt-0.5 space-y-0">
                      {Number(data.currentMaintenance) > 0 && (
                        <div><span>Înt:</span> <span className="text-indigo-600 font-medium">{(data.currentMaintenance || 0).toFixed(2)}</span></div>
                      )}
                      {Number(data.restante) > 0 && (
                        <div><span>Rest:</span> <span className="text-red-600 font-medium">{(data.restante || 0).toFixed(2)}</span></div>
                      )}
                      {Number(data.penalitati) > 0 && (
                        <div><span>Pen:</span> <span className="text-orange-600 font-medium">{(data.penalitati || 0).toFixed(2)}</span></div>
                      )}
                    </div>
                  </div>
                </td>
                {isMonthReadOnly && !isHistoricMonth && (
                  <td
                    className={`pl-3 pr-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-center sticky right-0 z-10 transition-colors ${isExpanded ? 'bg-blue-50' : 'bg-white group-hover:bg-blue-50'}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (data.paymentInfo?.canReceivePayment && onOpenPaymentModal) {
                          onOpenPaymentModal({
                            apartmentId: data.apartmentId,
                            apartmentNumber: data.apartment,
                            owner: data.owner,
                            restante: data.restante,
                            intretinere: data.currentMaintenance,
                            penalitati: data.penalitati,
                            totalDatorat: data.totalDatorat
                          });
                        }
                      }}
                      disabled={!data.paymentInfo?.canReceivePayment}
                      className={`inline-flex items-center justify-center w-8 h-8 xl:w-auto xl:h-auto xl:px-4 xl:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-colors ${
                        isLoadingPayments
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed invisible'
                          : data.paymentInfo?.canReceivePayment
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      title={!data.paymentInfo?.canReceivePayment ? 'Apartamentul are soldul zero' : 'Înregistrează încasare'}
                    >
                      <span className="hidden xl:inline">Încasează</span>
                      <HandCoins className="w-[18px] h-[18px] xl:hidden" />
                    </button>
                  </td>
                )}
              </tr>
              {isExpanded && (
                <tr className="bg-blue-50">
                  <td className={`p-0 ${status.color}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
                  <td
                    colSpan={colCount - 1}
                    className="px-3 sm:px-4 py-3 sm:py-4"
                  >
                    <div className="bg-white rounded-lg border border-blue-200 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm sm:text-base font-semibold text-gray-800">
                            Încasări efectuate — Apartament {data.apartment}
                          </h4>
                          {status.paidPct > 0 && status.paidPct < 100 && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                              {status.paidPct}% încasat
                            </span>
                          )}
                        </div>
                        {handleNavigation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigation('accounting');
                            }}
                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Toate încasările →
                          </button>
                        )}
                      </div>
                      {aptPayments.length === 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 italic py-2">
                          Nicio încasare înregistrată pentru această lună.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-gray-500">
                                <th className="text-left py-1.5 pr-3 font-medium">Data</th>
                                <th className="text-left py-1.5 pr-3 font-medium">Chitanță</th>
                                <th className="text-right py-1.5 pr-3 font-medium">Întreținere</th>
                                <th className="text-right py-1.5 pr-3 font-medium">Restanțe</th>
                                <th className="text-right py-1.5 pr-3 font-medium">Penalități</th>
                                <th className="text-right py-1.5 font-medium text-gray-700">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {aptPayments.map((p, i) => {
                                const intret = Number(p.intretinere) || 0;
                                const rest = Number(p.restante) || 0;
                                const pen = Number(p.penalitati) || 0;
                                const total = intret + rest + pen;
                                return (
                                  <tr key={p.id || i}>
                                    <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">
                                      {formatDate(p.timestamp || p.createdAt)}
                                    </td>
                                    <td className="py-1.5 pr-3 text-gray-700">
                                      {p.receiptNumber ? `#${p.receiptNumber}` : '—'}
                                    </td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums text-indigo-600">{intret.toFixed(2)}</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums text-red-600">{rest.toFixed(2)}</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums text-orange-600">{pen.toFixed(2)}</td>
                                    <td className="py-1.5 text-right font-bold text-emerald-700 tabular-nums">{total.toFixed(2)} lei</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
      <tfoot className={`${disableSticky ? '' : 'sticky bottom-0 z-20'} ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
        <tr>
          <td className={`p-0 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}></td>
          <td className={`px-1 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>TOTAL:</td>
          <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
            {maintenanceData.reduce((sum, d) => sum + (d.persons || 0), 0)}
          </td>
          <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
            {maintenanceData.reduce((sum, d) => sum + (d.currentMaintenance || 0), 0).toFixed(2)}
          </td>
          <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
            {maintenanceData.reduce((sum, d) => sum + (d.restante || 0), 0).toFixed(2)}
          </td>
          <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
            {maintenanceData.reduce((sum, d) => sum + (d.penalitati || 0), 0).toFixed(2)}
          </td>
          <td className={`px-1 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 text-xs sm:text-base whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
            {maintenanceData.reduce((sum, d) => sum + (d.totalDatorat || 0), 0).toFixed(2)}
          </td>
          {isMonthReadOnly && !isHistoricMonth && (
            <td
              className={`pl-3 pr-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap sticky right-0 z-10 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}
            ></td>
          )}
        </tr>
      </tfoot>
    </table>
  );
};

export default MaintenanceTableSimple;
