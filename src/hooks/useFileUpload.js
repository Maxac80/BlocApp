import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * 📁 HOOK PENTRU UPLOAD FIȘIERE ÎN FIREBASE STORAGE
 * 
 * Funcționalități:
 * - Upload poze profil, documente
 * - Generare URL-uri pentru Firestore
 * - Progress tracking pentru upload-uri
 * - Validări fișiere (tip, mărime)
 * - Ștergere fișiere vechi
 */
export const useFileUpload = () => {
  const [uploading, setUploading] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  // 📤 UPLOAD FIȘIER INDIVIDUAL
  const uploadFile = async (file, path, fileName = null) => {
    if (!file) throw new Error('Nu s-a furnizat fișier');
    
    const finalFileName = fileName || `${Date.now()}_${file.name}`;
    const fileRef = ref(storage, `${path}/${finalFileName}`);
    const uploadId = `${path}/${finalFileName}`;
    
    try {
      setUploading(prev => ({ ...prev, [uploadId]: true }));
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      
      console.log('🔄 Starting upload for:', uploadId);
      
      // Upload fișier cu metadata pentru a evita CORS issues
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: 'blocapp',
          timestamp: Date.now().toString()
        }
      };
      
      const snapshot = await uploadBytes(fileRef, file, metadata);
      console.log('✅ Upload completed:', snapshot.ref.fullPath);
      
      // Obține URL download cu un mic delay pentru a evita race conditions
      await new Promise(resolve => setTimeout(resolve, 500));
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Download URL obtained:', downloadURL);
      
      return {
        url: downloadURL,
        path: snapshot.ref.fullPath,
        name: finalFileName,
        size: file.size,
        type: file.type
      };
      
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      
      // Încearcă să ofere un mesaj mai clar
      if (error.code === 'storage/unauthorized') {
        throw new Error('Nu ai permisiune să încarci fișiere. Verifică autentificarea.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload-ul a fost anulat.');
      } else if (error.code === 'storage/unknown') {
        throw new Error('Eroare necunoscută la upload. Încearcă din nou.');
      }
      
      throw error;
    } finally {
      setUploading(prev => ({ ...prev, [uploadId]: false }));
      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
    }
  };

  // 📷 UPLOAD AVATAR ADMINISTRATOR
  const uploadAdminAvatar = async (file, userId) => {
    validateImageFile(file);
    
    const path = `avatars/admins/${userId}`;
    const fileName = `avatar_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    return await uploadFile(file, path, fileName);
  };

  // 📄 UPLOAD DOCUMENT ADMINISTRATOR
  const uploadAdminDocument = async (file, userId, documentType) => {
    validateDocumentFile(file);
    
    const path = `documents/admins/${userId}`;
    const fileName = `${documentType}_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    return await uploadFile(file, path, fileName);
  };

  // 🏢 UPLOAD DOCUMENTE ASOCIAȚIE
  const uploadAssociationDocument = async (file, associationId, documentType) => {
    validateDocumentFile(file);
    
    const path = `documents/associations/${associationId}`;
    const fileName = `${documentType}_${associationId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    return await uploadFile(file, path, fileName);
  };

  // 🗑️ ȘTERGERE FIȘIER
  const deleteFile = async (filePath) => {
    if (!filePath) return;
    
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      console.log('✅ File deleted successfully:', filePath);
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  };

  // ✅ VALIDARE IMAGINE
  const validateImageFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipul fișierului nu este suportat. Folosește JPG, PNG sau WebP.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Fișierul este prea mare. Dimensiunea maximă este 5MB.');
    }
  };

  // ✅ VALIDARE DOCUMENT
  const validateDocumentFile = (file) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipul fișierului nu este suportat. Folosește PDF, Word sau imagine.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Fișierul este prea mare. Dimensiunea maximă este 10MB.');
    }
  };

  // 📊 BATCH UPLOAD MULTIPLE FIȘIERE
  const uploadMultipleFiles = async (files, basePath, userId) => {
    const results = [];
    
    for (const { file, type } of files) {
      try {
        let result;
        
        if (type === 'avatar') {
          result = await uploadAdminAvatar(file, userId);
        } else {
          result = await uploadAdminDocument(file, userId, type);
        }
        
        results.push({ type, ...result, success: true });
      } catch (error) {
        results.push({ 
          type, 
          success: false, 
          error: error.message,
          fileName: file.name 
        });
      }
    }
    
    return results;
  };

  return {
    // Core functions
    uploadFile,
    deleteFile,
    
    // Specialized functions
    uploadAdminAvatar,
    uploadAdminDocument,
    uploadAssociationDocument,
    uploadMultipleFiles,
    
    // Validation
    validateImageFile,
    validateDocumentFile,
    
    // State
    uploading,
    uploadProgress,
    
    // Utilities
    isUploading: (uploadId) => uploading[uploadId] || false,
    getProgress: (uploadId) => uploadProgress[uploadId] || 0
  };
};