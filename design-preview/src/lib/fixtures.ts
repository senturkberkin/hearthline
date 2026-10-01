// Fictional design-review data. The production calculator remains the source of truth.
export type PreviewVariant = "current" | "lower-price"

export const previewScenarios = {
  current: {
    homePrice: 4_500_000,
    buyingHousing: 100_322,
    buyingCash: -47_322,
    buyingShare: 133.8,
    independent: "Year 7",
  },
  "lower-price": {
    homePrice: 4_000_000,
    buyingHousing: 88_235,
    buyingCash: -35_235,
    buyingShare: 117.6,
    independent: "Year 6",
  },
} as const

export const baseFacts = {
  income: 75_000,
  rent: 28_000,
  livingCosts: 22_000,
  savings: 500_000,
  downPayment: 350_000,
  monthlyRate: 2.25,
  incomeGrowth: 8,
  rentGrowth: 6,
}

export const formatMoney = (value: number) => new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0,
}).format(value)

export function previewSeries(variant: PreviewVariant) {
  const buyHousing = previewScenarios[variant].buyingHousing
  return Array.from({ length: 11 }, (_, year) => {
    const income = baseFacts.income * 1.08 ** year
    const rentHousing = baseFacts.rent * 1.06 ** year
    return {
      year,
      rentCash: Math.round(income - rentHousing - baseFacts.livingCosts),
      buyCash: Math.round(income - buyHousing - baseFacts.livingCosts),
      rentHousing: Math.round(rentHousing),
      buyHousing,
      rentShare: Math.round(rentHousing / income * 1000) / 10,
      buyShare: Math.round(buyHousing / income * 1000) / 10,
    }
  })
}
