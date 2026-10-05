import { calculate, firstMonth, independentMonth, withPrincipal, type Scenario } from "./engine"
import { deriveResultGuidance } from "./result-guidance"

export type ReportLanguage = "en" | "tr"
export type ReportItem = { label: string; value: string }

export function buildReportModel(scenario: Scenario, language: ReportLanguage, name: string | null, generatedAt: Date) {
  const tx = (en: string, tr: string) => language === "tr" ? tr : en
  const locale = language === "tr" ? "tr-TR" : "en-US"
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "TRY", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(value)
  const percent = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value) + "%"
  const projection = calculate(withPrincipal(scenario))
  const guidance = deriveResultGuidance(scenario, projection)
  const first = projection.rows[0]
  const chart = Array.from({ length: Math.ceil(projection.rows.length / 12) }, (_, index) => {
    const rows = projection.rows.slice(index * 12, index * 12 + 12)
    const average = (key: "rentSurplus" | "buySurplus") => rows.reduce((total, row) => total + row[key], 0) / rows.length
    return { year: index + 1, renting: average("rentSurplus"), buying: average("buySurplus") }
  })
  const month = (value: number | null) => value === null ? tx("Not within this scenario", "Bu senaryoda yok") : tx(`Month ${value}`, `Ay ${value}`)
  const conclusion = {
    "funding-gap": tx(`The purchase needs ${money(guidance.fundingGap)} more up front.`, `Alım için ${money(guidance.fundingGap)} daha gerekiyor.`),
    "payment-exceeds-income": guidance.usesMonthlySupport
      ? tx(`The first mortgage payment exceeds income and support by ${money(guidance.paymentGap)}.`, `İlk kredi taksiti gelir ve desteği ${money(guidance.paymentGap)} aşıyor.`)
      : tx(`The first mortgage payment exceeds take-home income by ${money(guidance.paymentGap)}.`, `İlk kredi taksiti net geliri ${money(guidance.paymentGap)} aşıyor.`),
    "both-shortfall": tx("Both paths start with a monthly shortfall.", "İki seçenek de aylık açıkla başlıyor."),
    "monthly-shortfall": tx(`Buying starts ${money(Math.abs(first.buySurplus))} short in month one.`, `Ev alımında ilk ay ${money(Math.abs(first.buySurplus))} açık var.`),
    "support-cliff": tx("The buying budget turns negative when support ends.", "Destek bitince ev alma bütçesi eksiye dönüyor."),
    "support-dependent": tx("Monthly support prevents a starting shortfall.", "Aylık destek başlangıçtaki açığı kapatıyor."),
    "future-payment-exceeds-income": tx("A later mortgage payment exceeds income and support.", "Sonraki bir kredi taksiti gelir ve desteği aşıyor."),
    "future-shortfall": tx("The buying budget turns negative later.", "Ev alma bütçesi ileride eksiye dönüyor."),
    "reserve-breach": tx("The chosen cash reserve is not maintained.", "Ayrılan nakit birikim korunamıyor."),
    "cash-positive": tx(`Buying leaves ${money(first.buySurplus)} in month one.`, `Ev alımında ilk ay ${money(first.buySurplus)} kalıyor.`),
  }[guidance.code]

  const starting: ReportItem[] = [
    { label: tx("Monthly take-home income", "Aylık net gelir"), value: money(scenario.income) },
    { label: tx("Current monthly rent", "Güncel aylık kira"), value: money(scenario.rent) },
    { label: tx("Other monthly expenses", "Aylık diğer giderler"), value: money(scenario.livingCosts) },
    { label: tx("Savings", "Birikim"), value: money(scenario.savings) },
    { label: tx("Target home price", "Hedef ev fiyatı"), value: money(scenario.propertyPrice) },
  ]
  if (scenario.debt > 0) starting.push({ label: tx("Other monthly debt payments", "Diğer aylık borç ödemeleri"), value: money(scenario.debt) })
  const buying: ReportItem[] = [
    { label: tx("Your down payment", "Kendi peşinatın"), value: money(scenario.downPayment) },
    { label: tx("Loan amount", "Kredi tutarı"), value: money(withPrincipal(scenario).principal) },
    { label: scenario.rateMode === "monthly" ? tx("Monthly interest rate", "Aylık faiz") : tx("Annual interest rate", "Yıllık faiz"), value: percent(scenario.rate) },
    { label: tx("Loan term", "Kredi vadesi"), value: tx(`${scenario.termYears} years`, `${scenario.termYears} yıl`) },
    { label: tx("Monthly payment", "Aylık taksit"), value: money(projection.payment) },
  ]
  if (scenario.closingCosts > 0) buying.push({ label: tx("Buying costs", "Satın alma giderleri"), value: money(scenario.closingCosts) })
  if (scenario.renovation > 0) buying.push({ label: tx("Initial renovation", "İlk tadilat gideri"), value: money(scenario.renovation) })
  if (scenario.ownerCosts > 0) buying.push({ label: tx("Annual homeowner costs", "Yıllık ev sahipliği giderleri"), value: money(scenario.ownerCosts) })
  if (scenario.reserve > 0) buying.push({ label: tx("Savings set aside", "Ayrılan birikim"), value: money(scenario.reserve) })
  const support: ReportItem[] = []
  if (scenario.upfrontSupport > 0) support.push({ label: tx("One-time down-payment help", "Peşinata tek seferlik destek"), value: money(scenario.upfrontSupport) })
  if (scenario.monthlySupport > 0) {
    support.push({ label: tx("Monthly mortgage help", "Kredi taksitine aylık destek"), value: money(scenario.monthlySupport) })
    support.push({ label: tx("Modeled support duration", "Hesaplanan destek süresi"), value: tx(`${guidance.supportMonths} months`, `${guidance.supportMonths} ay`) })
  }
  const comparison: ReportItem[] = [
    { label: tx("Monthly cash left while renting", "Kirada aylık elde kalan"), value: money(first.rentSurplus) },
    { label: tx("Monthly cash left while buying", "Ev alımında aylık elde kalan"), value: money(first.buySurplus) },
    { label: tx("Buying minus renting · month one", "Ev alma − kirada kalma · ilk ay"), value: money(first.buySurplus - first.rentSurplus) },
  ]
  const milestones: ReportItem[] = [
    { label: tx("Buying budget stays nonnegative without monthly help", "Ev alma bütçesi aylık destek olmadan artıda kalır"), value: month(independentMonth(scenario, projection)) },
    { label: tx("Mortgage at or below 40% of income", "Kredi, gelirin %40'ına iner"), value: month(firstMonth(projection.rows, row => row.payment > 0 && row.payment / row.income <= .4)) },
  ]
  const assumptions: ReportItem[] = [
    { label: tx("Annual income change", "Yıllık gelir değişimi"), value: percent(scenario.incomeGrowth) },
    { label: tx("Annual rent change", "Yıllık kira değişimi"), value: percent(scenario.rentGrowth) },
    { label: tx("Annual other-expense change", "Diğer giderlerde yıllık değişim"), value: percent(scenario.expenseGrowth) },
    { label: tx("Scenario length", "Senaryo süresi"), value: tx(`${scenario.horizon} years`, `${scenario.horizon} yıl`) },
  ]
  const monthName = (index: number) => new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, index, 1))
  if (scenario.incomeGrowth !== 0) assumptions.push({ label: tx("Income raise month", "Gelir artışı ayı"), value: monthName(scenario.raiseMonth) })
  if (scenario.rentGrowth !== 0) assumptions.push({ label: tx("Rent renewal month", "Kira yenileme ayı"), value: monthName(scenario.rentRenewal) })
  return {
    title: tx("Rent vs buy scenario summary", "Kira–ev alma senaryo özeti"),
    name,
    date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(generatedAt),
    conclusion,
    starting, buying, support, comparison, milestones, assumptions, chart,
    disclaimer: tx("This document shows the consequences of the inputs and future assumptions above. It is an educational planning scenario, not a forecast or financial, investment, mortgage, legal or tax advice.", "Bu belge, yukarıdaki girdilerin ve gelecek varsayımlarının hesaplanan sonuçlarını gösterir. Eğitim amaçlı bir planlama senaryosudur; tahmin veya finans, yatırım, kredi, hukuk ya da vergi tavsiyesi değildir."),
  }
}
