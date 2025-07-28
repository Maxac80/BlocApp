import React, { useState, useEffect } from 'react';
import { Building, MapPin, Phone, Mail, CreditCard, FileText, Plus, Check } from 'lucide-react';
import { judeteRomania } from '../../data/counties';

/**
 * 🏢 ASSOCIATION STEP - CREAREA PRIMEI ASOCIAȚII (OPȚIONAL)
 */
export default function AssociationStep({ stepData, onUpdateData }) {
  const [skipStep, setSkipStep] = useState(stepData.skipStep || false);
  const [associationData, setAssociationData] = useState({
    name: '',
    cui: '',
    registrationNumber: '',
    address: {
      street: '',
      number: '',
      city: '',
      county: '',
      zipCode: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    bankAccount: {
      bank: '',
      iban: '',
      accountName: ''
    },
    ...stepData.associationData
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdateData({
        skipStep,
        associationData,
        isValid: skipStep || validateBasicInfo()
      });
    }, 300); // Debounce pentru a evita actualizări prea frecvente
    
    return () => clearTimeout(timeoutId);
  }, [skipStep, associationData]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateBasicInfo = () => {
    return associationData.name.trim().length > 0 &&
           associationData.address.street.trim().length > 0 &&
           associationData.address.city.trim().length > 0 &&
           associationData.address.county.trim().length > 0;
  };

  const handleInputChange = (path, value) => {
    setAssociationData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let target = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
      }
      
      target[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear validation error
    if (validationErrors[path]) {
      setValidationErrors(prev => ({
        ...prev,
        [path]: null
      }));
    }
  };

  const validateCUI = (cui) => {
    if (cui.length > 0 && (cui.length < 6 || cui.length > 10 || !/^\d+$/.test(cui))) {
      setValidationErrors(prev => ({
        ...prev,
        cui: 'CUI-ul trebuie să aibă între 6-10 cifre'
      }));
    }
  };

  const validateIBAN = (iban) => {
    if (iban.length > 0 && (iban.length !== 24 || !iban.startsWith('RO'))) {
      setValidationErrors(prev => ({
        ...prev,
        'bankAccount.iban': 'IBAN-ul românesc trebuie să aibă 24 caractere și să înceapă cu RO'
      }));
    }
  };

  if (skipStep) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-blue-50 rounded-xl p-8 border border-blue-200">
          <Check className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Perfect! Vei putea adăuga asociația mai târziu
          </h3>
          <p className="text-gray-600 mb-6">
            Nu-ți face griji - poți crea și configura asociația oricând din aplicația principală. 
            Pentru moment, să finalizăm configurarea contului tău.
          </p>
          
          <button
            onClick={() => setSkipStep(false)}
            className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Totuși vreau să adaug asociația acum
          </button>
        </div>

        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Ce poți face în aplicația principală:</h4>
          <ul className="text-sm text-gray-700 space-y-2 text-left max-w-md mx-auto">
            <li>• Creezi multiple asociații</li>
            <li>• Configurezi structura completă (blocuri, scări, apartamente)</li>
            <li>• Imporți date din Excel</li>
            <li>• Setezi toate tipurile de cheltuieli</li>
            <li>• Inviti proprietarii să se înregistreze</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* OPȚIUNE SKIP */}
      <div className="mb-8 text-center">
        <button
          onClick={() => setSkipStep(true)}
          className="text-gray-600 hover:text-gray-800 transition-colors text-sm"
        >
          Omite acest pas - voi adăuga asociația mai târziu →
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* INFO SIDEBAR */}
        <div className="lg:col-span-1">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 sticky top-4">
            <h4 className="font-semibold text-blue-900 mb-4">💡 Despre prima asociație</h4>
            <ul className="text-sm text-blue-800 space-y-3">
              <li className="flex items-start">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Poți începe cu informațiile de bază</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Datele se completează ulterior</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Poți crea multiple asociații</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Structura se configurează în app</span>
              </li>
            </ul>
          </div>
        </div>

        {/* FORMULAR PRINCIPAL */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* DATE GENERALE */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Informații generale
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Denumirea asociației *
                </label>
                <input
                  type="text"
                  value={associationData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Asociația de Proprietari Bloc A1"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CUI (opțional)
                  </label>
                  <input
                    type="text"
                    value={associationData.cui}
                    onChange={(e) => {
                      handleInputChange('cui', e.target.value);
                      validateCUI(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12345678"
                    maxLength="10"
                  />
                  {validationErrors.cui && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.cui}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nr. înregistrare (opțional)
                  </label>
                  <input
                    type="text"
                    value={associationData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: J40/12345/2020"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ADRESĂ */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Adresa asociației
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strada *
                </label>
                <input
                  type="text"
                  value={associationData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Strada Primăverii"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numărul
                </label>
                <input
                  type="text"
                  value={associationData.address.number}
                  onChange={(e) => handleInputChange('address.number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Codul poștal
                </label>
                <input
                  type="text"
                  value={associationData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456"
                  maxLength="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orașul *
                </label>
                <input
                  type="text"
                  value={associationData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="București"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Județul *
                </label>
                <select
                  value={associationData.address.county}
                  onChange={(e) => handleInputChange('address.county', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selectează județul</option>
                  {judeteRomania.map(county => (
                    <option key={county.cod} value={county.nume}>
                      {county.nume}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Date de contact
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={associationData.contact.phone}
                  onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0721234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={associationData.contact.email}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="asociatia@exemplu.ro"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website (opțional)
                </label>
                <input
                  type="url"
                  value={associationData.contact.website}
                  onChange={(e) => handleInputChange('contact.website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.asociatia.ro"
                />
              </div>
            </div>
          </div>

          {/* CONT BANCAR */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Cont bancar (opțional)
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banca
                </label>
                <input
                  type="text"
                  value={associationData.bankAccount.bank}
                  onChange={(e) => handleInputChange('bankAccount.bank', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Banca Transilvania"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={associationData.bankAccount.iban}
                  onChange={(e) => {
                    handleInputChange('bankAccount.iban', e.target.value.toUpperCase());
                    validateIBAN(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="RO49AAAA1B31007593840000"
                  maxLength="24"
                />
                {validationErrors['bankAccount.iban'] && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors['bankAccount.iban']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numele contului
                </label>
                <input
                  type="text"
                  value={associationData.bankAccount.accountName}
                  onChange={(e) => handleInputChange('bankAccount.accountName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Asociația de Proprietari..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROGRES COMPLETARE */}
      <div className="mt-8 bg-green-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-green-900">Progres completare asociație</span>
          <span className="text-green-700">{validateBasicInfo() ? '✓ Minim necesar completat' : 'În completare...'}</span>
        </div>
        <p className="text-sm text-green-800">
          Ai completat informațiile de bază necesare. Restul detaliilor se pot adăuga din aplicația principală.
        </p>
      </div>
    </div>
  );
}