import { doc, collection } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firestore Helper Functions for Nested Sheets Structure
 *
 * These helpers ensure consistent path construction for the nested sheets
 * collection under associations.
 *
 * Structure: associations/{associationId}/sheets/{sheetId}
 */

/**
 * Get a reference to a specific sheet document
 *
 * @param {string} associationId - The association ID
 * @param {string} sheetId - The sheet ID
 * @returns {DocumentReference} Firestore document reference
 *
 * @example
 * const sheetRef = getSheetRef(associationId, currentSheet.id);
 * await updateDoc(sheetRef, { status: 'PUBLISHED' });
 */
export const getSheetRef = (associationId, sheetId) => {
  if (!associationId) {
    throw new Error('associationId is required for getSheetRef');
  }
  if (!sheetId) {
    throw new Error('sheetId is required for getSheetRef');
  }
  return doc(db, 'associations', associationId, 'sheets', sheetId);
};

/**
 * Get a reference to the sheets collection for an association
 *
 * @param {string} associationId - The association ID
 * @returns {CollectionReference} Firestore collection reference
 *
 * @example
 * const sheetsQuery = query(
 *   getSheetsCollection(associationId),
 *   where('status', '==', 'PUBLISHED')
 * );
 * const snapshot = await getDocs(sheetsQuery);
 */
export const getSheetsCollection = (associationId) => {
  if (!associationId) {
    throw new Error('associationId is required for getSheetsCollection');
  }
  return collection(db, 'associations', associationId, 'sheets');
};

/**
 * Create a new sheet document reference with auto-generated ID
 *
 * @param {string} associationId - The association ID
 * @returns {DocumentReference} Firestore document reference with auto-generated ID
 *
 * @example
 * const newSheetRef = createNewSheetRef(associationId);
 * await setDoc(newSheetRef, {
 *   monthYear: 'noiembrie 2025',
 *   status: 'IN_PROGRESS',
 *   ...sheetData
 * });
 */
export const createNewSheetRef = (associationId) => {
  if (!associationId) {
    throw new Error('associationId is required for createNewSheetRef');
  }
  return doc(getSheetsCollection(associationId));
};

/**
 * Validate that a sheet belongs to the specified association
 * Helper function for security checks in components
 *
 * @param {string} associationId - The expected association ID
 * @param {Object} sheet - The sheet document data
 * @returns {boolean} True if sheet belongs to association
 *
 * @example
 * if (!validateSheetOwnership(associationId, sheetData)) {
 *   throw new Error('Sheet does not belong to this association');
 * }
 */
export const validateSheetOwnership = (associationId, sheet) => {
  // With nested structure, this is automatically enforced by Firestore path
  // But we keep this function for backwards compatibility and explicit checks
  return sheet && sheet.associationId === associationId;
};

/**
 * Migration helper: Check if we're using old flat structure or new nested structure
 * This can be used during transition period to support both structures
 *
 * @param {string} path - The document path
 * @returns {boolean} True if using new nested structure
 *
 * @example
 * const isNested = isNestedStructure(sheetRef.path);
 * console.log(isNested ? 'Using new structure' : 'Using old structure');
 */
export const isNestedStructure = (path) => {
  return path && path.includes('associations/') && path.includes('/sheets/');
};
