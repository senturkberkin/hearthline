import * as React from "react"
import { ArrowLeft, ArrowRight, ChevronDown, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BrandHeader } from "@/components/product/shell"
import { MoneyInput, PercentInput } from "@/components/product/financial-input"
import { FieldInfo, FieldInfoLabel } from "@/components/product/field-info"
import { IncomeHistoryCalculator } from "@/components/product/income-history-calculator"
import { MonthPicker } from "@/components/product/month-picker"
import { SupportInputs } from "@/components/product/support-inputs"
import { useProduct } from "@/lib/product-context"
import { clampDownPayment, downPaymentAllocation } from "@/lib/down-payment-allocation"
import { validateScenario, withPrincipal, type Scenario } from "@/lib/engine"
import { sitePath } from "@/lib/utils"

function AssumptionFieldLabel({ label, badge, info, infoLabel }: { label: string; badge: string; info: React.ReactNode; infoLabel: string }) {
  return <span className="inline-flex flex-wrap items-center gap-1"><span>{label}</span><span className="rounded-full bg-primary/8 px-1.5 py-0.5 text-[9px] font-semibold text-primary">{badge}</span><FieldInfo label={infoLabel}>{info}</FieldInfo></span>
}

function IntegerInput({ id, value, onValueChange, min, max }: { id: string; value: number; onValueChange: (value: number) => void; min: number; max: number }) {
  const [text, setText] = React.useState(() => String(value))
  const isEditing = React.useRef(false)
  const normalize = (raw: string) => Math.min(max, Math.max(min, Math.round(Number(raw))))

  React.useEffect(() => {
    if (!isEditing.current) setText(String(value))
  }, [value])

  return <Input
    id={id}
    type="number"
    inputMode="numeric"
    min={min}
    max={max}
    value={text}
    onFocus={() => { isEditing.current = true }}
    onChange={event => {
      const raw = event.target.value
      setText(raw)
      if (raw === "") return
      const next = normalize(raw)
      if (Number.isFinite(next)) onValueChange(next)
    }}
    onBlur={() => {
      isEditing.current = false
      if (text === "") { setText(String(value)); return }
      const next = normalize(text)
      setText(String(next))
      if (next !== value) onValueChange(next)
    }}
  />
}

