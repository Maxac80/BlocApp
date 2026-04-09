/**
 * 📊 STATS CARD — componentă reutilizabilă pentru carduri de statistici
 *
 * Folosită pe toate paginile pentru consistență vizuală:
 * - Facturi, Cheltuieli, Furnizori, Distribuție cheltuieli
 *
 * Pattern: grid grid-cols-2 md:grid-cols-4 gap-3 mb-6
 */

const StatsCard = ({ label, value, sublabel, borderColor = 'border-blue-500', icon }) => (
  <div className={`bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 ${borderColor}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      {icon && <div className="text-2xl opacity-30">{icon}</div>}
    </div>
  </div>
);

export default StatsCard;
