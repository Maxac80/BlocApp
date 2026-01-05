# BlocApp Responsive Design Guide

Acest document conține template-ul și regulile de design responsive folosite în aplicație.

## Breakpoints Tailwind CSS

- `sm:` - 640px și mai mare (telefoane mari / tablete mici)
- `md:` - 768px și mai mare (tablete)
- `lg:` - 1024px și mai mare (desktop)

## Font Sizes (Text)

| Element | Mobile | Desktop | Clase Tailwind |
|---------|--------|---------|----------------|
| Titlu principal (h1) | 20px | 24px | `text-xl sm:text-2xl` |
| Titlu secțiune (h2) | 18px | 20px | `text-lg sm:text-xl` |
| Titlu card (h3) | 16px | 18px | `text-base sm:text-lg` |
| Text normal | 14px | 16px | `text-sm sm:text-base` |
| Text mic / labels | 12px | 14px | `text-xs sm:text-sm` |
| Text foarte mic | 10px | 12px | `text-[10px] sm:text-xs` |
| Text tabel | 12px | 14px | `text-xs sm:text-sm` |
| Total Datorat (highlight) | 14px | 16px | `text-sm sm:text-base` |

## Spacing (Padding & Margin)

| Context | Mobile | Desktop | Clase Tailwind |
|---------|--------|---------|----------------|
| Container principal | 12px | 16px-24px | `p-3 sm:p-4 lg:p-6` |
| Card padding | 12px | 16px | `p-3 sm:p-4` |
| Celule tabel | 8px | 12px | `px-2 sm:px-3 py-2 sm:py-3` |
| Gap între elemente | 4px | 8px | `gap-1 sm:gap-2` |
| Gap containere | 8px | 12px | `gap-2 sm:gap-3` |
| Margin bottom header | 16px | 24px-32px | `mb-4 sm:mb-6 lg:mb-8` |
| Space între secțiuni | 16px | 24px | `space-y-4 sm:space-y-6` |

## Icons (Lucide React)

| Context | Mobile | Desktop | Clase Tailwind |
|---------|--------|---------|----------------|
| Icon în buton | 16px | 20px | `w-4 h-4 sm:w-5 sm:h-5` |
| Icon mic (tabel) | 12px | 16px | `w-3 h-3 sm:w-4 sm:h-4` |
| Icon mare (empty state) | 48px | 64px | `w-12 h-12 sm:w-16 sm:h-16` |
| Icon mediu | 40px | 48px | `w-10 h-10 sm:w-12 sm:h-12` |

## Buttons

```jsx
// Buton principal
className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg"

// Buton mic (în tabel)
className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg"

// Buton full-width
className="w-full py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl"
```

## Inputs

```jsx
// Input standard
className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg"

// Input cu icon
className="pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 text-sm sm:text-base"
```

## Cards & Containers

```jsx
// Card standard
className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6"

// Card cu border
className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 sm:p-4"

// Modal container
className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] p-4 sm:p-6"
```

## Badges

```jsx
// Badge standard
className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full"

// Badge în header
className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded"
```

## Tables

```jsx
// Table base font
<table className="w-full text-xs sm:text-sm">

// Table header cell
<th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-700 whitespace-nowrap">

// Table body cell
<td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">

// Table cell cu valoare importantă
<td className="px-2 sm:px-3 py-2 sm:py-3 font-bold text-sm sm:text-base whitespace-nowrap">
```

## Layout Patterns

### Flex Container Responsive
```jsx
// Vertical pe mobil, horizontal pe desktop
className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"

// Flex wrap pe mobil
className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2"
```

### Grid Responsive
```jsx
// 1 coloană mobil, 2 pe tablet, 3 pe desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
```

### Scroll Containers
```jsx
// Container cu scroll orizontal pentru tabele
<div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
```

## Expense Card Header (ExpenseList)

```jsx
// Container principal
<div className="flex flex-wrap sm:flex-nowrap sm:items-start sm:justify-between gap-1 sm:gap-2">

// Nume cheltuială
<div className="mb-0.5 sm:mb-0.5">
  <h4 className="font-semibold text-base text-gray-900 px-2 py-0.5 -ml-2 rounded inline-block">

// Sumă cheltuială
<div className="flex flex-col items-end gap-0.5 w-full sm:w-auto sm:min-w-[200px] order-2 sm:order-none">
  <div className="text-right">
    <div className="text-base sm:text-lg font-bold text-blue-600">

// Info mc
<span className="text-xs text-gray-500">
```

## Best Practices

1. **Mobile First**: Stilurile de bază sunt pentru mobil, se adaugă breakpoints pentru ecrane mari
2. **Consistență**: Folosește aceleași pattern-uri în toată aplicația
3. **Whitespace-nowrap**: Adaugă pe celule de tabel pentru a preveni wrap-ul textului
4. **Overflow**: Containerele pentru tabele trebuie să aibă `overflow-x-auto`
5. **Touch Targets**: Butoanele și elementele interactive să aibă min 44px pe mobil

## Exemple Complete

### Header Pagină
```jsx
<header className="mb-4 sm:mb-6 lg:mb-8">
  <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
      <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
```

### Empty State
```jsx
<div className="bg-white rounded-xl shadow p-8 sm:p-12 text-center">
  <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Titlu</h3>
  <p className="text-sm sm:text-base text-gray-500">Descriere</p>
</div>
```

### Form Input cu Label
```jsx
<div>
  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
    Label
  </label>
  <input
    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg"
  />
</div>
```
