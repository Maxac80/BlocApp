/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React from 'react';
import { ClipboardList } from 'lucide-react';

const MaintenanceTableDetailed = ({
  maintenanceData,
  expenses,
  association,
  isMonthReadOnly,
  onOpenMaintenanceBreakdown,
  disableSticky = false
}) => {
  // Lățimile fixe ale coloanelor de bază
  const baseColWidths = { ap: 60, proprietar: 175, pers: 70, intretinere: 120, restanta: 110, total: 120, penalitati: 110, totalDatorat: 130 };
  const baseWidth = Object.values(baseColWidths).reduce((a, b) => a + b, 0);
  const extraWidth = expenses.length * 120;
  const minTableWidth = baseWidth + extraWidth;

  const headerBg = isMonthReadOnly ? 'bg-purple-100' : 'bg-gray-50';

  // Strategie sticky:
  // - thead/tfoot NU sunt sticky la nivel de element; sticky e pe fiecare <th>/<td>
  //   (Chrome are bug-uri cu sticky pe thead când copiii sunt și ei sticky)
  // - Cornere (Ap. în thead/tfoot): sticky top/bottom + left=0, z-30
  // - Proprietar header/footer: sticky top/bottom mereu; sticky left doar pe desktop (sm:)
  // - Restul header/footer cells: sticky top/bottom doar
  // - tbody Apartament: sticky left=0
  // - tbody Proprietar: sticky left:60px doar pe desktop
  const stickyOnly = !disableSticky;
  const thBase = stickyOnly ? `sticky top-0 z-10 ${headerBg}` : headerBg;
  const tfBase = stickyOnly ? `sticky bottom-0 z-10 ${headerBg}` : headerBg;
  const stickyApThead = stickyOnly
    ? `sticky top-0 left-0 z-30 ${headerBg} border-r-2 border-gray-300 sm:border-r-0`
    : `sticky left-0 z-30 ${headerBg} border-r-2 border-gray-300 sm:border-r-0`;
  const stickyProprietarThead = stickyOnly
    ? `sticky top-0 z-10 sm:left-[60px] sm:z-20 ${headerBg} sm:border-r-2 sm:border-gray-300`
    : `sm:sticky sm:left-[60px] sm:z-20 ${headerBg} sm:border-r-2 sm:border-gray-300`;
  const stickyApTfoot = stickyOnly
    ? `sticky bottom-0 left-0 z-30 ${headerBg} border-r-2 border-gray-300 sm:border-r-0`
    : `sticky left-0 z-30 ${headerBg} border-r-2 border-gray-300 sm:border-r-0`;
  const stickyProprietarTfoot = stickyOnly
    ? `sticky bottom-0 z-10 sm:left-[60px] sm:z-20 ${headerBg} sm:border-r-2 sm:border-gray-300`
    : `sm:sticky sm:left-[60px] sm:z-20 ${headerBg} sm:border-r-2 sm:border-gray-300`;
  const stickyApTd = `sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r-2 border-gray-300 sm:border-r-0`;
  const stickyProprietarTd = `sm:sticky sm:left-[60px] sm:z-[5] bg-white group-hover:bg-gray-50 sm:border-r-2 sm:border-gray-300`;

  return (
    <table className="border-collapse text-xs sm:text-sm" style={{ width: `max(100%, ${minTableWidth}px)`, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: `${baseColWidths.ap}px` }} />
          <col style={{ width: `${baseColWidths.proprietar}px` }} />
          <col style={{ width: `${baseColWidths.pers}px` }} />
          <col style={{ width: `${baseColWidths.intretinere}px` }} />
          <col style={{ width: `${baseColWidths.restanta}px` }} />
          <col style={{ width: `${baseColWidths.total}px` }} />
          <col style={{ width: `${baseColWidths.penalitati}px` }} />
          <col style={{ width: `${baseColWidths.totalDatorat}px` }} />
          {expenses.map(expense => {
            const expenseKey = expense.expenseTypeId || expense.id || expense.name;
            const hasDiff = maintenanceData.some(d => d.expenseDifferenceDetails?.[expenseKey]);
            return (
              <React.Fragment key={`col-${expense.id}`}>
                <col style={{ width: '120px' }} />
                {hasDiff && <col style={{ width: '120px' }} />}
              </React.Fragment>
            );
          })}
        </colgroup>
        <thead>
          <tr>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap ${stickyApThead}`}>
              Ap.
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap ${stickyProprietarThead}`}>
              Proprietar
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${thBase}`}>
              Pers.
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${thBase}`}>
              Întreținere
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${thBase}`}>
              Restanță
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${thBase}`}>
              Total
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${thBase}`}>
              Penalități
            </th>
            <th className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 whitespace-nowrap ${thBase}`}>
              Total Datorat
            </th>
            {expenses.map(expense => {
              const expenseKey = expense.expenseTypeId || expense.id || expense.name;
              const hasDifferences = maintenanceData.some(data =>
                data.expenseDifferenceDetails?.[expenseKey]
              );

              return (
                <React.Fragment key={expense.id}>
                  <th
                    className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 ${thBase}`}
                    title={expense.name}
                  >
                    {expense.name}
                  </th>
                  {hasDifferences && (
                    <th
                      className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-medium text-gray-700 ${thBase}`}
                      title={`${expense.name} - Diferență`}
                    >
                      {expense.name} - Dif.
                    </th>
                  )}
                </React.Fragment>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
        {maintenanceData.map(data => (
          <tr key={data.apartmentId} className="group hover:bg-gray-50">
            <td className={`px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap ${stickyApTd}`}>
              {data.apartment}
            </td>
            <td className={`px-2 sm:px-3 py-2 sm:py-3 text-blue-600 font-medium whitespace-nowrap ${stickyProprietarTd}`}>
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
                <span className="truncate">{data.owner}</span>
              </div>
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right whitespace-nowrap">
              {data.persons}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap">
              {data.currentMaintenance.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap">
              {data.restante.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-purple-600 whitespace-nowrap">
              {data.totalMaintenance.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap">
              {data.penalitati.toFixed(2)}
            </td>
            <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap">
              {data.totalDatorat.toFixed(2)}
            </td>
            {expenses.map(expense => {
              const expenseKey = expense.expenseTypeId || expense.id || expense.name;
              const hasDifferences = maintenanceData.some(d =>
                d.expenseDifferenceDetails?.[expenseKey]
              );

              const expenseDetail = data.expenseDetails?.[expenseKey];
              const expenseAmount = typeof expenseDetail === 'object' ? expenseDetail?.amount : expenseDetail;

              return (
                <React.Fragment key={expense.id}>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold bg-blue-50 whitespace-nowrap">
                    {expenseAmount !== undefined && expenseAmount !== null ?
                      Number(expenseAmount).toFixed(2) :
                      '0.00'
                    }
                  </td>
                  {hasDifferences && (
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-right font-bold bg-orange-50 whitespace-nowrap">
                      {data.expenseDifferenceDetails?.[expenseKey] !== undefined ?
                        Number(data.expenseDifferenceDetails[expenseKey]).toFixed(2) :
                        '0.00'
                      }
                    </td>
                  )}
                </React.Fragment>
              );
            })}
          </tr>
        ))}
      </tbody>
        <tfoot>
        <tr>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap ${stickyApTfoot}`}></td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 font-semibold whitespace-nowrap ${stickyProprietarTfoot}`}>
            TOTAL:
          </td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 whitespace-nowrap ${tfBase}`}>
            {maintenanceData.reduce((sum, d) => sum + d.persons, 0)}
          </td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-indigo-600 whitespace-nowrap ${tfBase}`}>
            {maintenanceData.reduce((sum, d) => sum + d.currentMaintenance, 0).toFixed(2)}
          </td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-red-600 whitespace-nowrap ${tfBase}`}>
            {maintenanceData.reduce((sum, d) => sum + d.restante, 0).toFixed(2)}
          </td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-purple-600 whitespace-nowrap ${tfBase}`}>
            {maintenanceData.reduce((sum, d) => sum + d.totalMaintenance, 0).toFixed(2)}
          </td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-orange-600 whitespace-nowrap ${tfBase}`}>
            {maintenanceData.reduce((sum, d) => sum + d.penalitati, 0).toFixed(2)}
          </td>
          <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold text-gray-800 text-sm sm:text-base whitespace-nowrap ${tfBase}`}>
            {maintenanceData.reduce((sum, d) => sum + d.totalDatorat, 0).toFixed(2)}
          </td>
          {expenses.map(expense => {
            const expenseKey = expense.expenseTypeId || expense.id || expense.name;
            const hasDifferences = maintenanceData.some(d =>
              d.expenseDifferenceDetails?.[expenseKey]
            );

            return (
              <React.Fragment key={expense.id}>
                <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold whitespace-nowrap ${tfBase}`}>
                  {maintenanceData.reduce((sum, d) => {
                    const detail = d.expenseDetails?.[expenseKey];
                    const amount = typeof detail === 'object' ? detail?.amount : detail;
                    return sum + (amount || 0);
                  }, 0).toFixed(2)}
                </td>
                {hasDifferences && (
                  <td className={`px-2 sm:px-3 py-2 sm:py-3 text-right font-bold whitespace-nowrap ${tfBase}`}>
                    {maintenanceData.reduce((sum, d) => sum + (d.expenseDifferenceDetails?.[expenseKey] || 0), 0).toFixed(2)}
                  </td>
                )}
              </React.Fragment>
            );
          })}
        </tr>
        </tfoot>
      </table>
  );
};

export default MaintenanceTableDetailed;
