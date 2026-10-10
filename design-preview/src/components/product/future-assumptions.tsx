import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldLabel } from "@/components/ui/field"
import { FieldInfo, FieldInfoLabel } from "@/components/product/field-info"
import { MoneyInput, PercentInput } from "@/components/product/financial-input"
import { IncomeHistoryCalculator } from "@/components/product/income-history-calculator"
import { IntegerInput } from "@/components/product/integer-input"
import { MonthPicker } from "@/components/product/month-picker"
import { SupportInputs } from "@/components/product/support-inputs"
import { useProduct } from "@/lib/product-context"
import type { Scenario } from "@/lib/engine"

type IncomeMode = "none" | "annual" | "history"
type RentMode = "none" | "next" | "annual"
type ChangeMode = "none" | "annual"

function ChoiceGroup<T extends string>({ name, value, options, onValueChange }: { name: string; value: T; options: Array<{ value: T; label: string }>; onValueChange: (value: T) => void }) {
  return <div className="mt-3 flex flex-wrap gap-2">
    {options.map(option => <label key={option.value} className={`inline-flex cursor-pointer items-center justify-center rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${value === option.value ? "bg-primary text-primary-foreground" : "bg-muted text-ink-soft hover:text-foreground"}`}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onValueChange(option.value)} className="sr-only" />
      {option.label}
    </label>)}
  </div>
}

