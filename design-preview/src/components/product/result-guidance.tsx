import { useProduct } from "@/lib/product-context"
import { deriveResultGuidance } from "@/lib/result-guidance"
import type { Projection, Scenario } from "@/lib/engine"

export function ResultGuidance({ scenario, projection, headingId = "result-guidance-title" }: { scenario: Scenario; projection: Projection; headingId?: string }) {
  const { tx, money } = useProduct()
  const result = deriveResultGuidance(scenario, projection)
  const month = (value: number | null) => `${tx("month", "ay")} ${value}`

  const headline = {
    "funding-gap": tx(`The purchase needs ${money(result.fundingGap)} more up front.`, `Alım için ${money(result.fundingGap)} daha gerekiyor.`),
    "payment-exceeds-income": result.usesMonthlySupport
      ? tx(`The mortgage payment exceeds monthly income and support by ${money(result.paymentGap)}.`, `Kredi taksiti aylık gelir ve desteği ${money(result.paymentGap)} aşıyor.`)
      : tx(`The mortgage payment exceeds take-home income by ${money(result.paymentGap)}.`, `Kredi taksiti aylık net geliri ${money(result.paymentGap)} aşıyor.`),
    "both-shortfall": tx("Both paths start with a monthly shortfall.", "İki seçenek de aylık nakit açığıyla başlıyor."),
    "monthly-shortfall": tx(`Buying starts ${money(Math.abs(result.monthOneBuyCash))} short each month.`, `Ev alımında ilk ay ${money(Math.abs(result.monthOneBuyCash))} açık var.`),
    "support-cliff": tx(`The budget turns negative when support ends in ${month(result.supportCliffMonth)}.`, `Aylık destek bitince bütçe ${month(result.supportCliffMonth)} eksiye dönüyor.`),
    "support-dependent": tx(`${money(projection.rows[0].support)} monthly support prevents a starting shortfall.`, `${money(projection.rows[0].support)} aylık destek başlangıçtaki açığı kapatıyor.`),
    "future-shortfall": tx(`The buying budget turns negative in ${month(result.firstDeficitMonth)}.`, `Ev alma bütçesi ${month(result.firstDeficitMonth)} eksiye dönüyor.`),
    "reserve-breach": result.firstReserveBreachMonth === 0
      ? tx(`The purchase cuts into your ${money(scenario.reserve)} reserve immediately.`, `Alım anında ayırdığın ${money(scenario.reserve)} birikim korunamıyor.`)
      : tx(`Savings fall below your ${money(scenario.reserve)} reserve in ${month(result.firstReserveBreachMonth)}.`, `Birikim ${month(result.firstReserveBreachMonth)} ayırdığın ${money(scenario.reserve)} tutarın altına iniyor.`),
    "cash-positive": tx(`Buying leaves ${money(result.monthOneBuyCash)} in month one.`, `Ev alımında ilk ay ${money(result.monthOneBuyCash)} kalıyor.`),
  }[result.code]
  const lead = {
    "funding-gap": tx(`The modeled cash needed at purchase is ${money(projection.initialBuyCash)}, against ${money(scenario.savings)} in savings.`, `Alım için hesaplanan nakit ${money(projection.initialBuyCash)}; birikim ${money(scenario.savings)}.`),
    "payment-exceeds-income": result.usesMonthlySupport
      ? tx(`The payment is ${money(projection.payment)}; month-one income and support total ${money(projection.rows[0].income + projection.rows[0].support)}, before other expenses.`, `Taksit ${money(projection.payment)}; ilk ay gelir ve destek toplamı, diğer giderlerden önce ${money(projection.rows[0].income + projection.rows[0].support)}.`)
      : tx(`The payment is ${money(projection.payment)}; take-home income is ${money(projection.rows[0].income)}, before other expenses.`, `Taksit ${money(projection.payment)}; diğer giderlerden önce net gelir ${money(projection.rows[0].income)}.`),
    "both-shortfall": tx(`Renting leaves ${money(projection.rows[0].rentSurplus)} and buying leaves ${money(result.monthOneBuyCash)} in month one.`, `İlk ay kirada ${money(projection.rows[0].rentSurplus)}, ev alımında ${money(result.monthOneBuyCash)} kalıyor.`),
    "monthly-shortfall": result.usesMonthlySupport
      ? tx(`Even with ${money(scenario.monthlySupport)} monthly support, the mortgage payment is ${money(projection.payment)}.`, `${money(scenario.monthlySupport)} aylık desteğe rağmen kredi taksiti ${money(projection.payment)}.`)
      : result.usesUpfrontSupport
        ? tx(`${money(scenario.upfrontSupport)} upfront support lowers the payment by ${money(result.upfrontSupportMonthlyGain)} a month; the payment is still ${money(projection.payment)}.`, `${money(scenario.upfrontSupport)} peşin destek taksiti ayda ${money(result.upfrontSupportMonthlyGain)} azaltıyor; mevcut taksit ${money(projection.payment)}.`)
        : tx(`The mortgage payment is ${money(projection.payment)} a month, against ${money(scenario.income)} take-home income.`, `Kredi taksiti ayda ${money(projection.payment)}; net gelir ${money(scenario.income)}.`),
    "support-cliff": tx(`${money(projection.rows[0].support)} monthly support is included for ${result.supportMonths} months; the first month without it is ${money(projection.rows[(result.supportCliffMonth ?? 1) - 1].buySurplus)}.`, `${result.supportMonths} ay boyunca ${money(projection.rows[0].support)} destek dahil; desteksiz ilk ay bütçe ${money(projection.rows[(result.supportCliffMonth ?? 1) - 1].buySurplus)}.`),
    "support-dependent": tx(`Without support, month one would be ${money(result.monthOneBuyCash - projection.rows[0].support)}; help is counted toward payments for ${result.supportMonths} months.`, `Destek olmadan ilk ay ${money(result.monthOneBuyCash - projection.rows[0].support)} kalırdı; destek ${result.supportMonths} ay taksite sayılıyor.`),
    "future-shortfall": tx(`Month one leaves ${money(result.monthOneBuyCash)}; future income and expense changes follow the rates you entered.`, `İlk ay ${money(result.monthOneBuyCash)} kalıyor; sonraki gelir ve giderler girdiğin oranlarla değişiyor.`),
    "reserve-breach": tx(`The lowest modeled liquid balance is ${money(result.lowestLiquid)}.`, `Hesaplanan en düşük nakit birikim ${money(result.lowestLiquid)}.`),
    "cash-positive": tx(`Renting leaves ${money(projection.rows[0].rentSurplus)} in the same month; this compares cash flow, not total wealth.`, `Aynı ay kirada ${money(projection.rows[0].rentSurplus)} kalıyor; karşılaştırma toplam serveti değil, nakit akışını gösteriyor.`),
  }[result.code]
  const path = result.trend === "crosses"
    ? tx(`Buying leaves more monthly cash than renting from ${month(result.crossoverMonth)} onward.`, `${month(result.crossoverMonth)} itibarıyla ev almak kiradan daha fazla aylık nakit bırakıyor.`)
    : result.trend === "narrows" ? tx("The monthly gap with renting narrows, but does not reverse within this period.", "Kirayla aylık fark daralıyor, ancak bu sürede tersine dönmüyor.")
    : result.trend === "widens" ? tx("The monthly gap with renting grows over this period.", "Kirayla aylık fark bu süre içinde açılıyor.")
    : result.trend === "rent-overtakes" ? tx(`Renting leaves more monthly cash from ${month(result.rentOvertakesMonth)} onward.`, `${month(result.rentOvertakesMonth)} itibarıyla kirada kalmak daha fazla aylık nakit bırakıyor.`)
    : result.trend === "buy-ahead" ? tx("Buying starts with more monthly cash than renting.", "Ev almak başlangıçta kiradan daha fazla aylık nakit bırakıyor.")
    : result.trend === "even" ? tx("The two paths leave the same monthly cash in month one.", "İlk ay iki seçenek de aynı aylık nakdi bırakıyor.")
    : tx("Renting keeps the monthly cash-flow lead throughout this period.", "Bu süre boyunca kirada kalmak aylık nakit akışında önde.")
  const budgetPath = result.firstDeficitMonth && result.recoveryMonth && result.recoveryMonth > result.firstDeficitMonth
    ? tx(`The monthly shortfall ends from ${month(result.recoveryMonth)} under these assumptions.`, `Bu varsayımlarla aylık açık ${month(result.recoveryMonth)} itibarıyla bitiyor.`)
    : null
  const checkNext = result.code === "funding-gap"
    ? tx("Check the cash needed at signing, or test a lower-priced home.", "Satın alma için gereken nakdi kontrol et veya daha düşük ev fiyatı dene.")
    : result.code === "payment-exceeds-income"
    ? tx(`Even before other expenses, the payment is ${money(result.paymentGap)} too high. Test a larger affordable down payment, lower price or actual loan offer.`, `Diğer giderlerden önce bile taksit ${money(result.paymentGap)} fazla. Birikimini koruyarak daha yüksek peşinat, daha düşük fiyat veya gerçek kredi teklifi dene.`)
    : result.code === "support-cliff" || result.code === "support-dependent"
    ? tx("Test the plan without monthly support before relying on it.", "Bu plana güvenmeden önce aylık destek olmadan da dene.")
    : result.code === "both-shortfall"
    ? tx("Revisit income, regular expenses and the home-price target before comparing paths.", "Seçenekleri karşılaştırmadan önce gelirini, düzenli giderlerini ve ev fiyatı hedefini gözden geçir.")
    : result.code === "reserve-breach"
    ? tx("Do not raise the down payment before checking the cash left after purchase. Test a lower price first.", "Alım sonrası kalan birikimi kontrol etmeden peşinatı artırma. Önce daha düşük fiyat dene.")
    : result.downPaymentTest && result.monthOneBuyCash < 0 && result.downPaymentTest.monthOneCash >= 0
    ? tx(`Try ${money(result.downPaymentTest.extra)} more down: month-one cash would reach ${money(result.downPaymentTest.monthOneCash)} while preserving your chosen reserve.`, `Peşinatı ${money(result.downPaymentTest.extra)} artırmayı dene: ayırdığın birikimi korurken ilk ay ${money(result.downPaymentTest.monthOneCash)} kalır.`)
    : result.downPaymentTest && result.monthOneBuyCash < 0
    ? tx(`Putting ${money(result.downPaymentTest.extra)} more down preserves your reserve and improves monthly cash by ${money(result.downPaymentTest.monthlyGain)}, but still leaves a ${money(Math.abs(result.downPaymentTest.monthOneCash))} shortfall.`, `Ayırdığın birikimi koruyarak peşinatı ${money(result.downPaymentTest.extra)} artırmak aylık bütçeyi ${money(result.downPaymentTest.monthlyGain)} rahatlatır; yine de ${money(Math.abs(result.downPaymentTest.monthOneCash))} açık kalır.`)
    : result.usesUpfrontSupport && result.monthOneBuyCash < 0 && scenario.reserve > 0
    ? tx(`Upfront support already lowers the loan. A larger down payment would use your chosen ${money(scenario.reserve)} reserve; test a lower price instead.`, `Peşin destek krediyi zaten azaltıyor. Daha yüksek peşinat ayırdığın ${money(scenario.reserve)} birikimi kullanır; bunun yerine daha düşük fiyat dene.`)
    : result.downPaymentTest && result.usesUpfrontSupport
    ? tx(`Test ${money(result.downPaymentTest.extra)} more down while keeping your reserve: the monthly payment falls by ${money(result.downPaymentTest.monthlyGain)}.`, `Ayırdığın birikimi koruyarak peşinatı ${money(result.downPaymentTest.extra)} artırmayı dene: taksit ayda ${money(result.downPaymentTest.monthlyGain)} düşer.`)
    : result.lowerPriceMonthlyGain !== null
    ? tx(`A 10% lower home price improves month-one cash by ${money(result.lowerPriceMonthlyGain)} in this model.`, `Ev fiyatı %10 düşük olursa bu modelde ilk ay elde kalan ${money(result.lowerPriceMonthlyGain)} artıyor.`)
    : tx("Test a lower price or a verified loan offer while keeping your reserve.", "Ayırdığın birikimi koruyarak daha düşük fiyat veya gerçek kredi teklifi dene.")

  return <section aria-labelledby={headingId} className="mb-6">
    <h1 id={headingId} className="max-w-[760px] text-[clamp(2rem,4vw,3.2rem)] leading-[1.06] font-semibold tracking-[-.065em]">{headline}</h1>
    <p className="mt-3 text-[14px] text-ink-soft">{lead}</p>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <div className="rounded-[13px] bg-[#edf2ff] p-4 dark:bg-[#24282e]"><p className="text-[11px] font-semibold text-muted-foreground">{tx("Over time", "Zaman içinde")}</p><p className="mt-1 text-[13px] font-medium leading-5">{budgetPath ?? path}</p></div>
      <div className="rounded-[13px] bg-[#f4f6fa] p-4 dark:bg-[#202328]"><p className="text-[11px] font-semibold text-muted-foreground">{tx("Try next", "Sıradaki deneme")}</p><p className="mt-1 text-[13px] font-medium leading-5">{checkNext}</p></div>
    </div>
    <details className="mt-3 rounded-[12px] bg-card px-4 py-3 text-[12px] text-ink-soft"><summary className="cursor-pointer font-semibold text-foreground">{tx("Why this result?", "Bu sonuç neden çıktı?")}</summary><div className="mt-3 space-y-2 leading-5">
      <p>{tx("The comparison uses your income, rent, living costs, debts, mortgage and support assumptions. It describes cash flow, not which choice builds more wealth.", "Karşılaştırma gelir, kira, yaşam gideri, borç, kredi ve destek varsayımlarını kullanır. Nakit akışını anlatır; hangi seçeneğin daha fazla servet oluşturduğunu söylemez.")}</p>
      {budgetPath && <p>{path}</p>}
      {result.usesUpfrontSupport && <p>{tx(`${money(scenario.upfrontSupport)} of one-time support was subtracted from the loan. At the same rate and term, it lowers the modeled payment by ${money(result.upfrontSupportMonthlyGain)} a month. A later positive balance still depends on that help at purchase.`, `${money(scenario.upfrontSupport)} peşin destek kredi tutarından düşüldü. Aynı faiz ve vadede hesaplanan taksiti ayda ${money(result.upfrontSupportMonthlyGain)} azaltır. Sonraki aylarda artıda olmak, alımı bu destekten bağımsız kılmaz.`)}</p>}
      {result.usesMonthlySupport && <p>{tx(`${money(projection.rows[0].support)} monthly help is applied to the mortgage payment for ${result.supportMonths} months, never beyond the payment itself.`, `${result.supportMonths} ay boyunca ${money(projection.rows[0].support)} aylık destek kredi taksitine sayıldı; destek taksiti aşmıyor.`)}</p>}
      {(result.missingOwnerCosts || result.missingBuyingCosts) && <p>{tx("Before deciding, check omitted ownership and purchase costs against real quotes; zero entries make this result optimistic.", "Karar vermeden önce sıfır bırakılan ev sahipliği ve alım giderlerini gerçek tekliflerle kontrol et; sıfır girişler sonucu iyimser gösterebilir.")}</p>}
      <p>{tx("This is your scenario, not a market forecast or a recommendation to buy.", "Bu senin senaryon; piyasa tahmini ya da ev alma tavsiyesi değil.")}</p>
    </div></details>
  </section>
}
