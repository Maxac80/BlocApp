/* eslint-disable no-unused-vars */
import React, { useMemo, useCallback, useState } from 'react';
import { Gauge, Cog, Activity, Building, Smartphone, AlertTriangle } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import StatsCard from '../common/StatsCard';
import ContentCard from '../common/ContentCard';
import SearchFilterBar from '../common/SearchFilterBar';
import ExpenseAccordion from '../meters/ExpenseAccordion';
import MeterTypesEditor from '../meters/MeterTypesEditor';
import ApartmentMetersTable from '../meters/ApartmentMetersTable';
import PortalSubmissionSettings from '../meters/PortalSubmissionSettings';

export default function MetersConfigView({
  association,
  blocks = [],
  stairs = [],
  currentMonth,
  currentSheet,
  getAssociationApartments,
  isMonthReadOnly,
  isReadOnlyRole,
  handleNavigation,
  updateExpenseConfig,
}) {
  const apartments = getAssociationApartments ? getAssociationApartments() : [];
  const readOnly = isMonthReadOnly || isReadOnlyRole;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExpense, setFilterExpense] = useState('all');
  const [filterPortal, setFilterPortal] = useState('all'); // all | enabled | disabled

  const meterExpenses = useMemo(() => {
    const configs = Object.values(currentSheet?.configSnapshot?.expenseConfigurations || {});
    return configs.filter((c) => {
      if (c.isEnabled === false) return false;
      if (c.distributionType !== 'consumption') return false;
      const ic = c.indexConfiguration;
      if (!ic?.enabled) return false;
      return ['indexes', 'mixed'].includes(ic.inputMode);
    });
  }, [currentSheet]);

  const stats = useMemo(() => {
    const totalTypes = meterExpenses.reduce(
      (sum, c) => sum + (c.indexConfiguration?.indexTypes?.length || 0),
      0
    );
    const apartmentsWithMeters = new Set();
    meterExpenses.forEach((c) => {
      Object.entries(c.indexConfiguration?.apartmentMeters || {}).forEach(([aptId, meters]) => {
        if (Object.values(meters || {}).some((m) => m?.enabled)) {
          apartmentsWithMeters.add(aptId);
        }
      });
    });
    const portalActive = meterExpenses.filter(
      (c) => c.indexConfiguration?.portalSubmission?.enabled
    ).length;
    return {
      totalExpenses: meterExpenses.length,
      totalTypes,
      apartmentsWithMeters: apartmentsWithMeters.size,
      portalActive,
    };
  }, [meterExpenses]);

  const handleConfigPatch = useCallback(
    async (expenseConfig, patch) => {
      if (!updateExpenseConfig) return;
      const expenseKey = expenseConfig.id;
      const updatedConfig = {
        ...expenseConfig,
        indexConfiguration: {
          ...(expenseConfig.indexConfiguration || {}),
          ...patch,
        },
      };
      await updateExpenseConfig(expenseKey, updatedConfig);
    },
    [updateExpenseConfig]
  );

  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        <PageHeader
          icon={Cog}
          iconColor="text-purple-600"
          title={`Contoare${currentMonth ? ` - ${currentMonth}` : ''}`}
          subtitle="Configurare contoare, serii și transmitere din portal"
          rightAction={
            <button
              onClick={() => handleNavigation && handleNavigation('indexes')}
              className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm font-medium"
            >
              <Gauge className="w-4 h-4" />
              <span className="hidden sm:inline">Vezi consumuri</span>
              <span className="sm:hidden">Consumuri</span>
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
              Pentru a configura contoarele, trebuie să adaugi blocurile, scările și apartamentele.
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
                label="Cheltuieli cu contoare"
                value={stats.totalExpenses}
                borderColor="border-purple-500"
              />
              <StatsCard
                label="Tipuri de contoare"
                value={stats.totalTypes}
                borderColor="border-blue-500"
              />
              <StatsCard
                label="Apt. cu contoare bifate"
                value={`${stats.apartmentsWithMeters} / ${apartments.length}`}
                borderColor="border-green-500"
              />
              <StatsCard
                label="Portal activ"
                value={`${stats.portalActive} / ${stats.totalExpenses}`}
                borderColor="border-emerald-500"
              />
            </div>

            <SearchFilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Caută după apartament, proprietar sau serie contor..."
              focusRingColor="focus:ring-purple-400"
              filters={
                <>
                  <select
                    value={filterExpense}
                    onChange={(e) => setFilterExpense(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm bg-white"
                  >
                    <option value="all">Toate cheltuielile</option>
                    {meterExpenses.map((cfg) => (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterPortal}
                    onChange={(e) => setFilterPortal(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm bg-white"
                  >
                    <option value="all">Toate (portal)</option>
                    <option value="enabled">Portal activ</option>
                    <option value="disabled">Portal inactiv</option>
                  </select>
                </>
              }
            />

            <ContentCard
              icon={Cog}
              iconColor="text-purple-600"
              title="Configurare contoare"
              subtitle={`${meterExpenses.length} ${meterExpenses.length === 1 ? 'cheltuială' : 'cheltuieli'} pe consum`}
              headerBg="bg-purple-50"
            >
              {readOnly && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-amber-800">
                    Această lună este publicată. Configurațiile sunt afișate doar pentru vizualizare.
                  </div>
                </div>
              )}

              {meterExpenses.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
                  <Gauge className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">
                    Nicio cheltuială pe consum cu indecși activată pentru această lună.
                  </p>
                  <button
                    onClick={() => handleNavigation && handleNavigation('maintenance')}
                    className="inline-flex items-center gap-1.5 text-purple-600 text-sm font-medium hover:underline"
                  >
                    Adaugă o cheltuială pe Distribuție Cheltuieli
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {meterExpenses
                    .filter((cfg) => {
                      if (filterExpense !== 'all' && cfg.id !== filterExpense) return false;
                      const portalEnabled = !!cfg.indexConfiguration?.portalSubmission?.enabled;
                      if (filterPortal === 'enabled' && !portalEnabled) return false;
                      if (filterPortal === 'disabled' && portalEnabled) return false;
                      return true;
                    })
                    .map((cfg) => {
                    const indexTypes = cfg.indexConfiguration?.indexTypes || [];
                    const apartmentMeters = cfg.indexConfiguration?.apartmentMeters || {};
                    const portal = cfg.indexConfiguration?.portalSubmission || {};

                    const enabledAptCount = apartments.filter((apt) => {
                      const m = apartmentMeters[apt.id] || {};
                      return Object.values(m).some((mt) => mt?.enabled);
                    }).length;

                    const badges = [
                      {
                        label: `${indexTypes.length} ${indexTypes.length === 1 ? 'tip' : 'tipuri'}`,
                        color: indexTypes.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: `${enabledAptCount} apt`,
                        color: enabledAptCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: portal.enabled ? 'Portal: ON' : 'Portal: OFF',
                        color: portal.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600',
                      },
                    ];

                    return (
                      <ExpenseAccordion
                        key={cfg.id}
                        title={cfg.name}
                        subtitle={`${indexTypes.length} ${indexTypes.length === 1 ? 'tip de contor' : 'tipuri de contoare'} · ${enabledAptCount} apt configurate`}
                        badges={badges}
                        defaultOpen={meterExpenses.length === 1}
                        iconColor="text-purple-600"
                        headerBg="bg-purple-50"
                      >
                        <MeterTypesEditor
                          indexTypes={indexTypes}
                          consumptionUnit={cfg.consumptionUnit || 'mc'}
                          disabled={readOnly}
                          onChange={(newTypes) => handleConfigPatch(cfg, { indexTypes: newTypes })}
                        />

                        <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3">
                          <h4 className="text-xs sm:text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1.5">
                            <Building className="w-4 h-4" /> Contoare per apartament
                          </h4>
                          <ApartmentMetersTable
                            apartments={apartments}
                            blocks={blocks}
                            stairs={stairs}
                            indexTypes={indexTypes}
                            apartmentMeters={apartmentMeters}
                            disabled={readOnly}
                            searchTerm={searchTerm}
                            onChange={(newMeters) =>
                              handleConfigPatch(cfg, { apartmentMeters: newMeters })
                            }
                          />
                        </div>

                        <PortalSubmissionSettings
                          portalSubmission={portal}
                          disabled={readOnly}
                          onChange={(newPortal) =>
                            handleConfigPatch(cfg, { portalSubmission: newPortal })
                          }
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
    </div>
  );
}
