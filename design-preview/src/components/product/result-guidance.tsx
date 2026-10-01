import { useProduct } from "@/lib/product-context"
import { deriveResultGuidance } from "@/lib/result-guidance"
import type { Projection, Scenario } from "@/lib/engine"

export function ResultGuidance({ scenario, projection }: { scenario: Scenario; projection: Projection }) {
  const { tx, money } = useProduct()
  const result = deriveResultGuidance(scenario, projection)
  const month = (value: number | null) => `${tx("month", "ay")} ${value}`

  const headline = {
    "funding-gap": tx("The purchase needs more cash up front.", "Ev alımı için başlangıçta daha fazla nakit gerekiyor."),
    "both-shortfall": tx("Both paths start with a monthly shortfall.", "İki seçenek de aylık nakit açığıyla başlıyor."),
    "monthly-shortfall": tx("Buying starts with a monthly shortfall.", "Ev almak aylık nakit açığıyla başlıyor."),
    "support-cliff": tx("Monthly support is carrying this plan.", "Bu plan aylık desteğe dayanıyor."),
    "support-dependent": tx("The starting budget depends on monthly support.", "Başlangıç bütçesi aylık desteğe dayanıyor."),
    "future-shortfall": tx("The monthly budget turns negative later.", "Aylık bütçe ileride eksiye dönüyor."),
    "reserve-breach": tx("Buying cuts into your cash reserve.", "Ev almak ayırdığın birikimi azaltıyor."),
    "cash-positive": tx("Buying fits the modeled monthly budget.", "Ev almak hesaplanan aylık bütçeye sığıyor."),
  }[result.code]
  const lead = {
    "funding-gap": tx(`${money(result.fundingGap)} more is needed for the down payment and buying costs.`, `Peşinat ve alım giderleri için ${money(result.fundingGap)} daha gerekiyor.`),
    "both-shortfall": tx(`Renting leaves ${money(projection.rows[0].rentSurplus)} and buying leaves ${money(result.monthOneBuyCash)} in month one.`, `İlk ay kirada ${money(projection.rows[0].rentSurplus)}, ev alımında ${money(result.monthOneBuyCash)} kalıyor.`),
    "monthly-shortfall": tx(`${money(Math.abs(result.monthOneBuyCash))} short in month one, after income and entered expenses.`, `İlk ay gelir ve girilen giderler sonrası ${money(Math.abs(result.monthOneBuyCash))} açık var.`),
    "support-cliff": tx(`Cash flow turns negative in ${month(result.supportCliffMonth)} when monthly support ends.`, `Aylık destek bitince ${month(result.supportCliffMonth)} nakit akışı eksiye dönüyor.`),
    "support-dependent": tx(`Without monthly support, month one would be ${money(result.monthOneBuyCash - scenario.monthlySupport)}.`, `Aylık destek olmadan ilk ay elde kalan ${money(result.monthOneBuyCash - scenario.monthlySupport)} olurdu.`),
    "future-shortfall": tx(`Buying first shows a monthly shortfall in ${month(result.firstDeficitMonth)}.`, `Ev alımında ilk aylık açık ${month(result.firstDeficitMonth)} ortaya çıkıyor.`),
    "reserve-breach": tx(`Projected cash falls below your ${money(scenario.reserve)} reserve.`, `Hesaplanan birikim, ayırdığın ${money(scenario.reserve)} tutarın altına iniyor.`),
    "cash-positive": tx(`${money(result.monthOneBuyCash)} remains in month one after entered expenses.`, `İlk ay girilen giderlerden sonra ${money(result.monthOneBuyCash)} kalıyor.`),
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
    : result.code === "support-cliff" || result.code === "support-dependent"
    ? tx("Test the plan without monthly support before relying on it.", "Bu plana güvenmeden önce aylık destek olmadan da dene.")
    : result.code === "both-shortfall"
    ? tx("Revisit income, regular expenses and the home-price target before comparing paths.", "Seçenekleri karşılaştırmadan önce gelirini, düzenli giderlerini ve ev fiyatı hedefini gözden geçir.")
    : result.code === "reserve-breach"
    ? tx("Try a lower price while keeping your chosen reserve intact.", "Ayırdığın birikimi koruyarak daha düşük ev fiyatı dene.")
    : result.lowerPriceMonthlyGain !== null
    ? tx(`A 10% lower home price improves month-one cash by ${money(result.lowerPriceMonthlyGain)} in this model.`, `Ev fiyatı %10 düşük olursa bu modelde ilk ay elde kalan ${money(result.lowerPriceMonthlyGain)} artıyor.`)
    : tx("Test a lower price or a verified loan offer while keeping your reserve.", "Ayırdığın birikimi koruyarak daha düşük fiyat veya gerçek kredi teklifi dene.")

  return <section aria-labelledby="result-guidance-title" className="mb-6">
    <p className="text-[11px] font-semibold tracking-[.1em] text-primary uppercase">{tx("Your scenario", "Senaryon")}</p>
    <h1 id="result-guidance-title" className="mt-2 max-w-[760px] text-[clamp(2rem,4vw,3.2rem)] leading-[1.06] font-semibold tracking-[-.065em]">{headline}</h1>
    <p className="mt-3 text-[14px] text-ink-soft">{lead}</p>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <div className="rounded-[13px] bg-[#edf2ff] p-4 dark:bg-[#24282e]"><p className="text-[11px] font-semibold text-muted-foreground">{tx("Over time", "Zaman içinde")}</p><p className="mt-1 text-[13px] font-medium leading-5">{budgetPath ?? path}</p></div>
      <div className="rounded-[13px] bg-[#f4f6fa] p-4 dark:bg-[#202328]"><p className="text-[11px] font-semibold text-muted-foreground">{tx("Try next", "Sıradaki deneme")}</p><p className="mt-1 text-[13px] font-medium leading-5">{checkNext}</p></div>
    </div>
    <details className="mt-3 rounded-[12px] bg-card px-4 py-3 text-[12px] text-ink-soft"><summary className="cursor-pointer font-semibold text-foreground">{tx("Why this result?", "Bu sonuç neden çıktı?")}</summary><div className="mt-3 space-y-2 leading-5">
      <p>{tx("The comparison uses your income, rent, living costs, debts, mortgage and support assumptions. It describes cash flow, not which choice builds more wealth.", "Karşılaştırma gelir, kira, yaşam gideri, borç, kredi ve destek varsayımlarını kullanır. Nakit akışını anlatır; hangi seçeneğin daha fazla servet oluşturduğunu söylemez.")}</p>
      {budgetPath && <p>{path}</p>}
      {result.firstDeficitMonth && <p>{tx(`Buying has a negative monthly balance from ${month(result.firstDeficitMonth)}.`, `Ev alımında ${month(result.firstDeficitMonth)} itibarıyla aylık bütçe eksiye düşüyor.`)}</p>}
      {result.usesUpfrontSupport && <p>{tx(`The loan amount includes ${money(scenario.upfrontSupport)} of one-time outside support. A positive later balance does not make the purchase independent of that help.`, `Kredi tutarı ${money(scenario.upfrontSupport)} tek seferlik dış desteği içeriyor. Sonraki aylarda artıda olmak, alımı bu destekten bağımsız kılmaz.`)}</p>}
      {result.usesMonthlySupport && <p>{tx(`Monthly support of ${money(scenario.monthlySupport)} is included for ${scenario.supportMonths} months.`, `${scenario.supportMonths} ay boyunca ${money(scenario.monthlySupport)} aylık destek dahil.`)}</p>}
      {(result.missingOwnerCosts || result.missingBuyingCosts) && <p>{tx("Before deciding, check omitted ownership and purchase costs against real quotes; zero entries make this result optimistic.", "Karar vermeden önce sıfır bırakılan ev sahipliği ve alım giderlerini gerçek tekliflerle kontrol et; sıfır girişler sonucu iyimser gösterebilir.")}</p>}
      <p>{tx("This is your scenario, not a market forecast or a recommendation to buy.", "Bu senin senaryon; piyasa tahmini ya da ev alma tavsiyesi değil.")}</p>
    </div></details>
  </section>
}
