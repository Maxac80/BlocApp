/**
 * 📊 STATS CARD — componentă reutilizabilă pentru carduri de statistici
 *
 * Folosită pe toate paginile pentru consistență vizuală:
 * - Facturi, Cheltuieli, Furnizori, Distribuție cheltuieli
 *
 * Pattern: grid grid-cols-2 md:grid-cols-4 gap-3 mb-6
 */

const StatsCard = ({ label, value, sublabel, breakdown, borderColor = 'border-blue-500', icon }) => (
  <div className={`bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 ${borderColor}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
        {breakdown && breakdown.length > 0 && (
          <div className="mt-1.5 space-y-0.5 border-t border-gray-200 pt-1.5">
            {breakdown.map((b, i) => (
              <div key={i} className="flex justify-between items-baseline text-[11px] leading-tight">
                <span className="text-gray-500">{b.label}</span>
                <span className="font-medium text-gray-700 tabular-nums">{b.value}</span>
              </div>
            ))}
          </div>
        )}
        {sublabel && !breakdown && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      {icon && <div className="text-2xl opacity-30">{icon}</div>}
    </div>
  </div>
);

export default StatsCard;
