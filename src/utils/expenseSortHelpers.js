const DEFAULT_EXPENSE_ORDER = [
  'Apă caldă',
  'Apă rece',
  'Canal',
  'Întreținere lift',
  'Energie electrică',
  'Service interfon',
  'Cheltuieli cu asociația',
  'Salarii NETE',
  'Impozit ANAF',
  'Spații în folosință',
  'Căldură',
];

export function sortByExpenseName(items, getName) {
  return [...items].sort((a, b) => {
    const aName = getName(a);
    const bName = getName(b);
    const aIndex = DEFAULT_EXPENSE_ORDER.indexOf(aName);
    const bIndex = DEFAULT_EXPENSE_ORDER.indexOf(bName);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return aName.localeCompare(bName);
  });
}
