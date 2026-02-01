/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, Send, CheckCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useOwnerInvitation } from '../../hooks/useOwnerInvitation';

const ApartmentModal = ({
  isOpen,
  onClose,
  mode, // 'add', 'edit' sau 'view'
  apartment, // pentru edit sau view
  stair, // pentru add
  blocks, // pentru a găsi blocul
  stairs, // toate scările pentru a găsi scara apartamentului în editare
  apartments, // ADĂUGAT: pentru calcul cotă parte
  association, // ADĂUGAT: pentru invitații proprietari
  currentUserId, // ADĂUGAT: ID-ul adminului curent
  onSave
}) => {
  const isViewMode = mode === 'view';
  const [formData, setFormData] = useState({
    number: '',
    owner: '',
    persons: '',
    apartmentType: '',
    surface: '',
    heatingSource: '',
    email: '',
    phone: ''
  });
  const [totalSurface, setTotalSurface] = useState(0); // ADĂUGAT: pentru calcul cotă parte

  // Hook pentru invitații proprietari
  const {
    sendInvitation,
    getInvitationStatus,
    resendInvitation,
    loading: invitationLoading
  } = useOwnerInvitation();

  const [invitationStatus, setInvitationStatus] = useState({ status: 'none' });
  const [invitationSending, setInvitationSending] = useState(false);

  // Resetează sau populează datele când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      if ((mode === 'edit' || mode === 'view') && apartment) {
        setFormData({
          number: apartment.number || '',
          owner: apartment.owner || '',
          persons: apartment.persons || '',
          apartmentType: apartment.apartmentType || '',
          surface: apartment.surface || '',
          heatingSource: apartment.heatingSource || '',
          email: apartment.email || '',
          phone: apartment.phone || ''
        });
      } else {
        setFormData({
          number: '',
          owner: '',
          persons: '',
          apartmentType: '',
          surface: '',
          heatingSource: '',
          email: '',
          phone: ''
        });
      }
    }
  }, [isOpen, mode, apartment]);

  // ADĂUGAT: Calculează suprafața totală pentru grupul relevant (scară)
  useEffect(() => {
    if (!isOpen || !apartments) {
      setTotalSurface(0);
      return;
    }

    // Determină scara curentă (ID sau nume pentru fallback)
    let currentStairId = null;
    let currentStairName = null;

    if ((mode === 'edit' || mode === 'view') && apartment) {
      currentStairId = apartment.stairId;
      currentStairName = apartment.stair; // Numele scării din snapshot
    } else if (mode === 'add' && stair) {
      currentStairId = stair.id;
      currentStairName = stair.name;
    }

    if (!currentStairId && !currentStairName) {
      setTotalSurface(0);
      return;
    }

    // Calculează suprafața totală a apartamentelor din aceeași scară
    // Încearcă mai întâi după stairId, apoi fallback la stair name
    let relevantApartments = apartments.filter(apt => apt.stairId === currentStairId);

    // Fallback: dacă nu găsim după stairId, încercăm după numele scării
    if (relevantApartments.length === 0 && currentStairName) {
      relevantApartments = apartments.filter(apt => apt.stair === currentStairName);
    }

    let total = relevantApartments.reduce((sum, apt) => sum + (parseFloat(apt.surface) || 0), 0);

    // Dacă suntem în modul edit, exclude suprafața veche a apartamentului curent și adaugă cea nouă
    if (mode === 'edit' && apartment) {
      total = total - (parseFloat(apartment.surface) || 0) + (parseFloat(formData.surface) || 0);
    } else if (mode === 'add') {
      // Dacă suntem în modul add, adaugă suprafața nouă
      total = total + (parseFloat(formData.surface) || 0);
    }
    // Pentru modul view, totalul rămâne neschimbat (toate suprafețele din scară)

    setTotalSurface(total);
  }, [isOpen, mode, apartment, stair, apartments, formData.surface]);

  // Verifică statusul invitației când se deschide modalul sau se schimbă emailul
  useEffect(() => {
    const checkInvitationStatus = async () => {
      if (!isOpen || !formData.email || mode === 'add') {
        setInvitationStatus({ status: 'none' });
        return;
      }

      const status = await getInvitationStatus(formData.email);
      setInvitationStatus(status);
    };

    checkInvitationStatus();
  }, [isOpen, formData.email, mode, getInvitationStatus]);

  // Handler pentru trimitere invitație
  const handleSendInvitation = async () => {
    if (!formData.email || !association || !currentUserId) {
      alert('Completează adresa de email și salvează apartamentul înainte de a trimite invitația.');
      return;
    }

    setInvitationSending(true);

    try {
      const apartmentData = {
        id: apartment?.id,
        number: formData.number,
        stairId: apartment?.stairId || stair?.id,
        blocId: apartment?.blocId || stair?.blockId
      };

      const ownerInfo = {
        firstName: formData.owner.split(' ')[0] || '',
        lastName: formData.owner.split(' ').slice(1).join(' ') || '',
        phone: formData.phone || ''
      };

      const result = await sendInvitation(
        formData.email,
        apartmentData,
        { id: association.id, name: association.name },
        currentUserId,
        ownerInfo
      );

      if (result.success) {
        setInvitationStatus({ status: 'pending' });
        alert(`Invitație trimisă cu succes către ${formData.email}!\n\nLink: ${result.magicLink}`);
      } else {
        alert('Eroare la trimiterea invitației: ' + result.error);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Eroare la trimiterea invitației: ' + error.message);
    } finally {
      setInvitationSending(false);
    }
  };

  // Handler pentru retrimite invitație
  const handleResendInvitation = async () => {
    if (!invitationStatus.owner?.id || !currentUserId) return;

    setInvitationSending(true);

    try {
      const result = await resendInvitation(invitationStatus.owner.id, currentUserId);

      if (result.success) {
        alert(`Invitație retrimisă către ${formData.email}!\n\nLink: ${result.magicLink}`);
      } else {
        alert('Eroare la retrimiterea invitației: ' + result.error);
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Eroare: ' + error.message);
    } finally {
      setInvitationSending(false);
    }
  };

  if (!isOpen) return null;

  // Găsește scara pentru apartamentul în editare sau vizualizare
  const currentStair = (mode === 'edit' || mode === 'view') && apartment && stairs
    ? stairs.find(s => s.id === apartment.stairId)
    : stair;

  // Găsește blocul pentru scara curentă
  const currentBlock = mode === 'add' && stair && blocks
    ? blocks.find(block => block.id === stair.blockId)
    : (mode === 'edit' || mode === 'view') && currentStair && blocks
    ? blocks.find(block => block.id === currentStair.blockId)
    : null;

  // Pentru modul view, folosim direct numele salvate în snapshot (dacă nu găsim în structura curentă)
  const displayBlockName = currentBlock?.name || apartment?.block || '';
  const displayStairName = currentStair?.name || apartment?.stair || '';

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validări pentru câmpurile obligatorii
    if (!formData.owner.trim() || !formData.persons || !formData.number) {
      alert('Completați câmpurile obligatorii (număr apartament, proprietar și numărul de persoane)');
      return;
    }

    // ADĂUGAT: Calculează cota parte dacă există suprafață
    let cotaParte = null;
    if (formData.surface && totalSurface > 0) {
      cotaParte = parseFloat(((parseFloat(formData.surface) / totalSurface) * 100).toFixed(4));
    }

    const apartmentData = {
      number: parseInt(formData.number),
      owner: formData.owner.trim(),
      persons: parseInt(formData.persons),
      apartmentType: formData.apartmentType?.trim() || null,
      surface: formData.surface ? parseFloat(formData.surface) : null,
      cotaParte: cotaParte, // ADĂUGAT: Salvează cota parte calculată
      heatingSource: formData.heatingSource?.trim() || null,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null
    };

    try {
      await onSave(apartmentData);
      onClose();
    } catch (error) {
      console.error('Error saving apartment:', error);
      alert('Eroare la salvarea apartamentului: ' + error.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[95vw] sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header cu gradient - albastru pentru view, orange pentru edit/add */}
        <div className={`p-3 sm:p-4 flex items-center justify-between text-white flex-shrink-0 ${
          isViewMode
            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
            : 'bg-gradient-to-r from-orange-500 to-orange-600'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-white bg-opacity-20 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
              <span className="text-xl sm:text-2xl">{isViewMode ? '👁️' : '🏠'}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-semibold truncate">
                {isViewMode
                  ? `Vizualizare apartament ${apartment?.number}`
                  : mode === 'edit'
                    ? `Editează apartament ${apartment?.number}`
                    : 'Configurare: Apartament nou'}
              </h3>
              <p className={`text-xs sm:text-sm truncate ${isViewMode ? 'text-blue-100' : 'text-orange-100'}`}>
                {(mode === 'edit' || isViewMode)
                  ? `${displayBlockName} - ${displayStairName}`
                  : `Apartament nou la ${currentBlock?.name || ''} - ${stair?.name || ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`text-white transition-colors flex-shrink-0 ${isViewMode ? 'hover:text-blue-200' : 'hover:text-orange-200'}`}
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-sm sm:text-base font-medium text-gray-800 mb-2 sm:mb-3">Informații generale</h4>

                {/* Rândul 1: Numărul apartamentului și Proprietarul */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Numărul apartamentului {!isViewMode && '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, number: value});
                      }}
                      className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isViewMode
                          ? 'border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed'
                          : 'border-orange-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                      placeholder="ex: 15"
                      required={!isViewMode}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Proprietar {!isViewMode && '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.owner}
                      onChange={(e) => setFormData({...formData, owner: e.target.value})}
                      className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg outline-none ${
                        isViewMode
                          ? 'border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed'
                          : 'border-orange-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                      placeholder="ex: Ion Popescu"
                      required={!isViewMode}
                      disabled={isViewMode}
                    />
                  </div>
                </div>

                {/* Rândul 2: Numărul de persoane și Tipul apartamentului */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Numărul de persoane {!isViewMode && '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.persons}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, persons: value});
                      }}
                      className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isViewMode
                          ? 'border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed'
                          : 'border-orange-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                      placeholder="ex: 3"
                      required={!isViewMode}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Tipul apartamentului
                    </label>
                    {isViewMode ? (
                      // În modul view, afișăm textul direct
                      <input
                        type="text"
                        value={formData.apartmentType || '-'}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed rounded-lg outline-none"
                        disabled
                      />
                    ) : (
                      <select
                        value={formData.apartmentType}
                        onChange={(e) => setFormData({...formData, apartmentType: e.target.value})}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      >
                        <option value="">Selectează tipul</option>
                        <option value="Garsoniera">Garsoniera</option>
                        <option value="2 camere">2 camere</option>
                        <option value="3 camere">3 camere</option>
                        <option value="4 camere">4 camere</option>
                        <option value="5 camere">5 camere</option>
                        <option value="Penthouse">Penthouse</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Rândul 3: Suprafața și Sursa de încălzire */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Suprafața utilă (mp)
                    </label>
                    <input
                      type="text"
                      value={formData.surface}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        // Previne mai mult de un punct
                        const parts = value.split('.');
                        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                        setFormData({...formData, surface: cleanValue});
                      }}
                      className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isViewMode
                          ? 'border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed'
                          : 'border-orange-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                      placeholder="ex: 65.5"
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Sursa de încălzire
                    </label>
                    {isViewMode ? (
                      // În modul view, afișăm textul direct pentru a evita probleme cu valori non-standard
                      <input
                        type="text"
                        value={formData.heatingSource || '-'}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed rounded-lg outline-none"
                        disabled
                      />
                    ) : (
                      <select
                        value={formData.heatingSource}
                        onChange={(e) => setFormData({...formData, heatingSource: e.target.value})}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      >
                        <option value="">Selectează sursa</option>
                        <option value="Termoficare">Termoficare</option>
                        <option value="Centrala proprie">Centrală proprie</option>
                        <option value="Centrala bloc">Centrală bloc</option>
                        <option value="Debransat">Debranșat</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* ADĂUGAT: Cotă parte indiviză - calculată automat */}
                {formData.surface && (
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                    <label className="block text-xs sm:text-sm font-medium text-blue-900 mb-1">
                      📊 Cotă parte indiviză {isViewMode ? '' : '(calculată automat)'}
                    </label>
                    <div className="text-sm sm:text-lg font-semibold text-blue-700">
                      {/* În modul view, folosim cotaParte salvată în snapshot dacă există */}
                      {isViewMode && apartment?.cotaParte ? (
                        <>
                          {apartment.cotaParte.toFixed(4)}%
                          <span className="text-xs sm:text-sm font-normal text-blue-600 ml-1 sm:ml-2">
                            ({formData.surface} mp - calculat la momentul salvării)
                          </span>
                        </>
                      ) : totalSurface > 0 ? (
                        <>
                          {((parseFloat(formData.surface) / totalSurface) * 100).toFixed(4)}%
                          <span className="text-xs sm:text-sm font-normal text-blue-600 ml-1 sm:ml-2">
                            ({formData.surface} mp / {totalSurface.toFixed(2)} mp)
                          </span>
                        </>
                      ) : (
                        <span className="text-xs sm:text-sm text-blue-600">
                          {isViewMode
                            ? 'Nu sunt disponibile date de suprafață pentru calculul cotei parte'
                            : 'Completați suprafețele celorlalte apartamente pentru calcul complet'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <h4 className="text-sm sm:text-base font-medium text-gray-800 mb-2 sm:mb-3 mt-3 sm:mt-4">Informații de contact</h4>

                {/* Email și Telefon pe aceeași linie */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Adresă email
                    </label>
                    <div className="flex gap-1 sm:gap-2">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={`flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg outline-none ${
                          isViewMode
                            ? 'border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed'
                            : 'border-orange-300 focus:ring-2 focus:ring-orange-500'
                        }`}
                        placeholder="ex: ion.popescu@en"
                        disabled={isViewMode}
                      />
                      {/* Buton invitație - doar în modul edit/view și dacă există email */}
                      {mode !== 'add' && formData.email && association && (
                        <>
                          {invitationStatus.status === 'active' ? (
                            <span className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Activ
                            </span>
                          ) : invitationStatus.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={handleResendInvitation}
                              disabled={invitationSending}
                              className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
                              title="Retrimite invitația"
                            >
                              {invitationSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 mr-1" />
                                  <RefreshCw className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          ) : invitationStatus.status === 'expired' ? (
                            <button
                              type="button"
                              onClick={handleResendInvitation}
                              disabled={invitationSending}
                              className="inline-flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
                              title="Invitație expirată - Retrimite"
                            >
                              {invitationSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                  Retrimite
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendInvitation}
                              disabled={invitationSending || !formData.email}
                              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                              title="Trimite invitație pentru acces portal"
                            >
                              {invitationSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-1" />
                                  Invită
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {!isViewMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        {invitationStatus.status === 'active'
                          ? 'Proprietarul are cont activ în portal'
                          : invitationStatus.status === 'pending'
                          ? 'Invitație trimisă - așteaptă activare'
                          : invitationStatus.status === 'expired'
                          ? 'Invitația a expirat - retrimite pentru reactivare'
                          : 'Trimite invitație pentru acces la portalul proprietarilor'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Număr de telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border rounded-lg outline-none ${
                        isViewMode
                          ? 'border-blue-200 bg-blue-50 text-gray-700 cursor-not-allowed'
                          : 'border-orange-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                      placeholder="ex: 0721234567"
                      disabled={isViewMode}
                    />
                    {!isViewMode && <p className="text-xs text-gray-500 mt-1">Opțional - pentru urgențe</p>}
                  </div>
                </div>
              </div>
        </div>

        {/* Butoane fixe */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t flex justify-end gap-2 sm:gap-3 flex-shrink-0">
          {isViewMode ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Închide
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="contents">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                {mode === 'edit' ? 'Salvează' : 'Adaugă'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ApartmentModal;