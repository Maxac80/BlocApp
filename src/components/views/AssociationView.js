import React, { useState, useEffect } from 'react';
import {Building2, Plus, User, Globe, CreditCard, Edit, Save, X } from 'lucide-react';
import { AddressForm } from '../forms';
import { judeteRomania } from '../../data/counties';
import DashboardHeader from '../dashboard/DashboardHeader';

const AssociationView = ({
  association,
  newAssociation,
  setNewAssociation,
  handleAddAssociation,
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
  
  // State pentru editare Date de Identificare
  const [isEditingIdentification, setIsEditingIdentification] = useState(false);
  const [identificationData, setIdentificationData] = useState({
    name: '',
    cui: '',
    registrationNumber: ''
  });

  // State pentru editare Sediul Social
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressData, setAddressData] = useState({
    sediu_judet: '',
    sediu_oras: '',
    sediu_strada: '',
    sediu_numar: '',
    sediu_bloc: ''
  });

  // State pentru editare Contact și Program
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactData, setContactData] = useState({
    email: '',
    phone: '',
    website: '',
    collectionSchedule: ''
  });

  // State pentru editare Date Financiare
  const [isEditingFinancial, setIsEditingFinancial] = useState(false);
  const [financialData, setFinancialData] = useState({
    bank: '',
    bankAccount: '',
    workingFundAccount: ''
  });

  // State pentru editare Persoane Responsabile
  const [isEditingResponsible, setIsEditingResponsible] = useState(false);
  const [responsibleData, setResponsibleData] = useState({
    president: '',
    censor: ''
  });

  // Inițializare toate datele când se încarcă asociația
  useEffect(() => {
    if (association) {
      setIdentificationData({
        name: association.name || '',
        cui: association.cui || '',
        registrationNumber: association.registrationNumber || ''
      });
      
      setAddressData({
        sediu_judet: association.sediu_judet || association.address?.county || '',
        sediu_oras: association.sediu_oras || association.address?.city || '',
        sediu_strada: association.sediu_strada || association.address?.street || '',
        sediu_numar: association.sediu_numar || association.address?.number || '',
        sediu_bloc: association.sediu_bloc || association.address?.block || ''
      });
      
      setContactData({
        email: association.email || association.contact?.email || '',
        phone: association.phone || association.contact?.phone || '',
        website: association.contact?.website || '',
        collectionSchedule: association.collectionSchedule || ''
      });
      
      setFinancialData({
        bank: association.bank || association.bankAccountData?.bank || '',
        bankAccount: association.bankAccount || association.bankAccountData?.iban || '',
        workingFundAccount: association.workingFundAccount || ''
      });
      
      setResponsibleData({
        president: association.president || '',
        censor: association.censor || ''
      });
    }
  }, [association]);

  // Actualizare orașe bazate pe județ pentru asociația existentă
  useEffect(() => {
    if (association) {
      const county = isEditingAddress 
        ? addressData.sediu_judet 
        : (association?.sediu_judet || association?.address?.county);
      if (county) {
        const judet = judeteRomania.find(j => j.nume === county);
        if (judet) {
          setAvailableCities(judet.orase || []);
        }
      } else {
        setAvailableCities([]);
      }
    }
  }, [association?.sediu_judet, association?.address?.county, association, addressData.sediu_judet, isEditingAddress]);

  // Handler pentru editarea datelor de identificare
  const handleEditIdentification = () => {
    setIsEditingIdentification(true);
  };

  const handleSaveIdentification = async () => {
    // Salvare date
    await updateAssociation({
      name: identificationData.name,
      cui: identificationData.cui,
      registrationNumber: identificationData.registrationNumber
    });
    setIsEditingIdentification(false);
  };

  const handleCancelIdentification = () => {
    // Resetare la valorile originale
    setIdentificationData({
      name: association.name || '',
      cui: association.cui || '',
      registrationNumber: association.registrationNumber || ''
    });
    setIsEditingIdentification(false);
  };

  // Handlers pentru Sediul Social
  const handleEditAddress = () => {
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    await updateAssociation({
      sediu_judet: addressData.sediu_judet,
      sediu_oras: addressData.sediu_oras,
      sediu_strada: addressData.sediu_strada,
      sediu_numar: addressData.sediu_numar,
      sediu_bloc: addressData.sediu_bloc,
      address: {
        county: addressData.sediu_judet,
        city: addressData.sediu_oras,
        street: addressData.sediu_strada,
        number: addressData.sediu_numar,
        block: addressData.sediu_bloc
      }
    });
    setIsEditingAddress(false);
  };

  const handleCancelAddress = () => {
    setAddressData({
      sediu_judet: association.sediu_judet || association.address?.county || '',
      sediu_oras: association.sediu_oras || association.address?.city || '',
      sediu_strada: association.sediu_strada || association.address?.street || '',
      sediu_numar: association.sediu_numar || association.address?.number || '',
      sediu_bloc: association.sediu_bloc || association.address?.block || ''
    });
    setIsEditingAddress(false);
  };

  // Handlers pentru Contact și Program
  const handleEditContact = () => {
    setIsEditingContact(true);
  };

  const handleSaveContact = async () => {
    await updateAssociation({
      email: contactData.email,
      phone: contactData.phone,
      collectionSchedule: contactData.collectionSchedule,
      contact: {
        email: contactData.email,
        phone: contactData.phone,
        website: contactData.website
      }
    });
    setIsEditingContact(false);
  };

  const handleCancelContact = () => {
    setContactData({
      email: association.email || association.contact?.email || '',
      phone: association.phone || association.contact?.phone || '',
      website: association.contact?.website || '',
      collectionSchedule: association.collectionSchedule || ''
    });
    setIsEditingContact(false);
  };

  // Handlers pentru Date Financiare
  const handleEditFinancial = () => {
    setIsEditingFinancial(true);
  };

  const handleSaveFinancial = async () => {
    await updateAssociation({
      bank: financialData.bank,
      bankAccount: financialData.bankAccount,
      workingFundAccount: financialData.workingFundAccount,
      bankAccountData: {
        bank: financialData.bank,
        iban: financialData.bankAccount,
        accountName: association.bankAccountData?.accountName || association.name
      }
    });
    setIsEditingFinancial(false);
  };

  const handleCancelFinancial = () => {
    setFinancialData({
      bank: association.bank || association.bankAccountData?.bank || '',
      bankAccount: association.bankAccount || association.bankAccountData?.iban || '',
      workingFundAccount: association.workingFundAccount || ''
    });
    setIsEditingFinancial(false);
  };

  // Handlers pentru Persoane Responsabile
  const handleEditResponsible = () => {
    setIsEditingResponsible(true);
  };

  const handleSaveResponsible = async () => {
    await updateAssociation({
      president: responsibleData.president,
      censor: responsibleData.censor
    });
    setIsEditingResponsible(false);
  };

  const handleCancelResponsible = () => {
    setResponsibleData({
      president: association.president || '',
      censor: association.censor || ''
    });
    setIsEditingResponsible(false);
  };

