/**
 * 📧 EMAIL SIMULATOR PENTRU TESTARE
 * 
 * Simulează trimiterea de email-uri și afișează link-urile în consolă
 * pentru testare în development
 */

export class EmailSimulator {
  static isDevelopment = process.env.NODE_ENV === 'development';
  
  // 📧 SIMULARE EMAIL VERIFICARE
  static simulateEmailVerification(user) {
    if (!this.isDevelopment) return;
    
    // console.log('📧 EMAIL VERIFICATION SIMULATED');
    // console.log('=====================================');
    // console.log(`To: ${user.email}`);
    // console.log(`Subject: Verifică-ți adresa de email pentru BlocApp`);
    // console.log('');
    // console.log('🔗 CLICK pe link-ul de mai jos pentru a-ți verifica emailul:');
    // console.log(`https://blocapp-production.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=DEMO_CODE&apiKey=demo`);
    // console.log('');
    // console.log('💡 Pentru testare: Apasă butonul "Am verificat emailul" din aplicație');
    // console.log('=====================================');
    
    // Afișează și o notificare în UI
    this.showNotificationInUI('Email de verificare trimis! Verifică consola pentru link.');
  }
  
  // 🔄 SIMULARE RESET PAROLĂ
  static simulatePasswordReset(email) {
    if (!this.isDevelopment) return;
    
    // console.log('🔄 PASSWORD RESET SIMULATED');
    // console.log('=====================================');
    // console.log(`To: ${email}`);
    // console.log(`Subject: Resetează-ți parola pentru BlocApp`);
    // console.log('');
    // console.log('🔗 CLICK pe link-ul de mai jos pentru a-ți reseta parola:');
    // console.log(`https://blocapp-production.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=DEMO_CODE&apiKey=demo`);
    // console.log('');
    // console.log('💡 Pentru testare: Folosește opțiunea "Am uitat parola" din login');
    // console.log('=====================================');
    
    this.showNotificationInUI('Email de resetare trimis! Verifică consola pentru link.');
  }
  
  // 🎉 SIMULARE EMAIL WELCOME
  static simulateWelcomeEmail(user, completionData) {
    if (!this.isDevelopment) return;
    
    // console.log('🎉 WELCOME EMAIL SIMULATED');
    // console.log('=====================================');
    // console.log(`To: ${user.email}`);
    // console.log(`Subject: Bine ai venit în BlocApp, ${user.displayName || 'Administrator'}!`);
    // console.log('');
    // console.log('🎊 Felicitări! Ai completat cu succes configurarea contului!');
    // console.log('');
    // console.log(`📊 Progres onboarding: ${completionData.completedSteps}/${completionData.totalSteps} pași`);
    // console.log('📄 Documente încărcate: ✓');
    // console.log('⚙️ Setări configurate: ✓');
    // console.log('');
    // console.log('🔗 Resurse utile:');
    // console.log('• Ghid de început: https://blocapp.ro/guide');
    // console.log('• Suport: support@blocapp.ro');
    // console.log('• Video tutoriale: https://youtube.com/blocapp');
    // console.log('=====================================');
  }
  
  // 🔔 NOTIFICARE ÎN UI
  static showNotificationInUI(message) {
    // Creează o notificare temporară în aplicație
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="mr-3">📧</div>
        <div class="text-sm">${message}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Șterge după 5 secunde
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
  
  // 🔗 SIMULARE CLICK PE LINK EMAIL VERIFICARE
  static simulateEmailVerificationClick() {
    if (!this.isDevelopment) return;
    
    // console.log('🔗 SIMULARE: Utilizatorul a clickat pe linkul de verificare');
    // console.log('=====================================');
    
    // Obține utilizatorul curent din Firebase
    if (window.firebase && window.firebase.auth && window.firebase.auth.currentUser) {
      const userId = window.firebase.auth.currentUser.uid;
      // Setează flag în localStorage pentru simulare
      localStorage.setItem(`email_verified_simulated_${userId}`, 'true');
      // console.log(`✅ Flag de verificare setat pentru user: ${userId}`);
    }
    
    // Afișează notificare că verificarea a fost simulată
    this.showNotificationInUI('✅ Email verificat cu succes! (simulare development)');
    
    // Trigger pentru a actualiza starea de verificare în aplicație
    const event = new CustomEvent('emailVerificationSimulated', {
      detail: { verified: true, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
    
    return true;
  }
  
  // 📋 LOG SIMULARE GENERAL
  static logEmailAction(action, details) {
    if (!this.isDevelopment) return;
    
    // console.log(`📧 EMAIL ACTION: ${action}`);
    // console.log('Details:', details);
    // console.log('---');
  }
}