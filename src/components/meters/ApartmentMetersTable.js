import React, { useMemo, useState } from 'react';
import { matchesSearch } from '../../utils/searchHelpers';

export default function ApartmentMetersTable({
  apartments = [],
  blocks = [],
  stairs = [],
  indexTypes = [],
  apartmentMeters = {},
  disabled = false,
  searchTerm = '',
  onChange,
}) {
  const [selectedStairTab, setSelectedStairTab] = useState('all');

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
    if (searchTerm) {
      list = list.filter((apt) => {
        const meters = apartmentMeters[apt.id] || {};
        const serials = Object.values(meters).map((m) => m?.serialNumber || '').filter(Boolean);
        return (
          matchesSearch(apt.owner, searchTerm) ||
          matchesSearch(`Apt ${apt.number}`, searchTerm) ||
          matchesSearch(String(apt.number), searchTerm) ||
          serials.some((s) => matchesSearch(s, searchTerm))
        );
      });
    }
    return list;
  }, [selectedStairTab, apartments, apartmentMeters, searchTerm]);

  const handleToggle = (apartmentId, meterId, enabled) => {
    if (disabled) return;
    const updated = {
      ...apartmentMeters,
      [apartmentId]: {
        ...apartmentMeters[apartmentId],
        [meterId]: {
          enabled,
          serialNumber: apartmentMeters[apartmentId]?.[meterId]?.serialNumber || '',
        },
      },
    };
    onChange(updated);
  };

  const handleSerial = (apartmentId, meterId, serialNumber) => {
    if (disabled) return;
    const updated = {
      ...apartmentMeters,
      [apartmentId]: {
        ...apartmentMeters[apartmentId],
        [meterId]: {
          ...apartmentMeters[apartmentId]?.[meterId],
          enabled: apartmentMeters[apartmentId]?.[meterId]?.enabled ?? false,
          serialNumber,
        },
      },
    };
    onChange(updated);
  };

  if (indexTypes.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic py-3 px-2 bg-gray-50 rounded-md">
        Definește mai întâi tipurile de contoare pentru a putea atribui contoare apartamentelor.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600">
        Bifează contoarele instalate pentru fiecare apartament și introdu seria. Doar apartamentele cu contoare bifate vor avea coloane pentru indecși.
      </div>

      {stairTabs.length > 1 && (
        <div className="border-b overflow-x-auto">
          <div className="flex">
            <button
              onClick={() => setSelectedStairTab('all')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                selectedStairTab === 'all'
                  ? 'bg-purple-50 text-purple-700 border-purple-700'
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
                    ? 'bg-purple-50 text-purple-700 border-purple-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {stair.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredApartments.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-50">
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-purple-50 z-10">
                  Apartament
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200">
                  Proprietar
                </th>
                {indexTypes.map((meter) => (
                  <th
                    key={meter.id}
                    className="px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[180px]"
                  >
                    <div>{meter.name}</div>
                    <div className="text-xs font-normal text-gray-500">({meter.unit})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredApartments.map((apartment, idx) => (
                <tr key={apartment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 border-b border-r border-gray-200 sticky left-0 bg-inherit z-10">
                    <div className="text-sm font-medium text-gray-900">Apt {apartment.number}</div>
                  </td>
                  <td className="px-2 py-1.5 border-b border-r border-gray-200">
                    <div className="text-xs text-gray-600">{apartment.owner || '-'}</div>
                  </td>
                  {indexTypes.map((meter) => {
                    const meterConfig = apartmentMeters[apartment.id]?.[meter.id] || {
                      enabled: false,
                      serialNumber: '',
                    };
                    return (
                      <td key={meter.id} className="px-2 py-1.5 border-b border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={meterConfig.enabled}
                              disabled={disabled}
                              onChange={(e) => handleToggle(apartment.id, meter.id, e.target.checked)}
                              className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span
                              className={`text-xs ${meterConfig.enabled ? 'text-green-600 font-medium' : 'text-gray-400'}`}
                            >
                              {meterConfig.enabled ? '✓' : ''}
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder="Serie contor"
                            value={meterConfig.serialNumber}
                            disabled={!meterConfig.enabled || disabled}
                            onChange={(e) => handleSerial(apartment.id, meter.id, e.target.value)}
                            className={`flex-1 text-sm border rounded px-2 py-1 min-w-[100px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                              !meterConfig.enabled || disabled
                                ? 'bg-gray-100 cursor-not-allowed text-gray-400 border-gray-200'
                                : 'bg-white border-gray-300'
                            }`}
                            maxLength={20}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-6 text-sm">
          Nu există apartamente configurate în asociație.
        </p>
      )}
    </div>
  );
}