const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
const monthType = getMonthType ? getMonthType(currentMonth) : null;

return (
  <div className={`min-h-screen p-6 ${
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏛️ Date asociație</h1>
      </div>

        {/* Condiție principală: Dacă nu există asociație și utilizatorul nu a trecut prin onboarding */}
        {!association && !userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-blue-50 border border-blue-200 p-8 rounded-xl mb-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-blue-800 mb-2">🎉 Bun venit în BlocApp!</h3>
              <p className="text-blue-700 max-w-md mx-auto">
                Pentru a începe, trebuie să creezi prima ta asociație de proprietari.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={newAssociation.name}
                    onChange={(e) => setNewAssociation({...newAssociation, name: e.target.value})}
                    placeholder="Denumirea asociației (ex: Asociația Primăverii 12) *"
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <input
                    value={newAssociation.cui || ""}
                    onChange={(e) => setNewAssociation({...newAssociation, cui: e.target.value})}
                    placeholder="CUI (ex: 12345678) *"
                    className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={handleAddAssociation}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center disabled:bg-gray-400 text-lg font-medium"
                    disabled={!newAssociation.name}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Creează Asociația
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dacă utilizatorul a trecut prin onboarding dar nu are asociație */}
        {!association && userProfile?.metadata?.onboardingCompleted && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🔄 Se încarcă datele asociației...
            </h3>
            <p className="text-yellow-700 mb-4">
              Asociația ta a fost creată în timpul configurării inițiale. Dacă nu se încarcă în câteva secunde, încearcă să reîmprospătezi pagina.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 font-medium"
            >
              🔄 Reîmprospătează Pagina
            </button>
          </div>
        )}

        {association && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-blue-800">📋 Date de Identificare</h3>
                  <p className="text-blue-600 text-sm mt-1">Informații obligatorii pentru înregistrarea legală</p>
                </div>
                <div className="flex gap-2">
                  {!isEditingIdentification ? (
                    <button
                      onClick={handleEditIdentification}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editează
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveIdentification}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salvează
                      </button>
                      <button
                        onClick={handleCancelIdentification}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Anulează
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Denumirea asociației <span className="text-red-500">*</span></label>
                    <input
                      value={isEditingIdentification ? identificationData.name : (association?.name || "")}
                      onChange={(e) => {
                        if (isEditingIdentification) {
                          setIdentificationData({...identificationData, name: e.target.value});
                        }
                      }}
                      disabled={!isEditingIdentification}
                      placeholder="ex: Asociația Primăverii 12"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingIdentification ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CUI <span className="text-red-500">*</span></label>
                    <input
                      value={isEditingIdentification ? identificationData.cui : (association?.cui || "")}
                      onChange={(e) => {
                        if (isEditingIdentification) {
                          setIdentificationData({...identificationData, cui: e.target.value});
                        }
                      }}
                      disabled={!isEditingIdentification}
                      placeholder="ex: 12345678"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingIdentification ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nr. înregistrare <span className="text-red-500">*</span></label>
                  <input
                    value={isEditingIdentification ? identificationData.registrationNumber : (association?.registrationNumber || "")}
                    onChange={(e) => {
                      if (isEditingIdentification) {
                        setIdentificationData({...identificationData, registrationNumber: e.target.value});
                      }
                    }}
                    disabled={!isEditingIdentification}
                    placeholder="ex: 123/2024"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      !isEditingIdentification ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-green-50 border-b border-green-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-green-800">📍 Sediul Social</h3>
                  <p className="text-green-600 text-sm mt-1">Adresa juridică oficială a asociației</p>
                </div>
                <div className="flex gap-2">
                  {!isEditingAddress ? (
                    <button
                      onClick={handleEditAddress}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editează
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveAddress}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salvează
                      </button>
                      <button
                        onClick={handleCancelAddress}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Anulează
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Județul <span className="text-red-500">*</span></label>
                    <select
                      value={isEditingAddress ? addressData.sediu_judet : (association?.sediu_judet || association?.address?.county || "")}
                      onChange={(e) => {
                        if (isEditingAddress) {
                          setAddressData({
                            ...addressData,
                            sediu_judet: e.target.value,
                            sediu_oras: '' // Reset orașul când se schimbă județul
                          });
                        }
                      }}
                      disabled={!isEditingAddress}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingAddress ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selectează județul</option>
                      {judeteRomania.map(county => (
                        <option key={county.cod} value={county.nume}>
                          {county.nume}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orașul <span className="text-red-500">*</span></label>
                    <select
                      value={isEditingAddress ? addressData.sediu_oras : (association?.sediu_oras || association?.address?.city || "")}
                      onChange={(e) => {
                        if (isEditingAddress) {
                          setAddressData({...addressData, sediu_oras: e.target.value});
                        }
                      }}
                      disabled={!isEditingAddress || !addressData.sediu_judet}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingAddress ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    >
                      <option value="">
                        {(association?.sediu_judet || association?.address?.county) 
                          ? 'Selectează orașul' 
                          : 'Selectează mai întâi județul'}
                      </option>
                      {availableCities.map(city => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Strada <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={isEditingAddress ? addressData.sediu_strada : (association?.sediu_strada || association?.address?.street || "")}
                      onChange={(e) => {
                        if (isEditingAddress) {
                          setAddressData({...addressData, sediu_strada: e.target.value});
                        }
                      }}
                      disabled={!isEditingAddress}
                      placeholder="ex: Strada Primăverii"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingAddress ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numărul <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={isEditingAddress ? addressData.sediu_numar : (association?.sediu_numar || association?.address?.number || "")}
                      onChange={(e) => {
                        if (isEditingAddress) {
                          setAddressData({...addressData, sediu_numar: e.target.value});
                        }
                      }}
                      disabled={!isEditingAddress}
                      placeholder="123A"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingAddress ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blocul <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={isEditingAddress ? addressData.sediu_bloc : (association?.sediu_bloc || association?.address?.block || "")}
                      onChange={(e) => {
                        if (isEditingAddress) {
                          setAddressData({...addressData, sediu_bloc: e.target.value});
                        }
                      }}
                      disabled={!isEditingAddress}
                      placeholder="A1, B2, etc."
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingAddress ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-purple-800">📞 Contact și Program</h3>
                  <p className="text-purple-600 text-sm mt-1">Informații de contact și program de funcționare</p>
                </div>
                <div className="flex gap-2">
                  {!isEditingContact ? (
                    <button
                      onClick={handleEditContact}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editează
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveContact}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salvează
                      </button>
                      <button
                        onClick={handleCancelContact}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Anulează
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email asociație <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={isEditingContact ? contactData.email : (association?.email || association?.contact?.email || "")}
                      onChange={(e) => {
                        if (isEditingContact) {
                          setContactData({...contactData, email: e.target.value});
                        }
                      }}
                      disabled={!isEditingContact}
                      placeholder="ex: contact@asociatiaprimaverii.ro"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingContact ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon asociație</label>
                    <input
                      type="tel"
                      value={isEditingContact ? contactData.phone : (association?.phone || association?.contact?.phone || "")}
                      onChange={(e) => {
                        if (isEditingContact) {
                          setContactData({...contactData, phone: e.target.value});
                        }
                      }}
                      disabled={!isEditingContact}
                      placeholder="ex: 0212345678"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingContact ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website (opțional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={isEditingContact ? contactData.website : (association?.contact?.website || "")}
                        onChange={(e) => {
                          if (isEditingContact) {
                            setContactData({...contactData, website: e.target.value});
                          }
                        }}
                        disabled={!isEditingContact}
                        placeholder="https://www.asociatiaprimaverii.ro"
                        className={`w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                          !isEditingContact ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orarul încasărilor <span className="text-red-500">*</span></label>
                  <textarea
                    value={isEditingContact ? contactData.collectionSchedule : (association?.collectionSchedule || "")}
                    onChange={(e) => {
                      if (isEditingContact) {
                        setContactData({...contactData, collectionSchedule: e.target.value});
                      }
                    }}
                    disabled={!isEditingContact}
                    placeholder={`ex:\nLuni: 09:00 - 17:00\nMarți: 09:00 - 17:00\nMiercuri: 09:00 - 17:00\nJoi: 09:00 - 17:00\nVineri: 09:00 - 17:00\nSâmbătă: 09:00 - 12:00`}
                    rows={6}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      !isEditingContact ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-indigo-800">🏦 Date Financiare</h3>
                  <p className="text-indigo-600 text-sm mt-1">Conturi bancare și informații financiare</p>
                </div>
                <div className="flex gap-2">
                  {!isEditingFinancial ? (
                    <button
                      onClick={handleEditFinancial}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editează
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveFinancial}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salvează
                      </button>
                      <button
                        onClick={handleCancelFinancial}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Anulează
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banca <span className="text-red-500">*</span></label>
                    <input
                      value={isEditingFinancial ? financialData.bank : (association?.bank || association?.bankAccountData?.bank || "")}
                      onChange={(e) => {
                        if (isEditingFinancial) {
                          setFinancialData({...financialData, bank: e.target.value});
                        }
                      }}
                      disabled={!isEditingFinancial}
                      placeholder="ex: BCR, BRD, ING Bank"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingFinancial ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IBAN <span className="text-red-500">*</span></label>
                    <input
                      value={isEditingFinancial ? financialData.bankAccount : (association?.bankAccount || association?.bankAccountData?.iban || "")}
                      onChange={(e) => {
                        if (isEditingFinancial) {
                          setFinancialData({...financialData, bankAccount: e.target.value});
                        }
                      }}
                      disabled={!isEditingFinancial}
                      placeholder="RO49 AAAA 1B31..."
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingFinancial ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numele contului <span className="text-red-500">*</span></label>
                    <input
                      value={association?.bankAccountData?.accountName || ""}
                      onChange={(e) => {
                        if (isEditingFinancial) {
                          // Nu modificăm accountName, doar bank și IBAN
                        }
                      }}
                      disabled={true}
                      placeholder="Asociația de Proprietari..."
                      className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 outline-none"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cont fond de rulment</label>
                  <input
                    value={isEditingFinancial ? financialData.workingFundAccount : (association?.workingFundAccount || "")}
                    onChange={(e) => {
                      if (isEditingFinancial) {
                        setFinancialData({...financialData, workingFundAccount: e.target.value});
                      }
                    }}
                    disabled={!isEditingFinancial}
                    placeholder="RO49 AAAA 1B31... (opțional - dacă aveți cont separat)"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      !isEditingFinancial ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-orange-800">👥 Persoane Responsabile</h3>
                  <p className="text-orange-600 text-sm mt-1">Conducerea asociației de proprietari</p>
                </div>
                <div className="flex gap-2">
                  {!isEditingResponsible ? (
                    <button
                      onClick={handleEditResponsible}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editează
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveResponsible}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salvează
                      </button>
                      <button
                        onClick={handleCancelResponsible}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Anulează
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Administrator</label>
                    <input
                      value={association?.adminProfile?.firstName && association?.adminProfile?.lastName 
                              ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}` 
                              : association?.administrator || ""}
                      readOnly
                      className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                      placeholder="Completat din profilul administratorului"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Președinte</label>
                    <input
                      value={isEditingResponsible ? responsibleData.president : (association?.president || "")}
                      onChange={(e) => {
                        if (isEditingResponsible) {
                          setResponsibleData({...responsibleData, president: e.target.value});
                        }
                      }}
                      disabled={!isEditingResponsible}
                      placeholder="Numele președintelui"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingResponsible ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cenzor</label>
                    <input
                      value={isEditingResponsible ? responsibleData.censor : (association?.censor || "")}
                      onChange={(e) => {
                        if (isEditingResponsible) {
                          setResponsibleData({...responsibleData, censor: e.target.value});
                        }
                      }}
                      disabled={!isEditingResponsible}
                      placeholder="Numele cenzorului"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        !isEditingResponsible ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 bg-cyan-50 border-b border-cyan-100">
                <h3 className="text-xl font-semibold text-cyan-800">👤 Administrator Asociație</h3>
                <p className="text-cyan-600 text-sm mt-1">Informații administrator responsabil</p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* Avatar Administrator */}
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-cyan-200 mr-4">
                      {association?.adminProfile?.avatarURL ? (
                        <img 
                          src={association.adminProfile.avatarURL} 
                          alt="Avatar administrator" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {association?.adminProfile?.firstName && association?.adminProfile?.lastName
                          ? `${association.adminProfile.firstName} ${association.adminProfile.lastName}`
                          : association?.administrator || 'Administrator'
                        }
                      </h4>
                      <p className="text-gray-600">
                        {association?.adminProfile?.companyName || 'Companie nespecificată'}
                      </p>
                      {association?.adminProfile?.phone && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {association.adminProfile.phone}
                        </p>
                      )}
                      {association?.adminProfile?.email && (
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {association.adminProfile.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleNavigation('profile')}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Editează Profil
                  </button>
                </div>
                
                {/* Informații rapide */}
                {(association?.adminProfile?.position || association?.adminProfile?.experience || association?.adminProfile?.licenseNumber) && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {association?.adminProfile?.position && (
                        <div>
                          <span className="text-gray-500">Funcția:</span>
                          <p className="font-medium">{association.adminProfile.position}</p>
                        </div>
                      )}
                      {association?.adminProfile?.experience && (
                        <div>
                          <span className="text-gray-500">Experiența:</span>
                          <p className="font-medium">{association.adminProfile.experience} ani</p>
                        </div>
                      )}
                      {association?.adminProfile?.licenseNumber && (
                        <div>
                          <span className="text-gray-500">Număr atestat administrator:</span>
                          <p className="font-medium">{association.adminProfile.licenseNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-medium text-gray-800 mb-3">📊 Statistici Asociație</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {blocks.filter(b => b.associationId === association?.id).length}
                  </div>
                  <div className="text-gray-600">Blocuri</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stairs.filter(s => blocks.some(b => b.id === s.blockId && b.associationId === association?.id)).length}
                  </div>
                  <div className="text-gray-600">Scări</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {getAssociationApartments().length}
                  </div>
                  <div className="text-gray-600">Apartamente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {getAssociationApartments().reduce((sum, apt) => sum + apt.persons, 0)}
                  </div>
                  <div className="text-gray-600">Persoane</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssociationView;