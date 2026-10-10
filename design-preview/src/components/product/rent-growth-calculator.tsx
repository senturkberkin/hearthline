import * as React from "react"
import { X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/product/financial-input"
import { useProduct } from "@/lib/product-context"

export function RentGrowthCalculator({ currentRent, currentGrowth, onApply }: { currentRent: number; currentGrowth: number; onApply: (rate: number) => void }) {
  const { tx, percent } = useProduct()
  const [open, setOpen] = React.useState(false)
  const [nextRent, setNextRent] = React.useState(0)
  const hasNextRent = currentRent > 0 && nextRent > 0
  const impliedGrowth = hasNextRent ? (nextRent / currentRent - 1) * 100 : 0
  const applied = hasNextRent && Math.abs(currentGrowth - impliedGrowth) < .05

  return <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
    <DialogPrimitive.Trigger asChild><Button type="button" variant="ghost" size="sm" className="mt-5 px-0 text-primary">{tx("Calculate from next rent", "Sonraki kiradan artışı hesapla")} <span aria-hidden="true">→</span></Button></DialogPrimitive.Trigger>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-24px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] bg-background p-5 text-foreground shadow-[0_30px_100px_-30px_rgba(0,0,0,.45)] outline-none sm:p-7" aria-describedby={undefined}>
        <div className="flex items-start justify-between gap-4"><div><DialogPrimitive.Title className="text-[22px] font-semibold tracking-[-.04em]">{tx("Calculate from next rent", "Sonraki kiradan artışı hesapla")}</DialogPrimitive.Title><p className="mt-2 text-[12px] leading-5 text-muted-foreground">{tx("Enter the next monthly rent to calculate the equivalent annual change.", "Sonraki aylık kirayı girerek eşdeğer yıllık değişimi hesapla.")}</p></div><DialogPrimitive.Close asChild><Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={tx("Close", "Kapat")}><X className="size-4" /></Button></DialogPrimitive.Close></div>
        <div className="mt-6 max-w-[320px]"><MoneyInput id="next-rent" label={tx("Known next monthly rent", "Bilinen sonraki aylık kira")} value={nextRent} onValueChange={setNextRent} /></div>
        {hasNextRent && <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-[14px] bg-muted p-4"><div><span className="block text-[11px] text-muted-foreground">{tx("Implied annual increase", "Hesaplanan yıllık artış")}</span><strong className="mt-1 block text-[22px] font-semibold tabular-nums">{percent(impliedGrowth)}</strong></div><Button type="button" size="sm" variant={applied ? "outline" : "default"} disabled={applied} onClick={() => { onApply(Math.round(impliedGrowth * 10) / 10); setOpen(false) }}>{applied ? tx("Applied", "Uygulandı") : tx("Use this increase", "Bu artışı kullan")}</Button></div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
