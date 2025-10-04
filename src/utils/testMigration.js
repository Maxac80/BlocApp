// utils/testMigration.js
// Script pentru testarea migrării sheet-based în browser console

export const testSheetBasedMigration = async () => {
  console.log('🚀 Testing Sheet-Based Migration...');

  try {
    // 1. Analizează structura actuală
    console.log('📊 Step 1: Analyzing current data structure...');
    if (typeof window !== 'undefined' && window.dataMigration) {
      const analysis = await window.dataMigration.analyze();
      console.log('✅ Analysis complete:', analysis);

      // 2. Migrează datele
      console.log('🔄 Step 2: Migrating data to sheets...');
      const migration = await window.dataMigration.migrate(analysis);
      console.log('✅ Migration complete:', migration);

      // 3. Verifică rezultatele
      console.log('🔍 Step 3: Verifying migration results...');
      const verification = await verifyMigration();
      console.log('✅ Verification complete:', verification);

      return {
        success: true,
        analysis,
        migration,
        verification
      };
    } else {
      console.error('❌ Migration tools not available. Make sure app is loaded.');
      return { success: false, error: 'Migration tools not available' };
    }
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    return { success: false, error: error.message };
  }
};

const verifyMigration = async () => {
  console.log('🔍 Verifying migrated data in sheets...');

  try {
    // Import Firebase functions
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase');

    // Check sheets for migrated data
    const sheetsSnapshot = await getDocs(collection(db, 'sheets'));
    const migratedSheets = [];

    sheetsSnapshot.forEach(doc => {
      const data = doc.data();
      const verification = {
        id: doc.id,
        monthYear: data.monthYear,
        status: data.status,
        hasExpenseConfigurations: !!(data.configSnapshot?.expenseConfigurations && Object.keys(data.configSnapshot.expenseConfigurations).length > 0),
        hasSuppliers: !!(data.configSnapshot?.suppliers && data.configSnapshot.suppliers.length > 0),
        hasDisabledExpenses: !!(data.configSnapshot?.disabledExpenses && data.configSnapshot.disabledExpenses.length > 0),
        hasSheetInitialBalances: !!(data.configSnapshot?.sheetInitialBalances && Object.keys(data.configSnapshot.sheetInitialBalances).length > 0)
      };

      if (verification.hasExpenseConfigurations || verification.hasSuppliers || verification.hasDisabledExpenses || verification.hasSheetInitialBalances) {
        migratedSheets.push(verification);
      }
    });

    return {
      totalSheets: sheetsSnapshot.size,
      migratedSheets: migratedSheets.length,
      sheetsWithData: migratedSheets,
      summary: {
        expenseConfigurations: migratedSheets.filter(s => s.hasExpenseConfigurations).length,
        suppliers: migratedSheets.filter(s => s.hasSuppliers).length,
        disabledExpenses: migratedSheets.filter(s => s.hasDisabledExpenses).length,
        sheetInitialBalances: migratedSheets.filter(s => s.hasSheetInitialBalances).length
      }
    };
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
};

// Expune funcția pentru browser console
if (typeof window !== 'undefined') {
  window.testSheetMigration = testSheetBasedMigration;
}