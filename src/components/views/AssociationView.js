import React, { useState, useEffect, Fragment } from 'react';
import { Building2, User, Globe, CreditCard, Edit, Save, X, MapPin, Phone, Mail, Clock, Users, UserPlus, ShieldCheck, UserCheck, Shield, Trash2, MoreVertical, Link2, Calendar, Settings, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { judeteRomania } from '../../data/counties';
import { useAssocMembers } from '../../hooks/useAssocMembers';
import { useAssocInvitation } from '../../hooks/useAssocInvitation';
import InviteAssocMemberModal from '../modals/InviteAssocMemberModal';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Lunile în română
const romanianMonths = [
  'ianuarie', 'februarie', 'martie', 'aprilie',
  'mai', 'iunie', 'iulie', 'august',
  'septembrie', 'octombrie', 'noiembrie', 'decembrie'
];

const AssociationView = ({
  association,
  setAssociation,
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
  getMonthType,
  userRole,
  currentUserId,
  // Settings props
  currentSheet,
  publishedSheet,
  sheets = [],
  updateSheetMonthSettings
}) => {
  const [availableCities, setAvailableCities] = useState([]);
  const [activeTab, setActiveTab] = useState('identification');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Settings state
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [monthSettings, setMonthSettings] = useState(() => {
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setMonth(previousDate.getMonth() - 1);
    return {
      workingMonth: romanianMonths[currentDate.getMonth()],
      workingYear: currentDate.getFullYear(),
      consumptionMonth: romanianMonths[previousDate.getMonth()],
      consumptionYear: previousDate.getFullYear()
    };
  });
  const [generalSettings, setGeneralSettings] = useState({
    autoPublish: false,
    requireConfirmationForPublish: true,
    defaultPenaltyRate: 0.02,
    daysBeforePenalty: 30
  });

  // Membri
  const { members, loading: membersLoading, loadMembers, unsubscribeMembers, removeMember, changeMemberRole, transferOwnership } = useAssocMembers();
  const { invitations, loading: invitationsLoading, loadInvitations, unsubscribeInvitations, createInvitation, cancelInvitation } = useAssocInvitation();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberActionMenu, setMemberActionMenu] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const [transferring, setTransferring] = useState(false);

  const isFounder = association?.adminId === currentUserId;

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
    legalAdmin: '',
    president: '',
    censor: ''
  });

  // Incarcare membri (real-time) si invitatii cand se deschide tab-ul Membri
  useEffect(() => {
    if (activeTab === 'members' && association?.id) {
      loadMembers(association.id, association.adminId);
      loadInvitations(association.id);
    }

    return () => {
      unsubscribeMembers();
      unsubscribeInvitations();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, association?.id]);

  // Incarcare setari cand se deschide un tab de setari
  useEffect(() => {
    if (['months', 'general', 'system'].includes(activeTab) && association?.id) {
      loadAppSettings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, association?.id]);

  const loadAppSettings = async () => {
    if (!association?.id) return;
    try {
      const settingsRef = doc(db, 'associations', association.id, 'settings', 'app');
      const settingsDoc = await getDoc(settingsRef);

      const currentDate = new Date();
      const previousDate = new Date(currentDate);
      previousDate.setMonth(previousDate.getMonth() - 1);
      const defaultSettings = {
        workingMonth: romanianMonths[currentDate.getMonth()],
        workingYear: currentDate.getFullYear(),
        consumptionMonth: romanianMonths[previousDate.getMonth()],
        consumptionYear: previousDate.getFullYear()
      };

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.monthSettings?.workingMonth && data.monthSettings?.consumptionMonth) {
          setMonthSettings(data.monthSettings);
        } else {
          setMonthSettings(defaultSettings);
        }
        if (data.generalSettings) {
          setGeneralSettings(data.generalSettings);
        }
      } else {
        setMonthSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveAppSettings = async () => {
    if (!association?.id) return;
    setSettingsSaving(true);
    setSaveMessage('');
    try {
      const settingsRef = doc(db, 'associations', association.id, 'settings', 'app');
      await setDoc(settingsRef, {
        monthSettings,
        generalSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: association.adminId || 'unknown'
      }, { merge: true });

      if (currentSheet && updateSheetMonthSettings) {
        const workingMonthName = `${monthSettings.workingMonth} ${monthSettings.workingYear}`;
        const consumptionMonthName = `${monthSettings.consumptionMonth} ${monthSettings.consumptionYear}`;
        await updateSheetMonthSettings(currentSheet.id, workingMonthName, consumptionMonthName);
      }

      setSaveMessage('Setările au fost salvate cu succes!');
      if (updateAssociation) {
        await updateAssociation({ ...association, settings: { monthSettings, generalSettings } });
      }
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Eroare la salvarea setărilor');
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetSettingsToDefaults = () => {
    if (!window.confirm('Sigur doriți să resetați toate setările la valorile implicite?')) return;
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setMonth(previousDate.getMonth() - 1);
    setMonthSettings({
      workingMonth: romanianMonths[currentDate.getMonth()],
      workingYear: currentDate.getFullYear(),
      consumptionMonth: romanianMonths[previousDate.getMonth()],
      consumptionYear: previousDate.getFullYear()
    });
    setGeneralSettings({
      autoPublish: false,
      requireConfirmationForPublish: true,
      defaultPenaltyRate: 0.02,
      daysBeforePenalty: 30
    });
    setSaveMessage('Setările au fost resetate la valorile implicite');
    setTimeout(() => setSaveMessage(''), 3000);
  };

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
    },
    {
      id: 'members',
      title: 'Membri',
      icon: UserPlus
    },
    {
      id: 'months',
      title: 'Configurare Luni',
      icon: Calendar
    },
    {
      id: 'general',
      title: 'Setări Generale',
      icon: Settings
    },
    {
      id: 'system',
      title: 'Sistem',
      icon: Database
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
        legalAdmin: association.legalAdmin
          || (association?.adminProfile?.firstName && association?.adminProfile?.lastName
            ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}`
            : association?.administrator || ''),
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
        legalAdmin: formData.legalAdmin,
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
        legalAdmin: association.legalAdmin
          || (association?.adminProfile?.firstName && association?.adminProfile?.lastName
            ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}`
            : association?.administrator || ''),
        president: association.president || '',
        censor: association.censor || ''
      });
    }
    setIsEditing(false);
    setSaveMessage('');
  };


  return (
    <div className="px-3 sm:px-4 lg:px-6 pb-20 lg:pb-2">
      <div className="w-full">
        {/* Page Title */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🏛️ Setări Asociație</h1>
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
                      className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
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
                            value={formData.legalAdmin}
                            onChange={(e) => handleInputChange('legalAdmin', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Numele administratorului"
                            className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                              'border-gray-300'
                            }`}
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

                  </div>
                )}

                {/* Tab 5: Membri */}
                {activeTab === 'members' && (
                  <div className="space-y-4">
                    {/* Membri activi */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 overflow-visible">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                          <Users className="w-4 h-4 mr-1.5" />
                          Membrii asociatiei
                        </h3>
                        {isFounder && (
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Invita Membru
                          </button>
                        )}
                      </div>

                      {/* Lista membri */}
                      {membersLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : members.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">Nu exista membri inca.</p>
                          {isFounder && (
                            <button
                              onClick={() => setShowInviteModal(true)}
                              className="mt-3 text-blue-600 text-sm hover:underline"
                            >
                              Invita primul membru
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {members.map((member) => {
                            const roleConfig = {
                              assoc_admin: { label: 'Administrator', icon: ShieldCheck, color: 'bg-purple-100 text-purple-700' },
                              assoc_president: { label: 'Presedinte', icon: UserCheck, color: 'bg-blue-100 text-blue-700' },
                              assoc_censor: { label: 'Cenzor', icon: Shield, color: 'bg-green-100 text-green-700' }
                            };
                            const config = roleConfig[member.role] || roleConfig.assoc_admin;
                            const RoleIcon = config.icon;
                            const isSelf = member.id === currentUserId;

                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center min-w-0">
                                  <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center mr-3 flex-shrink-0 border border-gray-200">
                                    <User className="w-4 h-4 text-gray-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {member.name || member.email || 'Membru'}
                                      {isSelf && <span className="text-xs text-gray-400 ml-1">(tu)</span>}
                                    </p>
                                    {member.email && (
                                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  {member.isFounder ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                      Fondator
                                    </span>
                                  ) : (
                                    <span className="inline-block" style={{ width: '4.6rem' }} />
                                  )}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                                    <RoleIcon className="w-3 h-3 mr-1" />
                                    {config.label}
                                  </span>

                                  {/* Dropdown sau placeholder pentru aliniere */}
                                  {isFounder && !isSelf ? (
                                    <div className="relative w-8 flex-shrink-0">
                                      <button
                                        onClick={() => setMemberActionMenu(memberActionMenu === member.id ? null : member.id)}
                                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                      </button>

                                      {memberActionMenu === member.id && (
                                        <>
                                        <div className="fixed inset-0 z-40" onClick={() => setMemberActionMenu(null)} />
                                        <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 w-48">
                                          {['assoc_admin', 'assoc_president', 'assoc_censor']
                                            .filter(r => r !== member.role)
                                            .map(role => {
                                              const rc = roleConfig[role];
                                              const RIcon = rc.icon;
                                              return (
                                                <button
                                                  key={role}
                                                  onClick={async () => {
                                                    await changeMemberRole(association.id, member.id, role, currentUserId);
                                                    setMemberActionMenu(null);
                                                  }}
                                                  className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 text-gray-700"
                                                >
                                                  <RIcon className="w-3.5 h-3.5 mr-2" />
                                                  Setează ca {rc.label}
                                                </button>
                                              );
                                            })}
                                          {isFounder && member.role === 'assoc_admin' && (
                                            <>
                                              <div className="border-t border-gray-100 my-1" />
                                              <button
                                                onClick={() => {
                                                  setConfirmTransfer(member);
                                                  setMemberActionMenu(null);
                                                }}
                                                className="w-full flex items-center px-3 py-2 text-xs hover:bg-yellow-50 text-yellow-700"
                                              >
                                                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                                                Transferă Fondator
                                              </button>
                                            </>
                                          )}
                                          <div className="border-t border-gray-100 my-1" />
                                          <button
                                            onClick={() => {
                                              setConfirmRemove(member);
                                              setMemberActionMenu(null);
                                            }}
                                            className="w-full flex items-center px-3 py-2 text-xs hover:bg-red-50 text-red-600"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                            Elimină membru
                                          </button>
                                        </div>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    /* Placeholder invizibil pentru a păstra alinierea */
                                    <div className="w-8 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Invitatii in asteptare */}
                    {invitations.filter(i => i.status === 'pending').length > 0 && (
                      <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                          <Link2 className="w-4 h-4 mr-1.5" />
                          Invitatii in asteptare
                        </h3>
                        <div className="space-y-2">
                          {invitations.filter(i => i.status === 'pending').map((inv) => {
                            const invRoleConfig = {
                              assoc_admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-700' },
                              assoc_president: { label: 'Presedinte', color: 'bg-blue-100 text-blue-700' },
                              assoc_censor: { label: 'Cenzor', color: 'bg-green-100 text-green-700' }
                            };
                            const invConfig = invRoleConfig[inv.role] || invRoleConfig.assoc_admin;

                            return (
                              <div
                                key={inv.id}
                                className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-200"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {inv.email}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Expira: {new Date(inv.expiresAt).toLocaleDateString('ro-RO')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${invConfig.color}`}>
                                    {invConfig.label}
                                  </span>
                                  {isFounder && (
                                    <button
                                      onClick={async () => {
                                        await cancelInvitation(association.id, inv.id, currentUserId);
                                      }}
                                      className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors"
                                      title="Anuleaza invitatie"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Tab: Configurare Luni */}
                {activeTab === 'months' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                        Configurare Luni pentru Sheet-ul în Lucru
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Setați luna pentru care se calculează întreținerea și luna pentru care sunt înregistrate consumurile.
                      </p>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                        <h5 className="text-xs sm:text-sm font-medium text-blue-800 mb-1.5">💡 Despre Sheet-urile de Lucru</h5>
                        <div className="text-xs text-blue-700 space-y-1">
                          <p><strong>Sheet în Lucru:</strong> Luna pentru care calculați întreținerea în prezent</p>
                          <p><strong>Sheet Publicat:</strong> Luna care a fost finalizată și publicată pentru plată</p>
                          <p><strong>Sheet Arhivat:</strong> Lunile vechi care nu mai pot fi modificate</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">
                            🔄 La publicare, luna în lucru devine publicată și se creează automat un nou sheet pentru luna următoare
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-md p-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Luna în Lucru (întreținere)</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Luna întreținerii</label>
                              <select
                                value={monthSettings.workingMonth}
                                onChange={(e) => setMonthSettings(prev => ({ ...prev, workingMonth: e.target.value }))}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Selectați luna</option>
                                {romanianMonths.map(month => (
                                  <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Anul</label>
                              <input
                                type="number" min="2020" max="2030"
                                value={monthSettings.workingYear}
                                onChange={(e) => setMonthSettings(prev => ({ ...prev, workingYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-md p-3">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Luna pentru Consumuri</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Luna consumurilor</label>
                              <select
                                value={monthSettings.consumptionMonth}
                                onChange={(e) => setMonthSettings(prev => ({ ...prev, consumptionMonth: e.target.value }))}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Selectați luna</option>
                                {romanianMonths.map(month => (
                                  <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Anul</label>
                              <input
                                type="number" min="2020" max="2030"
                                value={monthSettings.consumptionYear}
                                onChange={(e) => setMonthSettings(prev => ({ ...prev, consumptionYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {monthSettings.workingMonth && monthSettings.consumptionMonth && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Preview Document</h3>
                        <div className="bg-white rounded-md p-3 border border-blue-300">
                          <p className="text-center text-sm font-bold mb-1">TABEL DE ÎNTREȚINERE</p>
                          <p className="text-center text-xs sm:text-sm text-gray-700">
                            Întreținere luna <strong className="text-blue-600">{monthSettings.workingMonth.charAt(0).toUpperCase() + monthSettings.workingMonth.slice(1)} {monthSettings.workingYear}</strong>
                          </p>
                          <p className="text-center text-xs sm:text-sm text-gray-700">
                            Consum luna <strong className="text-blue-600">{monthSettings.consumptionMonth.charAt(0).toUpperCase() + monthSettings.consumptionMonth.slice(1)} {monthSettings.consumptionYear}</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-800">
                          <p className="font-medium">Notă importantă:</p>
                          <p>La publicarea sheet-ului curent, următorul sheet va incrementa automat ambele luni păstrând diferența dintre ele.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Setări Generale */}
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Comportament Publicare</h3>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={generalSettings.requireConfirmationForPublish}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, requireConfirmationForPublish: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="text-xs sm:text-sm text-gray-700">Cere confirmare înainte de publicarea unei luni</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Penalități și Termene</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Rata penalității (%)</label>
                          <input
                            type="number" min="0" max="10" step="0.01"
                            value={generalSettings.defaultPenaltyRate * 100}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultPenaltyRate: parseFloat(e.target.value) / 100 || 0 }))}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Standard: 2% din suma datorată</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Zile până la aplicarea penalităților</label>
                          <input
                            type="number" min="0" max="90"
                            value={generalSettings.daysBeforePenalty}
                            onChange={(e) => setGeneralSettings(prev => ({ ...prev, daysBeforePenalty: parseInt(e.target.value) || 30 }))}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Standard: 30 de zile de la emitere</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Sistem */}
                {activeTab === 'system' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Informații Sistem</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-2.5 rounded-md">
                          <p className="text-xs text-gray-600">Asociație</p>
                          <p className="text-sm font-medium text-gray-900">{association?.name || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-md">
                          <p className="text-xs text-gray-600">CUI</p>
                          <p className="text-sm font-medium text-gray-900">{association?.cui || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-md">
                          <p className="text-xs text-gray-600">Total Sheet-uri</p>
                          <p className="text-sm font-medium text-gray-900">{sheets.length}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-md">
                          <p className="text-xs text-gray-600">Sheet în lucru</p>
                          <p className="text-sm font-medium text-gray-900">{currentSheet?.monthYear || 'Niciunul'}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-md">
                          <p className="text-xs text-gray-600">Sheet publicat</p>
                          <p className="text-sm font-medium text-gray-900">{publishedSheet?.monthYear || 'Niciunul'}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-md">
                          <p className="text-xs text-gray-600">Data creării</p>
                          <p className="text-sm font-medium text-gray-900">
                            {association?.createdAt ? new Date(association.createdAt).toLocaleDateString('ro-RO') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Acțiuni Sistem</h3>
                      <div className="space-y-2">
                        <button
                          onClick={resetSettingsToDefaults}
                          className="flex items-center px-3 py-1.5 text-xs sm:text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Resetează Setările la Default
                        </button>
                        <p className="text-xs text-gray-500">⚠️ Resetarea setărilor va reveni la valorile implicite ale aplicației</p>
                      </div>
                    </div>

                    {(currentSheet || publishedSheet) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex">
                          <Database className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-800">
                            <p className="font-medium mb-1">Status Sheet-uri</p>
                            {currentSheet && <p>• Sheet în lucru: {currentSheet.monthYear} (ID: {currentSheet.id?.slice(-6)})</p>}
                            {publishedSheet && <p>• Sheet publicat: {publishedSheet.monthYear} (ID: {publishedSheet.id?.slice(-6)})</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer: Association data tabs (editare/salvare) */}
              {['identification', 'schedule', 'financial', 'responsible'].includes(activeTab) && (
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
              )}

              {/* Footer: Settings tabs (salvează setările) */}
              {['months', 'general'].includes(activeTab) && (
              <div className="bg-gray-50 px-3 sm:px-6 py-2.5 border-t">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleNavigation('dashboard')}
                    className="px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={saveAppSettings}
                    disabled={settingsSaving}
                    className="flex items-center px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {settingsSaving ? (
                      <>
                        <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Se salvează...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Salvează Setările
                      </>
                    )}
                  </button>
                </div>
              </div>
              )}
            </div>
            </Fragment>
          </div>
        )}
      </div>

      {/* Modal invitare membru */}
      <InviteAssocMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        association={association}
        onInvite={async (invData) => {
          const result = await createInvitation(association.id, invData, currentUserId);
          // Reload invitatii
          await loadInvitations(association.id);
          return result;
        }}
        loading={invitationsLoading}
      />

      {/* Dialog confirmare eliminare */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirma eliminarea</h3>
            <p className="text-sm text-gray-600 mb-4">
              Esti sigur ca vrei sa elimini pe <strong>{confirmRemove.name || confirmRemove.email}</strong> din asociatie?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Anuleaza
              </button>
              <button
                onClick={async () => {
                  await removeMember(association.id, confirmRemove.id, currentUserId);
                  setConfirmRemove(null);
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog confirmare transfer ownership */}
      {confirmTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transferă rolul de Fondator</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ești sigur că vrei să transferi rolul de Fondator al asociației <strong>{association?.name || 'asociația'}</strong> către <strong>{confirmTransfer.name || confirmTransfer.email}</strong>?
            </p>
            <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded-lg mb-4">
              Vei rămâne administrator (editor), dar nu vei mai fi fondatorul asociației. Noul fondator va putea gestiona membrii și transfera rolul mai departe.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmTransfer(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={transferring}
              >
                Anuleaza
              </button>
              <button
                onClick={async () => {
                  setTransferring(true);
                  try {
                    await transferOwnership(association.id, confirmTransfer.id, currentUserId);
                    // Actualizează local association.adminId pentru UI instant
                    if (setAssociation) {
                      setAssociation(prev => ({ ...prev, adminId: confirmTransfer.id }));
                    }
                    setConfirmTransfer(null);
                    // Reload members to update founder badge
                    loadMembers(association.id, confirmTransfer.id);
                  } catch (err) {
                    console.error('Transfer failed:', err);
                  } finally {
                    setTransferring(false);
                  }
                }}
                className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                disabled={transferring}
              >
                {transferring ? 'Se transferă...' : 'Transferă'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssociationView;