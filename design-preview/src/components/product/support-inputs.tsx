import * as React from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/product/financial-input"
import { FieldInfoLabel } from "@/components/product/field-info"
import { useProduct } from "@/lib/product-context"
import type { Scenario } from "@/lib/engine"

export function SupportInputs({ scenario, update, compact = false }: { scenario: Scenario; update: (patch: Partial<Scenario>) => void; compact?: boolean }) {
  const { tx } = useProduct()
  const [enabled, setEnabled] = React.useState(scenario.upfrontSupport > 0 || scenario.monthlySupport > 0)
  const maxMonths = Number.isFinite(scenario.termYears) ? Math.max(1, Math.round(scenario.termYears * 12)) : 1
  const endsEarly = scenario.supportMonths > 0 && scenario.supportMonths < maxMonths
  return <fieldset className={compact ? "mt-3" : "mt-6"}>
    <legend className="text-[14px] font-semibold">{tx("Will someone help pay for the home?", "Ev alımında destek alacak mısın?")}</legend>
    <div className="mt-3 flex gap-2">
      {([false, true] as const).map(value => <label key={String(value)} className={`inline-flex min-w-20 cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${enabled === value ? "bg-primary text-primary-foreground" : "bg-muted text-ink-soft hover:text-foreground"}`}><input type="radio" name={compact ? "adjust-support-enabled" : "setup-support-enabled"} checked={enabled === value} onChange={() => { setEnabled(value); if (!value) update({ upfrontSupport: 0, monthlySupport: 0, supportMonths: 0 }) }} className="sr-only" />{value ? tx("Yes", "Evet") : tx("No", "Hayır")}</label>)}
    </div>
    {enabled && <div className={`mt-4 grid gap-4 rounded-[16px] bg-muted p-5 ${compact ? "" : "sm:grid-cols-2"}`}>
      <MoneyInput id={compact ? "adjust-support-upfront" : "support-upfront"} label={tx("One-time help with the down payment", "Peşinata tek seferlik destek")} value={scenario.upfrontSupport} onValueChange={upfrontSupport => update({ upfrontSupport })} />
      <MoneyInput id={compact ? "adjust-support-monthly" : "support-monthly"} label={<FieldInfoLabel infoLabel={tx("About monthly support", "Aylık destek hakkında")} info={tx("Monthly support is counted toward mortgage payments. If no end date is set, Hearthline assumes it continues until the mortgage ends.", "Aylık destek kredi taksitine katkı olarak sayılır. Bitiş süresi belirtilmezse Hearthline desteğin kredi bitene kadar sürdüğünü varsayar.")}>{tx("Monthly help with mortgage payments", "Kredi taksitine aylık destek")}</FieldInfoLabel>} value={scenario.monthlySupport} onValueChange={monthlySupport => update({ monthlySupport })} />
      {scenario.monthlySupport > 0 && <div className={compact ? "" : "sm:col-span-2"}>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium"><input type="checkbox" checked={endsEarly} onChange={event => update({ supportMonths: event.target.checked ? Math.min(12, maxMonths - 1) : 0 })} disabled={maxMonths <= 1} className="size-4 accent-primary" />{tx("Support ends earlier", "Destek daha erken bitecek")}</label>
        {endsEarly && <Field className="mt-3 max-w-[200px]"><FieldLabel htmlFor={compact ? "adjust-support-months" : "support-months"}>{tx("Support duration (months)", "Destek süresi (ay)")}</FieldLabel><Input id={compact ? "adjust-support-months" : "support-months"} type="number" min="1" max={maxMonths - 1} value={scenario.supportMonths} onChange={event => update({ supportMonths: Math.min(maxMonths - 1, Math.max(1, Number(event.target.value) || 1)) })} /></Field>}
      </div>}
    </div>}
  </fieldset>
}
