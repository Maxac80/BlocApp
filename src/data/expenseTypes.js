export const defaultExpenseTypes = [
  {
    id: "expense-type-hot-water",
    name: "Apă caldă",
    defaultDistribution: "consumption",
    consumptionUnit: "mc",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    id: "expense-type-cold-water",
    name: "Apă rece",
    defaultDistribution: "consumption",
    consumptionUnit: "mc",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    id: "expense-type-sewage",
    name: "Canal",
    defaultDistribution: "consumption",
    consumptionUnit: "mc",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    id: "expense-type-elevator",
    name: "Întreținere lift",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    id: "expense-type-electricity",
    name: "Energie electrică",
    defaultDistribution: "person",
    fixedAmountMode: "person",
    invoiceEntryMode: "separate",
    expenseEntryMode: "building"
  },
  {
    id: "expense-type-intercom",
    name: "Service interfon",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    id: "expense-type-association-fees",
    name: "Cheltuieli cu asociația",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    id: "expense-type-salaries",
    name: "Salarii NETE",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    id: "expense-type-taxes",
    name: "Impozit ANAF",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    id: "expense-type-commercial-spaces",
    name: "Spații în folosință",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    id: "expense-type-heating",
    name: "Căldură",
    defaultDistribution: "individual",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  }
];