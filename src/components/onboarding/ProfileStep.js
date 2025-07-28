import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Building, Calendar, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { judeteRomania } from '../../data/counties';
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
    cnp: stepData.cnp || '',
    phone: stepData.phone || userProfile?.phone || currentUser?.phoneNumber || '',
    email: stepData.email || userProfile?.email || currentUser?.email || '',
    birthDate: stepData.birthDate || '',
    gender: stepData.gender || '',
    
    // Adresă
    address: stepData.address || {
      street: '',
      number: '',
      building: '',
      apartment: '',
      city: '',
      county: '',
      zipCode: ''
    },
    
    // Date profesionale
    professionalInfo: stepData.professionalInfo || {
      companyName: userProfile?.companyName || '',
      position: userProfile?.position || '',
      experience: '',
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
      'address.city', 'address.county',
      'professionalInfo.companyName'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = getNestedValue(formData, field);
      return value && value.toString().trim().length > 0;
    });
    
    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
    setCompletionPercentage(percentage);
  }, [formData]);

  // 🔄 UPDATE PARENT DATA
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdateData(formData);
    }, 300); // Debounce pentru a evita actualizări prea frecvente
    
    return () => clearTimeout(timeoutId);
  }, [formData, onUpdateData]);

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
    if (path === 'cnp') {
      validateCNP(value);
    } else if (path === 'phone') {
      validatePhone(value);
    }
  };

  // ✅ VALIDĂRI SPECIFICE
  const validateCNP = (cnp) => {
    if (cnp && cnp.length === 13) {
      // Validare CNP românesc simplificată
      if (!/^\d{13}$/.test(cnp)) {
        setFieldErrors(prev => ({
          ...prev,
          cnp: 'CNP-ul trebuie să conțină doar cifre'
        }));
      } else {
        setFieldErrors(prev => ({
          ...prev,
          cnp: null
        }));
      }
    }
  };

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
      console.log('🔄 Using Base64 upload for avatar...');
      
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
      
      console.log('✅ Avatar uploaded successfully (Base64)');
      
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
      
      {/* 📊 PROGRESS HEADER */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Progres completare profil</h3>
          <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-blue-700 mt-2">
          Completează minim 80% pentru a continua la pasul următor
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* 📷 AVATAR SECTION */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
            <h4 className="font-semibold text-gray-900 mb-4">Fotografia ta</h4>
            
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                {formData.avatarPreview ? (
                  <img 
                    src={formData.avatarPreview} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>
              
              {(isUploadingAvatar || isUploading(`avatars/admins/${currentUser?.uid}`) || isUploadingBase64) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <Camera className="w-4 h-4 mr-2" />
              {formData.avatarPreview ? 'Schimbă foto' : 'Adaugă foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploadingAvatar || isUploading(`avatars/admins/${currentUser?.uid}`) || isUploadingBase64}
              />
            </label>
            
            {renderFieldError('avatar')}
            
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG până la 2MB (redimensionată automat)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              💡 Base64 storage (Firebase Storage necesită upgrade)
            </p>
          </div>
        </div>

        {/* 📝 FORMULAR PRINCIPAL */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* DATE PERSONALE */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Date personale
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prenume *
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
                  Nume *
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
                  Email *
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
                  CNP (opțional)
                </label>
                <input
                  type="text"
                  value={formData.cnp}
                  onChange={(e) => handleInputChange('cnp', e.target.value)}
                  maxLength="13"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="1234567890123"
                />
                {renderFieldError('cnp')}
                {renderFieldSuccess('cnp')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon *
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data nașterii (opțional)
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {renderFieldSuccess('birthDate')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gen (opțional)
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Selectează</option>
                  <option value="masculin">Masculin</option>
                  <option value="feminin">Feminin</option>
                </select>
                {renderFieldSuccess('gender')}
              </div>
            </div>
          </div>

          {/* ADRESĂ */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Adresă
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strada *
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Strada Exemplu"
                />
                {renderFieldError('address.street')}
                {renderFieldSuccess('address.street')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numărul
                </label>
                <input
                  type="text"
                  value={formData.address.number}
                  onChange={(e) => handleInputChange('address.number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="123A"
                />
                {renderFieldSuccess('address.number')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blocul/Apartamentul
                </label>
                <input
                  type="text"
                  value={formData.address.apartment}
                  onChange={(e) => handleInputChange('address.apartment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ap. 15"
                />
                {renderFieldSuccess('address.apartment')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orașul *
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="București"
                />
                {renderFieldError('address.city')}
                {renderFieldSuccess('address.city')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Județul *
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
                  Codul poștal
                </label>
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="123456"
                  maxLength="6"
                />
                {renderFieldSuccess('address.zipCode')}
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
                  Compania/Firma *
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Funcția
                </label>
                <input
                  type="text"
                  value={formData.professionalInfo.position}
                  onChange={(e) => handleInputChange('professionalInfo.position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Administrator asociație"
                />
                {renderFieldSuccess('professionalInfo.position')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiența (ani)
                </label>
                <select
                  value={formData.professionalInfo.experience}
                  onChange={(e) => handleInputChange('professionalInfo.experience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Selectează</option>
                  <option value="0-1">Sub 1 an</option>
                  <option value="1-3">1-3 ani</option>
                  <option value="3-5">3-5 ani</option>
                  <option value="5-10">5-10 ani</option>
                  <option value="10+">Peste 10 ani</option>
                </select>
                {renderFieldSuccess('professionalInfo.experience')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Număr licență/autorizație
                </label>
                <input
                  type="text"
                  value={formData.professionalInfo.licenseNumber}
                  onChange={(e) => handleInputChange('professionalInfo.licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ex: ADM123456"
                />
                {renderFieldSuccess('professionalInfo.licenseNumber')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 💡 TIPS PENTRU COMPLETARE */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">💡 Sfaturi pentru completarea profilului</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Datele cu * sunt obligatorii pentru a continua</li>
          <li>• Fotografia îți va apărea în documentele generate</li>
          <li>• Adresa va fi folosită pentru corespondența oficială</li>
          <li>• Datele profesionale ajută la generarea documentelor legale</li>
        </ul>
      </div>
    </div>
  );
}