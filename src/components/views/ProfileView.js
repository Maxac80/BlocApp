import React, { useState, useEffect } from 'react';
import { User, Camera, Building, Save, AlertCircle, CheckCircle, MapPin, FileText, Shield, Upload, Eye, X, Download } from 'lucide-react';
import { judeteRomania } from '../../data/counties';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useBase64Upload } from '../../hooks/useBase64Upload';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import DashboardHeader from '../dashboard/DashboardHeader';

/**
 * 👤 PROFILE VIEW - EDITAREA PROFILULUI ADMINISTRATORULUI CU TAB-URI
 *
 * Permite editarea:
 * - Avatar
 * - Date personale (nume, telefon, email)
 * - Date profesionale (companie, funcție, licență)
 * - Adresă
 * - Documente administrator
 */
const ProfileView = ({
  association,
  blocks = [],
  stairs = [],
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
      city: '',
      county: ''
    },
    documents: {} // Inițializează cu obiect gol pentru documente
  });

  const [activeTab, setActiveTab] = useState('date'); // 'date' sau 'documente'
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  // const [previewDocument, setPreviewDocument] = useState(null); // Document preview not implemented yet
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
        city: '',
        county: ''
      };

      if (adminData.address) {
        // Format nou din wizard
        addressData = {
          street: adminData.address.street || '',
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

    // Date personale obligatorii
    if (!formData.firstName.trim()) errors.firstName = 'Prenumele este obligatoriu';
    if (!formData.lastName.trim()) errors.lastName = 'Numele este obligatoriu';
    if (!formData.phone.trim()) errors.phone = 'Telefonul este obligatoriu';
    if (!formData.email.trim()) errors.email = 'Email-ul este obligatoriu';

    // Validare telefon
    const phoneRegex = /^(\+4|4|0)[0-9]{8,9}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Numărul de telefon nu este valid (ex: 0721234567)';
    }

    // Adresă obligatorie
    if (!formData.address.street?.trim()) errors['address.street'] = 'Strada este obligatorie';
    if (!formData.address.city?.trim()) errors['address.city'] = 'Localitatea este obligatorie';
    if (!formData.address.county?.trim()) errors['address.county'] = 'Județul este obligatoriu';

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
      const base64Result = await uploadAvatarBase64(file);

      setFormData(prev => ({
        ...prev,
        avatarURL: base64Result.base64,
        avatarMetadata: {
          originalName: base64Result.originalName,
          size: base64Result.size,
          type: base64Result.type,
          uploadedAt: base64Result.uploadedAt,
          storageType: 'base64'
        }
      }));

      setValidationErrors(prev => ({
        ...prev,
        avatar: null
      }));

    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      setValidationErrors(prev => ({
        ...prev,
        avatar: error.message || 'Nu s-a putut încărca imaginea'
      }));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Upload document
  const handleDocumentUpload = async (event, documentId) => {
    const file = event.target.files[0];
    if (!file || !isEditing) return;

    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;

    // Validează tipul fișierului
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!document.acceptedTypes.includes(fileExtension)) {
      setValidationErrors(prev => ({
        ...prev,
        [`document_${documentId}`]: `Tipul de fișier nu este acceptat. Acceptate: ${document.acceptedTypes.join(', ')}`
      }));
      return;
    }

    // Validează dimensiunea
    if (file.size > document.maxSize) {
      setValidationErrors(prev => ({
        ...prev,
        [`document_${documentId}`]: `Fișierul este prea mare. Maximum ${Math.round(document.maxSize / 1024 / 1024)}MB`
      }));
      return;
    }

    // Setează progress
    setUploadProgress(prev => ({
      ...prev,
      [documentId]: 0
    }));

    try {
      // Simulează progres pentru UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [documentId]: Math.min((prev[documentId] || 0) + 20, 90)
        }));
      }, 200);

      const base64Result = await uploadAvatarBase64(file);
      clearInterval(progressInterval);

      // Actualizează documentul în formData
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentId]: {
            uploaded: true,
            name: file.name,
            size: file.size,
            type: file.type,
            base64: base64Result.base64,
            uploadedAt: new Date().toISOString()
          }
        }
      }));

      // Finalizează progress
      setUploadProgress(prev => ({
        ...prev,
        [documentId]: 100
      }));

      // Șterge progress după 2 secunde
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 2000);

      // Șterge eroarea
      setValidationErrors(prev => ({
        ...prev,
        [`document_${documentId}`]: null
      }));

    } catch (error) {
      console.error('❌ Error uploading document:', error);
      setValidationErrors(prev => ({
        ...prev,
        [`document_${documentId}`]: error.message || 'Nu s-a putut încărca documentul'
      }));

      // Șterge progress
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[documentId];
        return newProgress;
      });
    }
  };

  // Previzualizare document - not implemented yet
  const handleDocumentPreview = (documentId) => {
    const documentData = formData.documents?.[documentId];
    if (!documentData || !documentData.uploaded) return;

    // TODO: Implement document preview modal
    alert(`Preview pentru ${documentData.name} - funcție în dezvoltare`);

    // setPreviewDocument({
    //   name: documentData.name,
    //   type: documentData.type,
    //   url: documentData.base64
    // });
  };

  // Ștergere document
  const handleDocumentDelete = (documentId) => {
    if (!isEditing) return;

    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentId]: {
          uploaded: false,
          name: null,
          size: null,
          type: null,
          base64: null,
          uploadedAt: null
        }
      }
    }));

    setValidationErrors(prev => ({
      ...prev,
      [`document_${documentId}`]: null
    }));
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const keys = field.split('.');
        const newData = { ...prev };
        let current = newData;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        return newData;
      } else {
        return { ...prev, [field]: value };
      }
    });

    // Șterge eroarea pentru câmpul curent
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const monthType = getMonthType ? getMonthType(currentMonth) : null;

  return (
    <div
      id="profile-view-top"
      className={`min-h-screen px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-4 pb-20 lg:pb-2 ${
        monthType === 'current'
          ? "bg-gradient-to-br from-indigo-50 to-blue-100"
          : monthType === 'next'
          ? "bg-gradient-to-br from-green-50 to-emerald-100"
          : monthType === 'historic'
          ? "bg-gradient-to-br from-gray-50 to-gray-100"
          : "bg-gradient-to-br from-indigo-50 to-blue-100"
      }`}
    >
      <div className="w-full">
        {/* Header */}
        <DashboardHeader
          association={association}
          blocks={blocks}
          stairs={stairs}
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
        <div className="mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Profil Administrator</h1>
        </div>

        {/* Mesaj salvare */}
        {saveMessage && (
          <div className={`mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-md flex items-center text-xs sm:text-sm ${
            saveMessage.includes('succes')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {saveMessage.includes('succes') ? (
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
            )}
            {saveMessage}
          </div>
        )}

        {/* Tab Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b overflow-x-auto">
            <div className="flex">
              <button
                onClick={() => setActiveTab('date')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'date'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Date </span>Administrator
              </button>
              <button
                onClick={() => setActiveTab('documente')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'documente'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Documente </span>Administrator
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Tab 1: Date Administrator */}
            {activeTab === 'date' && (
              <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Avatar Section */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 text-center sticky top-4">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Fotografia ta</h4>

                    <div className="relative inline-block mb-3">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg mx-auto">
                        {formData.avatarURL ? (
                          <img
                            src={getPreviewUrl(formData.avatarURL) || formData.avatarURL}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-10 h-10 sm:w-12 sm:h-12" />
                          </div>
                        )}
                      </div>

                      {(isUploadingAvatar || isUploading(`avatars/admins/${currentUser?.uid}`) || isUploadingBase64) && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>

                    <label className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                      {formData.avatarURL ? 'Schimbă foto' : 'Adaugă foto'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isUploadingAvatar || isUploading(`avatars/admins/${currentUser?.uid}`) || isUploadingBase64}
                      />
                    </label>

                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5">
                      JPG, PNG până la 2MB
                    </p>

                    {/* Butoane Edit/Save */}
                    <div className="mt-4 space-y-2">
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Editează profil
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                          >
                            {isSaving ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                                Salvez...
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 mr-1.5" />
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
                                  city: '',
                                  county: ''
                                };

                                if (adminData.address) {
                                  addressData = {
                                    street: adminData.address.street || '',
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
                            className="w-full px-3 py-1.5 text-xs sm:text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                          >
                            Anulează
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formular Date */}
                <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                  {/* Date Personale */}
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Date personale
                    </h4>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Prenume <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nume <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                            validationErrors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="exemplu@email.com"
                        />
                        {validationErrors.email && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {validationErrors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Telefon <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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

                  {/* ADRESA DE DOMICILIU */}
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Adresa de domiciliu
                    </h4>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Județul <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.address.county}
                          onChange={(e) => handleInputChange('address.county', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Localitatea <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => handleInputChange('address.city', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Strada și numărul <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.address.street}
                          onChange={(e) => handleInputChange('address.street', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                            validationErrors['address.street'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Strada Exemplu nr. 123"
                        />
                        {validationErrors['address.street'] && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {validationErrors['address.street']}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date Profesionale */}
                  <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <Building className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Date profesionale
                    </h4>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Funcția <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value="Administrator asociație"
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700"
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">Compania/Firma (opțional)</label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                          placeholder="Ex: SC Admin Bloc SRL"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Număr atestat administrator <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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
                </div>
              </div>
            )}

            {/* Tab 2: Documente Administrator */}
            {activeTab === 'documente' && (
              <div className="space-y-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Documentele administratorului
                </h3>

                <div className="grid gap-3">
                  {documents.map((document) => {
                    const documentData = formData.documents?.[document.id] || {};
                    const isUploaded = documentData.uploaded;
                    const isUploading = uploadProgress[document.id] !== undefined;

                    return (
                      <div
                        key={document.id}
                        className={`
                          border-2 rounded-md p-3 transition-all duration-300
                          ${isUploaded
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <div className={`
                              p-1.5 rounded-md mr-2 flex-shrink-0
                              ${isUploaded
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}>
                              <document.icon className="w-4 h-4" />
                            </div>

                            <div className="flex-1">
                              <h5 className="text-xs sm:text-sm font-medium text-gray-900 flex items-center">
                                {document.title}
                                {document.required && <span className="text-red-500 ml-1">*</span>}
                              </h5>
                              <p className="text-gray-600 text-xs mt-0.5">{document.description}</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                                {document.tips}
                              </p>
                            </div>
                          </div>

                          {/* STATUS ICON */}
                          <div className="flex-shrink-0">
                            {isUploaded ? (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                            ) : document.required ? (
                              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                            ) : null}
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {isEditing && (
                            <>
                              <label className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors text-xs">
                                <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                                {isUploaded ? 'Înlocuiește' : 'Încarcă'}
                                <input
                                  type="file"
                                  accept={document.acceptedTypes.join(',')}
                                  onChange={(e) => handleDocumentUpload(e, document.id)}
                                  className="hidden"
                                  disabled={isUploading}
                                />
                              </label>

                              {isUploaded && (
                                <button
                                  onClick={() => handleDocumentDelete(document.id)}
                                  className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                                >
                                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                                  Șterge
                                </button>
                              )}
                            </>
                          )}

                          {isUploaded && (
                            <>
                              <button
                                onClick={() => handleDocumentPreview(document.id)}
                                className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs"
                              >
                                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                                Vezi
                              </button>

                              <a
                                href={documentData.base64}
                                download={documentData.name}
                                className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                              >
                                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                                Descarcă
                              </a>
                            </>
                          )}
                        </div>

                        {/* PROGRESS BAR */}
                        {isUploading && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                              <span>Se încarcă...</span>
                              <span>{uploadProgress[document.id]}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[document.id]}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* ERROR MESSAGE */}
                        {validationErrors[`document_${document.id}`] && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-xs text-red-600 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {validationErrors[`document_${document.id}`]}
                            </p>
                          </div>
                        )}

                        {!isEditing && !isUploaded && (
                          <div className="mt-2 text-center py-2 sm:py-3 border-2 border-dashed border-gray-300 rounded-md bg-gray-50">
                            <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-gray-400 mb-1" />
                            <p className="text-xs text-gray-500">
                              {document.required ? 'Document obligatoriu' : 'Document opțional'}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-400">Activează editarea pentru a adăuga</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* INFORMAȚII DOCUMENTE */}
                <div className="mt-4 bg-blue-50 rounded-md p-2.5 sm:p-3">
                  <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1.5">Informații despre documente</h5>
                  <ul className="text-[10px] sm:text-xs text-blue-800 space-y-0.5">
                    <li>• Documentele cu * sunt obligatorii</li>
                    <li>• Documentele sunt criptate și stocate în siguranță</li>
                    <li>• Pentru modificări, activează editarea profilului</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;