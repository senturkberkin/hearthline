import { Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { previewScenarios, type PreviewVariant } from "@/lib/fixtures"
import { useProduct } from "@/lib/product-context"
import type { Projection } from "@/lib/engine"

export function RentBuyComparison({ variant = "current", projection, compact = false }: { variant?: PreviewVariant; projection?: Projection; compact?: boolean }) {
  const { tx, money, percent } = useProduct()
  const result = previewScenarios[variant]
  const first = projection?.rows[0]
  const cells = [
    { name: tx("Renting", "Kirada kalma"), marker: "bg-rent", cash: first?.rentSurplus ?? 25_000, housing: first?.rent ?? 28_000, share: first ? percent(first.rent / first.income * 100) : percent(37.3) },
    { name: tx("Buying", "Ev alma"), marker: "bg-buy", cash: first?.buySurplus ?? result.buyingCash, housing: first?.userHousing ?? result.buyingHousing, share: first ? percent(first.userHousing / first.income * 100) : percent(result.buyingShare) },
  ]
  return <section aria-label={tx("Renting and buying comparison", "Kira ve satın alma karşılaştırması")} className="overflow-hidden rounded-[18px] bg-card shadow-[0_12px_32px_-28px_#0000002e]">
    <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[.08em] text-muted-foreground uppercase">{tx("First month", "İlk ay")}</p>
        <h2 className="mt-1 text-[16px] font-semibold tracking-[-.025em]">{tx("Monthly breathing room", "Aylık elde kalan")}</h2>
      </div>
      {!compact && <Popover>
        <PopoverTrigger asChild><button type="button" aria-label={tx("What does cash left mean?", "Elde kalan ne demek?")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Info className="size-4" /></button></PopoverTrigger>
        <PopoverContent align="end" className="max-w-[260px] p-4 text-[13px] leading-5">{tx("Cash left is take-home pay after housing, living costs and existing debt. It is not total wealth.", "Elde kalan, konut, yaşam giderleri ve mevcut borçlar sonrası net gelirdir. Toplam servet değildir.")}</PopoverContent>
      </Popover>}
    </div>
    <div className="grid grid-cols-2 gap-2 px-2 pb-2">
      {cells.map((cell, index) => <div key={cell.name} className={`min-w-0 rounded-[13px] px-3 py-4 sm:px-5 sm:py-5 ${index === 0 ? "bg-[#edf2ff]" : "bg-[#f2f0fc]"}`}>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft"><span className={`size-2 rounded-full ${cell.marker}`} />{cell.name}</div>
        <strong className={`mt-5 block truncate text-[clamp(1.48rem,3vw,2.65rem)] leading-none font-semibold tracking-[-.06em] tabular-nums ${cell.cash < 0 ? "text-destructive" : "text-foreground"}`} title={money(cell.cash)}>{money(cell.cash)}</strong>
        {!compact && <div className="mt-5 space-y-2 text-[12px] tabular-nums">
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">{tx("Housing", "Konut")}</span><strong className="font-semibold">{money(cell.housing)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">{tx("Of income", "Gelire oranı")}</span><strong className="font-semibold">{cell.share}</strong></div>
        </div>}
      </div>)}
    </div>
  </section>
}
