export const defaultExpenseTypes = [
  {
    name: "Apă caldă",
    defaultDistribution: "consumption",
    consumptionUnit: "mc",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    name: "Apă rece",
    defaultDistribution: "consumption",
    consumptionUnit: "mc",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    name: "Canal",
    defaultDistribution: "consumption",
    consumptionUnit: "mc",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    name: "Întreținere lift",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  },
  {
    name: "Energie electrică",
    defaultDistribution: "person",
    invoiceEntryMode: "separate",
    expenseEntryMode: "building"
  },
  {
    name: "Service interfon",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    name: "Cheltuieli cu asociația",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    name: "Salarii NETE",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    name: "Impozit ANAF",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    name: "Spații în folosință",
    defaultDistribution: "apartment",
    invoiceEntryMode: "single",
    expenseEntryMode: "total"
  },
  {
    name: "Căldură",
    defaultDistribution: "individual",
    invoiceEntryMode: "single",
    expenseEntryMode: "staircase"
  }
];