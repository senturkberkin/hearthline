import * as React from "react"
import { ArrowRight, Home, ReceiptText, SlidersHorizontal, TrendingUp, X, type LucideIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { PercentInput } from "@/components/product/financial-input"
import { FieldInfo, FieldInfoLabel } from "@/components/product/field-info"
import { IncomeHistoryCalculator } from "@/components/product/income-history-calculator"
import { IntegerInput } from "@/components/product/integer-input"
import { MinimumWageGrowthAction, RentCeilingGrowthAction } from "@/components/product/growth-reference-action"
import { MonthPicker } from "@/components/product/month-picker"
import { RentGrowthCalculator } from "@/components/product/rent-growth-calculator"
import { SupportInputs } from "@/components/product/support-inputs"
import { useProduct } from "@/lib/product-context"
import type { Scenario } from "@/lib/engine"

type FutureEditor = "income" | "rent" | "expenses" | "other"

function AssumptionChoice({ icon: Icon, title, summary, onOpen, className = "" }: { icon: LucideIcon; title: string; summary: string; onOpen: () => void; className?: string }) {
  const { tx } = useProduct()
  return <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={tx(`Edit ${title}: ${summary}`, `${title} düzenle: ${summary}`)} className={`group flex min-h-[102px] flex-col items-start rounded-[14px] px-4 py-4 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-card/75 focus-visible:ring-2 focus-visible:ring-ring active:scale-[.985] ${className}`}>
    <span className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft"><Icon aria-hidden="true" className="size-4 text-primary" />{title}</span>
    <strong className="mt-3 text-[16px] font-semibold leading-5 tracking-[-.025em] tabular-nums text-foreground">{summary}</strong>
    <span className="mt-auto flex items-center gap-1 pt-3 text-[11px] font-semibold text-primary">{tx("Edit", "Düzenle")}<ArrowRight aria-hidden="true" className="size-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5" /></span>
  </button>
}

function PlanningChoice({ summary, onOpen }: { summary: string; onOpen: () => void }) {
  const { tx } = useProduct()
  return <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={tx(`Edit planning details: ${summary}`, `Planlama ayrıntılarını düzenle: ${summary}`)} className="group flex min-h-[72px] w-full items-center gap-3 border-t border-hairline px-4 py-3 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-card/75 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-[.99]">
    <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0 text-primary" />
    <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-ink-soft">{tx("Planning details", "Planlama ayrıntıları")}</span><strong className="mt-0.5 block truncate text-[13px] font-semibold tabular-nums text-foreground">{summary}</strong></span>
    <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">{tx("Edit", "Düzenle")}<ArrowRight aria-hidden="true" className="size-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5" /></span>
  </button>
}

function AlternativeInputs({ children }: { children: React.ReactNode }) {
  const { tx } = useProduct()
  return <section className="mt-8" aria-label={tx("Other ways to set this value", "Bu değeri belirlemenin diğer yolları")}>
    <h3 className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted-foreground">{tx("Other ways to set it", "Diğer belirleme yolları")}</h3>
    <div className="mt-2 border-y border-hairline">{children}</div>
  </section>
}

function GrowthError({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-3 text-[11px] font-medium text-destructive">{message}</p> : null
}

function AssumptionEditor({ active, onOpenChange, scenario, update, constraintError, onConstraintViolation, clearConstraintError }: { active: FutureEditor | null; onOpenChange: (open: boolean) => void; scenario: Scenario; update: (patch: Partial<Scenario>) => void; constraintError: string; onConstraintViolation: () => void; clearConstraintError: () => void }) {
  const { tx, language, percent } = useProduct()
  const monthName = (month: number) => new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long" }).format(new Date(2026, month, 1))
  const annualSummary = (growth: number, month: number) => `${percent(growth)} ${tx("/ year", "/ yıl")} · ${monthName(month)}`
  const supportIncluded = scenario.upfrontSupport > 0 || scenario.monthlySupport > 0
  const details = active === "income"
    ? { title: tx("Income", "Gelir"), summary: annualSummary(scenario.incomeGrowth, scenario.raiseMonth) }
    : active === "rent"
      ? { title: tx("Rent", "Kira"), summary: annualSummary(scenario.rentGrowth, scenario.rentRenewal) }
      : active === "expenses"
        ? { title: tx("Expenses", "Giderler"), summary: scenario.expenseGrowth === 0 ? tx("No annual change", "Yıllık değişim yok") : `${percent(scenario.expenseGrowth)} ${tx("/ year", "/ yıl")}` }
        : { title: tx("Planning details", "Planlama ayrıntıları"), summary: `${scenario.horizon} ${tx("years", "yıl")} · ${supportIncluded ? tx("Support included", "Destek dahil") : tx("No support", "Destek yok")}` }

  return <DialogPrimitive.Root open={active !== null} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="assumption-editor-overlay fixed inset-0 z-50 bg-[#101318]/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="assumption-editor-panel fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[24px] border border-hairline bg-background text-foreground shadow-[0_30px_100px_-30px_rgba(0,0,0,.55)] outline-none sm:inset-y-4 sm:left-auto sm:right-4 sm:w-[min(520px,calc(100vw-32px))]" aria-describedby="future-editor-summary">
        <header className="flex items-start justify-between gap-5 border-b border-hairline px-5 py-5 sm:px-7 sm:py-6">
          <div><span className="text-[10px] font-semibold uppercase tracking-[.09em] text-primary">{tx("Current assumption", "Güncel varsayım")}</span><DialogPrimitive.Title className="mt-1 text-[24px] font-semibold tracking-[-.04em]">{details.title}</DialogPrimitive.Title><DialogPrimitive.Description id="future-editor-summary" className="mt-1 text-[13px] font-medium tabular-nums text-ink-soft">{details.summary}</DialogPrimitive.Description></div>
          <DialogPrimitive.Close asChild><Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={tx("Close editor", "Düzenleyiciyi kapat")}><X className="size-4" /></Button></DialogPrimitive.Close>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {active === "income" && <>
            <div className="grid gap-5 sm:grid-cols-2 sm:items-end"><PercentInput id="income-growth" label={<FieldInfoLabel infoLabel={tx("About future income growth", "Gelecek gelir artışı hakkında")} info={tx("The annual income change applied in the selected month.", "Seçtiğin ayda uygulanan yıllık gelir değişimi.")}>{tx("Annual change", "Yıllık değişim")}</FieldInfoLabel>} value={scenario.incomeGrowth} onValueChange={incomeGrowth => { clearConstraintError(); update({ incomeGrowth }) }} min={-99.9} onConstraintViolation={onConstraintViolation} /><MonthPicker value={scenario.raiseMonth} onValueChange={raiseMonth => update({ raiseMonth })} label={tx("Raise month", "Zam ayı")} /></div>
            <GrowthError message={constraintError} />
            <AlternativeInputs><IncomeHistoryCalculator currentIncome={scenario.income} onApply={incomeGrowth => update({ incomeGrowth })} /><MinimumWageGrowthAction onUse={incomeGrowth => update({ incomeGrowth })} /></AlternativeInputs>
          </>}
          {active === "rent" && <>
            <div className="grid gap-5 sm:grid-cols-2 sm:items-end"><PercentInput id="rent-growth" label={<FieldInfoLabel infoLabel={tx("About future rent change", "Gelecek kira artışı hakkında")} info={tx("The annual rent change applied in the selected renewal month.", "Seçtiğin yenileme ayında uygulanan yıllık kira değişimi.")}>{tx("Annual change", "Yıllık değişim")}</FieldInfoLabel>} value={scenario.rentGrowth} onValueChange={rentGrowth => { clearConstraintError(); update({ rentGrowth }) }} min={-99.9} onConstraintViolation={onConstraintViolation} /><MonthPicker value={scenario.rentRenewal} onValueChange={rentRenewal => update({ rentRenewal })} label={tx("Renewal month", "Yenileme ayı")} /></div>
            <GrowthError message={constraintError} />
            <AlternativeInputs><RentGrowthCalculator currentRent={scenario.rent} currentGrowth={scenario.rentGrowth} onApply={rentGrowth => update({ rentGrowth })} /><RentCeilingGrowthAction onUse={rentGrowth => update({ rentGrowth })} /></AlternativeInputs>
          </>}
          {active === "expenses" && <><div className="max-w-[300px]"><PercentInput id="expense-growth" label={<FieldInfoLabel infoLabel={tx("About expense growth", "Gider artışı hakkında")} info={tx("The annual change applied to regular living costs.", "Düzenli yaşam giderlerine uygulanan yıllık değişim.")}>{tx("Annual change", "Yıllık değişim")}</FieldInfoLabel>} value={scenario.expenseGrowth} onValueChange={expenseGrowth => { clearConstraintError(); update({ expenseGrowth }) }} min={-99.9} onConstraintViolation={onConstraintViolation} /></div><GrowthError message={constraintError} /></>}
          {active === "other" && <>
            <div className="max-w-[260px]"><Field><FieldLabel htmlFor="horizon" className="flex items-center gap-1">{tx("Comparison length (years)", "Karşılaştırma süresi (yıl)")}<FieldInfo label={tx("About comparison length", "Karşılaştırma süresi hakkında")}>{tx("Controls how many years the comparison shows; it does not change the mortgage term.", "Karşılaştırmada gösterilen yılı belirler; kredi vadesini değiştirmez.")}</FieldInfo></FieldLabel><IntegerInput id="horizon" value={scenario.horizon} onValueChange={horizon => update({ horizon })} min={1} max={40} /></Field></div>
            <div className="mt-7 border-t border-hairline pt-6"><SupportInputs scenario={scenario} update={update} compact /></div>
          </>}
        </div>

        <footer className="border-t border-hairline bg-background px-5 py-4 sm:flex sm:justify-end sm:px-7"><DialogPrimitive.Close asChild><Button type="button" className="w-full sm:w-auto">{tx("Done", "Bitti")}</Button></DialogPrimitive.Close></footer>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}

export function FutureAssumptions({ scenario, update, headingRef }: { scenario: Scenario; update: (patch: Partial<Scenario>) => void; headingRef: React.Ref<HTMLHeadingElement> }) {
  const { tx, language, percent } = useProduct()
  const [active, setActive] = React.useState<FutureEditor | null>(null)
  const [constraintError, setConstraintError] = React.useState("")
  const monthName = (month: number) => new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long" }).format(new Date(2026, month, 1))
  const annualSummary = (growth: number, month: number) => `${percent(growth)} ${tx("/ year", "/ yıl")} · ${monthName(month)}`
  const supportIncluded = scenario.upfrontSupport > 0 || scenario.monthlySupport > 0

  return <section aria-labelledby="future-heading" className="max-w-[680px]">
    <h2 id="future-heading" ref={headingRef} tabIndex={-1} className="text-[25px] font-semibold tracking-[-.045em] outline-none">{tx("Future assumptions", "Gelecek varsayımları")}</h2>
    <p className="mt-2 max-w-[560px] text-[12px] leading-5 text-ink-soft">{tx("Annual scenario assumptions—not forecasts.", "Yıllık senaryo varsayımlarıdır; tahmin değildir.")}</p>

    <div className="mt-6 overflow-hidden rounded-[20px] bg-muted p-2">
      <div className="grid sm:grid-cols-3">
        <AssumptionChoice icon={TrendingUp} title={tx("Income", "Gelir")} summary={annualSummary(scenario.incomeGrowth, scenario.raiseMonth)} onOpen={() => { setConstraintError(""); setActive("income") }} />
        <AssumptionChoice icon={Home} title={tx("Rent", "Kira")} summary={annualSummary(scenario.rentGrowth, scenario.rentRenewal)} onOpen={() => { setConstraintError(""); setActive("rent") }} className="border-t border-hairline sm:border-l sm:border-t-0" />
        <AssumptionChoice icon={ReceiptText} title={tx("Expenses", "Giderler")} summary={scenario.expenseGrowth === 0 ? tx("No annual change", "Yıllık değişim yok") : `${percent(scenario.expenseGrowth)} ${tx("/ year", "/ yıl")}`} onOpen={() => { setConstraintError(""); setActive("expenses") }} className="border-t border-hairline sm:border-l sm:border-t-0" />
      </div>
      <PlanningChoice summary={`${scenario.horizon} ${tx("years", "yıl")} · ${supportIncluded ? tx("Support included", "Destek dahil") : tx("No support", "Destek yok")}`} onOpen={() => { setConstraintError(""); setActive("other") }} />
    </div>

    <AssumptionEditor active={active} onOpenChange={open => { if (!open) setActive(null) }} scenario={scenario} update={update} constraintError={constraintError} clearConstraintError={() => setConstraintError("")} onConstraintViolation={() => setConstraintError(tx("Annual changes must be greater than −100%.", "Yıllık değişimler −%100'den büyük olmalı."))} />
  </section>
}
