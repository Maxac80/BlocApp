// 🧙‍♂️ ONBOARDING COMPONENTS EXPORTS
// Organizare centralizată pentru toate componentele de onboarding

export { default as OnboardingWizard } from './OnboardingWizard';
export { default as WelcomeStep } from './WelcomeStep';
export { default as ProfileStep } from './ProfileStep';
export { default as DocumentsStep } from './DocumentsStep';
export { default as SettingsStep } from './SettingsStep';
export { default as AssociationStep } from './AssociationStep';
export { default as TutorialStep } from './TutorialStep';

// Re-export pentru convenience
export {
  OnboardingWizard as Wizard,
  WelcomeStep as Welcome,
  ProfileStep as Profile,
  DocumentsStep as Documents,
  SettingsStep as Settings,
  AssociationStep as Association,
  TutorialStep as Tutorial
};