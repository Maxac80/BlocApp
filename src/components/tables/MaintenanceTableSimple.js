/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { ClipboardList, Coins, HandCoins, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { regenerateReceipt } from '../../utils/incasariHelpers';

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
  handleNavigation,
  apartments = [],
  association
}) => {
  const [expandedId, setExpandedId] = useState(null);

  // Helper: status vizual (culoare bara + procent)
  const getStatusVisual = (data) => {
    const totalDatorat = Number(data.totalDatorat) || 0;
    const totalPaid = Number(data.paymentInfo?.totalPaid) || 0;
    const totalInitial = totalDatorat + totalPaid;
    const paidPct = totalInitial > 0 ? Math.round((totalPaid / totalInitial) * 100) : 0;

    if (data.isPaid || totalDatorat < 0.01) {
      return { color: 'bg-green-500', text: '✓ Încasat integral', textColor: 'text-green-600', paidPct: 100 };
    }
    if (data.isPartiallyPaid || paidPct > 0) {
      return { color: 'bg-orange-500', text: `${paidPct}% încasat`, textColor: 'text-orange-600', paidPct };
    }
    return { color: 'bg-blue-500', text: 'Neîncasat', textColor: 'text-red-600', paidPct: 0 };
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
      <thead className={`hidden sm:table-header-group ${disableSticky ? '' : 'sticky top-0 z-30'} ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
        <tr>
          <th className={`p-0 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></th>
          <th className={`px-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Ap.</th>
          <th className={`px-1 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap w-full sm:w-auto ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Proprietar</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Pers.</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Întreținere</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Restanță</th>
          <th className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Penalități</th>
          <th className={`pl-1 pr-1 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>Total Datorat</th>
          {isMonthReadOnly && !isHistoricMonth && (
            <th
              className={`pl-1 pr-2 sm:px-3 py-2 sm:py-3 text-center font-medium text-gray-700 whitespace-nowrap sticky right-0 z-30 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}
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

          // Valori INIȚIALE = rămas + plătit (datoria reală la publicare)
          const paidR = Number(data.paymentInfo?.totalsByCategory?.totalRestante) || 0;
          const paidI = Number(data.paymentInfo?.totalsByCategory?.totalIntretinere) || 0;
          const paidP = Number(data.paymentInfo?.totalsByCategory?.totalPenalitati) || 0;
          const origRestante = (Number(data.restante) || 0) + paidR;
          const origIntretinere = (Number(data.currentMaintenance) || 0) + paidI;
          const origPenalitati = (Number(data.penalitati) || 0) + paidP;
          const origTotal = origRestante + origIntretinere + origPenalitati;
          const totalPaid = Number(data.paymentInfo?.totalPaid) || 0;
          const restCurent = Math.max(0, origTotal - totalPaid);

          // Tinte subtile pe rând în funcție de status încasare
          const isFullyPaid = status.paidPct >= 100;
          const isPartiallyPaid = status.paidPct > 0 && status.paidPct < 100;

          // Culoare expand: verde dacă plătit integral, portocaliu dacă parțial, albastru dacă neîncasat
          const expandBg = isFullyPaid ? 'bg-green-50' : isPartiallyPaid ? 'bg-orange-50' : 'bg-blue-50';
          const expandBorder = isFullyPaid ? 'border-green-200' : isPartiallyPaid ? 'border-orange-200' : 'border-blue-200';
          const progressCardBg = isFullyPaid
            ? 'bg-green-50 border-green-100'
            : isPartiallyPaid
            ? 'bg-orange-50 border-orange-100'
            : 'bg-blue-50 border-blue-100';

          const rowBg = isExpanded
            ? expandBg
            : isFullyPaid
            ? 'bg-green-50/60 hover:bg-green-50'
            : isPartiallyPaid
            ? 'bg-orange-50/40 hover:bg-orange-50'
            : 'hover:bg-blue-50';
          const stickyCellBg = isExpanded
            ? expandBg
            : isFullyPaid
            ? 'bg-green-50/60 group-hover:bg-green-50'
            : isPartiallyPaid
            ? 'bg-orange-50/40 group-hover:bg-orange-50'
            : 'bg-white group-hover:bg-blue-50';

          return (
            <React.Fragment key={data.apartmentId}>
              {/* MOBILE row: card-like layout cu Apt# + Total pe r1, owner+breakdown sub */}
              <tr
                onClick={() => setExpandedId(isExpanded ? null : data.apartmentId)}
                className={`sm:hidden cursor-pointer transition-colors group ${rowBg}`}
                title="Click pentru a vedea încasările apartamentului"
              >
                <td className={`p-0 ${status.color}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
                <td
                  colSpan={isMonthReadOnly && !isHistoricMonth ? 7 : 8}
                  className={`px-2 py-2 transition-colors ${stickyCellBg}`}
                  style={{ maxWidth: 0 }}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    {/* Rândul 1: Apartament + chevron stânga | Total dreapta */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 font-semibold text-sm">
                        <span>{data.apartment}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                      </span>
                      <span className="font-bold text-base text-gray-800">{origTotal.toFixed(2)}</span>
                    </div>
                    {/* Rândul 2: iconiță + owner + status + breakdown */}
                    <div className="flex items-start gap-2">
                      {onOpenMaintenanceBreakdown && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMaintenanceBreakdown(data);
                          }}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700 transition-colors"
                          title="Detalii cheltuieli"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                      )}
                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <span className="truncate text-sm text-blue-600 font-medium">{data.owner}</span>
                        {isMonthReadOnly && (
                          <span className={`text-[11px] ${status.textColor}`}>{status.text}</span>
                        )}
                        {/* Breakdown — fiecare item pe linia lui (avem lățime suficientă) */}
                        {(origIntretinere > 0 || origRestante > 0 || origPenalitati > 0) && (
                          <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                            {origIntretinere > 0 && (
                              <div>Înt: <span className="text-indigo-600 font-medium">{origIntretinere.toFixed(2)}</span></div>
                            )}
                            {origRestante > 0 && (
                              <div>Restanță: <span className="text-red-600 font-medium">{origRestante.toFixed(2)}</span></div>
                            )}
                            {origPenalitati > 0 && (
                              <div>Pen: <span className="text-orange-600 font-medium">{origPenalitati.toFixed(2)}</span></div>
                            )}
                          </div>
                        )}
                        {/* Info plată — pe O linie (avem spațiu) */}
                        {totalPaid > 0 && restCurent > 0.01 && (
                          <div className="text-[11px] text-gray-500 leading-tight">
                            încasat <span className="text-green-600 font-medium">{totalPaid.toFixed(2)}</span> • rămas <span className="text-orange-600 font-medium">{restCurent.toFixed(2)}</span>
                          </div>
                        )}
                        {totalPaid > 0 && restCurent <= 0.01 && (
                          <div className="text-[11px] text-gray-500 leading-tight">
                            încasat <span className="text-green-600 font-medium">{totalPaid.toFixed(2)} lei</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                {isMonthReadOnly && !isHistoricMonth && (
                  <td
                    className={`pl-1 pr-2 py-2 whitespace-nowrap text-center sticky right-0 z-10 transition-colors ${stickyCellBg}`}
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
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium shadow-sm transition-colors ${
                        isLoadingPayments
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed invisible'
                          : data.paymentInfo?.canReceivePayment
                            ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      title={!data.paymentInfo?.canReceivePayment ? 'Apartamentul are soldul zero' : 'Înregistrează încasare'}
                    >
                      <HandCoins className="w-[18px] h-[18px]" />
                    </button>
                  </td>
                )}
              </tr>
              {/* DESKTOP row: structura clasică pe coloane */}
              <tr
                onClick={() => setExpandedId(isExpanded ? null : data.apartmentId)}
                className={`hidden sm:table-row cursor-pointer transition-colors group ${rowBg}`}
                title="Click pentru a vedea încasările apartamentului"
              >
                <td className={`p-0 ${status.color}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
                <td className={`px-1 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap transition-colors ${stickyCellBg}`}>
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
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap">{origIntretinere.toFixed(2)}</td>
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap">{origRestante.toFixed(2)}</td>
                <td className="hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap">{origPenalitati.toFixed(2)}</td>
                <td className="pl-1 pr-1 sm:px-3 py-2 sm:py-3 text-right align-top xl:align-middle">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-gray-800 text-sm sm:text-base">{origTotal.toFixed(2)}</span>
                    {/* Subtitle pentru parțial: încasat X • rămas Y */}
                    {totalPaid > 0 && restCurent > 0.01 && (
                      <div className="text-[10px] leading-tight text-gray-500 mt-1 flex flex-col xl:flex-row xl:gap-1 items-end">
                        <span>încasat <span className="text-green-600 font-medium">{totalPaid.toFixed(2)}</span></span>
                        <span className="hidden xl:inline">•</span>
                        <span>rămas <span className="text-orange-600 font-medium">{restCurent.toFixed(2)}</span></span>
                      </div>
                    )}
                    {totalPaid > 0 && restCurent <= 0.01 && (
                      <span className="text-[10px] leading-tight text-gray-500 mt-1">
                        încasat <span className="text-green-600 font-medium">{totalPaid.toFixed(2)} lei</span>
                      </span>
                    )}
                  </div>
                </td>
                {isMonthReadOnly && !isHistoricMonth && (
                  <td
                    className={`pl-1 pr-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-center sticky right-0 z-10 transition-colors ${stickyCellBg}`}
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
                <tr className={expandBg}>
                  <td className={`p-0 ${status.color}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
                  <td
                    colSpan={colCount - 1}
                    className="px-3 sm:px-4 py-3 sm:py-4"
                    style={{ maxWidth: 0 }}
                  >
                    <div className={`bg-white rounded-lg border ${expandBorder} p-3 sm:p-4 w-full overflow-hidden`} style={{ minWidth: 0 }}>
                      {/* Progres încasare per categorie */}
                      {(() => {
                        const paid = data.paymentInfo?.totalsByCategory || {};
                        const paidRestante = Number(paid.totalRestante) || 0;
                        const paidIntretinere = Number(paid.totalIntretinere) || 0;
                        const paidPenalitati = Number(paid.totalPenalitati) || 0;
                        const remRestante = Number(data.restante) || 0;
                        const remIntretinere = Number(data.currentMaintenance) || 0;
                        const remPenalitati = Number(data.penalitati) || 0;
                        const origRestante = remRestante + paidRestante;
                        const origIntretinere = remIntretinere + paidIntretinere;
                        const origPenalitati = remPenalitati + paidPenalitati;
                        const totalPaid = paidRestante + paidIntretinere + paidPenalitati;
                        const totalOrig = origRestante + origIntretinere + origPenalitati;
                        const totalRest = totalOrig - totalPaid;

                        const rows = [
                          { label: 'Restanțe', paid: paidRestante, total: origRestante, bar: 'bg-red-500', text: 'text-red-600' },
                          { label: 'Întreținere', paid: paidIntretinere, total: origIntretinere, bar: 'bg-blue-500', text: 'text-blue-600' },
                          { label: 'Penalități', paid: paidPenalitati, total: origPenalitati, bar: 'bg-orange-500', text: 'text-orange-600' }
                        ].filter(r => r.total > 0.01);

                        if (rows.length === 0) return null;

                        return (
                          <div className={`mb-3 sm:mb-4 rounded-lg p-3 border ${progressCardBg} w-full overflow-hidden`} style={{ minWidth: 0 }}>
                            <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Progres încasare</h5>
                            <div className="space-y-2">
                              {rows.map((r) => {
                                const pct = r.total > 0 ? Math.min(100, Math.round((r.paid / r.total) * 100)) : 0;
                                return (
                                  <div key={r.label} className="min-w-0">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs mb-0.5">
                                      <span className="text-gray-600">{r.label}</span>
                                      <span className="tabular-nums whitespace-nowrap">
                                        <span className={`font-semibold ${r.text}`}>{r.paid.toFixed(2)}</span>
                                        <span className="text-gray-400"> / {r.total.toFixed(2)} lei</span>
                                        <span className="ml-2 text-gray-500">{pct}%</span>
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-200">
                                      <div className={`h-full ${r.bar} transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="border-t border-blue-200 mt-2 pt-2 flex flex-wrap items-center justify-between text-xs gap-2">
                              <span className="text-gray-600">
                                Total încasat: <span className="font-bold text-green-700 tabular-nums">{totalPaid.toFixed(2)} lei</span>
                              </span>
                              <span className={totalRest > 0.01 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                                {totalRest > 0.01 ? `Rest de încasat: ${totalRest.toFixed(2)} lei` : '✓ Încasat integral'}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
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
                      {aptPayments.length === 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 italic py-2">
                          Nicio încasare înregistrată pentru această lună.
                        </p>
                      ) : (
                        <>
                          {/* Mobile: carduri compacte */}
                          <div className="sm:hidden space-y-2">
                            {aptPayments.map((p, i) => {
                              const intret = Number(p.intretinere) || 0;
                              const rest = Number(p.restante) || 0;
                              const pen = Number(p.penalitati) || 0;
                              const total = intret + rest + pen;
                              return (
                                <div key={p.id || i} className="bg-gray-50 rounded-lg border border-gray-200 p-2.5">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <span className="whitespace-nowrap">{formatDate(p.timestamp || p.createdAt)}</span>
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                        {p.receiptNumber ? `#${p.receiptNumber}` : '—'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        regenerateReceipt(p, apartments, association);
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded flex-shrink-0"
                                      title="Regenerează chitanța PDF"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="flex items-baseline justify-between border-t border-gray-200 pt-1.5">
                                    <span className="text-xs text-gray-600">Total</span>
                                    <span className="text-sm font-bold text-emerald-700 tabular-nums">{total.toFixed(2)} lei</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                                    {intret > 0 && (
                                      <span className="text-indigo-600">
                                        Înt: <span className="font-medium tabular-nums">{intret.toFixed(2)}</span>
                                      </span>
                                    )}
                                    {rest > 0 && (
                                      <span className="text-red-600">
                                        Rest: <span className="font-medium tabular-nums">{rest.toFixed(2)}</span>
                                      </span>
                                    )}
                                    {pen > 0 && (
                                      <span className="text-orange-600">
                                        Pen: <span className="font-medium tabular-nums">{pen.toFixed(2)}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Desktop: tabel */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 text-gray-500">
                                  <th className="text-left py-1.5 pr-3 font-medium">Data</th>
                                  <th className="text-left py-1.5 pr-3 font-medium">Chitanță</th>
                                  <th className="text-right py-1.5 pr-3 font-medium">Întreținere</th>
                                  <th className="text-right py-1.5 pr-3 font-medium">Restanțe</th>
                                  <th className="text-right py-1.5 pr-3 font-medium">Penalități</th>
                                  <th className="text-right py-1.5 pr-3 font-medium text-gray-700">Total</th>
                                  <th className="py-1.5 pl-2 text-center font-medium w-10"></th>
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
                                      <td className="py-1.5 pr-3 text-right font-bold text-emerald-700 tabular-nums">{total.toFixed(2)} lei</td>
                                      <td className="py-1.5 pl-2 text-center">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            regenerateReceipt(p, apartments, association);
                                          }}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                          title="Regenerează chitanța PDF"
                                        >
                                          <FileText className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
      <tfoot className={`${disableSticky ? '' : 'sticky bottom-[64px] lg:bottom-0 z-20'} ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
        {(() => {
          // Sume INIȚIALE (rămas + plătit) pentru consistență cu coloanele
          const sumPersons = maintenanceData.reduce((s, d) => s + (Number(d.persons) || 0), 0);
          const sumIntretinere = maintenanceData.reduce((s, d) => {
            const paid = Number(d.paymentInfo?.totalsByCategory?.totalIntretinere) || 0;
            return s + ((Number(d.currentMaintenance) || 0) + paid);
          }, 0);
          const sumRestante = maintenanceData.reduce((s, d) => {
            const paid = Number(d.paymentInfo?.totalsByCategory?.totalRestante) || 0;
            return s + ((Number(d.restante) || 0) + paid);
          }, 0);
          const sumPenalitati = maintenanceData.reduce((s, d) => {
            const paid = Number(d.paymentInfo?.totalsByCategory?.totalPenalitati) || 0;
            return s + ((Number(d.penalitati) || 0) + paid);
          }, 0);
          const sumTotal = sumIntretinere + sumRestante + sumPenalitati;
          return (
            <>
              {/* MOBILE tfoot: TOTAL + sumTotal pe o singură linie */}
              <tr className="sm:hidden">
                <td className={`p-0 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
                <td
                  colSpan={isMonthReadOnly && !isHistoricMonth ? 7 : 8}
                  className={`px-2 py-2 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}
                  style={{ maxWidth: 0 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">TOTAL:</span>
                    <span className="font-bold text-base text-gray-800">{sumTotal.toFixed(2)}</span>
                  </div>
                </td>
                {isMonthReadOnly && !isHistoricMonth && (
                  <td
                    className={`pl-1 pr-2 py-2 sticky right-0 z-10 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}
                  ></td>
                )}
              </tr>
              {/* DESKTOP tfoot: structura clasică */}
            <tr className="hidden sm:table-row">
              <td className={`p-0 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`} aria-hidden="true" style={{ width: '4px', minWidth: '4px', maxWidth: '4px' }}></td>
              <td className={`px-1 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}></td>
              <td className={`px-1 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>TOTAL:</td>
              <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
                {sumPersons}
              </td>
              <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
                {sumIntretinere.toFixed(2)}
              </td>
              <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
                {sumRestante.toFixed(2)}
              </td>
              <td className={`hidden xl:table-cell px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
                {sumPenalitati.toFixed(2)}
              </td>
              <td className={`pl-1 pr-1 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 text-xs sm:text-base whitespace-nowrap ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}>
                {sumTotal.toFixed(2)}
              </td>
              {isMonthReadOnly && !isHistoricMonth && (
                <td
                  className={`pl-1 pr-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap sticky right-0 z-10 ${isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50'}`}
                ></td>
              )}
            </tr>
            </>
          );
        })()}
      </tfoot>
    </table>
  );
};

export default MaintenanceTableSimple;
