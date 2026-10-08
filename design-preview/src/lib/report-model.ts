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
  const monthInline = (value: number) => tx(`month ${value}`, `${value}. ay`)
  const conclusion = {
    "funding-gap": tx("There is not enough cash to complete this purchase.", "Bu alımı tamamlamak için başlangıçtaki para yeterli değil."),
    "payment-exceeds-income": tx("This home does not fit your monthly budget today.", "Bu ev şu an aylık bütçene uygun değil."),
    "both-shortfall": tx("Both options stretch your monthly budget today.", "Şu an iki seçenek de aylık bütçeni zorluyor."),
    "monthly-shortfall": tx("This home does not fit your monthly budget today.", "Bu ev şu an aylık bütçene uygun değil."),
    "support-cliff": tx("This home stops fitting your budget when support ends.", "Destek sona erdiğinde bu ev aylık bütçene uymuyor."),
    "support-dependent": tx("This home fits your budget only with monthly support.", "Bu ev şu an yalnızca aylık destekle bütçene uyuyor."),
    "future-payment-exceeds-income": tx("This home may outgrow your budget later.", "Bu ev ilerleyen dönemde aylık bütçeni aşabilir."),
    "future-shortfall": tx("This home fits today, but the budget becomes tight later.", "Bu ev bugün bütçene uyuyor; ilerleyen dönemde giderler gelirini aşıyor."),
    "reserve-breach": tx("This purchase uses savings you wanted to keep aside.", "Bu alım, kenarda tutmak istediğin birikimi kullanıyor."),
    "cash-positive": tx("This home fits your monthly budget in this scenario.", "Bu ev bu senaryoda aylık bütçene uyuyor."),
  }[guidance.code]

  const todayNegative = guidance.code === "funding-gap" || guidance.monthOneBuyCash < 0
  const todayValue = guidance.code === "funding-gap" ? guidance.fundingGap : Math.abs(guidance.monthOneBuyCash)
  const today = {
    value: money(todayValue),
    negative: todayNegative,
    label: guidance.code === "funding-gap"
      ? tx("more needed at purchase", "alım sırasında ek gerekiyor")
      : guidance.monthOneBuyCash < 0
        ? tx("missing from the monthly budget", "aylık bütçede eksik kalıyor")
        : tx("left after monthly expenses", "aylık giderlerden sonra kalıyor"),
    detail: guidance.code === "funding-gap"
      ? tx(`The purchase needs ${money(projection.initialBuyCash)} up front; available savings are ${money(scenario.savings)}.`, `Alım sırasında ${money(projection.initialBuyCash)} gerekiyor; kullanılabilir birikim ${money(scenario.savings)}.`)
      : guidance.monthOneBuyCash < 0
        ? tx(`Buying expenses exceed income and support by ${money(Math.abs(guidance.monthOneBuyCash))} in month one.`, `İlk ay ev alımındaki giderler, gelir ve desteği ${money(Math.abs(guidance.monthOneBuyCash))} aşıyor.`)
        : tx(`After housing, regular expenses and debt, ${money(guidance.monthOneBuyCash)} remains in month one.`, `İlk ay konut, düzenli giderler ve borçlar ödendikten sonra ${money(guidance.monthOneBuyCash)} kalıyor.`),
    comparison: guidance.monthOneGap < 0
      ? tx(`Buying leaves ${money(Math.abs(guidance.monthOneGap))} less than renting in month one.`, `İlk ay ev alımında kiraya göre ${money(Math.abs(guidance.monthOneGap))} daha az kalıyor.`)
      : guidance.monthOneGap > 0
        ? tx(`Buying leaves ${money(guidance.monthOneGap)} more than renting in month one.`, `İlk ay ev alımında kiraya göre ${money(guidance.monthOneGap)} daha fazla kalıyor.`)
        : tx("Both options leave the same amount in month one.", "İlk ay iki seçenekte de aynı tutar kalıyor."),
  }
  const overTime = guidance.supportCliffMonth
    ? { title: tx(`Support ends in ${monthInline(guidance.supportCliffMonth)}`, `Destek ${monthInline(guidance.supportCliffMonth)} sona eriyor`), detail: tx("The result depends on support continuing until that point.", "Bu tarihe kadarki sonuç, desteğin devam etmesine bağlı.") }
    : guidance.recoveryMonth && guidance.monthOneBuyCash < 0
      ? { title: tx(`The monthly budget balances in ${monthInline(guidance.recoveryMonth)}`, `Aylık bütçen ${monthInline(guidance.recoveryMonth)} dengelenir`), detail: tx("This uses the income and expense changes entered; it is not a market forecast.", "Bu tarih, girilen gelir ve gider değişimlerine dayanır; piyasa tahmini değildir.") }
      : guidance.firstDeficitMonth && guidance.firstDeficitMonth > 1
        ? { title: tx(`The budget becomes tight in ${monthInline(guidance.firstDeficitMonth)}`, `Giderler ${monthInline(guidance.firstDeficitMonth)} geliri aşmaya başlar`), detail: tx("The later result follows the growth assumptions entered.", "İlerleyen dönemdeki sonuç, girilen değişim oranlarına dayanır.") }
        : guidance.crossoverMonth
          ? { title: tx(`Buying moves ahead in ${monthInline(guidance.crossoverMonth)}`, `Ev alımında ${monthInline(guidance.crossoverMonth)} daha fazla para kalmaya başlar`), detail: tx("From then on, buying leaves more monthly cash than renting in this model.", "Bu tarihten sonra modelde ev alımında kiraya göre aylık olarak daha fazla para kalır.") }
          : guidance.monthOneBuyCash < 0
            ? { title: tx(`It does not balance within ${scenario.horizon} years`, `${scenario.horizon} yıl içinde aylık bütçe dengelenmiyor`), detail: tx("The monthly gap remains throughout the selected period.", "Seçilen dönem boyunca aylık giderler gelirden yüksek kalır.") }
            : { title: tx("The monthly budget starts balanced", "Aylık bütçen ilk aydan dengede"), detail: tx("No monthly gap appears at the beginning of this scenario.", "Bu senaryonun başlangıcında aylık bütçede eksik oluşmuyor.") }

  let nextTest: { title: string; detail: string }
  const withoutMonthlySupport = guidance.usesMonthlySupport
    ? calculate(withPrincipal({ ...scenario, monthlySupport: 0, supportMonths: 0 })).rows[0].buySurplus
    : null
  if (guidance.code === "funding-gap") nextTest = { title: tx(`Add ${money(guidance.fundingGap)} to the purchase funds`, `Alım için ${money(guidance.fundingGap)} daha gerekiyor`), detail: tx("Alternatively, reduce the down payment or other up-front purchase costs.", "Diğer seçenek, peşinatı veya alım sırasındaki diğer giderleri azaltmak.") }
  else if (guidance.additionalDownPaymentToBalance && guidance.downPaymentToBalance) nextTest = { title: tx(`Raise the down payment to ${money(guidance.downPaymentToBalance)}`, `Peşinatı ${money(guidance.downPaymentToBalance)} seviyesine çıkar`), detail: tx(`That is ${money(guidance.additionalDownPaymentToBalance)} more and preserves the chosen reserve in this model.`, `Bu, peşinatı ${money(guidance.additionalDownPaymentToBalance)} artırır ve modelde ayrılan birikimi korur.`) }
  else if (guidance.homePriceToBalance && guidance.homePriceReductionToBalance && guidance.monthOneBuyCash < 0) nextTest = { title: tx(`Test a home around ${money(guidance.homePriceToBalance)}`, `Yaklaşık ${money(guidance.homePriceToBalance)} fiyatında bir ev dene`), detail: tx(`Reducing the price by ${money(guidance.homePriceReductionToBalance)} balances month one in this model.`, `Fiyatı ${money(guidance.homePriceReductionToBalance)} azaltmak modelde ilk ayın bütçesini dengeler.`) }
  else if (guidance.incomeIncreaseToBalance > 0) nextTest = { title: tx(`Month one balances at ${money(guidance.incomeToBalance)} income`, `İlk ay için gereken gelir ${money(guidance.incomeToBalance)}`), detail: tx(`That is ${money(guidance.incomeIncreaseToBalance)} above the income entered.`, `Bu tutar, girilen gelirden ${money(guidance.incomeIncreaseToBalance)} daha yüksek.`) }
  else if (guidance.code === "reserve-breach") nextTest = { title: tx(`Keep the ${money(scenario.reserve)} reserve visible`, `Ayrılan ${money(scenario.reserve)} birikimi koru`), detail: tx("Test a lower price before committing more savings to the down payment.", "Peşinata daha fazla birikim ayırmadan önce daha düşük bir ev fiyatı dene.") }
  else if (guidance.code === "support-dependent" && withoutMonthlySupport !== null) nextTest = { title: tx("Check the budget without monthly support", "Aylık destek olmadan da kontrol et"), detail: tx(`Without that support, month one leaves ${money(withoutMonthlySupport)}.`, `Destek olmadan ilk ay ${money(withoutMonthlySupport)} kalıyor.`) }
  else if (guidance.lowerPriceMonthlyGain !== null && guidance.lowerPriceMonthlyGain > 1) nextTest = { title: tx("Test a home that costs 10% less", "Fiyatı %10 daha düşük bir evi dene"), detail: tx(`That leaves ${money(guidance.lowerPriceMonthlyGain)} more in month one in this model.`, `Bu değişiklik modelde ilk ay ${money(guidance.lowerPriceMonthlyGain)} daha fazla bırakır.`) }
  else if (guidance.missingOwnerCosts || guidance.missingBuyingCosts) nextTest = { title: tx("Add the costs left at zero", "Sıfır bıraktığın masrafları ekle"), detail: tx("Use real quotes for purchase, insurance, maintenance and home-running costs before relying on this result.", "Sonuca güvenmeden önce alım, sigorta, bakım ve ev sahipliği giderlerini gerçek tekliflerle ekle.") }
  else nextTest = { title: tx("Compare a verified loan offer", "Gerçek bir kredi teklifiyle karşılaştır"), detail: tx(`The model uses a monthly payment of ${money(projection.payment)}. Compare the bank's actual payment against that number.`, `Modelde aylık taksit ${money(projection.payment)}. Bankanın gerçek taksitini bu tutarla karşılaştır.`) }

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
    conclusion, today, overTime, nextTest,
    starting, buying, support, comparison, milestones, assumptions, chart,
    disclaimer: tx("This document shows the consequences of the inputs and future assumptions above. It is an educational planning scenario, not a forecast or financial, investment, mortgage, legal or tax advice.", "Bu belge, yukarıdaki girdilerin ve gelecek varsayımlarının hesaplanan sonuçlarını gösterir. Eğitim amaçlı bir planlama senaryosudur; tahmin veya finans, yatırım, kredi, hukuk ya da vergi tavsiyesi değildir."),
  }
}
