// 📋 ONBOARDING COMPONENTS EXPORTS
// Organizare centralizată pentru toate componentele de onboarding

export { default as OnboardingTabs } from './OnboardingTabs';
export { default as ProfileStep } from './ProfileStep';
export { default as DocumentsStep } from './DocumentsStep';
export { default as AssociationStep } from './AssociationStep';

// Deprecated - păstrat pentru compatibilitate (va fi șters)
export { default as OnboardingWizard } from './OnboardingWizard';

// Re-export pentru convenience
export {
  OnboardingTabs as Tabs,
  ProfileStep as Profile,
  DocumentsStep as Documents,
  AssociationStep as Association
};