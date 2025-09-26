import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

const ApartmentModal = ({
  isOpen,
  onClose,
  mode, // 'add' sau 'edit'
  apartment, // pentru edit
  stair, // pentru add
  blocks, // pentru a găsi blocul
  stairs, // toate scările pentru a găsi scara apartamentului în editare
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('general');
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

  // Resetează sau populează datele când se deschide modalul
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general'); // Reset la primul tab
      if (mode === 'edit' && apartment) {
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

  if (!isOpen) return null;

  // Găsește scara pentru apartamentul în editare
  const currentStair = mode === 'edit' && apartment && stairs
    ? stairs.find(s => s.id === apartment.stairId)
    : stair;

  // Găsește blocul pentru scara curentă
  const currentBlock = mode === 'add' && stair && blocks
    ? blocks.find(block => block.id === stair.blockId)
    : mode === 'edit' && currentStair && blocks
    ? blocks.find(block => block.id === currentStair.blockId)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validări diferite pentru add vs edit
    if (mode === 'add') {
      if (!formData.owner.trim() || !formData.persons || !formData.number) {
        alert('Completați câmpurile obligatorii (număr apartament, proprietar și numărul de persoane)');
        return;
      }
    } else {
      if (!formData.owner.trim() || !formData.persons) {
        alert('Completați câmpurile obligatorii (proprietar și numărul de persoane)');
        return;
      }
    }

    const apartmentData = {
      owner: formData.owner.trim(),
      persons: parseInt(formData.persons),
      apartmentType: formData.apartmentType?.trim() || null,
      surface: formData.surface ? parseFloat(formData.surface) : null,
      heatingSource: formData.heatingSource?.trim() || null,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null
    };

    // Doar pentru add mode, include numărul apartamentului
    if (mode === 'add') {
      apartmentData.number = parseInt(formData.number);
    }

    try {
      await onSave(apartmentData);
      onClose();
    } catch (error) {
      console.error('Error saving apartment:', error);
      alert('Eroare la salvarea apartamentului: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col overflow-hidden">
        {/* Header cu gradient orange */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <span className="text-2xl">🏠</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {mode === 'edit' ? `Editează apartament ${apartment?.number}` : 'Configurare: Apartament nou'}
              </h3>
              <p className="text-orange-100 text-sm">
                {mode === 'edit'
                  ? `${currentBlock?.name || ''} - ${currentStair?.name || ''}`
                  : `Apartament nou la ${currentBlock?.name || ''} - ${stair?.name || ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-200 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 pt-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${
                activeTab === 'general'
                  ? 'bg-white text-orange-600 shadow-sm border-b-2 border-orange-500'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
              }`}
            >
              <span className="text-lg">🏡</span>
              General
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${
                activeTab === 'contact'
                  ? 'bg-white text-orange-600 shadow-sm border-b-2 border-orange-500'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-white/50'
              }`}
            >
              <span className="text-lg">📱</span>
              Contact
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-white overflow-hidden">
          <div className="h-full relative">
            {/* General Tab */}
            <div className={`absolute inset-0 p-6 pb-0 transition-transform duration-200 ease-in-out ${
              activeTab === 'general' ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="space-y-4 h-full">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Informații generale</h4>

                {/* Rândul 1: Numărul apartamentului (doar pentru add) și Proprietarul */}
                <div className="grid grid-cols-2 gap-4">
                  {mode === 'add' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numărul apartamentului *
                      </label>
                      <input
                        type="text"
                        value={formData.number}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({...formData, number: value});
                        }}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="ex: 15"
                        required
                      />
                    </div>
                  )}
                  <div className={mode === 'edit' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proprietar *
                    </label>
                    <input
                      type="text"
                      value={formData.owner}
                      onChange={(e) => setFormData({...formData, owner: e.target.value})}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="ex: Ion Popescu"
                      required
                    />
                  </div>
                </div>

                {/* Rândul 2: Numărul de persoane și Tipul apartamentului */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numărul de persoane *
                    </label>
                    <input
                      type="text"
                      value={formData.persons}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({...formData, persons: value});
                      }}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="ex: 3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipul apartamentului
                    </label>
                    <select
                      value={formData.apartmentType}
                      onChange={(e) => setFormData({...formData, apartmentType: e.target.value})}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">Selectează tipul</option>
                      <option value="Garsoniera">Garsoniera</option>
                      <option value="2 camere">2 camere</option>
                      <option value="3 camere">3 camere</option>
                      <option value="4 camere">4 camere</option>
                      <option value="5 camere">5 camere</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>
                </div>

                {/* Rândul 3: Suprafața și Sursa de încălzire */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suprafața (mp)
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
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="ex: 65.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sursa de încălzire
                    </label>
                    <select
                      value={formData.heatingSource}
                      onChange={(e) => setFormData({...formData, heatingSource: e.target.value})}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">Selectează sursa</option>
                      <option value="Termoficare">Termoficare</option>
                      <option value="Centrala proprie">Centrală proprie</option>
                      <option value="Centrala bloc">Centrală bloc</option>
                      <option value="Debransat">Debranșat</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Tab */}
            <div className={`absolute inset-0 p-6 pb-0 transition-transform duration-200 ease-in-out ${
              activeTab === 'contact' ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="space-y-4 h-full">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Informații de contact</h4>

                {/* Email și Telefon pe aceeași linie */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresă email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="ex: ion.popescu@email.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Pentru acces la aplicația BlocApp pentru proprietari</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Număr de telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="ex: 0721234567"
                    />
                    <p className="text-xs text-gray-500 mt-1">Opțional - pentru urgențe sau notificări</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Butoane fixe la baza modalului */}
        <div className="bg-white border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                {mode === 'edit' ? 'Salvează' : 'Adaugă'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApartmentModal;