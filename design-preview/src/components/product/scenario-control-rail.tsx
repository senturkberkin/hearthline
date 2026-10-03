import * as React from "react"
import { ChevronDown, Info, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MoneyInput, PercentInput } from "@/components/product/financial-input"
import { SupportInputs } from "@/components/product/support-inputs"
import { useProduct } from "@/lib/product-context"
import { clampDownPayment, downPaymentAllocation } from "@/lib/down-payment-allocation"
import { loadRentReference, type RentReference } from "@/lib/rent-reference"
import { calculate, withPrincipal, type Scenario } from "@/lib/engine"

function AssumptionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3 rounded-[12px] bg-[#f7f8fd] p-4"><h3 className="text-[11px] font-semibold tracking-[.08em] text-muted-foreground uppercase">{title}</h3>{children}</div>
}

function OfficialRentReference({ onUse }: { onUse: (rate: number) => void }) {
  const { tx, language, percent } = useProduct()
  const [reference, setReference] = React.useState<{ data: RentReference | null; stale: boolean }>({ data: null, stale: true })
  React.useEffect(() => { let alive = true; loadRentReference().then(value => { if (alive) setReference(value) }); return () => { alive = false } }, [])
  const data = reference.data
  const period = data ? new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${data.period}-01T00:00:00Z`)) : ""
  return <div className="rounded-[12px] bg-[#edf2ff] p-4"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">{tx("TÜİK rent reference", "TÜİK kira referansı")}<Popover><PopoverTrigger asChild><button type="button" aria-label={tx("About the reference", "Referans hakkında")} className="rounded p-0.5 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3" /></button></PopoverTrigger><PopoverContent align="start" className="max-w-[260px] p-4 text-[12px] leading-5">{tx("A dated official 12-month average CPI reference. It is context, not a forecast, and is never applied automatically.", "Tarihli resmî 12 aylık ortalama TÜFE referansı. Bağlam sağlar; tahmin değildir ve kendiliğinden uygulanmaz.")}</PopoverContent></Popover></div><div className="mt-2 flex items-center justify-between gap-2"><div><strong className="block text-[18px] font-semibold tabular-nums">{data ? percent(data.percentage, 2) : "—"}</strong><span className="text-[10px] text-muted-foreground">{data ? `${period}${reference.stale ? ` · ${tx("check date", "tarihi kontrol et")}` : ""}` : tx("Reference unavailable", "Referans alınamadı")}</span></div><Button type="button" size="sm" variant="outline" disabled={!data} onClick={() => { if (data) onUse(data.percentage) }}>{tx("Use", "Kullan")}</Button></div>{data && <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-primary hover:underline">{tx("Official source", "Resmî kaynak")}</a>}</div>
}

export function ScenarioControlRail({ scenario, onChange, onReset, className = "" }: { scenario: Scenario; onChange: (next: Scenario) => void; onReset: () => void; className?: string }) {
  const { tx, money } = useProduct()
  const update = (patch: Partial<Scenario>) => { const next = { ...scenario, ...patch }; onChange(withPrincipal({ ...next, downPayment: clampDownPayment(next) })) }
  const downPaymentLimit = downPaymentAllocation(scenario).limit
  const fundingGap = Math.max(0, scenario.downPayment + scenario.closingCosts + scenario.renovation - scenario.savings)
  const payment = scenario.termYears > 0 && Number.isFinite(scenario.rate) && Number.isFinite(scenario.principal) ? calculate(scenario).payment : null
  return <aside aria-label={tx("Scenario controls", "Senaryo kontrolleri")} className={`rounded-[18px] bg-card p-5 shadow-[0_16px_46px_-34px_#0000002e] ${className}`}>
    <h2 className="text-[17px] font-semibold tracking-[-.035em]">{tx("Adjust assumptions", "Varsayımları değiştir")}</h2>
    <div className="mt-5 space-y-2">
      <AssumptionGroup title={tx("Income", "Gelir")}><MoneyInput id="adjust-income" label={tx("Take-home / month", "Aylık net gelir")} value={scenario.income} onValueChange={income => update({ income })} /><PercentInput id="adjust-income-growth" label={tx("Annual income growth", "Yıllık gelir artışı")} value={scenario.incomeGrowth} onValueChange={incomeGrowth => update({ incomeGrowth })} /></AssumptionGroup>
      <AssumptionGroup title={tx("Rent", "Kira")}><MoneyInput id="adjust-rent" label={tx("Current / month", "Güncel aylık kira")} value={scenario.rent} onValueChange={rent => update({ rent })} /><PercentInput id="adjust-rent-growth" label={tx("Annual rent growth", "Yıllık kira artışı")} value={scenario.rentGrowth} onValueChange={rentGrowth => update({ rentGrowth })} /></AssumptionGroup>
      <AssumptionGroup title={tx("Other expenses", "Diğer giderler")}><MoneyInput id="adjust-living" label={tx("Per month", "Aylık tutar")} value={scenario.livingCosts} onValueChange={livingCosts => update({ livingCosts })} /><PercentInput id="adjust-expense-growth" label={tx("Annual increase", "Yıllık artış")} value={scenario.expenseGrowth} onValueChange={expenseGrowth => update({ expenseGrowth })} /></AssumptionGroup>
      <AssumptionGroup title={tx("Home", "Ev")}><MoneyInput id="adjust-price" label={tx("Target price", "Hedef fiyat")} value={scenario.propertyPrice} onValueChange={propertyPrice => update({ propertyPrice })} /><MoneyInput id="adjust-savings" label={tx("Available savings", "Kullanılabilir birikim")} value={scenario.savings} onValueChange={savings => update({ savings })} /><MoneyInput id="adjust-down" label={tx("Your down payment", "Kendi peşinatın")} value={scenario.downPayment} onValueChange={downPayment => update({ downPayment })} min={0} max={downPaymentLimit} invalid={fundingGap > 0} />{fundingGap > 0 && <p role="status" className="text-[11px] font-medium text-destructive">{tx("Down payment and buying costs exceed savings by", "Peşinat ve alım giderleri birikimini aşıyor:")} {money(fundingGap)}</p>}<div className="flex justify-between text-[11px] text-muted-foreground"><span>{tx("Loan amount", "Kredi tutarı")}</span><strong className="tabular-nums text-foreground">{money(scenario.principal)}</strong></div><div className="flex justify-between text-[11px] text-muted-foreground"><span>{tx("Monthly payment", "Aylık kredi taksiti")}</span><strong className="tabular-nums text-foreground">{payment === null ? "—" : money(payment)}</strong></div></AssumptionGroup>
      <AssumptionGroup title={tx("Loan", "Kredi")}><PercentInput id="adjust-rate" label={tx("Monthly rate", "Aylık faiz")} value={scenario.rate} onValueChange={rate => update({ rate })} /><Field><FieldLabel htmlFor="adjust-term" className="text-[12px] font-semibold text-ink-soft">{tx("Term (years)", "Vade (yıl)")}</FieldLabel><Input id="adjust-term" type="number" min="1" max="40" value={scenario.termYears} onChange={event => update({ termYears: Number(event.target.value) })} /></Field></AssumptionGroup>
    </div>
    <div className="mt-2"><OfficialRentReference onUse={rentGrowth => update({ rentGrowth })} /></div>
    <SupportInputs scenario={scenario} update={update} compact />
    <Collapsible className="mt-2"><CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="w-full justify-between px-1 text-primary">{tx("Advanced assumptions", "İleri varsayımlar")} <ChevronDown className="size-3.5" /></Button></CollapsibleTrigger><CollapsibleContent className="space-y-3 rounded-[12px] bg-[#f7f8fd] p-4"><MoneyInput id="adjust-debt" label={tx("Other debt / month", "Aylık diğer borç")} value={scenario.debt} onValueChange={debt => update({ debt })} /><MoneyInput id="adjust-owner" label={tx("Owner costs / year", "Yıllık ev gideri")} value={scenario.ownerCosts} onValueChange={ownerCosts => update({ ownerCosts })} /></CollapsibleContent></Collapsible>
    <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" className="px-1 text-primary" onClick={onReset}><RotateCcw className="size-3.5" />{tx("Reset", "Sıfırla")}</Button></div>
  </aside>
}
