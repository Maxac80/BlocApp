import React, { useState } from 'react';
import { Building, Check, UserCircle } from 'lucide-react';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import ProfileStep from './ProfileStep';
import AssociationStep from './AssociationStep';

/**
 * 📋 ONBOARDING CU 2 TAB-URI
 *
 * Features:
 * - Tab-uri consistente cu tema aplicației
 * - Validări în timp real
 * - Progress indicator pe fiecare tab
 * - Salvare automată progres
 * - Blocare finalizare până toate tab-urile sunt complete
 */
export default function OnboardingTabs({ onComplete }) {
  const {
    currentUser,
    userProfile,
    onboarding,
    profileManager
  } = useAuthEnhanced();

  const [activeTab, setActiveTab] = useState('profil');
  const [tabData, setTabData] = useState({
    profil: {},
    asociatie: {}
  });
  const [tabValidation, setTabValidation] = useState({
    profil: { isValid: false, progress: 0 },
    asociatie: { isValid: false, progress: 0 }
  });
  const [isLoading, setIsLoading] = useState(false);

  // 📋 Configurația tab-urilor
  const tabs = [
    {
      id: 'profil',
      title: 'Profil Personal',
      icon: UserCircle,
      description: 'Date personale și profesionale',
      required: true // Obligatoriu
    },
    {
      id: 'asociatie',
      title: 'Asociația',
      icon: Building,
      description: 'Creează prima asociație',
      required: true // Obligatoriu
    }
  ];

  // 🔄 Actualizează datele pentru un tab specific
  const handleTabDataUpdate = (tabId, data) => {
    setTabData(prev => ({
      ...prev,
      [tabId]: data
    }));

    // Actualizează starea de validare
    if (data.isValid !== undefined) {
      setTabValidation(prev => ({
        ...prev,
        [tabId]: {
          isValid: data.isValid,
          progress: data.progress || (data.isValid ? 100 : 0)
        }
      }));
    }
  };

  // ✅ Verifică dacă toate tab-urile obligatorii sunt complete
  const areRequiredTabsComplete = () => {
    // Ambele tab-uri sunt obligatorii - trebuie completate complet
    const profilValid = tabValidation['profil']?.isValid;
    const asociatieValid = tabValidation['asociatie']?.isValid;

    // Ambele tab-uri trebuie să fie complet valide
    return profilValid && asociatieValid;
  };

  // 🎯 Finalizează onboarding-ul
  const handleComplete = async () => {
    if (!areRequiredTabsComplete()) {
      alert('Te rog completează toate câmpurile obligatorii din ambele tab-uri (Profil Personal și Asociația) înainte de a finaliza configurarea.');
      return;
    }

    setIsLoading(true);
    try {
      // Salvează toate datele prin hook-ul de onboarding (metodă nouă pentru tab-uri)
      await onboarding.completeOnboardingWithTabs({
        profile: tabData.profil,
        association: tabData.asociatie
        // Documentele nu mai sunt parte din onboarding - se vor încărca în Profil
      }, currentUser);

      // Informează componenta părinte că onboarding-ul s-a terminat
      if (onComplete) {
        onComplete({ onboardingCompleted: true });
      }

      // Forțează reîncărcarea paginii pentru a reîncărca asociația
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('❌ Eroare la finalizarea onboarding-ului:', error);
      alert('A apărut o eroare la salvarea datelor. Te rog încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 Obține clasa CSS pentru tab bazată pe starea de validare
  const getTabClassName = (tab) => {
    const base = "inline-flex items-center justify-start px-8 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap w-64";

    // Tab activ - albastru
    if (activeTab === tab.id) {
      return `${base} border-blue-500 text-blue-600 bg-blue-50`;
    }

    // Tab inactiv - gri (indiferent de stare completare)
    return `${base} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`;
  };

  // 🎨 Obține iconul pentru starea tab-ului
  const getTabIcon = (tab) => {
    const validation = tabValidation[tab.id];

    // Verde când e completat
    if (validation?.isValid) {
      return <Check className="w-5 h-5 text-green-500" />;
    }

    // Gri neutru când nu e completat
    return <tab.icon className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="h-screen bg-gray-50 overflow-y-scroll">
      <div className="max-w-4xl mx-auto p-6">

        {/* Header - tema albastră ca în sidebar */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="bg-blue-600 px-8 py-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Building className="w-8 h-8 mr-3 text-white" />
                <div>
                  <div className="text-2xl font-bold">BlocApp</div>
                  <div className="text-base text-blue-200 font-normal">Configurare Cont</div>
                </div>
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                Completează informațiile pentru a începe să folosești BlocApp
              </p>
            </div>

            {/* Progress overall */}
            <div className="text-right">
              <div className="text-xs text-blue-200 uppercase tracking-wider">Progres</div>
              <div className="text-2xl font-bold text-white">
                {Math.round((Object.values(tabValidation).reduce((sum, val) => sum + (val.progress || 0), 0) / (tabs.length * 100)) * 100)}%
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabClassName(tab)}
              >
                <div className="flex items-center space-x-3">
                  {getTabIcon(tab)}
                  <div className="text-left">
                    <div className="font-medium text-base">{tab.title}</div>
                    <div className="text-xs opacity-75 mt-0.5">{tab.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="px-8 py-6">
          {activeTab === 'profil' && (
            <ProfileStep
              stepData={tabData.profil}
              onUpdateData={(data) => handleTabDataUpdate('profil', data)}
              currentUser={currentUser}
              userProfile={userProfile}
              profileManager={profileManager}
            />
          )}

          {activeTab === 'asociatie' && (
            <AssociationStep
              stepData={tabData.asociatie}
              onUpdateData={(data) => handleTabDataUpdate('asociatie', data)}
            />
          )}
          </div>
        </div>

        {/* Footer cu buton finalizare */}
        <div className="bg-white rounded-xl shadow-lg px-8 py-4">
          <div className="flex items-center justify-between">

            {/* Indicator tab-uri obligatorii */}
            <div className="flex items-center space-x-4 text-sm">
              {tabs.filter(tab => tab.required).map((tab) => {
                const validation = tabValidation[tab.id];
                return (
                  <div key={tab.id} className="flex items-center space-x-1">
                    {validation?.isValid ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <tab.icon className="w-4 h-4 text-orange-500" />
                    )}
                    <span className={validation?.isValid ? 'text-green-600' : 'text-orange-600'}>
                      {tab.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Buton finalizare */}
            <button
              onClick={handleComplete}
              disabled={!areRequiredTabsComplete() || isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                areRequiredTabsComplete() && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Se salvează...</span>
                </div>
              ) : (
                'Finalizează configurarea'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}