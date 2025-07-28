import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, Download, Shield } from 'lucide-react';

/**
 * 📄 DOCUMENTS STEP - UPLOAD DOCUMENTE OBLIGATORII
 * 
 * Features:
 * - Drag & drop pentru upload
 * - Preview documente uploadate
 * - Validări tip și dimensiune fișier
 * - Progress indicator upload
 * - Posibilitate ștergere documente
 * - Lista documentelor obligatorii vs opționale
 */
export default function DocumentsStep({ 
  stepData, 
  onUpdateData, 
  validationErrors = [],
  currentUser,
  profileManager
}) {
  const [dragStates, setDragStates] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [previewDocument, setPreviewDocument] = useState(null);

  // 📋 LISTA DOCUMENTELOR
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
      id: 'adminContract',
      title: 'Contract de administrare',
      description: 'Contractul semnat cu asociația de proprietari',
      required: true,
      icon: FileText,
      acceptedTypes: ['.pdf', '.doc', '.docx'],
      maxSize: 10 * 1024 * 1024, // 10MB
      tips: 'Include toate paginile cu semnături și ștampile'
    },
    {
      id: 'certifications',
      title: 'Certificate/Cursuri',
      description: 'Certificate de competență sau cursuri de specializare',
      required: false,
      icon: FileText,
      acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      tips: 'Opțional - pot fi adăugate și mai târziu din profil'
    },
    {
      id: 'businessLicense',
      title: 'Licență de funcționare',
      description: 'Licența de funcționare pentru activitatea de administrare',
      required: false,
      icon: FileText,
      acceptedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      maxSize: 5 * 1024 * 1024, // 5MB
      tips: 'Dacă ai firmă proprie de administrare'
    }
  ];

  // 📊 CALCULARE PROGRES UPLOAD
  const calculateProgress = () => {
    const requiredDocs = documents.filter(doc => doc.required);
    const uploadedRequired = requiredDocs.filter(doc => stepData[doc.id]?.uploaded);
    return Math.round((uploadedRequired.length / requiredDocs.length) * 100);
  };

  // ✅ VERIFICARE DACĂ TOATE DOCUMENTELE OBLIGATORII SUNT ÎNCĂRCATE
  const areRequiredDocumentsUploaded = () => {
    const requiredDocs = documents.filter(doc => doc.required);
    return requiredDocs.every(doc => stepData[doc.id]?.uploaded === true);
  };

  // 🔄 UPDATE VALIDATION STATE
  useEffect(() => {
    // Actualizează starea cu informația despre validare
    const isValid = areRequiredDocumentsUploaded();
    const currentData = {
      ...stepData,
      isValid: isValid,
      progress: calculateProgress()
    };
    
    // Doar actualizează dacă s-a schimbat starea de validare
    if (stepData.isValid !== isValid) {
      onUpdateData(currentData);
    }
  }, [stepData]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📝 VALIDARE FIȘIER
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

  // 📤 UPLOAD FIȘIER
  const handleFileUpload = async (file, documentId) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    // Validare fișier
    const validationErrors = validateFile(file, document);
    if (validationErrors.length > 0) {
      onUpdateData({
        ...stepData,
        [documentId]: {
          ...stepData[documentId],
          error: validationErrors[0]
        }
      });
      return;
    }
    
    setUploadProgress(prev => ({ ...prev, [documentId]: 0 }));
    
    try {
      // Simulare upload cu progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(prev => ({ ...prev, [documentId]: progress }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Creare URL preview local
      const previewUrl = URL.createObjectURL(file);
      
      // Update state cu documentul uploadat
      onUpdateData({
        ...stepData,
        [documentId]: {
          uploaded: true,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadDate: new Date().toISOString(),
          previewUrl,
          file, // Păstrăm fișierul pentru upload real ulterior
          error: null
        }
      });
      
      // Șterge progress după 1 secundă
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[documentId];
          return newProgress;
        });
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      onUpdateData({
        ...stepData,
        [documentId]: {
          ...stepData[documentId],
          error: 'Nu s-a putut uploada fișierul. Te rugăm să încerci din nou.'
        }
      });
      
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[documentId];
        return newProgress;
      });
    }
  };

  // 🗑️ ȘTERGERE DOCUMENT
  const handleDocumentDelete = (documentId) => {
    const documentData = stepData[documentId];
    if (documentData?.previewUrl) {
      URL.revokeObjectURL(documentData.previewUrl);
    }
    
    onUpdateData({
      ...stepData,
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
    });
  };

  // 👁️ PREVIEW DOCUMENT
  const handleDocumentPreview = (documentId) => {
    const documentData = stepData[documentId];
    if (documentData?.previewUrl) {
      setPreviewDocument({
        id: documentId,
        name: documentData.fileName,
        url: documentData.previewUrl,
        type: documentData.fileType
      });
    }
  };

  // 🎯 DRAG & DROP HANDLERS
  const handleDragOver = useCallback((e, documentId) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [documentId]: true }));
  }, []);

  const handleDragLeave = useCallback((e, documentId) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [documentId]: false }));
  }, []);

  const handleDrop = useCallback((e, documentId) => {
    e.preventDefault();
    setDragStates(prev => ({ ...prev, [documentId]: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0], documentId);
    }
  }, [stepData]);

  // 🎨 FORMATARE DIMENSIUNE FIȘIER
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const progress = calculateProgress();

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* 📊 PROGRESS HEADER */}
      <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Progres upload documente</h3>
          <span className="text-2xl font-bold text-green-600">{progress}%</span>
        </div>
        <div className="w-full bg-green-200 rounded-full h-3">
          <div 
            className="bg-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-green-700 mt-2">
          Upload documentele obligatorii pentru a continua (documente cu *)
        </p>
      </div>

      {/* 🛡️ SECURITATE INFO */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900">Siguranța documentelor tale</h4>
            <p className="text-sm text-blue-800 mt-1">
              Toate documentele sunt criptate și stocate în siguranță. Sunt folosite doar pentru verificarea identității și nu sunt împărtășite cu terțe părți.
            </p>
          </div>
        </div>
      </div>

      {/* 📄 LISTA DOCUMENTELOR */}
      <div className="grid gap-6">
        {documents.map((document) => {
          const documentData = stepData[document.id] || {};
          const isUploaded = documentData.uploaded;
          const isUploading = uploadProgress[document.id] !== undefined;
          const isDragging = dragStates[document.id];
          const hasError = documentData.error;
          
          return (
            <div 
              key={document.id}
              className={`
                bg-white rounded-xl border-2 transition-all duration-300
                ${isDragging 
                  ? 'border-blue-400 bg-blue-50' 
                  : isUploaded 
                  ? 'border-green-200 bg-green-50'
                  : hasError
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start">
                    <div className={`
                      p-3 rounded-lg mr-4 flex-shrink-0
                      ${isUploaded 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      <document.icon className="w-6 h-6" />
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        {document.title}
                        {document.required && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1">{document.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 {document.tips}
                      </p>
                    </div>
                  </div>
                  
                  {/* STATUS ICON */}
                  <div>
                    {isUploaded ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : hasError ? (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : null}
                  </div>
                </div>

                {/* ERROR MESSAGE */}
                {hasError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {documentData.error}
                    </p>
                  </div>
                )}

                {/* UPLOADED FILE INFO */}
                {isUploaded && !isUploading && (
                  <div className="mb-4 p-4 bg-green-100 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <p className="font-medium text-green-900">{documentData.fileName}</p>
                          <p className="text-sm text-green-700">
                            {formatFileSize(documentData.fileSize)} • Uploadat {new Date(documentData.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDocumentPreview(document.id)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-200 rounded-lg transition-colors"
                          title="Previzualizează"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDocumentDelete(document.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-200 rounded-lg transition-colors"
                          title="Șterge"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPLOAD PROGRESS */}
                {isUploading && (
                  <div className="mb-4 p-4 bg-blue-100 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-900 font-medium">Se uploadează...</span>
                      <span className="text-blue-700">{uploadProgress[document.id]}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[document.id]}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* UPLOAD AREA */}
                {!isUploaded && !isUploading && (
                  <div
                    onDragOver={(e) => handleDragOver(e, document.id)}
                    onDragLeave={(e) => handleDragLeave(e, document.id)}
                    onDrop={(e) => handleDrop(e, document.id)}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer
                      ${isDragging 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                    
                    <p className="font-medium text-gray-900 mb-2">
                      {isDragging ? 'Eliberează pentru upload' : 'Drag & drop sau selectează fișierul'}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Tipuri acceptate: {document.acceptedTypes.join(', ')} • 
                      Max {Math.round(document.maxSize / 1024 / 1024)}MB
                    </p>
                    
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 mr-2" />
                      Selectează fișierul
                      <input
                        type="file"
                        accept={document.acceptedTypes.join(',')}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleFileUpload(file, document.id);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 📋 INFORMAȚII SUPLIMENTARE */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-3">ℹ️ Informații importante</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• Documentele cu * sunt obligatorii pentru a continua</li>
          <li>• Toate documentele sunt criptate și stocate în siguranță</li>
          <li>• Poți adăuga documentele opționale și mai târziu din profil</li>
          <li>• Scanează documentele în rezoluție bună pentru verificare rapidă</li>
          <li>• Dimensiunea maximă per fișier este de 10MB</li>
        </ul>
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
  );
}