import * as React from "react"
import { ArrowLeft, ArrowRight, ChevronDown, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BrandHeader } from "@/components/product/shell"
import { MoneyInput, PercentInput } from "@/components/product/financial-input"
import { IncomeHistoryCalculator } from "@/components/product/income-history-calculator"
import { MonthPicker } from "@/components/product/month-picker"
import { SupportInputs } from "@/components/product/support-inputs"
import { useProduct } from "@/lib/product-context"
import { clampDownPayment, downPaymentAllocation } from "@/lib/down-payment-allocation"
import { validateScenario, withPrincipal, type Scenario } from "@/lib/engine"
import { sitePath } from "@/lib/utils"

export function SetupPage({ embedded = false, onComplete }: { embedded?: boolean; onComplete?: () => void } = {}) {
  const { scenario, setScenario, tx, money, percent } = useProduct()
  const [draft, setDraft] = React.useState<Scenario>(() => ({ ...scenario, downPayment: clampDownPayment(scenario) }))
  const [step, setStep] = React.useState(0)
  const [direction, setDirection] = React.useState<"forward" | "back">("forward")
  const [nextRent, setNextRent] = React.useState(0)
  const [error, setError] = React.useState("")
  const steps = [tx("Income", "Gelir"), tx("Rent", "Kira"), tx("Home", "Ev")]
  const update = (patch: Partial<Scenario>) => setDraft(current => { const next = { ...current, ...patch }; return { ...next, downPayment: clampDownPayment(next) } })
  const observedRentRise = draft.rent > 0 && nextRent > 0 ? (nextRent / draft.rent - 1) * 100 : 0
  const allocation = downPaymentAllocation(draft)
  const Content = embedded ? "div" : "main"
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const previousStep = React.useRef(step)

  React.useEffect(() => { if (embedded) setDraft({ ...scenario, downPayment: clampDownPayment(scenario) }) }, [embedded, scenario])

  React.useEffect(() => {
    if (previousStep.current !== step) headingRef.current?.focus({ preventScroll: true })
    previousStep.current = step
  }, [step])

  function moveToStep(nextStep: number) {
    if (nextStep === step) return
    setDirection(nextStep > step ? "forward" : "back")
    setStep(nextStep)
    setError("")
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }

  function continueStep() {
    if (step === 0 && draft.income <= 0) return setError(tx("Enter your monthly take-home pay.", "Aylık net gelirini gir."))
    if (step === 1 && draft.rent <= 0) return setError(tx("Enter your current rent.", "Güncel kiranı gir."))
    if (step < 2) { moveToStep(step + 1); return }
    const next = withPrincipal(draft)
    const problem = validateScenario(next)
    if (problem) { setError(problem === "range" ? tx("Use a loan term and scenario length of 1–40 years, and check the interest rate.", "Vade ve senaryo süresi 1–40 yıl olmalı; faiz oranını da kontrol et.") : tx("Check the home price, savings and contribution amounts.", "Ev fiyatını, birikimi ve katkı tutarlarını kontrol et.")); return }
    setScenario(next)
    try { sessionStorage.setItem("hearthline.scenario.v1", JSON.stringify(next)) } catch { /* Continue in memory if storage is unavailable. */ }
    if (onComplete) onComplete()
    else window.location.assign(sitePath("/results/"))
  }

  return <div className={embedded ? "bg-background text-foreground" : "min-h-screen bg-background text-foreground"}>
    {!embedded && <BrandHeader mode="app" />}
    <Content className="mx-auto max-w-[1240px] px-5 pb-16 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6"><div><h1 className="max-w-[760px] text-[clamp(1.85rem,3vw,2.65rem)] leading-tight font-semibold tracking-[-.05em]">{tx("Compare buying a home with renting.", "Ev almayı ve kirada kalmayı karşılaştır.")}</h1><p className="mt-3 max-w-[680px] text-[14px] leading-6 text-ink-soft">{tx("Enter your income, expenses, savings and home price to see how each path affects your monthly budget.", "Gelir, gider, birikim ve ev fiyatını gir; iki seçeneğin aylık bütçene etkisini gör.")}</p></div><span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5" />{tx("Private in this browser", "Bu tarayıcıda gizli")}</span></div>
      <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_315px] lg:gap-16">
        <div className="min-w-0">
          <div className="step-switcher mb-8 grid max-w-[680px] grid-cols-3 rounded-full bg-muted p-1" role="group" aria-label={tx(`Step ${step + 1} of 3`, `3 adımın ${step + 1}. adımı`)}>
            <span className="step-switcher__active" style={{ transform: `translateX(${step * 100}%)` }} aria-hidden="true" />
            {steps.map((name, index) => <button key={name} type="button" onClick={() => { if (index <= step) moveToStep(index) }} disabled={index > step} aria-current={index === step ? "step" : undefined} className={`relative z-10 min-h-10 rounded-full px-2 py-2 text-[12px] font-semibold transition-colors duration-300 ${index === step ? "text-primary-foreground" : index < step ? "text-foreground hover:text-primary" : "text-muted-foreground"}`}>{name}</button>)}
          </div>

          <div key={step} className={`step-content step-content--${direction}`}>
          {step === 0 && <section aria-labelledby="income-heading" className="max-w-[680px]"><h2 id="income-heading" ref={headingRef} tabIndex={-1} className="text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("What comes in each month?", "Her ay eline ne geçiyor?")}</h2>
            <div className="mt-7 grid max-w-[560px] gap-5 sm:grid-cols-2"><MoneyInput id="current-income" label={tx("Current monthly pay", "Güncel aylık net gelir")} value={draft.income} onValueChange={income => update({ income })} invalid={Boolean(error && draft.income <= 0)} /><PercentInput id="income-growth" label={tx("Expected annual income growth", "Beklenen yıllık gelir artışı")} value={draft.incomeGrowth} onValueChange={incomeGrowth => update({ incomeGrowth })} /></div>
            <IncomeHistoryCalculator currentIncome={draft.income} onApply={incomeGrowth => update({ incomeGrowth })} />
            <Collapsible className="mt-6"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="px-0 text-primary">{tx("More income timing", "Zam ayını seç")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="pt-4"><MonthPicker value={draft.raiseMonth} onValueChange={raiseMonth => update({ raiseMonth })} label={tx("Usual raise month", "Zam ayı")} /></CollapsibleContent></Collapsible>
          </section>}

          {step === 1 && <section aria-labelledby="rent-heading" className="max-w-[680px]"><h2 id="rent-heading" ref={headingRef} tabIndex={-1} className="text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("What does your month cost?", "Aylık giderlerin ne kadar?")}</h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-2"><MoneyInput id="current-rent" label={tx("Current monthly rent", "Güncel aylık kira")} value={draft.rent} onValueChange={rent => update({ rent })} invalid={Boolean(error && draft.rent <= 0)} /><MoneyInput id="living-costs" label={tx("Other monthly expenses", "Aylık diğer giderler")} value={draft.livingCosts} onValueChange={livingCosts => update({ livingCosts })} /></div>
            <div className="mt-6 max-w-[280px]"><PercentInput id="expense-growth" label={tx("Annual increase in other expenses", "Diğer giderlerde yıllık artış")} value={draft.expenseGrowth} onValueChange={expenseGrowth => update({ expenseGrowth })} /></div>
            <Collapsible className="mt-8"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="px-0 text-primary">{tx("Know your next rent?", "Sonraki kiranı biliyor musun?")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="grid gap-4 pt-5 sm:grid-cols-2"><MoneyInput id="next-rent" label={tx("Next monthly rent", "Sonraki aylık kira")} value={nextRent} onValueChange={setNextRent} />{nextRent > 0 && <div className="self-end pb-2 text-[12px] text-muted-foreground">{tx("That is a", "Bu, ")} <strong className="text-foreground">{percent(observedRentRise)}</strong> {tx("change.", "değişimdir.")}</div>}</CollapsibleContent></Collapsible>
            <div className="mt-8 max-w-[220px]"><PercentInput id="rent-growth" label={tx("Future annual rent change", "Gelecek yıllık kira artışı")} value={draft.rentGrowth} onValueChange={rentGrowth => update({ rentGrowth })} /></div>
            <Collapsible className="mt-6"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="px-0 text-primary">{tx("Rent renewal timing", "Kira artış ayını seç")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="pt-4"><MonthPicker value={draft.rentRenewal} onValueChange={rentRenewal => update({ rentRenewal })} label={tx("Rent renewal month", "Kira yenileme ayı")} /></CollapsibleContent></Collapsible>
          </section>}

          {step === 2 && <section aria-labelledby="home-heading" className="max-w-[680px]"><h2 id="home-heading" ref={headingRef} tabIndex={-1} className="text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("What home are you considering?", "Nasıl bir ev düşünüyorsun?")}</h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-2"><MoneyInput id="home-price" label={tx("Home price", "Ev fiyatı")} value={draft.propertyPrice} onValueChange={propertyPrice => update({ propertyPrice })} invalid={Boolean(error && draft.propertyPrice <= 0)} /><MoneyInput id="savings" label={tx("Your savings", "Birikimin")} value={draft.savings} onValueChange={savings => update({ savings })} /></div>
            <div className="mt-6 rounded-[18px] bg-muted p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-[17px] font-semibold tracking-[-.03em]">{tx("How much will you put down?", "Birikiminden peşinata ne kadar ayırırsın?")}</h3><span className="rounded-full bg-card px-3 py-1 text-[12px] font-semibold text-primary tabular-nums">{tx("Savings allocated", "Birikimden ayrılan")} · {percent(allocation.share)}</span></div>
              <div className="mt-5 max-w-[300px]"><MoneyInput id="down-payment" label={tx("Your down payment", "Kendi peşinatın")} value={draft.downPayment} onValueChange={downPayment => update({ downPayment })} min={0} max={allocation.limit} invalid={allocation.outsideLimit} /></div>
              <input type="range" min={0} max={allocation.limit} step={1} value={Math.min(Math.max(0, draft.downPayment), allocation.limit)} onChange={event => update({ downPayment: Number(event.target.value) })} disabled={allocation.limit === 0} aria-label={tx("Savings used for down payment", "Peşinata ayrılan birikim")} aria-valuetext={money(Math.min(Math.max(0, draft.downPayment), allocation.limit))} className="allocation-range mt-6" style={{ "--progress": `${allocation.limit > 0 ? Math.min(100, Math.max(0, draft.downPayment / allocation.limit * 100)) : 0}%` } as React.CSSProperties} />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums"><span>{money(0)}</span><span>{money(allocation.limit)}</span></div>
              <div className="mt-6 flex flex-wrap justify-between gap-x-8 gap-y-4"><div><span className="block text-[12px] text-muted-foreground">{tx("Savings left after down payment", "Peşinat sonrası kalan birikim")}</span><strong className={`mt-1 block text-[20px] font-semibold tabular-nums ${allocation.remaining < 0 ? "text-destructive" : ""}`}>{money(allocation.remaining)}</strong></div><div><span className="block text-[12px] text-muted-foreground">{tx("Three months of expenses", "Üç aylık gider karşılığı")}</span><strong className="mt-1 block text-[20px] font-semibold tabular-nums">{money(allocation.suggestedReserve)}</strong></div></div>
              {allocation.outsideLimit ? <p role="alert" className="mt-4 text-[12px] font-medium text-destructive">{tx("Choose a down payment between zero and the available amount.", "Peşinatı sıfır ile kullanılabilir tutar arasında seç.")}</p> : allocation.belowSuggestedReserve && <p className="mt-4 text-[12px] font-medium text-ink-soft">{tx("Less than three months of expenses would remain.", "Üç aylık gider karşılığından daha az birikim kalır.")}</p>}
            </div>
            <Collapsible className="mt-5"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="px-0 text-primary">{tx("Loan and advanced assumptions", "Kredi ve diğer varsayımlar")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="grid gap-5 rounded-[16px] bg-[#f5f7fd] p-5 sm:grid-cols-2"><PercentInput id="rate" label={tx("Monthly interest rate", "Aylık faiz oranı")} value={draft.rate} onValueChange={rate => update({ rate })} min={0} max={100} /><Field><FieldLabel htmlFor="loan-term">{tx("Loan term (years)", "Kredi vadesi (yıl)")}</FieldLabel><Input id="loan-term" type="number" min="1" max="40" value={draft.termYears} onChange={event => update({ termYears: Number(event.target.value) })} /></Field><MoneyInput id="reserve" label={tx("Cash reserve", "Acil durum birikimi")} value={draft.reserve} onValueChange={reserve => update({ reserve })} /><MoneyInput id="closing-costs" label={tx("Buying costs", "Satın alma giderleri")} value={draft.closingCosts} onValueChange={closingCosts => update({ closingCosts })} /><MoneyInput id="renovation" label={tx("Initial renovation", "İlk tadilat gideri")} value={draft.renovation} onValueChange={renovation => update({ renovation })} /><MoneyInput id="owner-costs" label={tx("Annual homeowner costs", "Yıllık ev sahipliği giderleri")} value={draft.ownerCosts} onValueChange={ownerCosts => update({ ownerCosts })} /><MoneyInput id="debt" label={tx("Other monthly debt", "Diğer aylık borç")} value={draft.debt} onValueChange={debt => update({ debt })} /><Field><FieldLabel htmlFor="horizon">{tx("Scenario length (years)", "Senaryo süresi (yıl)")}</FieldLabel><Input id="horizon" type="number" min="1" max="40" value={draft.horizon} onChange={event => update({ horizon: Number(event.target.value) })} /></Field></CollapsibleContent></Collapsible>
            <SupportInputs scenario={draft} update={update} />
          </section>}
          </div>

          {error && <p role="alert" className="mt-5 text-[12px] font-medium text-destructive">{error}</p>}
          <div className="mt-10 flex items-center justify-between"><Button type="button" variant="ghost" onClick={() => moveToStep(Math.max(0, step - 1))} disabled={step === 0} className="px-0"><ArrowLeft className="size-4" />{tx("Back", "Geri")}</Button><Button type="button" onClick={continueStep} className="gap-2">{step === 2 ? tx("See results", "Sonuçları gör") : tx("Continue", "Devam et")}<ArrowRight className="size-4" /></Button></div>
        </div>
        <aside className="hidden lg:block"><div className="sticky top-8 rounded-[20px] bg-[#f1f3ff] px-6 pb-6 pt-5"><h2 className="text-[18px] font-semibold tracking-[-.035em]">{tx("Your starting point", "Başlangıç durumun")}</h2><dl className="mt-6 space-y-2">{[[tx("Monthly income", "Aylık gelir"), money(draft.income)], [tx("Current rent", "Güncel kira"), money(draft.rent)], [tx("Other spending", "Diğer giderler"), money(draft.livingCosts)], [tx("Home price", "Ev fiyatı"), money(draft.propertyPrice)], [tx("Savings", "Birikim"), money(draft.savings)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 rounded-[9px] bg-white/75 px-3 py-2.5 text-[12px]"><dt className="text-ink-soft">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl></div></aside>
      </div>
    </Content>
  </div>
}
