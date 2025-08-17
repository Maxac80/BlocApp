import React, { useState, useEffect } from 'react';
import { User, Camera, Building, Save, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { judeteRomania } from '../../data/counties';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useBase64Upload } from '../../hooks/useBase64Upload';
import { useAuthEnhanced } from '../../context/AuthContextEnhanced';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import DashboardHeader from '../dashboard/DashboardHeader';

/**
 * 👤 PROFILE VIEW - EDITAREA PROFILULUI ADMINISTRATORULUI
 * 
 * Permite editarea:
 * - Avatar
 * - Date personale (nume, telefon, email)
 * - Date profesionale (companie, funcție, licență)
 * - Adresă
 */
const ProfileView = ({
  association,
  updateAssociation,
  userProfile,
  currentUser,
  currentMonth,
  setCurrentMonth,
  getAvailableMonths,
  expenses,
  isMonthReadOnly,
  getAssociationApartments,
  handleNavigation
}) => {
  const { isUploading } = useFileUpload();
  const { uploadAvatarBase64, isUploading: isUploadingBase64, getPreviewUrl } = useBase64Upload();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    avatarURL: '',
    companyName: '',
    position: '',
    licenseNumber: '',
    address: {
      street: '',
      number: '',
      building: '',
      apartment: '',
      city: '',
      county: ''
    }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Încarcă datele existente - inclusiv din wizard
  useEffect(() => {
    if (association?.adminProfile) {
      // Verificăm dacă avem date din wizard (structură diferită)
      const adminData = association.adminProfile;
      
      // Adresa poate veni fie ca obiect complet, fie ca proprietăți separate (format vechi)
      let addressData = {
        street: '',
        number: '',
        building: '',
        apartment: '',
        city: '',
        county: ''
      };
      
      if (adminData.address) {
        // Format nou din wizard
        addressData = {
          street: adminData.address.street || '',
          number: adminData.address.number || '',
          building: adminData.address.building || '',
          apartment: adminData.address.apartment || '',
          city: adminData.address.city || '',
          county: adminData.address.county || ''
        };
      }
      
      setFormData({
        firstName: adminData.firstName || '',
        lastName: adminData.lastName || '',
        phone: adminData.phone || '',
        email: adminData.email || currentUser?.email || '',
        avatarURL: adminData.avatarURL || '',
        companyName: adminData.companyName || '',
        position: adminData.position || '',
        licenseNumber: adminData.licenseNumber || '',
        address: addressData
      });
    } else if (currentUser) {
      // Dacă nu avem date salvate, folosim datele din currentUser
      setFormData(prev => ({
        ...prev,
        email: currentUser.email || prev.email
      }));
    }
  }, [association, currentUser]);

  // Validare formulare
  const validateForm = () => {
    const errors = {};
    
    // Câmpuri obligatorii
    if (!formData.firstName.trim()) errors.firstName = 'Prenumele este obligatoriu';
    if (!formData.lastName.trim()) errors.lastName = 'Numele este obligatoriu';
    if (!formData.phone.trim()) errors.phone = 'Telefonul este obligatoriu';
    if (!formData.email.trim()) errors.email = 'Email-ul este obligatoriu';
    
    // Validare telefon
    if (formData.phone && !/^(\+4|4|0)[0-9]{8,9}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Numărul de telefon nu este valid (ex: 0721234567)';
    }
    
    // Validare email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Adresa de email nu este validă';
    }
    
    // Adresă obligatorie
    if (!formData.address.county) errors['address.county'] = 'Județul este obligatoriu';
    if (!formData.address.city.trim()) errors['address.city'] = 'Localitatea este obligatorie';
    if (!formData.address.street.trim()) errors['address.street'] = 'Strada este obligatorie';
    if (!formData.address.number.trim()) errors['address.number'] = 'Numărul este obligatoriu';
    
    // Date profesionale obligatorii
    if (!formData.position) errors.position = 'Funcția este obligatorie';
    if (!formData.licenseNumber.trim()) errors.licenseNumber = 'Numărul atestatului este obligatoriu';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salvare modificări
  const handleSave = async () => {
    if (!validateForm()) {
      setSaveMessage('Vă rugăm completați toate câmpurile obligatorii');
      return;
    }
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // 1. Actualizează asociația
      await updateAssociation({
        adminProfile: {
          ...association.adminProfile,
          ...formData
        }
      });
      
      // 2. Actualizează userProfile în Firestore pentru ca Sidebar să se actualizeze
      if (currentUser?.uid) {
        const userProfileUpdates = {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          email: formData.email,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(doc(db, 'users', currentUser.uid), userProfileUpdates);
        console.log('✅ UserProfile actualizat în Firestore pentru Sidebar');
      }
      
      setIsEditing(false);
      setSaveMessage('Profilul a fost actualizat cu succes!');
      setValidationErrors({});
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setSaveMessage('Eroare la salvarea profilului');
    } finally {
      setIsSaving(false);
    }
  };

  // Upload avatar
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploadingAvatar(true);
    
    try {
      let avatarData;
      
      // Skip Firebase Storage pentru acum (necesită Blaze Plan)
      // Folosește direct Base64 pentru avatare
      console.log('🔄 Using Base64 upload (Firebase Storage requires Blaze Plan)...');
      
      const base64Result = await uploadAvatarBase64(file);
      avatarData = { 
        avatarURL: base64Result.base64,
        avatarMetadata: {
          originalName: base64Result.originalName,
          size: base64Result.size,
          type: base64Result.type,
          uploadedAt: base64Result.uploadedAt,
          storageType: 'base64'
        }
      };
      console.log('✅ Base64 upload successful');
      
      setFormData(prev => ({
        ...prev,
        avatarURL: avatarData.avatarURL
      }));
      
      // Salvează avatarul în asociație
      await updateAssociation({
        adminProfile: {
          ...association.adminProfile,
          ...avatarData
        }
      });
      
      setSaveMessage('Avatar actualizat cu succes! (Base64 storage)');
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      setSaveMessage(`Eroare la încărcarea avatarului: ${error.message}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Șterge eroarea pentru câmpul curent când se modifică
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  return (
    <div className={`min-h-screen p-4 ${
      currentMonth === currentMonthStr
        ? "bg-gradient-to-br from-indigo-50 to-blue-100"
        : "bg-gradient-to-br from-green-50 to-emerald-100"
    }`}>
    <div className="max-w-6xl mx-auto">
      
      {/* Header */}
      <DashboardHeader
        association={association}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        getAvailableMonths={getAvailableMonths}
        expenses={expenses}
        isMonthReadOnly={isMonthReadOnly}
        getAssociationApartments={getAssociationApartments}
        handleNavigation={handleNavigation}
      />

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👤 Profil Administrator</h1>
      </div>

      {/* Mesaj salvare */}
      {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            saveMessage.includes('succes') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {saveMessage.includes('succes') ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {saveMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center sticky top-4">
              <h4 className="font-semibold text-gray-900 mb-4">Fotografia ta</h4>
              
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg mx-auto">
                  {formData.avatarURL ? (
                    <img 
                      src={getPreviewUrl(formData.avatarURL) || formData.avatarURL} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-16 h-16" />
                    </div>
                  )}
                </div>
                
                {(isUploadingAvatar || isUploading(`avatars/admins/${currentUser?.uid}`) || isUploadingBase64) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <Camera className="w-4 h-4 mr-2" />
                {formData.avatarURL ? 'Schimbă foto' : 'Adaugă foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar || isUploading(`avatars/admins/${currentUser?.uid}`) || isUploadingBase64}
                />
              </label>
              
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG până la 2MB (redimensionată automat)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 Avatarele sunt stocate în Base64 (Firebase Storage necesită upgrade)
              </p>

              {/* Butoane Edit/Save */}
              <div className="mt-6 space-y-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Editează profil
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Salvez...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvează
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setValidationErrors({});
                        // Reset la datele originale
                        if (association?.adminProfile) {
                          const adminData = association.adminProfile;
                          let addressData = {
                            street: '',
                            number: '',
                            building: '',
                            apartment: '',
                            city: '',
                            county: ''
                          };
                          
                          if (adminData.address) {
                            addressData = {
                              street: adminData.address.street || '',
                              number: adminData.address.number || '',
                              building: adminData.address.building || '',
                              apartment: adminData.address.apartment || '',
                              city: adminData.address.city || '',
                              county: adminData.address.county || ''
                            };
                          }
                          
                          setFormData({
                            firstName: adminData.firstName || '',
                            lastName: adminData.lastName || '',
                            phone: adminData.phone || '',
                            email: adminData.email || currentUser?.email || '',
                            avatarURL: adminData.avatarURL || '',
                            companyName: adminData.companyName || '',
                            position: adminData.position || '',
                            licenseNumber: adminData.licenseNumber || '',
                            address: addressData
                          });
                        }
                      }}
                      className="w-full px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Anulează
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Formular Date */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Date Personale */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Date personale
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prenume <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Prenumele tău"
                  />
                  {validationErrors.firstName && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nume <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Numele tău"
                  />
                  {validationErrors.lastName && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="email@exemplu.ro"
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0721234567"
                  />
                  {validationErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Adresa de domiciliu */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Adresa de domiciliu
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Județul <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.address.county}
                    onChange={(e) => handleInputChange('address.county', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors['address.county'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selectează județul</option>
                    {judeteRomania.map(county => (
                      <option key={county.cod} value={county.nume}>
                        {county.nume}
                      </option>
                    ))}
                  </select>
                  {validationErrors['address.county'] && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors['address.county']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localitatea <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors['address.city'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="București, Ploiești, etc."
                  />
                  {validationErrors['address.city'] && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors['address.city']}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors['address.street'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Strada Exemplu"
                  />
                  {validationErrors['address.street'] && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors['address.street']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numărul <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.number}
                    onChange={(e) => handleInputChange('address.number', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors['address.number'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123A"
                  />
                  {validationErrors['address.number'] && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors['address.number']}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blocul/Scara/Apartamentul</label>
                  <input
                    type="text"
                    value={formData.address.apartment}
                    onChange={(e) => handleInputChange('address.apartment', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Ap. 15"
                  />
                </div>
              </div>
            </div>

            {/* Date Profesionale */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Date profesionale
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Funcția <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors.position ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selectează funcția</option>
                    <option value="Administrator asociație">Administrator asociație</option>
                    <option value="Președinte">Președinte</option>
                    <option value="Cenzor">Cenzor</option>
                  </select>
                  {validationErrors.position && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.position}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compania/Firma (opțional)</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Ex: SC Admin Bloc SRL"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Număr atestat administrator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      validationErrors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ex: ADM123456"
                  />
                  {validationErrors.licenseNumber && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationErrors.licenseNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Informații generale */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-medium text-gray-800 mb-3">ℹ️ Informații</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Câmpurile marcate cu <span className="text-red-500">*</span> sunt obligatorii</li>
                <li>• Avatarul tău apare în sidebar și în documentele generate</li>
                <li>• Datele personale sunt folosite pentru semnarea documentelor</li>
                <li>• Informațiile profesionale ajută la validarea calității de administrator</li>
                <li>• Toate datele sunt stocate securizat și sunt vizibile doar pentru tine</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;