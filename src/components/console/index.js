/**
 * 👑 CONSOLE PORTAL COMPONENTS
 *
 * Export central pentru componentele console (console.blocapp.ro).
 * Aceasta este zona super-admin pentru owner-ul BlocApp.
 *
 * Terminologie:
 * - "admin" în BlocApp = administratorii de asociații (clienții)
 * - "console/super_admin" = owner-ul BlocApp
 */

// Main App
export { default as ConsoleApp } from './ConsoleApp';

// Pages
export { default as ConsoleDashboard } from './ConsoleDashboard';
export { default as UserManagement } from './UserManagement';
export { default as UserBillingDetails } from './UserBillingDetails';
export { default as PendingPayments } from './PendingPayments';
