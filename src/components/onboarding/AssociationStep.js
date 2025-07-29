import React, { useState, useEffect } from 'react';
import { Building, MapPin, Phone, Mail, CreditCard, FileText, Plus, Check } from 'lucide-react';
import { judeteRomania } from '../../data/counties';

/**
 * 🏢 ASSOCIATION STEP - CREAREA PRIMEI ASOCIAȚII (OPȚIONAL)
 */
export default function AssociationStep({ stepData, onUpdateData }) {
  const [associationData, setAssociationData] = useState({
    name: '',
    cui: '',
    registrationNumber: '',
    address: {
      street: '',
      number: '',
      block: '',
      city: '',
      county: ''
    },
    contact: {
      phone: '',
      email: ''
    },
    bankAccount: {
      bank: '',
      iban: '',
      accountName: ''
    },
    ...stepData.associationData
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdateData({
        associationData,
        isValid: validateBasicInfo()
      });
    }, 300); // Debounce pentru a evita actualizări prea frecvente
    
    return () => clearTimeout(timeoutId);
  }, [associationData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizare orașe bazate pe județ
  useEffect(() => {
    if (associationData.address.county) {
      const judet = judeteRomania.find(j => j.nume === associationData.address.county);
      if (judet) {
        setAvailableCities(judet.orase || []);
      }
    } else {
      setAvailableCities([]);
    }
  }, [associationData.address.county]);

  const validateBasicInfo = () => {
    return associationData.name?.trim().length > 0 &&
           associationData.cui?.trim().length > 0 &&
           associationData.registrationNumber?.trim().length > 0 &&
           associationData.address?.street?.trim().length > 0 &&
           associationData.address?.number?.trim().length > 0 &&
           associationData.address?.block?.trim().length > 0 &&
           associationData.address?.city?.trim().length > 0 &&
           associationData.address?.county?.trim().length > 0 &&
           associationData.bankAccount?.bank?.trim().length > 0 &&
           associationData.bankAccount?.iban?.trim().length > 0 &&
           associationData.bankAccount?.accountName?.trim().length > 0;
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
      
      // Reset orașul când se schimbă județul
      if (path === 'address.county') {
        newData.address.city = '';
      }
      
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
    if (!cui || cui.trim().length === 0) {
      setValidationErrors(prev => ({
        ...prev,
        cui: 'CUI-ul este obligatoriu'
      }));
    } else if (cui.length < 6 || cui.length > 10 || !/^\d+$/.test(cui)) {
      setValidationErrors(prev => ({
        ...prev,
        cui: 'CUI-ul trebuie să aibă între 6-10 cifre'
      }));
    } else {
      setValidationErrors(prev => ({
        ...prev,
        cui: null
      }));
    }
  };

  const validateIBAN = (iban, path) => {
    if (!iban || iban.trim().length === 0) {
      setValidationErrors(prev => ({
        ...prev,
        [path]: 'IBAN-ul este obligatoriu'
      }));
    } else if (iban.length !== 24 || !iban.startsWith('RO')) {
      setValidationErrors(prev => ({
        ...prev,
        [path]: 'IBAN-ul românesc trebuie să aibă 24 caractere și să înceapă cu RO'
      }));
    } else {
      setValidationErrors(prev => ({
        ...prev,
        [path]: null
      }));
    }
  };


  return (
    <div className="max-w-4xl mx-auto">
      

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
                  Denumirea asociației <span className="text-red-500">*</span>
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
                    CUI <span className="text-red-500">*</span>
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
                    required
                  />
                  {validationErrors.cui && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.cui}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nr. înregistrare <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={associationData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: J40/12345/2020"
                    required
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Județul <span className="text-red-500">*</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orașul <span className="text-red-500">*</span>
                </label>
                <select
                  value={associationData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!associationData.address.county}
                >
                  <option value="">{associationData.address.county ? 'Selectează orașul' : 'Selectează mai întâi județul'}</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strada <span className="text-red-500">*</span>
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
                  Numărul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={associationData.address.number}
                  onChange={(e) => handleInputChange('address.number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123A"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blocul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={associationData.address.block}
                  onChange={(e) => handleInputChange('address.block', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="A1, B2, etc."
                  required
                />
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Date de contact asociație
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

            </div>
          </div>

          {/* CONT BANCAR */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Cont bancar <span className="text-red-500">*</span>
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={associationData.bankAccount.bank}
                  onChange={(e) => handleInputChange('bankAccount.bank', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: CEC Bank"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={associationData.bankAccount.iban}
                  onChange={(e) => {
                    handleInputChange('bankAccount.iban', e.target.value.toUpperCase());
                    validateIBAN(e.target.value, 'bankAccount.iban');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="RO49AAAA1B31007593840000"
                  maxLength="24"
                  required
                />
                {validationErrors['bankAccount.iban'] && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors['bankAccount.iban']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numele contului <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={associationData.bankAccount.accountName}
                  onChange={(e) => handleInputChange('bankAccount.accountName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Asociația de Proprietari..."
                  required
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