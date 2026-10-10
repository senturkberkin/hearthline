import * as React from "react"
import { Plus, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/product/financial-input"
import { FieldInfo } from "@/components/product/field-info"
import { useProduct } from "@/lib/product-context"
import { summarizeIncomeHistory, type IncomeYear } from "@/lib/income-history"

export function IncomeHistoryCalculator({ currentIncome, onApply }: { currentIncome: number; onApply: (rate: number) => void }) {
  const { tx, money, percent } = useProduct()
  const [open, setOpen] = React.useState(false)
  const currentYear = new Date().getFullYear()
  const [history, setHistory] = React.useState<IncomeYear[]>([{ year: currentYear - 1, income: 0 }])
  const { rows, average } = summarizeIncomeHistory([...history, { year: currentYear, income: currentIncome }])
  const oldestYear = Math.min(...history.map(entry => entry.year))

  return <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
    <DialogPrimitive.Trigger asChild><Button type="button" variant="ghost" size="sm" className="mt-5 px-0 text-primary">{tx("Calculate from past income", "Geçmiş gelirlerden hesapla")} <span aria-hidden="true">→</span></Button></DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[calc(100%-24px)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] bg-background p-5 text-foreground shadow-[0_30px_100px_-30px_rgba(0,0,0,.45)] outline-none sm:p-7" aria-describedby={undefined}>
        <div className="flex items-start justify-between gap-4"><div><DialogPrimitive.Title className="text-[22px] font-semibold tracking-[-.04em]">{tx("Calculate from past income", "Geçmiş gelirlerden hesapla")}</DialogPrimitive.Title><p className="mt-2 text-[12px] text-muted-foreground">{tx("Enter monthly take-home pay for consecutive years.", "Ardışık yıllardaki aylık net gelirini gir.")}</p></div><DialogPrimitive.Close asChild><Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={tx("Close", "Kapat")}><X className="size-4" /></Button></DialogPrimitive.Close></div>
      <div className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[305px] table-fixed text-left text-[12px]">
            <thead><tr className="text-muted-foreground"><th scope="col" className="w-[58px] pb-2 font-medium">{tx("Year", "Yıl")}</th><th scope="col" className="pb-2 font-medium">{tx("Monthly net pay", "Aylık net gelir")}</th><th scope="col" className="w-[80px] pb-2 text-right font-medium">{tx("Change", "Değişim")}</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.year}>
              <th scope="row" className="py-1 pr-2 align-middle font-semibold tabular-nums">{row.year}</th>
              <td className="py-1 pr-2">{row.year === currentYear ? <span className="flex h-10 items-center rounded-[9px] bg-card px-3 font-semibold tabular-nums text-foreground">{money(currentIncome)}</span> : <MoneyInput id={`income-${row.year}`} label={`${row.year} ${tx("monthly net pay", "aylık net gelir")}`} value={row.income} onValueChange={income => setHistory(items => items.map(item => item.year === row.year ? { ...item, income } : item))} hideLabel emptyWhenZero />}</td>
              <td className="py-1 text-right font-semibold tabular-nums">{row.change === null ? "—" : `${row.change > 0 ? "+" : ""}${percent(row.change)}`}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="sm" disabled={history.length >= 4} onClick={() => setHistory(items => [{ year: oldestYear - 1, income: 0 }, ...items])}><Plus className="size-3.5" />{tx("Add earlier year", "Önceki yılı ekle")}</Button>{history.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setHistory(items => items.filter(item => item.year !== oldestYear))}>{tx("Remove oldest", "En eski yılı çıkar")}</Button>}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-muted p-3"><div><span className="flex items-center gap-1 text-[11px] text-muted-foreground">{tx("Historical average annual change", "Geçmiş yılların ortalama artışı")}<FieldInfo label={tx("About using past income growth", "Geçmiş gelir artışını kullanma hakkında")}>{tx("Past salary growth is only a reference. Using it here does not mean Hearthline expects the same growth to continue.", "Geçmiş gelir artışları yalnızca referanstır. Burada kullanman, Hearthline’ın aynı artışın devam edeceğini öngördüğü anlamına gelmez.")}</FieldInfo></span><strong className="block text-[18px] font-semibold tabular-nums">{average === null ? "—" : `${average > 0 ? "+" : ""}${percent(average)}`}</strong></div><Button type="button" size="sm" disabled={average === null} onClick={() => { if (average !== null) { onApply(Math.round(average * 10) / 10); setOpen(false) } }}>{tx("Use as assumption", "Varsayım olarak kullan")}</Button></div>
      </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
