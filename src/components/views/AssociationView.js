import React, { useState, useEffect, Fragment } from 'react';
import { Building2, User, Globe, CreditCard, Edit, Save, X, MapPin, Phone, Mail, Clock, Users } from 'lucide-react';
import { judeteRomania } from '../../data/counties';
import DashboardHeader from '../dashboard/DashboardHeader';

const AssociationView = ({
  association,
  updateAssociation,
  blocks,
  stairs,
  getAssociationApartments,
  handleNavigation,
  userProfile,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  getMonthType
}) => {
  const [availableCities, setAvailableCities] = useState([]);
  const [activeTab, setActiveTab] = useState('identification'); // 'identification', 'schedule', 'financial', 'responsible'
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // State consolidat pentru toate datele
  const [formData, setFormData] = useState({
    // Date de identificare
    name: '',
    cui: '',
    registrationNumber: '',

    // Sediul social
    sediu_judet: '',
    sediu_oras: '',
    sediu_strada: '',
    sediu_numar: '',
    sediu_bloc: '',

    // Date de contact
    email: '',
    phone: '',
    website: '',

    // Program
    collectionSchedule: '',

    // Date financiare
    bank: '',
    bankAccount: '',
    workingFundAccount: '',

    // Persoane responsabile
    president: '',
    censor: ''
  });

  // 📋 Configurația tab-urilor
  const tabs = [
    {
      id: 'identification',
      title: 'Date Identificare',
      icon: Building2
    },
    {
      id: 'schedule',
      title: 'Program',
      icon: Clock
    },
    {
      id: 'financial',
      title: 'Date Financiare',
      icon: CreditCard
    },
    {
      id: 'responsible',
      title: 'Persoane Responsabile',
      icon: Users
    }
  ];

  // Inițializare toate datele când se încarcă asociația
  useEffect(() => {
    if (association) {
      setFormData({
        // Date de identificare
        name: association.name || '',
        cui: association.cui || '',
        registrationNumber: association.registrationNumber || '',

        // Sediul social
        sediu_judet: association.sediu_judet || association.address?.county || '',
        sediu_oras: association.sediu_oras || association.address?.city || '',
        sediu_strada: association.sediu_strada || association.address?.street || '',
        sediu_numar: association.sediu_numar || association.address?.number || '',
        sediu_bloc: association.sediu_bloc || association.address?.block || '',

        // Date de contact
        email: association.email || association.contact?.email || '',
        phone: association.phone || association.contact?.phone || '',
        website: association.contact?.website || '',

        // Program
        collectionSchedule: association.collectionSchedule || '',

        // Date financiare
        bank: association.bank || association.bankAccountData?.bank || '',
        bankAccount: association.bankAccount || association.bankAccountData?.iban || '',
        workingFundAccount: association.workingFundAccount || '',

        // Persoane responsabile
        president: association.president || '',
        censor: association.censor || ''
      });
    }
  }, [association]);

  // Actualizare orașe bazate pe județ
  useEffect(() => {
    if (formData.sediu_judet) {
      const judet = judeteRomania.find(j => j.nume === formData.sediu_judet);
      if (judet) {
        setAvailableCities(judet.orase || []);
      }
    } else {
      setAvailableCities([]);
    }
  }, [formData.sediu_judet]);

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Reset orașul când se schimbă județul
      if (field === 'sediu_judet') {
        newData.sediu_oras = '';
      }

      return newData;
    });
  };

  // Salvare modificări
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      await updateAssociation({
        // Date de identificare
        name: formData.name,
        cui: formData.cui,
        registrationNumber: formData.registrationNumber,

        // Sediul social
        sediu_judet: formData.sediu_judet,
        sediu_oras: formData.sediu_oras,
        sediu_strada: formData.sediu_strada,
        sediu_numar: formData.sediu_numar,
        sediu_bloc: formData.sediu_bloc,
        address: {
          county: formData.sediu_judet,
          city: formData.sediu_oras,
          street: formData.sediu_strada,
          number: formData.sediu_numar,
          block: formData.sediu_bloc
        },

        // Date de contact
        email: formData.email,
        phone: formData.phone,
        contact: {
          email: formData.email,
          phone: formData.phone,
          website: formData.website
        },

        // Program
        collectionSchedule: formData.collectionSchedule,

        // Date financiare
        bank: formData.bank,
        bankAccount: formData.bankAccount,
        workingFundAccount: formData.workingFundAccount,
        bankAccountData: {
          bank: formData.bank,
          iban: formData.bankAccount,
          accountName: association.bankAccountData?.accountName || association.name
        },

        // Persoane responsabile
        president: formData.president,
        censor: formData.censor
      });

      setIsEditing(false);
      setSaveMessage('Datele au fost actualizate cu succes!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error saving association data:', error);
      setSaveMessage('Eroare la salvarea datelor');
    } finally {
      setIsSaving(false);
    }
  };

  // Anulare editare
  const handleCancel = () => {
    if (association) {
      setFormData({
        // Date de identificare
        name: association.name || '',
        cui: association.cui || '',
        registrationNumber: association.registrationNumber || '',

        // Sediul social
        sediu_judet: association.sediu_judet || association.address?.county || '',
        sediu_oras: association.sediu_oras || association.address?.city || '',
        sediu_strada: association.sediu_strada || association.address?.street || '',
        sediu_numar: association.sediu_numar || association.address?.number || '',
        sediu_bloc: association.sediu_bloc || association.address?.block || '',

        // Date de contact
        email: association.email || association.contact?.email || '',
        phone: association.phone || association.contact?.phone || '',
        website: association.contact?.website || '',

        // Program
        collectionSchedule: association.collectionSchedule || '',

        // Date financiare
        bank: association.bank || association.bankAccountData?.bank || '',
        bankAccount: association.bankAccount || association.bankAccountData?.iban || '',
        workingFundAccount: association.workingFundAccount || '',

        // Persoane responsabile
        president: association.president || '',
        censor: association.censor || ''
      });
    }
    setIsEditing(false);
    setSaveMessage('');
  };

  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  return (
    <div className={`min-h-screen px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-4 pb-20 lg:pb-2 ${
      monthType === 'current'
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
        : monthType === 'next'
        ? "bg-gradient-to-br from-green-50 to-emerald-100"
        : monthType === 'historic'
        ? "bg-gradient-to-br from-gray-50 to-gray-100"
        : "bg-gradient-to-br from-indigo-50 to-blue-100"
    }`}>
      <div className="w-full">
        <DashboardHeader
          association={association}
          blocks={blocks}
          stairs={stairs}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getAvailableMonths={getAvailableMonths}
          expenses={expenses}
          isMonthReadOnly={isMonthReadOnly}
          getAssociationApartments={getAssociationApartments}
          handleNavigation={handleNavigation}
          getMonthType={getMonthType}
        />

        {/* Page Title */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">🏛️ Date Asociație</h1>
        </div>

        {/* Dacă utilizatorul a trecut prin onboarding dar nu are asociație */}
        {!association && userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-4 rounded-lg mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-yellow-800 mb-1.5">
              🔄 Se încarcă datele asociației...
            </h3>
            <p className="text-xs sm:text-sm text-yellow-700 mb-2">
              Asociația ta a fost creată în timpul configurării inițiale. Dacă nu se încarcă în câteva secunde, încearcă să reîmprospătezi pagina.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-3 py-1.5 text-xs sm:text-sm rounded-md hover:bg-yellow-700 font-medium"
            >
              🔄 Reîmprospătează
            </button>
          </div>
        )}

        {/* Mesaj salvare */}
        {saveMessage && (
          <div className={`mb-4 p-2.5 rounded-md flex items-center text-xs sm:text-sm ${
            saveMessage.includes('succes')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {saveMessage.includes('succes') ? (
              <Save className="w-4 h-4 mr-1.5" />
            ) : (
              <X className="w-4 h-4 mr-1.5" />
            )}
            {saveMessage}
          </div>
        )}

        {association && (
          <div className="space-y-6">
            <Fragment>
            {/* Tab Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b">
                <div className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {tab.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-3 sm:p-4 lg:p-6">
                {/* Tab 1: Date de Identificare + Sediul Social + Contact */}
                {activeTab === 'identification' && (
                  <div className="space-y-4">
                    {/* Date de Identificare */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Building2 className="w-4 h-4 mr-1.5" />
                        Date de Identificare
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Denumirea asociației <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            disabled={!isEditing}
                            placeholder="ex: Asociația Primăverii 12"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            CUI <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formData.cui}
                            onChange={(e) => handleInputChange('cui', e.target.value)}
                            disabled={!isEditing}
                            placeholder="ex: 12345678"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nr. înregistrare <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formData.registrationNumber}
                            onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                            disabled={!isEditing}
                            placeholder="ex: 123/2024"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sediul Social */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        Sediul Social
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Județul <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.sediu_judet}
                            onChange={(e) => handleInputChange('sediu_judet', e.target.value)}
                            disabled={!isEditing}
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          >
                            <option value="">Selectează</option>
                            {judeteRomania.map(county => (
                              <option key={county.cod} value={county.nume}>
                                {county.nume}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Orașul <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.sediu_oras}
                            onChange={(e) => handleInputChange('sediu_oras', e.target.value)}
                            disabled={!isEditing || !formData.sediu_judet}
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          >
                            <option value="">
                              {formData.sediu_judet ? 'Selectează' : 'Selectează județ'}
                            </option>
                            {availableCities.map(city => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Strada <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.sediu_strada}
                            onChange={(e) => handleInputChange('sediu_strada', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Strada Primăverii"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Numărul <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.sediu_numar}
                            onChange={(e) => handleInputChange('sediu_numar', e.target.value)}
                            disabled={!isEditing}
                            placeholder="123A"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Blocul <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.sediu_bloc}
                            onChange={(e) => handleInputChange('sediu_bloc', e.target.value)}
                            disabled={!isEditing}
                            placeholder="A1, B2"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Date de Contact */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Phone className="w-4 h-4 mr-1.5" />
                        Date de Contact
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email asociație <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            disabled={!isEditing}
                            placeholder="contact@asociatie.ro"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Telefon asociație</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            disabled={!isEditing}
                            placeholder="0212345678"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Website (opțional)</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              <Globe className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="url"
                              value={formData.website}
                              onChange={(e) => handleInputChange('website', e.target.value)}
                              disabled={!isEditing}
                              placeholder="www.asociatie.ro"
                              className={`w-full pl-7 px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                                'border-gray-300'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Program */}
                {activeTab === 'schedule' && (
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Program de funcționare
                    </h3>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Orarul încasărilor <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.collectionSchedule}
                        onChange={(e) => handleInputChange('collectionSchedule', e.target.value)}
                        disabled={!isEditing}
                        placeholder={`ex:\nLuni: 09:00 - 17:00\nMarți: 09:00 - 17:00\nMiercuri: 09:00 - 17:00\nJoi: 09:00 - 17:00\nVineri: 09:00 - 17:00\nSâmbătă: 09:00 - 12:00`}
                        rows={6}
                        className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                          'border-gray-300'
                        }`}
                      />
                      <p className="mt-1.5 text-xs text-gray-600">
                        💡 Specifică programul în care proprietarii pot achita taxele și întâlni administratorul
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 3: Date Financiare */}
                {activeTab === 'financial' && (
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      Informații bancare
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Banca <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={formData.bank}
                          onChange={(e) => handleInputChange('bank', e.target.value)}
                          disabled={!isEditing}
                          placeholder="BCR, BRD, ING"
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                            'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          IBAN <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={formData.bankAccount}
                          onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                          disabled={!isEditing}
                          placeholder="RO49 AAAA 1B31..."
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                            'border-gray-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Numele contului <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={association?.bankAccountData?.accountName || formData.name}
                          disabled={true}
                          placeholder="Asociația de Proprietari..."
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fond de rulment</label>
                        <input
                          value={formData.workingFundAccount}
                          onChange={(e) => handleInputChange('workingFundAccount', e.target.value)}
                          disabled={!isEditing}
                          placeholder="RO49 AAAA 1B31... (opțional)"
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                            'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      💡 Numele contului se completează automat. Fondul de rulment e opțional.
                    </p>
                  </div>
                )}

                {/* Tab 4: Persoane Responsabile */}
                {activeTab === 'responsible' && (
                  <div className="space-y-4">
                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                        <Users className="w-4 h-4 mr-1.5" />
                        Conducerea asociației
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Administrator</label>
                          <input
                            value={association?.adminProfile?.firstName && association?.adminProfile?.lastName
                                    ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}`
                                    : association?.administrator || ""}
                            readOnly
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                            placeholder="Din profil"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Președinte</label>
                          <input
                            value={formData.president}
                            onChange={(e) => handleInputChange('president', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Numele președintelui"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Cenzor</label>
                          <input
                            value={formData.censor}
                            onChange={(e) => handleInputChange('censor', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Numele cenzorului"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Informații Administrator */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">👤 Informații Administrator</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 sm:p-4 rounded-lg gap-3">
                        <div className="flex items-center">
                          {/* Avatar Administrator */}
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-green-200 mr-3">
                            {association?.adminProfile?.avatarURL ? (
                              <img
                                src={association.adminProfile.avatarURL}
                                alt="Avatar administrator"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User className="w-6 h-6" />
                              </div>
                            )}
                          </div>

                          <div>
                            <h5 className="text-sm sm:text-base font-semibold text-gray-900">
                              {association?.adminProfile?.firstName && association?.adminProfile?.lastName
                                ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}`
                                : association?.administrator || 'Administrator'
                              }
                            </h5>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {association?.adminProfile?.companyName || 'Companie nespecificată'}
                            </p>
                            <div className="flex flex-wrap gap-x-3 mt-0.5">
                              {association?.adminProfile?.phone && (
                                <p className="text-xs text-gray-500 flex items-center">
                                  <Phone className="w-3 h-3 mr-0.5" />
                                  {association.adminProfile.phone}
                                </p>
                              )}
                              {association?.adminProfile?.email && (
                                <p className="text-xs text-gray-500 flex items-center">
                                  <Mail className="w-3 h-3 mr-0.5" />
                                  {association.adminProfile.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleNavigation('profile')}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center self-start sm:self-center"
                        >
                          <User className="w-3.5 h-3.5 mr-1" />
                          Editează Profil
                        </button>
                      </div>

                      {/* Informații rapide */}
                      {(association?.adminProfile?.position || association?.adminProfile?.licenseNumber) && (
                        <div className="mt-3 bg-white p-3 rounded-md border">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                            {association?.adminProfile?.position && (
                              <div>
                                <span className="text-gray-500">Funcția:</span>
                                <span className="font-medium ml-1">{association.adminProfile.position}</span>
                              </div>
                            )}
                            {association?.adminProfile?.licenseNumber && (
                              <div>
                                <span className="text-gray-500">Nr. atestat:</span>
                                <span className="font-medium ml-1">{association.adminProfile.licenseNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer cu butoanele de editare/salvare */}
              <div className="bg-gray-50 px-3 sm:px-6 py-2.5 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600 hidden sm:block">
                    {isEditing ? 'Modifică datele și apasă Salvează' : 'Apasă Editează pentru a modifica datele'}
                  </div>

                  <div className="flex gap-2 ml-auto">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editează
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                              Salvez...
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Salvează
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1.5 text-xs sm:text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Anulează
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </Fragment>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssociationView;