import React from 'react';
import {
  calculateApartmentAmount,
  calculateCotaParteAmount,
  getParticipationBadge
} from '../../../utils/expenseAmountCalculator';

/**
 * 📊 TABEL DISTRIBUȚIE READ-ONLY (pentru apartment / person / cotaParte)
 *
 * Afișează cum s-a distribuit suma unei cheltuieli pe fiecare apartament.
 * - Desktop (≥768px): tabel complet cu coloane specifice tipului
 * - Mobil (<768px): listă de carduri compacte (single-row)
 *
 * Nu e editabilă. Pentru tipul `individual` folosește IndividualAmountsTable.
 */

const BADGE_COLORS = {
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700'
};

// Iconițe scurte cu text (pentru mobile badge compact)
const getBadgeIcon = (type) => {
  switch (type) {
    case 'excluded': return '🚫';
    case 'percentage': return '%';
    case 'fixed': return '📌';
    default: return '✓';
  }
};

const ParticipationBadge = ({ participation, fixedAmountMode, compact = false, onClick }) => {
  const badge = getParticipationBadge(participation, fixedAmountMode);

  // Conținut badge — compact doar iconițe, extins cu text
  let content;
  if (compact) {
    switch (badge.type) {
      case 'integral':
        content = '✓';
        break;
      case 'excluded':
        content = '🚫';
        break;
      case 'percentage':
        content = '%';
        break;
      case 'fixed':
        content = '📌';
        break;
      default:
        content = '✓';
    }
  } else {
    content = badge.label;
  }

  const colorClass = BADGE_COLORS[badge.color] || BADGE_COLORS.green;
  const clickableClass = onClick ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current transition-all' : '';
  const sizeClass = compact
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px]';

  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center rounded font-medium whitespace-nowrap ${sizeClass} ${colorClass} ${clickableClass}`}
    >
      {content}
    </Component>
  );
};

const ExpenseDistributionTable = ({
  apartments,
  expense,
  config,
  relevantAmount,
  allApartments,
  blocks,
  stairs,
  onEditParticipation
}) => {
  const distributionType = expense?.distributionType || expense?.distributionMethod;
  const fixedAmountMode = config?.fixedAmountMode || 'apartment';

  if (!apartments || apartments.length === 0) return null;
  if (!['apartment', 'perApartament', 'person', 'perPerson', 'cotaParte'].includes(distributionType)) {
    return null;
  }

  const isCotaParte = distributionType === 'cotaParte';
  const isPerson = distributionType === 'person' || distributionType === 'perPerson';

  // Sortează după numărul apartamentului
  const sortedApartments = [...apartments].sort((a, b) => {
    const numA = parseInt(a.number, 10);
    const numB = parseInt(b.number, 10);
    if (isNaN(numA) || isNaN(numB)) return String(a.number).localeCompare(String(b.number));
    return numA - numB;
  });

  // Calculează sumele pentru fiecare apartament
  const rows = sortedApartments.map(apt => {
    let amount = 0;
    let cotaParte = 0;

    if (isCotaParte) {
      const res = calculateCotaParteAmount(expense, apt, relevantAmount, allApartments, { config, stairs, blocks });
      amount = res.amount;
      cotaParte = res.cotaParte;
    } else {
      amount = calculateApartmentAmount(expense, apt, relevantAmount, allApartments, { config, stairs });
    }

    const participation = config?.apartmentParticipation?.[apt.id];
    return { apt, amount, cotaParte, participation };
  });

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

  const clickable = !!onEditParticipation;

  return (
    <div className="mt-4">
      {/* ============ DESKTOP TABLE (≥768px) ============ */}
      <div className="hidden md:block overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 w-16">Apt</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 min-w-[120px]">Proprietar</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b-2 border-l bg-amber-50 min-w-[100px]">Participare</th>
              {isPerson && (
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-20">Persoane</th>
              )}
              {isCotaParte && (
                <>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-24">Suprafață (mp)</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b-2 border-l w-24">Cotă parte</th>
                </>
              )}
              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b-2 border-l bg-teal-50 min-w-[100px]">Sumă (RON)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ apt, amount, cotaParte, participation }) => {
              const isExcluded = participation?.type === 'excluded';
              return (
                <tr
                  key={apt.id}
                  className={`border-b ${isExcluded ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}`}
                  style={{ height: '40px' }}
                >
                  <td className="px-3 py-2 font-medium">{apt.number}</td>
                  <td className="px-3 py-2 text-gray-600 truncate max-w-[160px]" title={apt.owner}>
                    {apt.owner || '-'}
                  </td>
                  <td className="px-3 py-2 border-l bg-amber-50">
                    <ParticipationBadge
                      participation={participation}
                      fixedAmountMode={fixedAmountMode}
                      onClick={clickable ? onEditParticipation : undefined}
                    />
                  </td>
                  {isPerson && (
                    <td className="px-3 py-2 text-center border-l">{apt.persons || 0}</td>
                  )}
                  {isCotaParte && (
                    <>
                      <td className="px-3 py-2 text-center border-l">{parseFloat(apt.surface || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center border-l text-gray-600">{cotaParte.toFixed(2)}%</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right font-medium border-l bg-teal-50">
                    {amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
              <td
                colSpan={2 + 1 + (isPerson ? 1 : 0) + (isCotaParte ? 2 : 0)}
                className="px-3 py-2 text-right"
              >
                TOTAL:
              </td>
              <td className="px-3 py-2 text-right text-teal-700">{totalAmount.toFixed(2)} RON</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ============ MOBILE CARD LIST (<768px) ============ */}
      <div className="md:hidden border rounded-lg overflow-hidden divide-y divide-gray-200 bg-white">
        {rows.map(({ apt, amount, cotaParte, participation }) => {
          const isExcluded = participation?.type === 'excluded';

          // Linia secundară: persoane sau mp+cotă
          let secondaryLine = null;
          if (isPerson) {
            secondaryLine = `${apt.persons || 0} pers`;
          } else if (isCotaParte) {
            secondaryLine = `${parseFloat(apt.surface || 0).toFixed(0)} mp · ${cotaParte.toFixed(2)}%`;
          }

          return (
            <div
              key={apt.id}
              className={`flex items-center gap-2 px-3 py-2 ${isExcluded ? 'bg-gray-100 opacity-60' : ''}`}
            >
              {/* Nr apt */}
              <div className="flex-shrink-0 w-8 text-center font-bold text-gray-700 text-sm">
                {apt.number}
              </div>

              {/* Proprietar + linie secundară */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate" title={apt.owner}>
                  {apt.owner || '-'}
                </div>
                {secondaryLine && (
                  <div className="text-[11px] text-gray-500">{secondaryLine}</div>
                )}
              </div>

              {/* Badge Participare compact (mereu vizibil, click pentru editare) */}
              <ParticipationBadge
                participation={participation}
                fixedAmountMode={fixedAmountMode}
                compact
                onClick={clickable ? onEditParticipation : undefined}
              />

              {/* Sumă */}
              <div className={`flex-shrink-0 text-right font-bold text-sm ${isExcluded ? 'text-gray-400' : 'text-teal-700'}`}>
                {amount.toFixed(2)}
              </div>
            </div>
          );
        })}

        {/* Footer TOTAL mobil */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-t-2 border-gray-400 font-bold">
          <span className="text-sm text-gray-700">TOTAL:</span>
          <span className="text-sm text-teal-700">{totalAmount.toFixed(2)} RON</span>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDistributionTable;
