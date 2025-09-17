import React, { useState, useEffect } from 'react';
import { User, Camera, Building, Save, AlertCircle, CheckCircle, MapPin, FileText, Shield, Upload, Eye, X, Download } from 'lucide-react';
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
  handleNavigation,
  getMonthType
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
    },
    documents: {} // Inițializează cu obiect gol pentru documente
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [previewDocument, setPreviewDocument] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});

  // 📋 LISTA DOCUMENTELOR ADMINISTRATORULUI
  const documents = [
    {
      id: 'idCard',
      title: 'Carte de identitate',
      description: 'Copie după cartea de identitate (față și verso)',
      required: true,
      icon: FileText,
      acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      tips: 'Scanează în rezoluție bună, textul să fie lizibil'
    },
    {
      id: 'adminAttestation',
      title: 'Atestat Administrator',
      description: 'Atestat care dovedește calitatea de administrator de condominii',
      required: true,
      icon: FileText,
      acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      tips: 'Document obligatoriu pentru activitatea de administrare'
    },
    {
      id: 'criminalRecord',
      title: 'Cazier judiciar',
      description: 'Cazier care atestă lipsa condamnărilor pentru infracțiuni economico-financiare',
      required: true,
      icon: Shield,
      acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      tips: 'Nu mai vechi de 6 luni, cu apostilă dacă este necesar'
    },
    {
      id: 'professionalCertifications',
      title: 'Certificate Calificare Profesională',
      description: 'Certificate de competență sau cursuri de specializare',
      required: false,
      icon: FileText,
      acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      tips: 'Opțional - dovezi suplimentare de competență profesională'
    },
    {
      id: 'adminContract',
      title: 'Contract de administrare',
      description: 'Contractul semnat cu asociația de proprietari',
      required: false,
      icon: FileText,
      acceptedTypes: ['.pdf', '.doc', '.docx'],
      maxSize: 10 * 1024 * 1024, // 10MB
      tips: 'Opțional - contract semnat cu asociația'
    }
  ];

  // Scroll to top when ProfileView mounts
  useEffect(() => {
    const scrollToTop = () => {
      // Find the main scroll container (with overflow-y-scroll)
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        mainContainer.scrollTop = 0;
      } else {
        // Fallback to window scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    
    // Immediate scroll
    scrollToTop();
    
    // Additional attempt after a short delay to ensure layout is complete
    setTimeout(scrollToTop, 100);
  }, []); // Run only once when component mounts

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
      
      // Debugging pentru documente
      // console.log('🔍 DEBUG: Loading admin profile with documents:', adminData.documents);
      
      setFormData({
        firstName: adminData.firstName || '',
        lastName: adminData.lastName || '',
        phone: adminData.phone || '',
        email: adminData.email || currentUser?.email || '',
        avatarURL: adminData.avatarURL || '',
        companyName: adminData.companyName || '',
        position: adminData.position || adminData.professionalInfo?.position || 'Administrator asociație',
        licenseNumber: adminData.licenseNumber || adminData.professionalInfo?.licenseNumber || '',
        address: addressData,
        // Documentele pot veni din wizard sau din profilul salvat
        documents: adminData.documents || {}
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
      // 1. Actualizează asociația (inclusiv documentele)
      await updateAssociation({
        adminProfile: {
          ...association.adminProfile,
          ...formData,
          documents: formData.documents || {}
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
        // console.log('✅ UserProfile actualizat în Firestore pentru Sidebar');
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
      // console.log('🔄 Using Base64 upload (Firebase Storage requires Blaze Plan)...');
      
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
      // console.log('✅ Base64 upload successful');
      
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

  // 📝 VALIDARE FIȘIER DOCUMENT
  const validateFile = (file, document) => {
    const errors = [];
    
    // Verificare tip fișier
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!document.acceptedTypes.includes(fileExtension)) {
      errors.push(`Tip fișier neacceptat. Folosește: ${document.acceptedTypes.join(', ')}`);
    }
    
    // Verificare dimensiune
    if (file.size > document.maxSize) {
      const maxSizeMB = Math.round(document.maxSize / 1024 / 1024);
      errors.push(`Fișierul este prea mare. Dimensiunea maximă: ${maxSizeMB}MB`);
    }
    
    return errors;
  };

  // 📤 UPLOAD DOCUMENT
  const handleDocumentUpload = async (file, documentId) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    // Validare fișier
    const validationErrors = validateFile(file, document);
    if (validationErrors.length > 0) {
      setSaveMessage(`Eroare document: ${validationErrors[0]}`);
      return;
    }
    
    setUploadProgress(prev => ({ ...prev, [documentId]: 0 }));
    
    try {
      // Convertire fișier în Base64
      const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };

      // Simulare upload cu progress
      for (let progress = 0; progress <= 50; progress += 10) {
        setUploadProgress(prev => ({ ...prev, [documentId]: progress }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Convertește în Base64
      // console.log(`🔄 Converting ${file.name} to Base64...`);
      const base64Data = await fileToBase64(file);
      
      // Continuă progress
      for (let progress = 60; progress <= 100; progress += 10) {
        setUploadProgress(prev => ({ ...prev, [documentId]: progress }));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Folosește Base64 direct ca preview URL
      const previewUrl = base64Data;
      
      // Update state cu documentul uploadat
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentId]: {
            uploaded: true,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadDate: new Date().toISOString(),
            previewUrl,
            base64: base64Data, // Salvăm datele Base64
            storageType: 'base64', // Marcăm că este salvat în Base64
            error: null
          }
        }
      }));
      
      // Șterge progress după 1 secundă
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 1000);
      
      setSaveMessage(`Document "${document.title}" încărcat cu succes!`);
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error uploading document:', error);
      setSaveMessage('Nu s-a putut uploada documentul. Te rugăm să încerci din nou.');
      
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[documentId];
        return newProgress;
      });
    }
  };

  // 🗑️ ȘTERGERE DOCUMENT
  const handleDocumentDelete = (documentId) => {
    const documentData = formData.documents?.[documentId];
    if (documentData?.previewUrl) {
      URL.revokeObjectURL(documentData.previewUrl);
    }
    
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentId]: {
          uploaded: false,
          fileName: '',
          fileSize: 0,
          fileType: '',
          uploadDate: null,
          previewUrl: null,
          file: null,
          error: null
        }
      }
    }));
    
    setSaveMessage('Document șters cu succes');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // 👁️ PREVIEW DOCUMENT
  const handleDocumentPreview = (documentId) => {
    const documentData = formData.documents?.[documentId];
    if (documentData?.previewUrl) {
      setPreviewDocument({
        id: documentId,
        name: documentData.fileName,
        url: documentData.previewUrl,
        type: documentData.fileType
      });
    }
  };

  // 🎨 FORMATARE DIMENSIUNE FIȘIER
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  return (
    <div 
      id="profile-view-top"
      className={`min-h-screen p-6 ${
        monthType === 'current'
          ? "bg-gradient-to-br from-indigo-50 to-blue-100"
          : monthType === 'next'
          ? "bg-gradient-to-br from-green-50 to-emerald-100"
          : monthType === 'historic'
          ? "bg-gradient-to-br from-gray-50 to-gray-100"
          : "bg-gradient-to-br from-indigo-50 to-blue-100"
      }`}>
    <div className="w-full">
      
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
        getMonthType={getMonthType}
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
                            address: addressData,
                            documents: adminData.documents || {}
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
                  <input
                    type="text"
                    value="Administrator asociație"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    readOnly
                  />
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

            {/* DOCUMENTE ADMINISTRATOR */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documentele administratorului
              </h4>
              
              <div className="grid gap-4">
                {documents.map((document) => {
                  const documentData = formData.documents?.[document.id] || {};
                  const isUploaded = documentData.uploaded;
                  const isUploading = uploadProgress[document.id] !== undefined;
                  
                  return (
                    <div 
                      key={document.id}
                      className={`
                        border-2 rounded-lg p-4 transition-all duration-300
                        ${isUploaded 
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div className={`
                            p-2 rounded-lg mr-3 flex-shrink-0
                            ${isUploaded 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            <document.icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 flex items-center">
                              {document.title}
                              {document.required && <span className="text-red-500 ml-1">*</span>}
                            </h5>
                            <p className="text-gray-600 text-sm mt-1">{document.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              💡 {document.tips}
                            </p>
                          </div>
                        </div>
                        
                        {/* STATUS ICON */}
                        <div className="flex-shrink-0">
                          {isUploaded ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : document.required ? (
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                          ) : null}
                        </div>
                      </div>

                      {/* UPLOADED FILE INFO */}
                      {isUploaded && !isUploading && (
                        <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-green-600 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-green-900">{documentData.fileName}</p>
                                <p className="text-xs text-green-700">
                                  {formatFileSize(documentData.fileSize)} • Uploadat {new Date(documentData.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDocumentPreview(document.id)}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded transition-colors"
                                title="Previzualizează"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {isEditing && (
                                <button
                                  onClick={() => handleDocumentDelete(document.id)}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-200 rounded transition-colors"
                                  title="Șterge"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* UPLOAD PROGRESS */}
                      {isUploading && (
                        <div className="mt-3 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-900 font-medium text-sm">Se uploadează...</span>
                            <span className="text-blue-700 text-sm">{uploadProgress[document.id]}%</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[document.id]}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* UPLOAD BUTTON */}
                      {!isUploaded && !isUploading && isEditing && (
                        <div className="mt-3">
                          <label className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploaded ? 'Schimbă document' : 'Selectează fișierul'}
                            <input
                              type="file"
                              accept={document.acceptedTypes.join(',')}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleDocumentUpload(file, document.id);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            {document.acceptedTypes.join(', ')} • Max {Math.round(document.maxSize / 1024 / 1024)}MB
                          </p>
                        </div>
                      )}

                      {!isEditing && !isUploaded && (
                        <div className="mt-3 text-center py-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            {document.required ? 'Document obligatoriu' : 'Document opțional'}
                          </p>
                          <p className="text-xs text-gray-400">Activează editarea pentru a adăuga</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* INFORMAȚII DOCUMENTE */}
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">ℹ️ Informații despre documente</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Documentele cu * sunt obligatorii pentru activitatea de administrare</li>
                  <li>• Toate documentele sunt criptate și stocate în siguranță</li>
                  <li>• Documentele pot fi vizualizate și descărcate oricând</li>
                  <li>• Pentru modificări, activează editarea profilului</li>
                </ul>
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

        {/* 🖼️ MODAL PREVIEW DOCUMENT */}
        {previewDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{previewDocument.name}</h3>
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                {previewDocument.type.startsWith('image/') ? (
                  <img 
                    src={previewDocument.url} 
                    alt={previewDocument.name}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Previzualizarea nu este disponibilă pentru acest tip de fișier.
                    </p>
                    <a
                      href={previewDocument.url}
                      download={previewDocument.name}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descarcă fișierul
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;