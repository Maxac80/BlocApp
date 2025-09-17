import { useState } from 'react';

/**
 * 📁 HOOK PENTRU UPLOAD IMAGINI FĂRĂ FIREBASE STORAGE
 * 
 * Folosește Base64 pentru a stoca imaginile direct în Firestore
 * Limitare: imagini mici (sub 1MB) din cauza limitărilor Firestore
 */
export const useBase64Upload = () => {
  const [isUploading, setIsUploading] = useState(false);

  // 📷 CONVERTEȘTE IMAGINE ÎN BASE64
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  };

  // 🔄 RESIZE IMAGINE PENTRU A REDUCE DIMENSIUNEA
  const resizeImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculează dimensiunile noi păstrând aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Desenează imaginea redimensionată
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertește la blob
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // ✅ VALIDARE IMAGINE
  const validateImageFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB pentru Base64
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipul fișierului nu este suportat. Folosește JPG, PNG sau WebP.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Fișierul este prea mare. Dimensiunea maximă este 2MB.');
    }
  };

  // 📤 UPLOAD AVATAR FOLOSIND BASE64
  const uploadAvatarBase64 = async (file) => {
    if (!file) throw new Error('Nu s-a furnizat fișier');
    
    try {
      setIsUploading(true);
      
      // Validează fișierul
      validateImageFile(file);
      
      // console.log('🔄 Processing image for Base64 storage...');
      
      // Redimensionează imaginea pentru a reduce dimensiunea
      const resizedFile = await resizeImage(file, 200, 200, 0.7);
      
      // Convertește la Base64
      const base64String = await imageToBase64(resizedFile);
      
      // console.log('✅ Image processed successfully');
      // console.log('📊 Original size:', file.size, 'bytes');
      // console.log('📊 Processed size:', base64String.length, 'characters');
      
      // Verifică dacă Base64 nu este prea mare pentru Firestore (1MB limit)
      if (base64String.length > 1048487) { // ~1MB în Base64
        throw new Error('Imaginea este prea mare chiar și după redimensionare. Încearcă o imagine mai mică.');
      }
      
      return {
        base64: base64String,
        originalName: file.name,
        size: resizedFile.size,
        type: resizedFile.type,
        uploadedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error processing image:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // 🖼️ GENEREAZĂ URL PENTRU PREVIEW DIN BASE64
  const getPreviewUrl = (base64String) => {
    if (!base64String) return null;
    
    // Dacă e deja un URL complet, returnează-l
    if (base64String.startsWith('data:image/')) {
      return base64String;
    }
    
    // Dacă e doar Base64 fără prefix, adaugă prefixul
    return `data:image/jpeg;base64,${base64String}`;
  };

  return {
    // Core functions
    uploadAvatarBase64,
    imageToBase64,
    resizeImage,
    getPreviewUrl,
    
    // Validation
    validateImageFile,
    
    // State
    isUploading
  };
};