# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlocApp is a Romanian apartment building management system built with React and Firebase. It manages apartment owner associations, tracks expenses, calculates maintenance fees, and handles payment balances for multiple buildings.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests in CI mode (non-interactive)
CI=true npm test
```

## Architecture

### Technology Stack
- **Frontend**: React 19.1.0 with Create React App
- **Styling**: Tailwind CSS 3.4.0
- **Backend**: Firebase (Firestore for database, Firebase Auth for authentication)
- **PDF Generation**: jspdf with jspdf-autotable

### Directory Structure
- `src/components/` - Feature-based component organization
  - `common/` - Shared components (Sidebar)
  - `dashboard/` - Dashboard views
  - `expenses/` - Expense management
  - `forms/` - Form components for data entry
  - `modals/` - Modal dialogs
  - `tables/` - Table components for maintenance calculations
  - `views/` - Main view components
- `src/context/` - React Context (AuthContext for authentication)
- `src/data/` - Static data (Romanian counties, expense types)
- `src/hooks/` - Custom hooks containing business logic
- `src/firebase.js` - Firebase configuration and initialization

### Key Architectural Patterns
1. **Custom Hooks**: Business logic is encapsulated in custom hooks (e.g., `useAssociations`, `useExpenses`)
2. **View-based Navigation**: Single-page app with view switching managed through state
3. **Firebase Integration**: Real-time data synchronization with Firestore
4. **Context API**: Authentication state managed through AuthContext

### Data Model
The app manages the following main entities:
- **Associations**: Apartment owner associations
- **Buildings**: Buildings within associations
- **Stairs**: Stairwells within buildings
- **Apartments**: Individual apartment units
- **Expenses**: Various expense types (utilities, maintenance)
- **Maintenance Calculations**: Monthly fee calculations per apartment

### Important Notes
- The UI and data models are in Romanian (e.g., "bloc" = building, "scara" = stairwell)
- Firebase configuration is currently hardcoded in `src/firebase.js`
- The app uses Firestore's real-time listeners for data synchronization
- PDF export functionality is available for maintenance tables

## Testing

Currently minimal test coverage. To run a single test:
```bash
npm test -- --testNamePattern="test name"
```

## Development Considerations

1. **Language**: The application is Romanian-specific with hardcoded Romanian text
2. **Authentication**: Firebase Auth is integrated but user management UI is minimal
3. **State Management**: Uses React hooks and Context API, no Redux
4. **Error Handling**: Basic error handling in hooks, could be improved
5. **Environment Variables**: Not currently used - Firebase config is hardcoded