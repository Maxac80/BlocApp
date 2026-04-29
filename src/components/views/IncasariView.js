/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  FileText,
  Trash2,
  MoreVertical,
  Calendar,
  Receipt,
  Search,
  X,
  ClipboardList,
  Printer
} from 'lucide-react';
import { useIncasari } from '../../hooks/useIncasari';
import { regenerateReceipt } from '../../utils/incasariHelpers';
import { downloadIncasariPdf } from '../../utils/incasariPdfGenerator';
import { matchesSearch } from '../../utils/searchHelpers';
import StatsCard from '../common/StatsCard';

const formatDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const fmt = (n) => `${Number(n || 0).toFixed(2)} lei`;

const IncasariView = ({
  association,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  publishedSheet,
  sheets = [],
  currentSheet,
  getAssociationApartments,
  isReadOnlyRole,
  handleNavigation
}) => {
  const apartments = getAssociationApartments ? getAssociationApartments() : [];

  const activeSheet = useMemo(() => {
    return sheets.find(
      (s) =>
        s.monthYear === currentMonth &&
        (s.status === 'PUBLISHED' || s.status === 'published' || s.status === 'archived')
    ) || (publishedSheet?.monthYear === currentMonth ? publishedSheet : null);
  }, [sheets, currentMonth, publishedSheet]);

  const { incasari, loading, deleteIncasare } = useIncasari(association, currentMonth, activeSheet);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown-container]')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRegenerate = async (incasare) => {
    setOpenDropdown(null);
    const result = await regenerateReceipt(incasare, apartments, association, currentMonth);
    if (!result?.success) {
      console.error('Eroare regenerare chitanță:', result?.error);
    }
  };

  const handleDelete = async (incasare) => {
    if (!window.confirm(`Sigur ștergi încasarea #${incasare.receiptNumber} (${fmt(incasare.total)})?`)) {
      setOpenDropdown(null);
      return;
    }
    setOpenDropdown(null);
    await deleteIncasare(incasare.id);
  };

  const filteredIncasari = useMemo(() => {
    let list = [...incasari];

    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      list = list.filter((inc) => {
        const apt = apartments.find((a) => a.id === inc.apartmentId);
        const aptNum = String(apt?.number ?? inc.apartmentNumber ?? '');
        const owner = apt?.owner || inc.owner || '';
        return (
          aptNum.includes(term) ||
          matchesSearch(owner, term) ||
          String(inc.receiptNumber || '').includes(term)
        );
      });
    }

    if (dateFilter) {
      list = list.filter((inc) => {
        const d = new Date(inc.timestamp || inc.createdAt || 0);
        if (isNaN(d.getTime())) return false;
        const pad = (x) => String(x).padStart(2, '0');
        const incDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        return incDate === dateFilter;
      });
    }

    return list.sort(
      (a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
    );
  }, [incasari, searchTerm, dateFilter, apartments]);

  const sortedIncasari = filteredIncasari;
  const hasFilters = searchTerm.trim() || dateFilter;

  // Statistici (aceleași 4 carduri ca pe pagina Întreținere)
  const stats = useMemo(() => {
    const data = activeSheet?.maintenanceTable || [];
    const payments = activeSheet?.payments || [];

    const totalCurrent = data.reduce((s, d) => s + (Number(d.currentMaintenance) || 0), 0);
    const totalRestante = data.reduce((s, d) => s + (Number(d.restante) || 0), 0);
    const totalPenalitati = data.reduce((s, d) => s + (Number(d.penalitati) || 0), 0);
    const totalDatorat = totalCurrent + totalRestante + totalPenalitati;

    const totalIncasatIntretinere = payments.reduce((s, p) => s + (Number(p.intretinere) || 0), 0);
    const totalIncasatRestante = payments.reduce((s, p) => s + (Number(p.restante) || 0), 0);
    const totalIncasatPenalitati = payments.reduce((s, p) => s + (Number(p.penalitati) || 0), 0);
    const totalIncasat = totalIncasatIntretinere + totalIncasatRestante + totalIncasatPenalitati;

    const ramas = Math.max(0, totalDatorat - totalIncasat);
    const totalApts = data.length;

    const aptsCuRestante = data.filter((d) => {
      const aptPays = payments.filter((p) => p.apartmentId === d.apartmentId);
      const paidR = aptPays.reduce((s, p) => s + (Number(p.restante) || 0), 0);
      const paidP = aptPays.reduce((s, p) => s + (Number(p.penalitati) || 0), 0);
      const remR = (Number(d.restante) || 0) - paidR;
      const remP = (Number(d.penalitati) || 0) - paidP;
      return remR > 0.01 || remP > 0.01;
    }).length;

    const procentRestante = totalApts > 0 ? Math.round((aptsCuRestante / totalApts) * 100) : 0;

    return {
      totalDatorat,
      totalCurrent,
      totalRestante,
      totalPenalitati,
      totalIncasat,
      totalIncasatIntretinere,
      totalIncasatRestante,
      totalIncasatPenalitati,
      ramas,
      totalApts,
      aptsCuRestante,
      procentRestante
    };
  }, [activeSheet]);

  const fmtMoney = (n) => `${Number(n || 0).toFixed(2)} lei`;

  // Bară colorată stânga: dacă plata = total apartament rămas la momentul plății, verde; parțial, portocaliu; default, albastru
  const getBarColor = (incasare) => {
    const apt = activeSheet?.maintenanceTable?.find((m) => m.apartmentId === incasare.apartmentId);
    if (!apt) return 'bg-blue-500';
    const datorat = (apt.restante || 0) + (apt.currentMaintenance || 0) + (apt.penalitati || 0);
    if (datorat <= 0.01) return 'bg-blue-500';
    const ratio = (incasare.total || 0) / datorat;
    if (ratio >= 0.99) return 'bg-green-500';
    if (ratio >= 0.4) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  // Lookup proprietar
  const getOwnerName = (incasare) => {
    const apt = apartments.find((a) => a.id === incasare.apartmentId);
    return apt?.owner || incasare.owner || '-';
  };

  const getApartmentNumber = (incasare) => {
    const apt = apartments.find((a) => a.id === incasare.apartmentId);
    return apt?.number ?? incasare.apartmentNumber ?? '-';
  };

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        {/* Header (în spiritul restului paginilor) */}
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-start gap-2 min-w-0">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5 sm:mt-1" />
            <span>
              Încasări{currentMonth ? ` - ${currentMonth}` : ''}
              <span className="block sm:inline text-xs sm:text-base font-normal text-gray-500 sm:ml-2">
                <span className="hidden sm:inline">· </span>
                {loading
                  ? 'se încarcă...'
                  : hasFilters
                  ? `${sortedIncasari.length} din ${incasari.length} ${incasari.length === 1 ? 'încasare' : 'încasări'}`
                  : `${sortedIncasari.length} ${sortedIncasari.length === 1 ? 'încasare' : 'încasări'}`}
              </span>
            </span>
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={async () => {
                await downloadIncasariPdf({
                  incasari,
                  apartments,
                  association,
                  monthYear: currentMonth,
                });
              }}
              disabled={!incasari || incasari.length === 0}
              className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-emerald-700 hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap transition-all"
              title="Imprimă raport încasări"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimă raport</span>
            </button>
            <button
              onClick={() => handleNavigation && handleNavigation('dashboard')}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 hover:shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition-all"
              title="Vezi Întreținere"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Vezi Întreținere</span>
            </button>
          </div>
        </div>

      {/* Conținut */}
      <div>
        {/* Statistici (aceleași carduri ca pe pagina Întreținere) */}
        {activeSheet && stats.totalApts > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatsCard
              label="Total Datorat"
              value={fmtMoney(stats.totalDatorat)}
              borderColor="border-blue-500"
              breakdown={[
                { label: 'Întreținere', value: fmtMoney(stats.totalCurrent) },
                { label: 'Restanțe', value: fmtMoney(stats.totalRestante) },
                { label: 'Penalități', value: fmtMoney(stats.totalPenalitati) }
              ]}
            />
            <StatsCard
              label="Total Încasat"
              value={fmtMoney(stats.totalIncasat)}
              borderColor="border-green-500"
              breakdown={
                stats.totalIncasat > 0
                  ? [
                      { label: 'Întreținere', value: fmtMoney(stats.totalIncasatIntretinere) },
                      { label: 'Restanțe', value: fmtMoney(stats.totalIncasatRestante) },
                      { label: 'Penalități', value: fmtMoney(stats.totalIncasatPenalitati) }
                    ]
                  : null
              }
            />
            <StatsCard
              label="Rămas de Încasat"
              value={fmtMoney(stats.ramas)}
              borderColor={stats.ramas > 0 ? 'border-orange-500' : 'border-green-500'}
            />
            <StatsCard
              label="Apartamente cu Restanțe"
              value={`${stats.aptsCuRestante} / ${stats.totalApts}`}
              sublabel={`${stats.procentRestante}% din total`}
              borderColor={stats.aptsCuRestante > 0 ? 'border-red-500' : 'border-green-500'}
            />
          </div>
        )}

        {/* Filtre */}
        {(incasari.length > 0 || hasFilters) && (
          <div className="mb-4 flex flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Caută apt, proprietar sau chitanță..."
                className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Șterge căutarea"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Mobile: icon-only date filter */}
            <div className="relative sm:hidden flex-shrink-0">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Filtru dată"
              />
              <div className={`w-10 h-10 flex items-center justify-center border rounded-lg bg-white relative ${dateFilter ? 'border-green-400' : 'border-gray-300'}`}>
                <Calendar className={`w-4 h-4 ${dateFilter ? 'text-green-600' : 'text-gray-600'}`} />
                {dateFilter && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              {dateFilter && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDateFilter(''); }}
                  className="absolute -bottom-1 -right-1 bg-white border border-gray-300 rounded-full p-0.5 text-gray-500 hover:text-gray-700 z-10"
                  aria-label="Șterge filtru dată"
                  style={{ pointerEvents: 'auto' }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Desktop: full date input */}
            <div className="relative hidden sm:block flex-shrink-0">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-7 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-label="Filtru dată"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-white p-0.5 rounded"
                  aria-label="Șterge filtru dată"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
        {!activeSheet ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 text-center">
            <Receipt className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-blue-800 mb-1">
              Luna {currentMonth} nu este publicată
            </h3>
            <p className="text-sm text-blue-600">
              Publică luna pentru a putea înregistra și vedea încasările.
            </p>
          </div>
        ) : sortedIncasari.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-10 text-center">
            <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            {hasFilters ? (
              <>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Niciun rezultat pentru filtrele aplicate
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Încearcă alte criterii sau șterge filtrele.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Șterge toate filtrele
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Nu sunt încasări pentru {currentMonth}
                </h3>
                <p className="text-sm text-gray-500">
                  Încasările vor apărea aici după ce admin-ul înregistrează plățile din pagina Întreținere.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: lista de carduri */}
            <div className="sm:hidden space-y-3">
              {sortedIncasari.map((inc) => {
                const dropdownId = `inc-${inc.id}`;
                const barColor = getBarColor(inc);
                const owner = getOwnerName(inc);
                const aptNum = getApartmentNumber(inc);
                return (
                  <div
                    key={inc.id}
                    className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />
                    <div className="pl-3 pr-2 py-3">
                      {/* Row 1: apt + owner | data + acțiuni */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(inc.timestamp || inc.createdAt)}
                          </div>
                          <div className="font-semibold text-gray-900 mt-0.5 truncate">
                            Ap. {aptNum} — {owner}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleRegenerate(inc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Regenerează chitanța"
                            aria-label="Regenerează chitanța"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          {!isReadOnlyRole && (
                            <div className="relative" data-dropdown-container>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
                                }}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                aria-label="Mai multe acțiuni"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              {openDropdown === dropdownId && (
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                  <button
                                    onClick={() => handleDelete(inc)}
                                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Șterge încasarea
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total mare centrat */}
                      <div className="mt-2 text-center">
                        <div className="text-2xl font-bold text-green-600">{fmt(inc.total)}</div>
                      </div>

                      {/* Breakdown categorii > 0 */}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {inc.restante > 0 && (
                          <span className="text-red-600">
                            Restanțe: <span className="font-medium">{fmt(inc.restante)}</span>
                          </span>
                        )}
                        {inc.intretinere > 0 && (
                          <span className="text-blue-600">
                            Întreținere: <span className="font-medium">{fmt(inc.intretinere)}</span>
                          </span>
                        )}
                        {inc.penalitati > 0 && (
                          <span className="text-orange-600">
                            Penalități: <span className="font-medium">{fmt(inc.penalitati)}</span>
                          </span>
                        )}
                      </div>

                      {/* Footer: chitanță */}
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Chitanță <span className="font-medium text-gray-700">#{inc.receiptNumber || '-'}</span>
                        </span>
                        {inc.paymentMethod && inc.paymentMethod !== 'cash' && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {inc.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Ap.</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Proprietar</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Restanțe</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Întreținere</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Penalități</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Data</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Chitanță</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedIncasari.map((inc) => {
                      const dropdownId = `inc-d-${inc.id}`;
                      return (
                        <tr key={inc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{getApartmentNumber(inc)}</td>
                          <td className="px-4 py-3 text-gray-900">{getOwnerName(inc)}</td>
                          <td className="px-4 py-3 text-right text-red-600">
                            {inc.restante > 0 ? fmt(inc.restante) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600">
                            {inc.intretinere > 0 ? fmt(inc.intretinere) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600">
                            {inc.penalitati > 0 ? fmt(inc.penalitati) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(inc.total)}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{formatDate(inc.timestamp || inc.createdAt)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded bg-green-100 text-green-700">
                              #{inc.receiptNumber || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleRegenerate(inc)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Regenerează chitanța"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {!isReadOnlyRole && (
                                <div className="relative" data-dropdown-container>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
                                    }}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                                    aria-label="Mai multe acțiuni"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {openDropdown === dropdownId && (
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                      <button
                                        onClick={() => handleDelete(inc)}
                                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Șterge
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default IncasariView;
