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
- **File Handling**: xlsx for Excel export/import, file-saver for downloads
- **Icons**: lucide-react

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
1. **Custom Hooks**: Business logic is encapsulated in custom hooks (18+ hooks including `useExpenseManagement`, `useInvoices`, `useMaintenanceCalculation`, `useBalanceManagement`)
2. **View-based Navigation**: Single-page app with view switching managed through state
3. **Firebase Integration**: Real-time data synchronization with Firestore
4. **Context API**: Authentication state managed through AuthContext
5. **Modular Components**: Feature-based organization with reusable modal and form components

### Data Model
The app manages the following main entities:
- **Associations**: Apartment owner associations
- **Buildings**: Buildings within associations
- **Stairs**: Stairwells within buildings
- **Apartments**: Individual apartment units
- **Expenses**: Various expense types (utilities, maintenance)
- **Maintenance Calculations**: Monthly fee calculations per apartment
- **Suppliers**: Vendor management
- **Invoices**: Invoice processing and management
- **Payment Balances**: Tracking apartment payment status

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
6. **File Operations**: Supports Excel import/export and PDF generation for reports
7. **Real-time Updates**: Leverages Firestore real-time listeners for live data synchronization

## Key Business Logic Hooks

The application's core functionality is divided across specialized hooks:
- `useExpenseManagement` - Expense tracking and categorization
- `useInvoices` - Invoice processing and management
- `useMaintenanceCalculation` - Complex apartment fee calculations
- `useBalanceManagement` - Payment tracking and balance management
- `useSuppliers` - Vendor and supplier management
- `useMonthManagement` - Monthly operations and status tracking
- `useIncasari` - Payment collection management

## Layout and Scroll Management Patterns

### Horizontal Scroll Isolation for Wide Tables

When dealing with tables that have many columns (e.g., MaintenanceTableDetailed with apartment data + multiple expense columns), follow these patterns to isolate horizontal scroll to the table container without deforming the entire page:

**Critical Requirements:**
1. **Root Container**: Must have `overflow-hidden` to prevent page-wide horizontal scroll
   - Example: `BlocApp.js` main content container has `overflow-hidden`

2. **Page Layout**: Use Flexbox with fixed viewport height
   - Container: `h-screen flex flex-col overflow-hidden`
   - Scrolling area: `flex-1 overflow-y-auto overflow-x-hidden`

3. **Table Container**: Wrap table in scroll container
   - Wrapper: `overflow-x-auto overflow-y-auto` with `maxHeight` constraint
   - Table: Calculate explicit `width` based on column count and widths

4. **Overflow Context Hierarchy**:
   ```
   Page Container (overflow-hidden)
   └── Main Content (flex-1 overflow-y-auto overflow-x-hidden)
       └── Table Card (overflow-hidden on card)
           └── Scroll Wrapper (overflow-x-auto overflow-y-auto)
               └── Table (explicit width)
   ```

**Example from MaintenanceView.js:**
```javascript
// Page container (line 806)
<div className="h-screen flex flex-col overflow-hidden">
  {/* Scrolling content area (line 815) */}
  <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 px-6 pb-6">
    {/* Table card (line 1018) */}
    <div className="rounded-xl shadow-lg border-2 overflow-hidden">
      {/* Scroll container (line 1115-1119) */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {/* Table with calculated width */}
        <MaintenanceTableDetailed ... />
      </div>
    </div>
  </div>
</div>
```

### Sticky Positioning for Navigation Elements

When using sticky positioning for tabs or headers within scrollable containers:

**Critical Requirements:**
1. **Remove Overflow Constraints**: Parent containers must NOT have `overflow-hidden` or `overflow-x-hidden` as these create new scroll contexts that break sticky positioning

2. **Explicit Position**: Use both className and inline style for reliability
   - `className="sticky top-0 z-10"`
   - `style={{ position: 'sticky' }}`

3. **Visual Separation**: Add shadows for better UX when sticky
   - `shadow-md` or `shadow-lg` for stuck elements
   - `bg-white` to ensure content scrolls behind cleanly

4. **Z-Index Layering**: Ensure proper stacking
   - Stair tabs: `z-10`
   - View mode tabs (Simplificat/Detaliat): `z-20` (higher to appear above)

**Example from MaintenanceView.js:**
```javascript
// Stair tabs (line 945)
<div
  className="sticky top-0 z-10 bg-white rounded-t-xl shadow-md border-b border-gray-200 mb-6"
  style={{ position: 'sticky' }}
>
  {/* Tab buttons */}
</div>

// View mode tabs (line 1089)
<div className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-200">
  {/* Simplificat/Detaliat buttons */}
</div>
```

**Common Pitfalls:**
- ❌ Adding `overflow-hidden` to wrapper containers breaks sticky positioning
- ❌ Using `max-w-full` on parent containers can interfere with sticky behavior
- ❌ Forgetting to set `background-color` causes content to show through when scrolling
- ❌ Not setting adequate `z-index` causes sticky elements to be covered by other content

### Table Column Width Management

For tables with dynamic columns and text wrapping:

1. **Column Headers with Long Text**: Remove `whitespace-nowrap` and set `maxWidth`
   ```javascript
   <th
     className="px-3 py-3 text-left text-sm font-medium text-gray-700"
     style={{ minWidth: '100px', maxWidth: '150px' }}
   >
     {expense.name} {/* Text will wrap on multiple lines */}
   </th>
   ```

2. **Table Width Calculation**: Calculate minimum width based on all columns
   ```javascript
   const minTableWidth =
     100 + // Apartment
     150 + // Owner
     90 +  // Persons
     // ... other fixed columns
     (expenses.length * 120) + // Dynamic expense columns
     (isMonthReadOnly ? 240 : 0); // Conditional columns
   ```

3. **Table Layout**: Use explicit width with auto layout
   ```javascript
   <table
     className="border-collapse"
     style={{ width: `${minTableWidth}px`, tableLayout: 'auto' }}
   >
   ```