export function SetupPage({ embedded = false, onComplete }: { embedded?: boolean; onComplete?: () => void } = {}) {
  const { scenario, setScenario, tx, money, percent } = useProduct()
  const [draft, setDraft] = React.useState<Scenario>(() => ({ ...scenario, downPayment: clampDownPayment(scenario) }))
  const [step, setStep] = React.useState(0)
  const [direction, setDirection] = React.useState<"forward" | "back">("forward")
  const [nextRent, setNextRent] = React.useState(0)
  const [error, setError] = React.useState("")
  const steps = [tx("Today", "Bugün"), tx("The home", "Ev"), tx("Future assumptions", "Gelecek")]
  const update = (patch: Partial<Scenario>) => setDraft(current => { const next = { ...current, ...patch }; return { ...next, downPayment: clampDownPayment(next) } })
  const hasNextRent = draft.rent > 0 && nextRent > 0
  const observedRentRise = hasNextRent ? (nextRent / draft.rent - 1) * 100 : 0
  const rentRiseApplied = hasNextRent && Math.abs(draft.rentGrowth - observedRentRise) < .05
  const allocation = downPaymentAllocation(draft)
  const Content = embedded ? "div" : "main"
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const previousStep = React.useRef(step)
  const assumption = tx("Assumption", "Varsayım")

  React.useEffect(() => { if (embedded) setDraft({ ...scenario, downPayment: clampDownPayment(scenario) }) }, [embedded, scenario])
  React.useEffect(() => { if (previousStep.current !== step) headingRef.current?.focus({ preventScroll: true }); previousStep.current = step }, [step])

  function moveToStep(nextStep: number) {
    if (nextStep === step) return
    setDirection(nextStep > step ? "forward" : "back")
    setStep(nextStep)
    setError("")
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }

  function continueStep() {
    if (step === 0 && draft.income <= 0) return setError(tx("Enter your monthly take-home pay.", "Aylık net gelirini gir."))
    if (step === 0 && draft.rent <= 0) return setError(tx("Enter your current rent.", "Güncel kiranı gir."))
    if (step === 1 && draft.propertyPrice <= 0) return setError(tx("Enter the home price.", "Ev fiyatını gir."))
    if (step < 2) { moveToStep(step + 1); return }
    const next = withPrincipal(draft)
    const problem = validateScenario(next)
    if (problem) { setError(problem === "range" ? tx("Use a loan term and scenario length of 1–40 years, and check the interest rate.", "Vade ve senaryo süresi 1–40 yıl olmalı; faiz oranını da kontrol et.") : tx("Check the home price, savings and contribution amounts.", "Ev fiyatını, birikimi ve katkı tutarlarını kontrol et.")); return }
    setScenario(next)
    if (onComplete) onComplete()
    else window.location.assign(sitePath("/results/"))
  }

  return <div className={embedded ? "bg-background text-foreground" : "min-h-screen bg-background text-foreground"}>
    {!embedded && <BrandHeader mode="app" />}
    <Content className="mx-auto max-w-[1240px] px-5 pb-12 pt-8 sm:px-8 sm:pb-14">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6"><div><h1 className="max-w-[760px] text-[clamp(1.85rem,3vw,2.65rem)] leading-tight font-semibold tracking-[-.05em]">{tx("Compare buying a home with renting.", "Ev almayı ve kirada kalmayı karşılaştır.")}</h1><p className="mt-3 max-w-[680px] text-[14px] leading-6 text-ink-soft">{tx("Start with what you know today. Future assumptions come last.", "Bugün bildiklerinle başla. Geleceğe ilişkin varsayımlar son adımda.")}</p></div><span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5" />{tx("Private in this browser", "Bu tarayıcıda gizli")}</span></div>
      <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_315px] lg:gap-16">
        <div className="min-w-0">
          <div className="step-switcher mb-5 grid max-w-[680px] grid-cols-3 rounded-full bg-muted p-1" role="group" aria-label={tx(`Step ${step + 1} of 3`, `3 adımın ${step + 1}. adımı`)}><span className="step-switcher__active" style={{ transform: `translateX(${step * 100}%)` }} aria-hidden="true" />{steps.map((name, index) => <button key={name} type="button" onClick={() => { if (index <= step) moveToStep(index) }} disabled={index > step} aria-current={index === step ? "step" : undefined} className={`relative z-10 min-h-10 rounded-full px-2 py-2 text-[12px] font-semibold transition-colors duration-300 ${index === step ? "text-primary-foreground" : index < step ? "text-foreground hover:text-primary" : "text-muted-foreground"}`}>{name}</button>)}</div>

          {step > 0 && <div className="mb-7 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-ink-soft lg:hidden" aria-label={tx("Entered values", "Girilen bilgiler")}><span>{tx("Income", "Gelir")} <strong className="text-foreground">{money(draft.income)}</strong></span><span aria-hidden="true">·</span><span>{tx("Rent", "Kira")} <strong className="text-foreground">{money(draft.rent)}</strong></span>{step > 1 && <><span aria-hidden="true">·</span><span>{tx("Home", "Ev")} <strong className="text-foreground">{money(draft.propertyPrice)}</strong></span></>}</div>}

          <div key={step} className={`step-content step-content--${direction}`}>
          {step === 0 && <section aria-labelledby="today-heading" className="max-w-[680px]"><span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold text-primary">{tx("Known today", "Bugünkü bilgiler")}</span><h2 id="today-heading" ref={headingRef} tabIndex={-1} className="mt-3 text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("What does your budget look like today?", "Bugünkü bütçen nasıl?")}</h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <MoneyInput id="current-income" label={<FieldInfoLabel infoLabel={tx("About monthly take-home income", "Aylık net gelir hakkında")} info={tx("Enter the amount you normally have available each month after tax. If your income varies, use a typical month.", "Vergi sonrası her ay genellikle eline geçen tutarı yaz. Gelirin değişkense tipik bir ayı kullan.")}>{tx("Current monthly take-home income", "Güncel aylık net gelir")}</FieldInfoLabel>} value={draft.income} onValueChange={income => update({ income })} invalid={Boolean(error && draft.income <= 0)} />
              <MoneyInput id="current-rent" label={tx("Current monthly rent", "Güncel aylık kira")} value={draft.rent} onValueChange={rent => update({ rent })} invalid={Boolean(error && draft.rent <= 0)} />
              <MoneyInput id="living-costs" label={<FieldInfoLabel infoLabel={tx("What to include in regular expenses", "Düzenli giderlere neleri eklemeli?")} info={tx("Include regular spending other than rent, such as groceries, bills, transport and subscriptions. Enter recurring debt payments separately.", "Kira dışındaki düzenli harcamalarını yaz: market, faturalar, ulaşım, abonelikler vb. Düzenli borç ödemelerini ayrı alana gir.")}>{tx("Other regular monthly expenses", "Kira dışındaki düzenli aylık giderler")}</FieldInfoLabel>} value={draft.livingCosts} onValueChange={livingCosts => update({ livingCosts })} />
              <MoneyInput id="savings" label={<FieldInfoLabel infoLabel={tx("About available savings", "Kullanılabilir birikim hakkında")} info={tx("Enter liquid savings you could realistically access for this decision. You choose how much to use as a down payment separately.", "Bu karar için gerçekçi olarak erişebileceğin likit birikimi gir. Peşinata ne kadarını ayıracağını ayrıca seçersin.")}>{tx("Savings available to you", "Kullanabileceğin birikim")}</FieldInfoLabel>} value={draft.savings} onValueChange={savings => update({ savings })} />
            </div>
            <Collapsible className="mt-6"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="px-0 text-primary">{tx("Add recurring debt payments", "Düzenli borç ödemesi ekle")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="max-w-[300px] pt-4"><MoneyInput id="debt" label={<FieldInfoLabel infoLabel={tx("About monthly debt payments", "Aylık borç ödemeleri hakkında")} info={tx("Regular debt payments that continue each month, such as personal loans or card installments.", "Her ay devam eden düzenli borç ödemeleri; ihtiyaç kredisi veya kart taksitleri gibi.")}>{tx("Other monthly debt", "Diğer aylık borç")}</FieldInfoLabel>} value={draft.debt} onValueChange={debt => update({ debt })} /></CollapsibleContent></Collapsible>
          </section>}

          {step === 1 && <section aria-labelledby="home-heading" className="max-w-[680px]"><span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold text-primary">{tx("Home and financing", "Ev ve finansman")}</span><h2 id="home-heading" ref={headingRef} tabIndex={-1} className="mt-3 text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("What home are you considering?", "Nasıl bir ev düşünüyorsun?")}</h2>
            <div className="mt-7 max-w-[320px]"><MoneyInput id="home-price" label={tx("Home price", "Ev fiyatı")} value={draft.propertyPrice} onValueChange={propertyPrice => update({ propertyPrice })} invalid={Boolean(error && draft.propertyPrice <= 0)} /></div>
            <div className="mt-6 rounded-[18px] bg-muted p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="flex items-center gap-1 text-[17px] font-semibold tracking-[-.03em]">{tx("How much will you put down?", "Birikiminden peşinata ne kadar ayırırsın?")}<FieldInfo label={tx("How the down payment affects the scenario", "Peşinatın senaryoyu nasıl etkilediği")}>{tx("A larger down payment reduces the loan and monthly payment, but leaves less cash available after purchase.", "Daha yüksek peşinat kredi ve aylık taksiti azaltır; ancak alım sonrası daha az nakit bırakır.")}</FieldInfo></h3><span className="rounded-full bg-card px-3 py-1 text-[12px] font-semibold text-primary tabular-nums">{tx("Savings allocated", "Birikimden ayrılan")} · {percent(allocation.share)}</span></div>
              <div className="mt-5 max-w-[300px]"><MoneyInput id="down-payment" label={tx("Your down payment", "Kendi peşinatın")} value={draft.downPayment} onValueChange={downPayment => update({ downPayment })} min={0} max={allocation.limit} invalid={allocation.outsideLimit} /></div>
              <input type="range" min={0} max={allocation.limit} step={1} value={Math.min(Math.max(0, draft.downPayment), allocation.limit)} onChange={event => update({ downPayment: Number(event.target.value) })} disabled={allocation.limit === 0} aria-label={tx("Savings used for down payment", "Peşinata ayrılan birikim")} aria-valuetext={money(Math.min(Math.max(0, draft.downPayment), allocation.limit))} className="allocation-range mt-6" style={{ "--progress": `${allocation.limit > 0 ? Math.min(100, Math.max(0, draft.downPayment / allocation.limit * 100)) : 0}%` } as React.CSSProperties} />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums"><span>{money(0)}</span><span>{money(allocation.limit)}</span></div>
              <div className="mt-6 flex flex-wrap justify-between gap-x-8 gap-y-4"><div><span className="block text-[12px] text-muted-foreground">{tx("Savings left after down payment", "Peşinat sonrası kalan birikim")}</span><strong className={`mt-1 block text-[20px] font-semibold tabular-nums ${allocation.remaining < 0 ? "text-destructive" : ""}`}>{money(allocation.remaining)}</strong></div><div><span className="flex items-center gap-1 text-[12px] text-muted-foreground">{tx("Three months of expenses", "Üç aylık gider karşılığı")}<FieldInfo label={tx("About the three-month reference", "Üç aylık gider referansı hakkında")}>{tx("Shown as a reference buffer only. Hearthline does not require you to keep this amount.", "Yalnızca referans olarak gösterilir. Hearthline bu tutarı kenarda tutmanı zorunlu kabul etmez.")}</FieldInfo></span><strong className="mt-1 block text-[20px] font-semibold tabular-nums">{money(allocation.suggestedReserve)}</strong></div></div>
              {allocation.outsideLimit ? <p role="alert" className="mt-4 text-[12px] font-medium text-destructive">{tx("Choose a down payment between zero and the available amount.", "Peşinatı sıfır ile kullanılabilir tutar arasında seç.")}</p> : allocation.belowSuggestedReserve && <p className="mt-4 text-[12px] font-medium text-ink-soft">{tx("Less than the three-month reference would remain.", "Üç aylık gider referansından daha az birikim kalır.")}</p>}
            </div>
              <div className="mt-6 rounded-[18px] bg-[#f1f4fb] p-5 dark:bg-[#292d32] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[15px] font-semibold">{tx("Loan assumption", "Kredi varsayımı")}</h3><span className="rounded-full bg-card px-2 py-1 text-[10px] font-semibold text-primary">{assumption}</span></div><p className="mt-2 text-[11px] text-ink-soft">{tx(`${percent(draft.rate, 2)} monthly · ${draft.termYears} years`, `Aylık ${percent(draft.rate, 2)} · ${draft.termYears} yıl`)}</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><PercentInput id="rate" label={<FieldInfoLabel infoLabel={tx("About the mortgage rate", "Konut kredisi faiz oranı hakkında")} info={tx("Enter the monthly mortgage rate quoted by the lender. Do not enter an annual rate here. Example: 2.5 means 2.5% per month.", "Bankanın teklif ettiği aylık konut kredisi faiz oranını gir. Yıllık faiz oranını girme. Örneğin 2,5 değeri aylık %2,5 anlamına gelir.")}>{tx("Monthly mortgage rate", "Aylık konut kredisi faizi")}</FieldInfoLabel>} value={draft.rate} onValueChange={rate => update({ rate, rateMode: "monthly" })} min={0} max={100} /><Field><FieldLabel htmlFor="loan-term">{tx("Mortgage term (years)", "Kredi vadesi (yıl)")}</FieldLabel><IntegerInput id="loan-term" value={draft.termYears} onValueChange={termYears => update({ termYears })} min={1} max={40} /></Field></div></div>
            <Collapsible className="mt-6"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="h-auto w-full justify-between px-0 py-2 text-left text-primary"><span><span className="block">{tx("Other home costs and settings", "Diğer ev giderleri ve ayarlar")}</span><span className="mt-1 block text-[10px] font-normal text-ink-soft">{tx("Additional buying costs", "Ek alım giderleri")}: {money(draft.closingCosts + draft.renovation)}</span></span><ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="grid gap-5 rounded-[16px] bg-[#f5f7fd] p-5 dark:bg-[#24282e] sm:grid-cols-2">
              <MoneyInput id="reserve" label={<FieldInfoLabel infoLabel={tx("About savings kept aside", "Kenarda tutulan birikim hakkında")} info={tx("Money you want to keep available instead of using toward the purchase. Hearthline uses it to flag the result; it does not automatically limit the down payment.", "Ev alımında kullanmak yerine kenarda tutmak istediğin tutar. Hearthline bunu sonucu değerlendirirken kullanır; peşinatı otomatik olarak sınırlamaz.")}>{tx("Savings to keep untouched", "Kenarda tutmak istediğin birikim")}</FieldInfoLabel>} value={draft.reserve} onValueChange={reserve => update({ reserve })} />
              <MoneyInput id="closing-costs" label={<FieldInfoLabel infoLabel={tx("About buying costs", "Satın alma giderleri hakkında")} info={tx("One-time costs in addition to the down payment, such as taxes, valuation, insurance, legal fees or moving costs.", "Peşinata ek tek seferlik giderler: vergi, ekspertiz, sigorta, hukuki masraflar, taşınma gibi.")}>{tx("Buying costs", "Satın alma giderleri")}</FieldInfoLabel>} value={draft.closingCosts} onValueChange={closingCosts => update({ closingCosts })} />
              <MoneyInput id="renovation" label={tx("Initial renovation", "İlk tadilat gideri")} value={draft.renovation} onValueChange={renovation => update({ renovation })} />
              <MoneyInput id="owner-costs" label={<FieldInfoLabel infoLabel={tx("About homeowner costs", "Ev sahipliği giderleri hakkında")} info={tx("Recurring ownership costs outside the mortgage, such as maintenance, insurance or building fees.", "Kredi taksiti dışındaki düzenli ev sahipliği giderleri; bakım, sigorta veya bina giderleri gibi.")}>{tx("Annual homeowner costs", "Yıllık ev sahipliği giderleri")}</FieldInfoLabel>} value={draft.ownerCosts} onValueChange={ownerCosts => update({ ownerCosts })} />
            </CollapsibleContent></Collapsible>
          </section>}

          {step === 2 && <section aria-labelledby="future-heading" className="max-w-[680px]"><span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold text-primary">{tx("Your assumptions", "Senin varsayımların")}</span><h2 id="future-heading" ref={headingRef} tabIndex={-1} className="mt-3 text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("What might change over time?", "Zaman içinde neler değişebilir?")}</h2><p className="mt-2 max-w-[560px] text-[12px] leading-5 text-ink-soft">{tx("These are not forecasts. Keep the current values or adjust how the scenario changes over time.", "Bunlar tahmin değil. Mevcut değerleri koruyabilir veya senaryonun zaman içinde nasıl değişeceğini belirleyebilirsin.")}</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-[18px] bg-[#f1f4fb] p-5 dark:bg-[#292d32]"><h3 className="text-[15px] font-semibold">{tx("Income and rent growth", "Gelir ve kira artışı")}</h3><div className="mt-4 grid gap-5 sm:grid-cols-2"><PercentInput id="income-growth" label={<AssumptionFieldLabel label={tx("Annual income growth", "Yıllık gelir artışı")} badge={assumption} infoLabel={tx("About future income growth", "Gelecek gelir artışı hakkında")} info={tx("The annual salary growth Hearthline uses going forward.", "Hearthline’ın gelecek yıllar için kullanacağı yıllık gelir artışı varsayımıdır.")} />} value={draft.incomeGrowth} onValueChange={incomeGrowth => update({ incomeGrowth })} /><PercentInput id="rent-growth" label={<AssumptionFieldLabel label={tx("Annual rent growth", "Yıllık kira artışı")} badge={assumption} infoLabel={tx("About future rent change", "Gelecek kira artışı hakkında")} info={tx("The annual rent change Hearthline applies at each future rent-renewal month.", "Hearthline’ın gelecekteki her kira yenileme ayında uyguladığı yıllık kira değişimidir.")} />} value={draft.rentGrowth} onValueChange={rentGrowth => update({ rentGrowth })} /></div><Collapsible className="mt-5"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="px-0 text-primary">{tx("Set months or calculate from past figures", "Ayları seç veya geçmiş veriden hesapla")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="grid gap-7 pt-4 sm:grid-cols-2"><div><IncomeHistoryCalculator currentIncome={draft.income} onApply={incomeGrowth => update({ incomeGrowth })} /><div className="mt-5"><MonthPicker value={draft.raiseMonth} onValueChange={raiseMonth => update({ raiseMonth })} label={tx("Raise month", "Zam ayı")} /></div></div><div><MoneyInput id="next-rent" label={tx("Next monthly rent", "Sonraki aylık kira")} value={nextRent} onValueChange={setNextRent} />{hasNextRent && <div className="mt-4 flex flex-wrap items-center gap-3"><span className="rounded-[12px] bg-card px-3 py-2 text-[12px] font-semibold tabular-nums">{tx("Calculated", "Hesaplanan")} · {percent(observedRentRise)}</span><Button type="button" size="sm" variant={rentRiseApplied ? "outline" : "default"} disabled={rentRiseApplied} onClick={() => update({ rentGrowth: Math.round(observedRentRise * 10) / 10 })}>{rentRiseApplied ? tx("Applied", "Uygulandı") : tx("Use this increase", "Bu artışı kullan")}</Button></div>}<div className="mt-5"><MonthPicker value={draft.rentRenewal} onValueChange={rentRenewal => update({ rentRenewal })} label={tx("Rent increase month", "Kira artış ayı")} /></div></div></CollapsibleContent></Collapsible></div>
              <div className="rounded-[18px] bg-[#f1f4fb] p-5 dark:bg-[#292d32]"><h3 className="text-[15px] font-semibold">{tx("Other assumptions", "Diğer varsayımlar")}</h3><div className="mt-4 grid gap-5 sm:grid-cols-2"><PercentInput id="expense-growth" label={<AssumptionFieldLabel label={tx("Annual increase in regular expenses", "Düzenli giderlerde yıllık artış")} badge={assumption} infoLabel={tx("About expense growth", "Gider artışı hakkında")} info={tx("This is your assumption for how regular living costs change each year.", "Düzenli yaşam giderlerinin her yıl nasıl değişeceğine ilişkin varsayımındır.")} />} value={draft.expenseGrowth} onValueChange={expenseGrowth => update({ expenseGrowth })} /><Field><FieldLabel htmlFor="horizon" className="flex items-center gap-1">{tx("Scenario length (years)", "Senaryo süresi (yıl)")}<FieldInfo label={tx("About scenario length", "Senaryo süresi hakkında")}>{tx("This only controls how many years Hearthline shows. It does not change the mortgage term.", "Yalnızca Hearthline’ın kaç yılı göstereceğini belirler. Kredi vadesini değiştirmez.")}</FieldInfo></FieldLabel><IntegerInput id="horizon" value={draft.horizon} onValueChange={horizon => update({ horizon })} min={1} max={40} /></Field></div></div>
            </div>
            <SupportInputs scenario={draft} update={update} />
          </section>}
          </div>

          {error && <p role="alert" className="mt-5 text-[12px] font-medium text-destructive">{error}</p>}
          <div className="mt-10 flex max-w-[680px] items-center justify-between"><Button type="button" variant="ghost" onClick={() => moveToStep(Math.max(0, step - 1))} disabled={step === 0} className="px-0"><ArrowLeft className="size-4" />{tx("Back", "Geri")}</Button><Button type="button" onClick={continueStep} className="gap-2">{step === 0 ? tx("Continue to the home", "Ev bilgilerine geç") : step === 1 ? tx("Continue to assumptions", "Varsayımlara geç") : tx("See results", "Sonuçları gör")}<ArrowRight className="size-4" /></Button></div>
        </div>
        <aside className="hidden lg:block"><div className="sticky top-8 rounded-[20px] bg-[#f1f3ff] px-6 pb-6 pt-5 dark:bg-[#292d32]"><h2 className="text-[18px] font-semibold tracking-[-.035em]">{tx("Your starting point", "Başlangıç durumun")}</h2><dl className="mt-6 space-y-2">{[[tx("Monthly income", "Aylık gelir"), money(draft.income)], [tx("Current rent", "Güncel kira"), money(draft.rent)], [tx("Other spending", "Diğer giderler"), money(draft.livingCosts)], [tx("Home price", "Ev fiyatı"), money(draft.propertyPrice)], [tx("Savings", "Birikim"), money(draft.savings)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 rounded-[9px] bg-white/75 px-3 py-2.5 text-[12px] dark:bg-white/6"><dt className="text-ink-soft">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl></div></aside>
      </div>
    </Content>
  </div>
}
