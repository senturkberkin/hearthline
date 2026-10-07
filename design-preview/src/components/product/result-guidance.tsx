import { ArrowRight, Clock3, Target, WalletCards } from "lucide-react"
import { useProduct } from "@/lib/product-context"
import { deriveResultGuidance } from "@/lib/result-guidance"
import type { Projection, Scenario } from "@/lib/engine"

export function ResultGuidance({ scenario, projection, headingId = "result-guidance-title" }: { scenario: Scenario; projection: Projection; headingId?: string }) {
  const { tx, money } = useProduct()
  const result = deriveResultGuidance(scenario, projection)
  const first = projection.rows[0]
  const month = (value: number | null) => tx(`month ${value}`, `${value}. ay`)
  const horizon = tx(`${scenario.horizon} years`, `${scenario.horizon} yıl`)

  const verdict = {
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
  }[result.code]

  const todayNegative = result.code === "funding-gap" || result.monthOneBuyCash < 0
  const todayValue = result.code === "funding-gap" ? result.fundingGap : Math.abs(result.monthOneBuyCash)
  const todayLabel = result.code === "funding-gap"
    ? tx("more needed at purchase", "alım sırasında ek gerekiyor")
    : result.monthOneBuyCash < 0
      ? tx("missing from the monthly budget", "aylık bütçede eksik kalıyor")
      : tx("left after monthly expenses", "aylık giderlerden sonra kalıyor")
  const todayDetail = result.code === "funding-gap"
    ? tx(`The purchase needs ${money(projection.initialBuyCash)} up front; your available savings are ${money(scenario.savings)}.`, `Alım sırasında ${money(projection.initialBuyCash)} gerekiyor; kullanılabilir birikimin ${money(scenario.savings)}.`)
    : result.monthOneBuyCash < 0
      ? tx(`Buying expenses exceed income and support by ${money(Math.abs(result.monthOneBuyCash))} in month one.`, `İlk ay ev alımındaki giderler, gelir ve desteği ${money(Math.abs(result.monthOneBuyCash))} aşıyor.`)
      : tx(`After housing, regular expenses and debt, ${money(result.monthOneBuyCash)} remains in month one.`, `İlk ay konut, düzenli giderler ve borçlar ödendikten sonra ${money(result.monthOneBuyCash)} kalıyor.`)
  const comparisonDetail = result.monthOneGap < 0
    ? tx(`Buying leaves ${money(Math.abs(result.monthOneGap))} less than renting in month one.`, `İlk ay ev alımında kiraya göre ${money(Math.abs(result.monthOneGap))} daha az kalıyor.`)
    : result.monthOneGap > 0
      ? tx(`Buying leaves ${money(result.monthOneGap)} more than renting in month one.`, `İlk ay ev alımında kiraya göre ${money(result.monthOneGap)} daha fazla kalıyor.`)
      : tx("Both options leave the same amount in month one.", "İlk ay iki seçenekte de aynı tutar kalıyor.")

  const timeTitle = result.supportCliffMonth
    ? tx(`Support ends in ${month(result.supportCliffMonth)}`, `Destek ${month(result.supportCliffMonth)} sona eriyor`)
    : result.recoveryMonth && result.monthOneBuyCash < 0
      ? tx(`The monthly budget balances in ${month(result.recoveryMonth)}`, `Aylık bütçen ${month(result.recoveryMonth)} dengelenir`)
      : result.firstDeficitMonth && result.firstDeficitMonth > 1
        ? tx(`The budget becomes tight in ${month(result.firstDeficitMonth)}`, `Giderler ${month(result.firstDeficitMonth)} geliri aşmaya başlar`)
        : result.crossoverMonth
          ? tx(`Buying moves ahead in ${month(result.crossoverMonth)}`, `Ev alımında ${month(result.crossoverMonth)} daha fazla para kalmaya başlar`)
          : result.monthOneBuyCash < 0
            ? tx(`It does not balance within ${horizon}`, `${horizon} içinde aylık bütçe dengelenmiyor`)
            : tx("The monthly budget starts balanced", "Aylık bütçen ilk aydan dengede")
  const timeDetail = result.supportCliffMonth
    ? tx("The result depends on support continuing until that point.", "Bu tarihe kadarki sonuç, desteğin devam etmesine bağlı.")
    : result.recoveryMonth && result.monthOneBuyCash < 0
      ? tx("This uses the income and expense changes you entered; it is not a market forecast.", "Bu tarih, girdiğin gelir ve gider değişimlerine dayanır; piyasa tahmini değildir.")
      : result.firstDeficitMonth && result.firstDeficitMonth > 1
        ? tx("The later result follows the growth assumptions you entered.", "İlerleyen dönemdeki sonuç, girdiğin değişim oranlarına dayanır.")
        : result.crossoverMonth
          ? tx("From then on, buying leaves more monthly cash than renting in this model.", "Bu tarihten sonra modelde ev alımında kiraya göre aylık olarak daha fazla para kalır.")
          : result.monthOneBuyCash < 0
            ? tx("The monthly gap remains within the period you selected.", "Seçtiğin dönem boyunca aylık giderler gelirden yüksek kalır.")
            : tx("No monthly gap appears at the beginning of this scenario.", "Bu senaryonun başlangıcında aylık bütçede eksik oluşmuyor.")

  let nextTitle: string
  let nextDetail: string
  if (result.code === "funding-gap") {
    nextTitle = tx(`Add ${money(result.fundingGap)} to the purchase funds`, `Alım için ${money(result.fundingGap)} daha gerekiyor`)
    nextDetail = tx("Alternatively, reduce the down payment or other up-front purchase costs.", "Diğer seçenek, peşinatı veya alım sırasındaki diğer giderleri azaltmak.")
  } else if (result.additionalDownPaymentToBalance && result.downPaymentToBalance) {
    nextTitle = tx(`Raise the down payment to ${money(result.downPaymentToBalance)}`, `Peşinatı ${money(result.downPaymentToBalance)} seviyesine çıkar`)
    nextDetail = tx(`That is ${money(result.additionalDownPaymentToBalance)} more and keeps your chosen reserve intact in this model.`, `Bu, peşinatı ${money(result.additionalDownPaymentToBalance)} artırır ve modelde ayırdığın birikimi korur.`)
  } else if (result.homePriceToBalance && result.homePriceReductionToBalance && result.monthOneBuyCash < 0) {
    nextTitle = tx(`Test a home around ${money(result.homePriceToBalance)}`, `Yaklaşık ${money(result.homePriceToBalance)} fiyatında bir ev dene`)
    nextDetail = tx(`At the same loan terms, reducing the price by ${money(result.homePriceReductionToBalance)} balances month one in this model.`, `Aynı kredi koşullarında fiyatı ${money(result.homePriceReductionToBalance)} azaltmak modelde ilk ayın bütçesini dengeler.`)
  } else if (result.incomeIncreaseToBalance > 0) {
    nextTitle = tx(`Month one balances at ${money(result.incomeToBalance)} income`, `İlk ay için gereken gelir ${money(result.incomeToBalance)}`)
    nextDetail = tx(`That is ${money(result.incomeIncreaseToBalance)} above the income entered.`, `Bu tutar, girdiğin gelirden ${money(result.incomeIncreaseToBalance)} daha yüksek.`)
  } else if (result.code === "reserve-breach") {
    nextTitle = tx(`Keep the ${money(scenario.reserve)} reserve visible`, `Ayırdığın ${money(scenario.reserve)} birikimi koru`)
    nextDetail = tx("Test a lower price before committing more savings to the down payment.", "Peşinata daha fazla birikim ayırmadan önce daha düşük bir ev fiyatı dene.")
  } else {
    nextTitle = tx("Compare a verified loan offer", "Gerçek bir kredi teklifiyle karşılaştır")
    nextDetail = result.lowerPriceMonthlyGain === null
      ? tx("Keep the reserve unchanged while testing the lender's actual payment.", "Bankanın gerçek taksitini denerken ayırdığın birikimi değiştirme.")
      : tx(`A 10% lower price leaves ${money(result.lowerPriceMonthlyGain)} more each month in this model.`, `Ev fiyatını %10 düşürmek modelde ayda ${money(result.lowerPriceMonthlyGain)} daha fazla bırakır.`)
  }

  return <section aria-labelledby={headingId} className="mb-7">
    <div className="inline-flex items-center gap-2 rounded-full bg-[#edf4ff] px-3 py-1.5 text-[11px] font-semibold text-primary dark:bg-[#2d3136] dark:text-white"><span className="size-1.5 rounded-full bg-primary dark:bg-white" />{tx("Your result", "Sonucun")}</div>
    <h1 id={headingId} className="mt-4 max-w-[790px] text-[clamp(2.15rem,4.5vw,3.65rem)] leading-[1.02] font-semibold tracking-[-.067em]">{verdict}</h1>

    <div className="mt-6 grid gap-3 sm:grid-cols-[1.15fr_.85fr]">
      <div className="relative overflow-hidden rounded-[22px] bg-[#edf4ff] p-5 sm:row-span-2 sm:p-6 dark:bg-[#272b30]">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/55 dark:bg-white/[.04]" />
        <div className="relative"><WalletCards aria-hidden="true" className="size-5 text-primary dark:text-white" /><p className="mt-7 text-[11px] font-semibold text-muted-foreground">{tx("Today", "Bugün")}</p><strong className={`mt-2 block text-[clamp(2.45rem,6vw,4.2rem)] leading-none font-semibold tracking-[-.065em] tabular-nums ${todayNegative ? "text-destructive" : ""}`}>{money(todayValue)}</strong><p className="mt-2 text-[13px] font-semibold">{todayLabel}</p><p className="mt-4 max-w-[430px] text-[12px] leading-5 text-ink-soft">{todayDetail}</p><div className="mt-6 inline-flex rounded-full bg-white/80 px-3 py-2 text-[11px] font-medium text-ink-soft dark:bg-black/20">{comparisonDetail}</div></div>
      </div>

      <div className="rounded-[18px] bg-[#f5f7fa] p-5 dark:bg-[#22262a]">
        <div className="flex items-center gap-2 text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" /><span className="text-[11px] font-semibold">{tx("Over time", "Zaman içinde")}</span></div>
        <div className="mt-4 flex items-start gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10 dark:bg-white dark:ring-white/10" /><div><p className="text-[14px] font-semibold leading-5">{timeTitle}</p><p className="mt-1.5 text-[11px] leading-5 text-ink-soft">{timeDetail}</p></div></div>
      </div>

      <div className="rounded-[18px] bg-[#e5effd] p-5 dark:bg-[#30353a]">
        <div className="flex items-center gap-2 text-primary dark:text-white"><Target aria-hidden="true" className="size-4" /><span className="text-[11px] font-semibold">{tx("Most useful next test", "En faydalı sonraki deneme")}</span></div>
        <p className="mt-4 text-[15px] font-semibold leading-5">{nextTitle}</p><p className="mt-1.5 text-[11px] leading-5 text-ink-soft">{nextDetail}</p><span className="mt-4 inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground dark:bg-white dark:text-[#191b1e]"><ArrowRight aria-hidden="true" className="size-3.5" /></span>
      </div>
    </div>

    <details className="mt-3 rounded-[14px] bg-card px-4 py-3 text-[12px] text-ink-soft"><summary className="cursor-pointer font-semibold text-foreground">{tx("Why this result?", "Bu sonuç neden çıktı?")}</summary><div className="mt-3 space-y-2 leading-5">
      <p>{tx("The comparison uses your income, rent, regular expenses, debts, mortgage and support assumptions. It describes monthly cash flow, not which option builds more wealth.", "Karşılaştırma; gelir, kira, düzenli gider, borç, kredi ve destek varsayımlarını kullanır. Aylık bütçeyi gösterir; hangi seçeneğin daha fazla servet oluşturduğunu söylemez.")}</p>
      {result.usesUpfrontSupport && <p>{tx(`${money(scenario.upfrontSupport)} of one-time support reduces the loan and lowers the modeled payment by ${money(result.upfrontSupportMonthlyGain)} a month.`, `${money(scenario.upfrontSupport)} peşin destek kredi tutarını azaltır ve modelde aylık taksiti ${money(result.upfrontSupportMonthlyGain)} düşürür.`)}</p>}
      {result.usesMonthlySupport && <p>{tx(`${money(first.support)} monthly help is applied to the mortgage for ${result.supportMonths} months, never beyond the payment itself.`, `${result.supportMonths} ay boyunca ${money(first.support)} aylık destek kredi taksitine eklenir; destek tutarı taksiti aşmaz.`)}</p>}
      {result.firstDeficitMonth !== null && <p>{tx("The remaining loan balance assumes every scheduled payment is made. Missed payments and lender approval are not modeled.", "Kalan kredi borcu, taksitlerin zamanında ödendiği varsayımıyla hesaplanır. Aksayan ödemeler ve kredi onayı modellenmez.")}</p>}
      {(result.missingOwnerCosts || result.missingBuyingCosts) && <p>{tx("Check ownership and purchase costs left at zero against real quotes; zero entries can make the result optimistic.", "Sıfır bıraktığın ev sahipliği ve alım giderlerini gerçek tekliflerle kontrol et; sıfır girişler sonucu olduğundan daha rahat gösterebilir.")}</p>}
      <p>{tx("This is your scenario, not a market forecast or a recommendation to buy.", "Bu senin senaryon; piyasa tahmini ya da ev alma tavsiyesi değil.")}</p>
    </div></details>
  </section>
}
