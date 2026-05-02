import React, { useMemo, useState } from 'react';
import { matchesSearch } from '../../utils/searchHelpers';

export default function IndexesInputTable({
  apartments = [],
  blocks = [],
  stairs = [],
  expense = null, // dacă există cheltuiala distribuită; altfel folosim pendingIndexes
  expenseTypeName, // numele cheltuielii (cheia în pendingIndexes)
  indexConfiguration = {},
  pendingIndexes = {},
  disabled = false,
  searchTerm = '',
  updateExpenseIndexes,
  updatePendingIndexes,
}) {
  const [selectedStairTab, setSelectedStairTab] = useState('all');
  const [localValues, setLocalValues] = useState({});

  const indexTypes = indexConfiguration?.indexTypes || [];
  const apartmentMeters = indexConfiguration?.apartmentMeters || {};

  const stairTabs = useMemo(() => {
    if (!blocks || !stairs) return [];
    return stairs.map((stair) => {
      const block = blocks.find((b) => b.id === stair.blockId);
      return {
        id: stair.id,
        name: stair.name,
        blockName: block?.name || '',
        label: `${block?.name || ''} - ${stair.name}`,
      };
    });
  }, [blocks, stairs]);

  const filteredApartments = useMemo(() => {
    let list = selectedStairTab === 'all'
      ? apartments
      : apartments.filter((apt) => apt.stairId === selectedStairTab);
    list = list.filter((apt) => {
      const meters = apartmentMeters[apt.id] || {};
      return Object.values(meters).some((m) => m?.enabled);
    });
    if (searchTerm) {
      list = list.filter((apt) =>
        matchesSearch(apt.owner, searchTerm) ||
        matchesSearch(`Apt ${apt.number}`, searchTerm) ||
        matchesSearch(String(apt.number), searchTerm)
      );
    }
    return list;
  }, [selectedStairTab, apartments, apartmentMeters, searchTerm]);

  const getIndexesData = (apartmentId) => {
    if (expense) return expense.indexes?.[apartmentId] || {};
    return pendingIndexes?.[expenseTypeName]?.[apartmentId] || {};
  };

  const handleIndexChange = (apartmentId, indexType, field, rawValue) => {
    if (disabled) return;
    if (rawValue !== '' && !/^\d*[.,]?\d*$/.test(rawValue)) return;
    const normalized = rawValue.replace(',', '.');
    const localKey = `${apartmentId}-${indexType.id}-${field}`;
    setLocalValues((prev) => ({ ...prev, [localKey]: normalized }));

    const indexesData = getIndexesData(apartmentId);
    const existing = indexesData[indexType.id] || {};
    const updatedIndexes = {
      ...indexesData,
      [indexType.id]: {
        ...existing,
        [field === 'old' ? 'oldIndex' : 'newIndex']: normalized,
        meterName: indexType.name,
      },
    };

    if (expense && updateExpenseIndexes) {
      updateExpenseIndexes(expense.id, apartmentId, updatedIndexes);
    } else if (updatePendingIndexes) {
      updatePendingIndexes(expenseTypeName, apartmentId, updatedIndexes);
    }
  };

  if (indexTypes.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic py-3 px-2 bg-gray-50 rounded-md">
        Niciun tip de contor definit. Configurează contoarele din pagina „Contoare" pentru a putea introduce indecși.
      </div>
    );
  }

  if (filteredApartments.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic py-3 px-2 bg-gray-50 rounded-md">
        {searchTerm
          ? 'Niciun apartament nu corespunde căutării.'
          : 'Niciun apartament cu contoare bifate. Mergi pe pagina „Contoare" și bifează contoarele instalate pentru fiecare apartament.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stairTabs.length > 1 && (
        <div className="border-b overflow-x-auto">
          <div className="flex">
            <button
              onClick={() => setSelectedStairTab('all')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                selectedStairTab === 'all'
                  ? 'bg-blue-50 text-blue-700 border-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Toate
            </button>
            {stairTabs.map((stair) => (
              <button
                key={stair.id}
                onClick={() => setSelectedStairTab(stair.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  selectedStairTab === stair.id
                    ? 'bg-blue-50 text-blue-700 border-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {stair.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-50">
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-blue-50 z-10 min-w-[80px]">
                Apt
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[140px]">
                Proprietar
              </th>
              {indexTypes.map((it) => (
                <th
                  key={it.id}
                  colSpan={2}
                  className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-b border-r border-gray-200"
                >
                  <div>{it.name}</div>
                  <div className="text-xs font-normal text-gray-500">({it.unit})</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 min-w-[90px]">
                Consum
              </th>
            </tr>
            <tr className="bg-blue-50/60 text-xs">
              <th className="border-b border-r" />
              <th className="border-b border-r" />
              {indexTypes.map((it) => (
                <React.Fragment key={it.id}>
                  <th className="px-2 py-1 text-center text-gray-600 border-b">Index vechi</th>
                  <th className="px-2 py-1 text-center text-gray-600 border-b border-r">Index nou</th>
                </React.Fragment>
              ))}
              <th className="border-b" />
            </tr>
          </thead>
          <tbody>
            {filteredApartments.map((apartment, idx) => {
              const indexesData = getIndexesData(apartment.id);
              const meters = apartmentMeters[apartment.id] || {};

              const totalConsumption = indexTypes.reduce((sum, it) => {
                if (!meters[it.id]?.enabled) return sum;
                const localOld = localValues[`${apartment.id}-${it.id}-old`];
                const localNew = localValues[`${apartment.id}-${it.id}-new`];
                const oldVal = localOld !== undefined ? localOld : indexesData[it.id]?.oldIndex;
                const newVal = localNew !== undefined ? localNew : indexesData[it.id]?.newIndex;
                if (newVal && oldVal) {
                  const diff = parseFloat(newVal) - parseFloat(oldVal);
                  return sum + (isNaN(diff) ? 0 : diff);
                }
                return sum;
              }, 0);

              return (
                <tr key={apartment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 border-b border-r border-gray-200 sticky left-0 bg-inherit z-10">
                    <div className="text-sm font-medium text-gray-900">Apt {apartment.number}</div>
                  </td>
                  <td className="px-2 py-1.5 border-b border-r border-gray-200">
                    <div className="text-xs text-gray-600 truncate max-w-[150px]" title={apartment.owner}>
                      {apartment.owner || '-'}
                    </div>
                  </td>

                  {indexTypes.map((it) => {
                    const meterEnabled = meters[it.id]?.enabled;
                    if (!meterEnabled) {
                      return (
                        <React.Fragment key={it.id}>
                          <td className="px-2 py-1.5 border-b text-center text-xs text-gray-300">-</td>
                          <td className="px-2 py-1.5 border-b border-r text-center text-xs text-gray-300">-</td>
                        </React.Fragment>
                      );
                    }
                    const raw = indexesData[it.id] || {};
                    const isOnline = raw.source === 'owner_portal';
                    const localOld = localValues[`${apartment.id}-${it.id}-old`];
                    const localNew = localValues[`${apartment.id}-${it.id}-new`];
                    const oldVal = localOld !== undefined ? localOld : (raw.oldIndex ?? '');
                    const newVal = localNew !== undefined ? localNew : (raw.newIndex ?? '');

                    return (
                      <React.Fragment key={it.id}>
                        <td className="px-2 py-1.5 border-b text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="-"
                            value={oldVal}
                            disabled={disabled}
                            onChange={(e) => handleIndexChange(apartment.id, it, 'old', e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                        <td className="px-2 py-1.5 border-b border-r text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="-"
                              value={newVal}
                              disabled={disabled}
                              onChange={(e) => handleIndexChange(apartment.id, it, 'new', e.target.value)}
                              className={`w-16 px-2 py-1 border rounded text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 ${
                                isOnline ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300'
                              }`}
                            />
                            {isOnline && newVal && (
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-bold cursor-help"
                                title={`Transmis online de proprietar${raw.submittedAt ? ` la ${new Date(raw.submittedAt).toLocaleString('ro-RO')}` : ''}`}
                              >
                                O
                              </span>
                            )}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td className="px-3 py-2 text-center border-b bg-green-50">
                    <span className={`font-medium ${totalConsumption > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                      {totalConsumption > 0 ? totalConsumption.toFixed(2) : '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
