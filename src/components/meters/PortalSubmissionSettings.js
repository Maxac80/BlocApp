import React from 'react';
import { Smartphone } from 'lucide-react';

const DEFAULT_PORTAL = {
  enabled: true,
  periodType: 'auto',
  isOpen: true,
  startDay: 1,
  endDay: 25,
};

export default function PortalSubmissionSettings({
  portalSubmission = DEFAULT_PORTAL,
  disabled = false,
  onChange,
}) {
  const cfg = { ...DEFAULT_PORTAL, ...portalSubmission };

  const update = (patch) => {
    if (disabled) return;
    onChange({ ...cfg, ...patch });
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
      <h4 className="text-xs sm:text-sm font-semibold text-emerald-900 mb-2 flex items-center gap-2">
        <Smartphone className="w-4 h-4" /> Transmitere din Portal Locatari
      </h4>

      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={cfg.enabled}
          disabled={disabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
        />
        <span className="text-xs sm:text-sm text-gray-700">
          Permite proprietarilor să transmită indecși online
        </span>
      </label>

      {cfg.enabled && (
        <div className="ml-5 space-y-2">
          <p className="text-xs font-medium text-gray-600 mb-1.5">Perioadă de transmitere:</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`portalPeriodType-${cfg.id || 'default'}`}
              value="auto"
              checked={cfg.periodType === 'auto'}
              disabled={disabled}
              onChange={() => update({ periodType: 'auto' })}
              className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs sm:text-sm text-gray-700">Automată</span>
              <span className="text-xs text-gray-500 ml-1">(1-25 ale lunii)</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`portalPeriodType-${cfg.id || 'default'}`}
              value="manual"
              checked={cfg.periodType === 'manual'}
              disabled={disabled}
              onChange={() => update({ periodType: 'manual' })}
              className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs sm:text-sm text-gray-700">Manuală</span>
              <span className="text-xs text-gray-500 ml-1">(deschid/închid când vreau)</span>
            </div>
          </label>

          {cfg.periodType === 'manual' && (
            <div className="ml-5 mt-1.5">
              <select
                value={cfg.isOpen ? 'open' : 'closed'}
                disabled={disabled}
                onChange={(e) => update({ isOpen: e.target.value === 'open' })}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="open">🟢 Deschisă</option>
                <option value="closed">🔴 Închisă</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`portalPeriodType-${cfg.id || 'default'}`}
              value="custom"
              checked={cfg.periodType === 'custom'}
              disabled={disabled}
              onChange={() => update({ periodType: 'custom' })}
              className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
            />
            <span className="text-xs sm:text-sm text-gray-700">Personalizată</span>
          </label>

          {cfg.periodType === 'custom' && (
            <div className="ml-5 mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-600">De la ziua</span>
              <input
                type="number"
                min="1"
                max="31"
                value={cfg.startDay || 1}
                disabled={disabled}
                onChange={(e) => update({ startDay: parseInt(e.target.value, 10) || 1 })}
                className="w-14 text-xs text-center border border-gray-300 rounded-md px-1.5 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-xs text-gray-600">până la ziua</span>
              <input
                type="number"
                min="1"
                max="31"
                value={cfg.endDay || 25}
                disabled={disabled}
                onChange={(e) => update({ endDay: parseInt(e.target.value, 10) || 25 })}
                className="w-14 text-xs text-center border border-gray-300 rounded-md px-1.5 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
