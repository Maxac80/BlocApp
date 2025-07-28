import React, { useState, useEffect } from 'react';
import { User, Camera, Phone, Mail, Building, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { judeteRomania } from '../../data/counties';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useBase64Upload } from '../../hooks/useBase64Upload';

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
  currentUser
}) => {
  const { uploadAdminAvatar, isUploading } = useFileUpload();
  const { uploadAvatarBase64, isUploading: isUploadingBase64, getPreviewUrl } = useBase64Upload();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    avatarURL: '',
    companyName: '',
    position: '',
    experience: '',
    licenseNumber: '',
    address: {
      street: '',
      number: '',
      city: '',
      county: '',
      zipCode: ''
    }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Încarcă datele existente
  useEffect(() => {
    if (association?.adminProfile) {
      setFormData({
        firstName: association.adminProfile.firstName || '',
        lastName: association.adminProfile.lastName || '',
        phone: association.adminProfile.phone || '',
        email: association.adminProfile.email || '',
        avatarURL: association.adminProfile.avatarURL || '',
        companyName: association.adminProfile.companyName || '',
        position: association.adminProfile.position || '',
        experience: association.adminProfile.experience || '',
        licenseNumber: association.adminProfile.licenseNumber || '',
        address: association.adminProfile.address || {
          street: '',
          number: '',
          city: '',
          county: '',
          zipCode: ''
        }
      });
    }
  }, [association]);

  // Salvare modificări
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await updateAssociation({
        adminProfile: {
          ...association.adminProfile,
          ...formData
        }
      });
      
      setIsEditing(false);
      setSaveMessage('Profilul a fost actualizat cu succes!');
      
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">👤 Profil Administrator</h2>
          <p className="text-gray-600 text-sm mt-1">Gestionează datele tale personale și profesionale</p>
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
                        // Reset la datele originale
                        if (association?.adminProfile) {
                          setFormData({
                            firstName: association.adminProfile.firstName || '',
                            lastName: association.adminProfile.lastName || '',
                            phone: association.adminProfile.phone || '',
                            email: association.adminProfile.email || '',
                            avatarURL: association.adminProfile.avatarURL || '',
                            companyName: association.adminProfile.companyName || '',
                            position: association.adminProfile.position || '',
                            experience: association.adminProfile.experience || '',
                            licenseNumber: association.adminProfile.licenseNumber || '',
                            address: association.adminProfile.address || {}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prenume</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Prenumele tău"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nume</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Numele tău"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="email@exemplu.ro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="0721234567"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compania</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="SC Admin Bloc SRL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Funcția</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Administrator asociație"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experiența</label>
                  <select
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">Selectează</option>
                    <option value="0-1">Sub 1 an</option>
                    <option value="1-3">1-3 ani</option>
                    <option value="3-5">3-5 ani</option>
                    <option value="5-10">5-10 ani</option>
                    <option value="10+">Peste 10 ani</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nr. licență/autorizație</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="ADM123456"
                  />
                </div>
              </div>
            </div>

            {/* Informații generale */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-medium text-gray-800 mb-3">ℹ️ Informații</h4>
              <ul className="text-sm text-gray-600 space-y-1">
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