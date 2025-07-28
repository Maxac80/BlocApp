// 🔐 AUTH COMPONENTS EXPORTS
// Organizare centralizată pentru toate componentele de autentificare

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ResetPasswordForm from './ResetPasswordForm';
import EmailVerification from './EmailVerification';

export { LoginForm, RegisterForm, ResetPasswordForm, EmailVerification };

// Re-export pentru compatibilitate și convenience
export {
  LoginForm as Login,
  RegisterForm as Register,
  ResetPasswordForm as ResetPassword,
  EmailVerification as EmailVerify
};