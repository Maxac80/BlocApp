/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from 'react';
import { Activity, Gauge, Cog, Building, Smartphone, AlertTriangle, Settings } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import StatsCard from '../common/StatsCard';
import ContentCard from '../common/ContentCard';
import SearchFilterBar from '../common/SearchFilterBar';
import { matchesSearch } from '../../utils/searchHelpers';
import { sortByExpenseName } from '../../utils/expenseSortHelpers';
import ExpenseAccordion from '../meters/ExpenseAccordion';
import IndexesInputTable from '../meters/IndexesInputTable';
import ExpenseConfigModal from '../modals/ExpenseConfigModal';

export default function MetersIndexesView({
  association,
  blocks = [],
  stairs = [],
  currentMonth,
  currentSheet,
  getAssociationApartments,
  isMonthReadOnly,
  isReadOnlyRole,
  handleNavigation,
  updateExpenseIndexes,
  updatePendingIndexes,
  getExpenseConfig,
  updateExpenseConfig,
  saveApartmentParticipations,
  getApartmentParticipation,
  setApartmentParticipation,
  onSyncSupplierServiceTypes,
}) {
  const apartments = getAssociationApartments ? getAssociationApartments() : [];
  const readOnly = isMonthReadOnly || isReadOnlyRole;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExpense, setFilterExpense] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all | complete | incomplete | portal
  const [configModalExpense, setConfigModalExpense] = useState(null);

  // Cheltuieli pe consum cu indecși configurați
  const meterExpenses = useMemo(() => {
    const configs = Object.values(currentSheet?.configSnapshot?.expenseConfigurations || {});
    const filtered = configs
      .filter((c) => {
        if (c.isEnabled === false) return false;
        if (c.distributionType !== 'consumption') return false;
        const ic = c.indexConfiguration;
        if (!ic?.enabled) return false;
        if (!['indexes', 'mixed'].includes(ic.inputMode)) return false;
        return (ic.indexTypes?.length || 0) > 0;
      })
      .map((cfg) => {
        const expense = (currentSheet?.expenses || []).find(
          (e) => e.expenseTypeId === cfg.id || e.name === cfg.name
        );
        return { config: cfg, expense };
      });
    return sortByExpenseName(filtered, ({ config }) => config.name);
  }, [currentSheet]);

  // Stats
  const stats = useMemo(() => {
    let totalMeters = 0; // suma contoarelor bifate per apartament
    let totalApartmentsWithMeters = new Set();
    let totalExpectedReadings = 0;
    let totalCompletedReadings = 0;
    let totalPortalSubmissions = 0;

    meterExpenses.forEach(({ config, expense }) => {
      const indexTypes = config.indexConfiguration?.indexTypes || [];
      const apartmentMeters = config.indexConfiguration?.apartmentMeters || {};
      const indexesData = expense?.indexes || currentSheet?.pendingIndexes?.[config.name] || {};

      apartments.forEach((apt) => {
        const meters = apartmentMeters[apt.id] || {};
        const enabledMeters = indexTypes.filter((it) => meters[it.id]?.enabled);
        if (enabledMeters.length > 0) {
          totalApartmentsWithMeters.add(apt.id);
          totalMeters += enabledMeters.length;
        }
        const aptIndexes = indexesData[apt.id] || {};
        enabledMeters.forEach((it) => {
          totalExpectedReadings += 1;
          const r = aptIndexes[it.id];
          if (r?.newIndex && r?.oldIndex) totalCompletedReadings += 1;
          if (r?.source === 'owner_portal') totalPortalSubmissions += 1;
        });
      });
    });

    const completionPct = totalExpectedReadings === 0
      ? 0
      : Math.round((totalCompletedReadings / totalExpectedReadings) * 100);
    const apartmentsWithMissing = Math.max(
      0,
      totalApartmentsWithMeters.size - new Set(
        meterExpenses.flatMap(({ config, expense }) => {
          const indexTypes = config.indexConfiguration?.indexTypes || [];
          const apartmentMeters = config.indexConfiguration?.apartmentMeters || {};
          const indexesData = expense?.indexes || currentSheet?.pendingIndexes?.[config.name] || {};
          return apartments
            .filter((apt) => {
              const meters = apartmentMeters[apt.id] || {};
              const enabled = indexTypes.filter((it) => meters[it.id]?.enabled);
              if (enabled.length === 0) return false;
              return enabled.every((it) => {
                const r = indexesData[apt.id]?.[it.id];
                return r?.newIndex && r?.oldIndex;
              });
            })
            .map((a) => a.id);
        })
      ).size
    );

    return {
      totalMeters,
      completionPct,
      totalCompletedReadings,
      totalExpectedReadings,
      totalPortalSubmissions,
      apartmentsWithMissing,
    };
  }, [meterExpenses, apartments, currentSheet]);

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        <PageHeader
          icon={Gauge}
          iconColor="text-blue-600"
          title={`Consumuri${currentMonth ? ` - ${currentMonth}` : ''}`}
          subtitle="Captare consumuri lunare (indecși sau introducere directă)"
          rightAction={
            <button
              onClick={() => handleNavigation && handleNavigation('meters')}
              className="flex items-center justify-center gap-1.5 bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap text-sm font-medium"
            >
              <Cog className="w-4 h-4" />
              Vezi contoare
            </button>
          }
        />

        {apartments.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 text-center mb-6">
            <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-2">
              Configurează mai întâi structura asociației
            </h3>
            <p className="text-sm text-blue-600 mb-4">
              Pentru a introduce indecși, trebuie să adaugi blocurile, scările și apartamentele.
            </p>
            <button
              onClick={() => handleNavigation && handleNavigation('setup')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Configurează Apartamentele
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatsCard
                label="Contoare active"
                value={stats.totalMeters}
                borderColor="border-blue-500"
              />
              <StatsCard
                label="Indecși completați"
                value={`${stats.totalCompletedReadings} / ${stats.totalExpectedReadings} (${stats.completionPct}%)`}
                borderColor={
                  stats.completionPct === 100
                    ? 'border-green-500'
                    : stats.completionPct >= 50
                    ? 'border-yellow-500'
                    : 'border-red-500'
                }
              />
              <StatsCard
                label="Transmise din portal"
                value={stats.totalPortalSubmissions}
                borderColor="border-emerald-500"
              />
              <StatsCard
                label="Apt. cu indecși lipsă"
                value={stats.apartmentsWithMissing}
                borderColor={stats.apartmentsWithMissing === 0 ? 'border-green-500' : 'border-orange-500'}
              />
            </div>

            <SearchFilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Caută după apartament sau proprietar..."
              focusRingColor="focus:ring-blue-400"
              filters={
                <>
                  <select
                    value={filterExpense}
                    onChange={(e) => setFilterExpense(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                  >
                    <option value="all">Toate cheltuielile</option>
                    {meterExpenses.map(({ config }) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                  >
                    <option value="all">Toate statusurile</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="portal">Cu transmisii portal</option>
                  </select>
                </>
              }
            />

            <ContentCard
              icon={Gauge}
              iconColor="text-blue-600"
              title="Consumuri lunare"
              subtitle={`${meterExpenses.length} ${meterExpenses.length === 1 ? 'cheltuială' : 'cheltuieli'} pe consum`}
              headerBg="bg-blue-50"
            >
              {readOnly && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-amber-800">
                    Această lună este publicată. Indecșii sunt afișați doar pentru vizualizare. Pentru modificări, depublică luna din Distribuție Cheltuieli.
                  </div>
                </div>
              )}

              {meterExpenses.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
                  <Gauge className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">
                    Nicio cheltuială pe consum cu indecși configurată pentru această lună.
                  </p>
                  <button
                    onClick={() => handleNavigation && handleNavigation('meters')}
                    className="inline-flex items-center gap-1.5 text-purple-600 text-sm font-medium hover:underline"
                  >
                    <Cog className="w-4 h-4" />
                    Vezi contoare
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {meterExpenses
                    .filter(({ config, expense }) => {
                      if (filterExpense !== 'all' && config.id !== filterExpense) return false;
                      if (filterStatus === 'all') return true;
                      const indexTypes = config.indexConfiguration?.indexTypes || [];
                      const apartmentMeters = config.indexConfiguration?.apartmentMeters || {};
                      const indexesData = expense?.indexes || currentSheet?.pendingIndexes?.[config.name] || {};
                      const enabledAptIds = apartments
                        .filter((apt) => {
                          const m = apartmentMeters[apt.id] || {};
                          return Object.values(m).some((mt) => mt?.enabled);
                        })
                        .map((a) => a.id);
                      let allDone = enabledAptIds.length > 0;
                      let anyMissing = false;
                      let portalCount = 0;
                      enabledAptIds.forEach((aptId) => {
                        const enabled = indexTypes.filter((it) => apartmentMeters[aptId]?.[it.id]?.enabled);
                        enabled.forEach((it) => {
                          const r = indexesData[aptId]?.[it.id];
                          if (!r?.newIndex || !r?.oldIndex) {
                            anyMissing = true;
                            allDone = false;
                          }
                          if (r?.source === 'owner_portal') portalCount += 1;
                        });
                      });
                      if (filterStatus === 'complete') return allDone && enabledAptIds.length > 0;
                      if (filterStatus === 'incomplete') return anyMissing;
                      if (filterStatus === 'portal') return portalCount > 0;
                      return true;
                    })
                    .map(({ config, expense }) => {
                    const indexTypes = config.indexConfiguration?.indexTypes || [];
                    const apartmentMeters = config.indexConfiguration?.apartmentMeters || {};
                    const indexesData = expense?.indexes || currentSheet?.pendingIndexes?.[config.name] || {};

                    const enabledAptIds = apartments
                      .filter((apt) => {
                        const m = apartmentMeters[apt.id] || {};
                        return Object.values(m).some((mt) => mt?.enabled);
                      })
                      .map((a) => a.id);

                    let completedAptCount = 0;
                    let totalConsumption = 0;
                    enabledAptIds.forEach((aptId) => {
                      const enabled = indexTypes.filter((it) => apartmentMeters[aptId]?.[it.id]?.enabled);
                      const allDone = enabled.every((it) => {
                        const r = indexesData[aptId]?.[it.id];
                        return r?.newIndex && r?.oldIndex;
                      });
                      if (allDone && enabled.length > 0) completedAptCount += 1;
                      enabled.forEach((it) => {
                        const r = indexesData[aptId]?.[it.id];
                        if (r?.newIndex && r?.oldIndex) {
                          const diff = parseFloat(r.newIndex) - parseFloat(r.oldIndex);
                          if (!isNaN(diff)) totalConsumption += diff;
                        }
                      });
                    });

                    const portalCount = enabledAptIds.reduce((sum, aptId) => {
                      const enabled = indexTypes.filter((it) => apartmentMeters[aptId]?.[it.id]?.enabled);
                      return sum + enabled.filter((it) => indexesData[aptId]?.[it.id]?.source === 'owner_portal').length;
                    }, 0);

                    const badges = [
                      {
                        label: `${completedAptCount}/${enabledAptIds.length} apt`,
                        color: completedAptCount === enabledAptIds.length && enabledAptIds.length > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700',
                      },
                      {
                        label: `${totalConsumption.toFixed(2)} ${indexTypes[0]?.unit || ''}`,
                        color: 'bg-blue-100 text-blue-700',
                      },
                    ];
                    if (portalCount > 0) {
                      badges.push({
                        label: `${portalCount} portal`,
                        color: 'bg-emerald-100 text-emerald-700',
                      });
                    }

                    return (
                      <ExpenseAccordion
                        key={config.id}
                        title={config.name}
                        subtitle={`${indexTypes.length} ${indexTypes.length === 1 ? 'tip de contor' : 'tipuri de contoare'}`}
                        badges={badges}
                        defaultOpen={meterExpenses.length === 1}
                        iconColor="text-blue-600"
                        headerBg="bg-blue-50"
                        menuItems={updateExpenseConfig ? [
                          {
                            label: 'Configurează cheltuiala',
                            icon: Settings,
                            onClick: () => setConfigModalExpense(config),
                          },
                        ] : []}
                      >
                        <IndexesInputTable
                          apartments={apartments}
                          blocks={blocks}
                          stairs={stairs}
                          expense={expense}
                          expenseTypeName={config.name}
                          indexConfiguration={config.indexConfiguration}
                          pendingIndexes={currentSheet?.pendingIndexes || {}}
                          disabled={readOnly}
                          searchTerm={searchTerm}
                          updateExpenseIndexes={updateExpenseIndexes}
                          updatePendingIndexes={updatePendingIndexes}
                        />
                      </ExpenseAccordion>
                    );
                  })}
                </div>
              )}
            </ContentCard>
          </>
        )}
      </div>

      {updateExpenseConfig && (
        <ExpenseConfigModal
          isOpen={!!configModalExpense}
          onClose={() => setConfigModalExpense(null)}
          expenseName={configModalExpense?.name || null}
          expenseConfig={configModalExpense || null}
          updateExpenseConfig={updateExpenseConfig}
          saveApartmentParticipations={saveApartmentParticipations}
          getAssociationApartments={getAssociationApartments}
          getApartmentParticipation={getApartmentParticipation}
          setApartmentParticipation={setApartmentParticipation}
          currentSheet={currentSheet}
          blocks={blocks}
          stairs={stairs}
          initialTab="indexes"
          onSyncSupplierServiceTypes={onSyncSupplierServiceTypes}
        />
      )}
    </div>
  );
}