function Summary({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[11px] font-medium text-ink-soft">{children}</p>
}

export function FutureAssumptions({ scenario, update }: { scenario: Scenario; update: (patch: Partial<Scenario>) => void }) {
  const { language, tx, money, percent } = useProduct()
  const [incomeMode, setIncomeMode] = React.useState<IncomeMode>(() => scenario.incomeGrowth === 0 ? "none" : "annual")
  const [rentMode, setRentMode] = React.useState<RentMode>(() => scenario.rentGrowth === 0 ? "none" : "annual")
  const [expenseMode, setExpenseMode] = React.useState<ChangeMode>(() => scenario.expenseGrowth === 0 ? "none" : "annual")
  const [nextRent, setNextRent] = React.useState(0)
  const hasNextRent = scenario.rent > 0 && nextRent > 0
  const impliedRentGrowth = hasNextRent ? (nextRent / scenario.rent - 1) * 100 : 0
  const impliedRentApplied = hasNextRent && Math.abs(scenario.rentGrowth - impliedRentGrowth) < .05
  const monthName = (month: number) => new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long" }).format(new Date(2026, month, 1))

  const selectIncomeMode = (mode: IncomeMode) => {
    setIncomeMode(mode)
    if (mode === "none" || mode === "history") update({ incomeGrowth: 0 })
  }
  const selectRentMode = (mode: RentMode) => {
    setRentMode(mode)
    if (mode === "none" || mode === "next") update({ rentGrowth: 0 })
  }
  const selectExpenseMode = (mode: ChangeMode) => {
    setExpenseMode(mode)
    if (mode === "none") update({ expenseGrowth: 0 })
  }

  return <div className="mt-6 divide-y divide-hairline border-y border-hairline">
    <fieldset className="py-6 first:pt-0">
      <legend className="text-[15px] font-semibold">{tx("How should your income change over time?", "Gelirin zaman içinde nasıl değişsin?")}</legend>
      <ChoiceGroup name="income-change-mode" value={incomeMode} onValueChange={selectIncomeMode} options={[
        { value: "none", label: tx("No change", "Değişmesin") },
        { value: "annual", label: tx("Set annual growth", "Yıllık artış belirle") },
        { value: "history", label: tx("Use past salaries", "Geçmiş gelirlerimi kullan") },
      ]} />
      {incomeMode === "annual" && <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:items-end"><PercentInput id="income-growth" label={<FieldInfoLabel infoLabel={tx("About annual income growth", "Yıllık gelir artışı hakkında")} info={tx("The annual salary growth Hearthline applies to future years.", "Hearthline’ın gelecek yıllara uygulayacağı yıllık gelir artışıdır.")}>{tx("Annual income growth", "Yıllık gelir artışı")}</FieldInfoLabel>} value={scenario.incomeGrowth} onValueChange={incomeGrowth => update({ incomeGrowth })} /><MonthPicker value={scenario.raiseMonth} onValueChange={raiseMonth => update({ raiseMonth })} label={tx("Month the increase takes effect", "Artışın uygulanacağı ay")} /></div>}
      {incomeMode === "history" && <IncomeHistoryCalculator currentIncome={scenario.income} onApply={incomeGrowth => update({ incomeGrowth })} />}
      <Summary>{incomeMode === "none" ? tx("Income stays unchanged.", "Gelir değişmiyor.") : incomeMode === "annual" ? tx(`${percent(scenario.incomeGrowth)} per year · ${monthName(scenario.raiseMonth)}`, `Yıllık ${percent(scenario.incomeGrowth)} · ${monthName(scenario.raiseMonth)}`) : scenario.incomeGrowth === 0 ? tx("Enter past salaries to calculate a rate.", "Bir oran hesaplamak için geçmiş gelirlerini gir.") : tx(`${percent(scenario.incomeGrowth)} per year from past salaries`, `Geçmiş gelirlerden yıllık ${percent(scenario.incomeGrowth)}`)}</Summary>
    </fieldset>

    <fieldset className="py-6">
      <legend className="text-[15px] font-semibold">{tx("How should your rent change over time?", "Kiran zaman içinde nasıl değişsin?")}</legend>
      <ChoiceGroup name="rent-change-mode" value={rentMode} onValueChange={selectRentMode} options={[
        { value: "none", label: tx("No change", "Değişmesin") },
        { value: "next", label: tx("I know my next rent", "Sonraki kiramı biliyorum") },
        { value: "annual", label: tx("Set annual growth", "Yıllık artış belirle") },
      ]} />
      {rentMode === "next" && <div className="mt-5"><div className="grid gap-5 sm:grid-cols-2 sm:items-end"><MoneyInput id="next-rent" label={tx("Next monthly rent", "Sonraki aylık kira")} value={nextRent} onValueChange={setNextRent} /><MonthPicker value={scenario.rentRenewal} onValueChange={rentRenewal => update({ rentRenewal })} label={tx("Month the new rent takes effect", "Yeni kiranın uygulanacağı ay")} /></div>{hasNextRent && <div className="mt-4 flex flex-wrap items-center gap-3"><span className="rounded-full bg-muted px-3 py-2 text-[12px] font-semibold tabular-nums">{tx("Implied annual change", "Hesaplanan yıllık değişim")} · {percent(impliedRentGrowth)}</span><Button type="button" size="sm" variant={impliedRentApplied ? "outline" : "default"} disabled={impliedRentApplied} onClick={() => update({ rentGrowth: Math.round(impliedRentGrowth * 10) / 10 })}>{impliedRentApplied ? tx("Applied", "Uygulandı") : tx("Use this increase", "Bu artışı kullan")}</Button></div>}</div>}
      {rentMode === "annual" && <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:items-end"><PercentInput id="rent-growth" label={<FieldInfoLabel infoLabel={tx("About annual rent growth", "Yıllık kira artışı hakkında")} info={tx("The annual rent change Hearthline applies in the renewal month.", "Hearthline’ın yenileme ayında uygulayacağı yıllık kira değişimidir.")}>{tx("Annual rent growth", "Yıllık kira artışı")}</FieldInfoLabel>} value={scenario.rentGrowth} onValueChange={rentGrowth => update({ rentGrowth })} /><MonthPicker value={scenario.rentRenewal} onValueChange={rentRenewal => update({ rentRenewal })} label={tx("Month the increase takes effect", "Artışın uygulanacağı ay")} /></div>}
      <Summary>{rentMode === "none" ? tx("Rent stays unchanged.", "Kira değişmiyor.") : rentMode === "annual" ? tx(`${percent(scenario.rentGrowth)} per year · ${monthName(scenario.rentRenewal)}`, `Yıllık ${percent(scenario.rentGrowth)} · ${monthName(scenario.rentRenewal)}`) : !hasNextRent ? tx("Enter your next rent and when it starts.", "Sonraki kiranı ve uygulanacağı ayı gir.") : impliedRentApplied ? tx(`Next rent ${money(nextRent)} · ${monthName(scenario.rentRenewal)}`, `Sonraki kira ${money(nextRent)} · ${monthName(scenario.rentRenewal)}`) : tx("Use the calculated increase to apply it to the scenario.", "Hesaplanan artışı senaryoya uygulamak için düğmeyi kullan.")}</Summary>
    </fieldset>

    <fieldset className="py-6">
      <legend className="text-[15px] font-semibold">{tx("Should your regular expenses change over time?", "Düzenli giderlerin zaman içinde değişsin mi?")}</legend>
      <ChoiceGroup name="expense-change-mode" value={expenseMode} onValueChange={selectExpenseMode} options={[
        { value: "none", label: tx("No change", "Değişmesin") },
        { value: "annual", label: tx("Set annual change", "Yıllık değişim belirle") },
      ]} />
      {expenseMode === "annual" && <div className="mt-5 max-w-[300px]"><PercentInput id="expense-growth" label={<FieldInfoLabel infoLabel={tx("About annual expense growth", "Yıllık gider artışı hakkında")} info={tx("The annual change Hearthline applies to regular living costs.", "Hearthline’ın düzenli yaşam giderlerine uygulayacağı yıllık değişimdir.")}>{tx("Annual change", "Yıllık değişim")}</FieldInfoLabel>} value={scenario.expenseGrowth} onValueChange={expenseGrowth => update({ expenseGrowth })} /></div>}
      <Summary>{expenseMode === "none" ? tx("Regular expenses stay unchanged.", "Düzenli giderler değişmiyor.") : tx(`${percent(scenario.expenseGrowth)} per year`, `Yıllık ${percent(scenario.expenseGrowth)}`)}</Summary>
    </fieldset>

    <Collapsible className="py-6">
      <CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="px-0 text-primary">{tx("More assumptions", "Diğer varsayımlar")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger>
      <CollapsibleContent className="pt-5"><div className="max-w-[300px]"><Field><FieldLabel htmlFor="horizon" className="flex items-center gap-1">{tx("Scenario length (years)", "Senaryo süresi (yıl)")}<FieldInfo label={tx("About scenario length", "Senaryo süresi hakkında")}>{tx("This only controls how many years Hearthline shows. It does not change the mortgage term.", "Yalnızca Hearthline’ın kaç yılı göstereceğini belirler. Kredi vadesini değiştirmez.")}</FieldInfo></FieldLabel><IntegerInput id="horizon" value={scenario.horizon} onValueChange={horizon => update({ horizon })} min={1} max={40} /></Field></div><SupportInputs scenario={scenario} update={update} /></CollapsibleContent>
    </Collapsible>
  </div>
}
