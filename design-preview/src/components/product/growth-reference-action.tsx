import * as React from "react"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/lib/product-context"
import { loadMinimumWageReference, type MinimumWageReference } from "@/lib/minimum-wage-reference"
import { loadRentReference, type RentReference } from "@/lib/rent-reference"

type Loaded<T> = { data: T | null; stale: boolean }

function ReferenceAction({ value, period, sourceUrl, stale, loading, label, unavailable, onUse }: { value: string; period: string; sourceUrl?: string; stale: boolean; loading: boolean; label: string; unavailable: string; onUse: () => void }) {
  const { tx } = useProduct()
  const unavailableOrStale = !sourceUrl || stale
  return <div className="border-t border-hairline py-3">
    <div className="rounded-[14px] border border-primary/30 bg-primary/[.055] p-1.5 dark:bg-primary/[.10]">
      <Button type="button" variant="ghost" className="group h-auto w-full justify-between rounded-[10px] px-3 py-3 text-left text-foreground transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary/[.08] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[.985] disabled:opacity-60" disabled={loading || unavailableOrStale} onClick={onUse}>
        <span className="min-w-0 text-[13px] font-semibold leading-5">{loading ? tx("Loading official rate…", "Resmî oran yükleniyor…") : sourceUrl ? <>{label} <strong className="ml-1 text-primary tabular-nums">{value}</strong></> : unavailable}</span>
        <span aria-hidden="true" className="ml-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-active:scale-95"><ArrowRight className="size-4" /></span>
      </Button>
      {sourceUrl && <div className="flex flex-wrap items-center gap-x-1.5 px-3 pb-1 pt-1 text-[10px] text-muted-foreground"><span>{period}{stale ? ` · ${tx("update pending", "güncelleme bekleniyor")}` : ""}</span><span aria-hidden="true">·</span><a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm font-semibold text-primary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{tx("Official source", "Resmî kaynak")} <ArrowUpRight aria-hidden="true" className="inline size-3" /></a></div>}
    </div>
  </div>
}

export function MinimumWageGrowthAction({ onUse }: { onUse: (percentage: number) => void }) {
  const { tx, percent } = useProduct()
  const [reference, setReference] = React.useState<Loaded<MinimumWageReference>>({ data: null, stale: false })
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => { let active = true; loadMinimumWageReference().then(result => { if (active) { setReference(result); setLoading(false) } }); return () => { active = false } }, [])
  const data = reference.data
  return <ReferenceAction value={data ? percent(data.percentage, 2) : "—"} period={data?.period ?? ""} sourceUrl={data?.sourceUrl} stale={reference.stale} loading={loading} label={data ? tx(`${data.period} minimum-wage increase`, `${data.period} asgari ücret artışı`) : tx("Minimum-wage increase", "Asgari ücret artışı")} unavailable={tx("Official wage reference unavailable", "Resmî ücret referansı alınamadı")} onUse={() => { if (data) onUse(data.percentage) }} />
}

export function RentCeilingGrowthAction({ onUse }: { onUse: (percentage: number) => void }) {
  const { language, tx, percent } = useProduct()
  const [reference, setReference] = React.useState<Loaded<RentReference>>({ data: null, stale: false })
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => { let active = true; loadRentReference().then(result => { if (active) { setReference(result); setLoading(false) } }); return () => { active = false } }, [])
  const data = reference.data
  const period = data ? new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long", year: "numeric" }).format(new Date(`${data.period}-01T12:00:00`)) : ""
  return <ReferenceAction value={data ? percent(data.percentage, 2) : "—"} period={period} sourceUrl={data?.sourceUrl} stale={reference.stale} loading={loading} label={tx("Rent ceiling", "Kira artış üst sınırı")} unavailable={tx("Official rent reference unavailable", "Resmî kira referansı alınamadı")} onUse={() => { if (data) onUse(data.percentage) }} />
}
