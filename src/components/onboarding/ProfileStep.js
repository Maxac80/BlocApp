import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Building, Calendar, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { judeteRomania, getOraseByJudet } from '../../data/counties';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useBase64Upload } from '../../hooks/useBase64Upload';

/**
 * 👤 PROFILE STEP - COMPLETAREA DATELOR PERSONALE ȘI PROFESIONALE
 * 
 * Features:
 * - Formular complet cu validări în timp real
 * - Upload avatar cu preview
 * - Auto-completare adresă
 * - Progress indicator pentru completare
 * - Salvare automată draft
 */
export default function ProfileStep({ 
  stepData, 
  onUpdateData, 
  validationErrors = [],
  currentUser,
  profileManager,
  userProfile
}) {
  const { uploadAdminAvatar, isUploading } = useFileUpload();
  const { uploadAvatarBase64, isUploading: isUploadingBase64, getPreviewUrl } = useBase64Upload();
  // Extrage numele și prenumele din userProfile sau currentUser
  const getInitialName = () => {
    if (userProfile?.name) {
      const nameParts = userProfile.name.split(' ');
      return {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
      };
    }
    return { firstName: '', lastName: '' };
  };

  const initialName = getInitialName();

  const [formData, setFormData] = useState({
    // Date personale - pre-completate din profil
    firstName: stepData.firstName || initialName.firstName || '',
    lastName: stepData.lastName || initialName.lastName || '',
    phone: stepData.phone || userProfile?.phone || currentUser?.phoneNumber || '',
    email: stepData.email || userProfile?.email || currentUser?.email || '',
    
    // Adresă
    address: stepData.address || {
      street: '', // Strada și numărul combined
      city: '',
      county: ''
    },
    
    // Date profesionale
    professionalInfo: stepData.professionalInfo || {
      companyName: userProfile?.companyName || '',
      position: userProfile?.position || 'Administrator asociație',
      licenseNumber: ''
    },
    
    // Avatar - salvăm doar URL-ul nu File object
    avatarURL: stepData.avatarURL || userProfile?.photoURL || null,
    avatarPreview: stepData.avatarPreview || userProfile?.photoURL || null
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [touchedFields, setTouchedFields] = useState(new Set());

  // 📊 CALCULARE PROGRES COMPLETARE
  useEffect(() => {
    const requiredFields = [
      'firstName', 'lastName', 'phone',
      'address.city', 'address.county', 'address.street',
      'professionalInfo.position'
    ];

    const completedFields = requiredFields.filter(field => {
      const value = getNestedValue(formData, field);
      return value && value.toString().trim().length > 0;
    });

    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
    setCompletionPercentage(percentage);
  }, [formData]);

  // ✅ VALIDARE INIȚIALĂ PENTRU CÂMPURILE PRE-COMPLETATE
  useEffect(() => {
    const requiredFields = [
      'firstName', 'lastName', 'phone',
      'address.city', 'address.county', 'address.street',
      'professionalInfo.position'
    ];

    // Marchează câmpurile pre-completate ca touched
    const preFilledFields = requiredFields.filter(field => {
      const value = getNestedValue(formData, field);
      return value && value.toString().trim().length > 0;
    });

    if (preFilledFields.length > 0) {
      setTouchedFields(prev => new Set([...prev, ...preFilledFields]));
    }

    // Validează telefon dacă e pre-completat
    if (formData.phone && formData.phone.trim().length > 0) {
      validatePhone(formData.phone);
    }
  }, []); // Rulează doar la mount

  // 🔄 RESTAURARE TOUCHED FIELDS CÂND SE SCHIMBĂ stepData
  useEffect(() => {
    if (stepData && stepData.touchedFields) {
      setTouchedFields(new Set(stepData.touchedFields));
    }
  }, [stepData]);


  // 🔄 UPDATE PARENT DATA
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Calculează validarea pentru parent
      const requiredFields = [
        'firstName', 'lastName', 'phone',
        'address.city', 'address.county', 'address.street',
        'professionalInfo.position'
      ];

      const completedFields = requiredFields.filter(field => {
        const value = getNestedValue(formData, field);
        return value && value.toString().trim().length > 0;
      });

      const isValid = completedFields.length === requiredFields.length && Object.keys(fieldErrors).every(key => !fieldErrors[key]);
      const progress = Math.round((completedFields.length / requiredFields.length) * 100);

      onUpdateData({
        ...formData,
        isValid,
        progress,
        touchedFields: Array.from(touchedFields) // Salvează touched fields
      });
    }, 300); // Debounce pentru a evita actualizări prea frecvente

    return () => clearTimeout(timeoutId);
  }, [formData, fieldErrors, onUpdateData]);

  // 🔍 HELPER PENTRU NESTED VALUES
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  // 📝 GESTIONARE SCHIMBĂRI INPUT
  const handleInputChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      setNestedValue(newData, path, value);
      return newData;
    });
    
    // Marchează câmpul ca touched
    setTouchedFields(prev => new Set([...prev, path]));
    
    // Șterge eroarea pentru câmpul curent
    if (fieldErrors[path]) {
      setFieldErrors(prev => ({
        ...prev,
        [path]: null
      }));
    }
    
    // Validare în timp real pentru anumite câmpuri
    if (path === 'phone') {
      validatePhone(value);
    }
  };

  // ✅ VALIDĂRI SPECIFICE
  const validatePhone = (phone) => {
    if (phone && !/^(\+4|4|0)[0-9]{8,9}$/.test(phone.replace(/\s/g, ''))) {
      setFieldErrors(prev => ({
        ...prev,
        phone: 'Numărul de telefon nu este valid (ex: 0721234567)'
      }));
    } else {
      setFieldErrors(prev => ({
        ...prev,
        phone: null
      }));
    }
  };

  // 📷 UPLOAD AVATAR
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploadingAvatar(true);
    
    try {
      // Folosește Base64 pentru avatar (Firebase Storage necesită Blaze Plan)
      // console.log('🔄 Using Base64 upload for avatar...');
      
      const base64Result = await uploadAvatarBase64(file);
      
      // Salvează datele Base64 în formData
      setFormData(prev => ({
        ...prev,
        avatarURL: base64Result.base64,
        avatarPreview: base64Result.base64,
        avatarMetadata: {
          originalName: base64Result.originalName,
          size: base64Result.size,
          type: base64Result.type,
          uploadedAt: base64Result.uploadedAt,
          storageType: 'base64'
        }
      }));
      
      setFieldErrors(prev => ({
        ...prev,
        avatar: null
      }));
      
      // console.log('✅ Avatar uploaded successfully (Base64)');
      
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      setFieldErrors(prev => ({
        ...prev,
        avatar: error.message || 'Nu s-a putut încărca imaginea'
      }));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 🎨 RENDER FIELD ERROR
  const renderFieldError = (fieldPath) => {
    const error = fieldErrors[fieldPath] || validationErrors.find(e => e.includes(fieldPath));
    if (!error) return null;
    
    return (
      <p className="mt-1 text-xs text-red-600 flex items-center">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </p>
    );
  };

  // 🎨 RENDER FIELD SUCCESS
  const renderFieldSuccess = (fieldPath) => {
    const value = getNestedValue(formData, fieldPath);
    const isTouched = touchedFields.has(fieldPath);
    const hasError = fieldErrors[fieldPath];
    
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* DATE PERSONALE */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Date personale
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prenume <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ion"
                />
                {renderFieldError('firstName')}
                {renderFieldSuccess('firstName')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Popescu"
                />
                {renderFieldError('lastName')}
                {renderFieldSuccess('lastName')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                  placeholder="exemplu@email.com"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Email-ul nu poate fi modificat</p>
                {renderFieldSuccess('email')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0721234567"
                />
                {renderFieldError('phone')}
                {renderFieldSuccess('phone')}
              </div>
            </div>
          </div>

          {/* ADRESA DE DOMICILIU */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Adresa de domiciliu
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Județul <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.address.county}
                  onChange={(e) => handleInputChange('address.county', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localitatea <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="București, Ploiești, etc."
                />
                {renderFieldError('address.city')}
                {renderFieldSuccess('address.city')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strada și numărul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Strada Exemplu nr. 123A"
                />
                {renderFieldError('address.street')}
                {renderFieldSuccess('address.street')}
              </div>
            </div>
          </div>

          {/* DATE PROFESIONALE */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Date profesionale
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Funcția <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value="Administrator asociație"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  readOnly
                />
                {renderFieldError('professionalInfo.position')}
                {renderFieldSuccess('professionalInfo.position')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compania/Firma
                </label>
                <input
                  type="text"
                  value={formData.professionalInfo.companyName}
                  onChange={(e) => handleInputChange('professionalInfo.companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ex: SC Admin Bloc SRL"
                />
                {renderFieldError('professionalInfo.companyName')}
                {renderFieldSuccess('professionalInfo.companyName')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Număr atestat administrator
                </label>
                <input
                  type="text"
                  value={formData.professionalInfo.licenseNumber}
                  onChange={(e) => handleInputChange('professionalInfo.licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ex: ADM123456"
                />
                {renderFieldError('professionalInfo.licenseNumber')}
                {renderFieldSuccess('professionalInfo.licenseNumber')}
              </div>
            </div>
          </div>

        {/* ℹ️ INFO CONT ADMINISTRATOR */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">ℹ️ Cont Administrator asociație</h4>
          <p className="text-sm text-blue-800">
            Acest cont îți permite să creezi și să administrezi asociații de proprietari, să gestionezi cheltuielile și să coordonezi activitățile administrative.
          </p>
        </div>

      </div>
    </div>
  );
}