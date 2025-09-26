import React, { useState, useEffect } from 'react';
import { Building, MapPin, Mail, FileText, Plus, Check, CheckCircle } from 'lucide-react';
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
    ...stepData
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [availableCities, setAvailableCities] = useState([]);
  const [previousAssociationName, setPreviousAssociationName] = useState('');
  const [touchedFields, setTouchedFields] = useState(new Set());

  // 🔄 ACTUALIZARE CÂND SE SCHIMBĂ stepData
  useEffect(() => {
    if (stepData && Object.keys(stepData).length > 0) {
      // Restaurează datele
      const { touchedFields: savedTouchedFields, ...dataWithoutMeta } = stepData;

      setAssociationData(prevData => ({
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
        ...prevData, // Păstrează datele existente
        ...dataWithoutMeta  // Aplică datele noi din stepData (fără meta)
      }));

      // Restaurează touched fields dacă există
      if (savedTouchedFields) {
        setTouchedFields(new Set(savedTouchedFields));
      }
    }
  }, [stepData]);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Calculează progresul bazat pe câmpurile completate
      const basicFields = ['name', 'cui', 'registrationNumber', 'address.street', 'address.number', 'address.block', 'address.city', 'address.county'];
      const completedBasicFields = basicFields.filter(field => {
        const value = field.includes('.') ?
          associationData.address[field.split('.')[1]] :
          associationData[field];
        return value && value.toString().trim().length > 0;
      });

      const progress = Math.round((completedBasicFields.length / basicFields.length) * 100);
      const isValid = validateBasicInfo() && Object.keys(validationErrors).every(key => !validationErrors[key]);

      onUpdateData({
        ...associationData,
        isValid,
        progress,
        touchedFields: Array.from(touchedFields) // Convertim Set-ul la array pentru serializare
      });
    }, 300); // Debounce pentru a evita actualizări prea frecvente

    return () => clearTimeout(timeoutId);
  }, [associationData, validationErrors, touchedFields]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ VALIDARE INIȚIALĂ PENTRU CÂMPURILE PRE-COMPLETATE
  useEffect(() => {
    const basicFields = ['name', 'cui', 'registrationNumber', 'address.street', 'address.number', 'address.block', 'address.city', 'address.county'];

    // Marchează câmpurile pre-completate ca touched
    const preFilledFields = basicFields.filter(field => {
      const value = field.includes('.') ?
        associationData.address?.[field.split('.')[1]] :
        associationData[field];
      return value && value.toString().trim().length > 0;
    });

    if (preFilledFields.length > 0) {
      setTouchedFields(prev => new Set([...prev, ...preFilledFields]));
    }

    // Validări specifice pentru câmpuri pre-completate
    if (associationData.cui && associationData.cui.trim().length > 0) {
      validateCUI(associationData.cui);
    }
  }, [associationData.name, associationData.cui, associationData.registrationNumber]); // Se rulează când se schimbă datele principale

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
           associationData.address?.county?.trim().length > 0;
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

    // Marchează câmpul ca touched
    setTouchedFields(prev => new Set([...prev, path]));

    // Clear validation error
    if (validationErrors[path]) {
      setValidationErrors(prev => ({
        ...prev,
        [path]: null
      }));
    }

    // Validări specifice
    if (path === 'cui') {
      validateCUI(value);
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

  // 🎨 RENDER FIELD SUCCESS
  const renderFieldSuccess = (fieldPath) => {
    const value = fieldPath.includes('.') ?
      associationData[fieldPath.split('.')[0]]?.[fieldPath.split('.')[1]] :
      associationData[fieldPath];
    const isTouched = touchedFields.has(fieldPath);
    const hasError = validationErrors[fieldPath];

    if (!isTouched || hasError || !value || value.toString().trim().length === 0) {
      return null;
    }

    return (
      <p className="mt-1 text-xs text-green-600 flex items-center">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completat
      </p>
    );
  };

  // 🚨 RENDER FIELD ERROR
  const renderFieldError = (fieldPath) => {
    const error = validationErrors[fieldPath];
    if (!error) return null;

    return (
      <p className="mt-1 text-xs text-red-600 flex items-center">
        <span>⚠️ {error}</span>
      </p>
    );
  };



  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
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
                {renderFieldError('name')}
                {renderFieldSuccess('name')}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CUI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={associationData.cui}
                    onChange={(e) => handleInputChange('cui', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12345678"
                    maxLength="10"
                    required
                  />
                  {renderFieldError('cui')}
                  {renderFieldSuccess('cui')}
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
                  {renderFieldError('registrationNumber')}
                  {renderFieldSuccess('registrationNumber')}
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
                {renderFieldError('address.county')}
                {renderFieldSuccess('address.county')}
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
                {renderFieldError('address.city')}
                {renderFieldSuccess('address.city')}
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
                {renderFieldError('address.street')}
                {renderFieldSuccess('address.street')}
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
                {renderFieldError('address.number')}
                {renderFieldSuccess('address.number')}
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
                {renderFieldError('address.block')}
                {renderFieldSuccess('address.block')}
              </div>
            </div>
          </div>


        {/* 🚀 INFO DESPRE ASOCIAȚII */}
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <h4 className="font-medium text-green-900 mb-2">🚀 Gata să începi!</h4>
          <p className="text-sm text-green-800">
            Administrează cu ușurință asociația de proprietari.
          </p>
        </div>

      </div>
    </div>
  );
}