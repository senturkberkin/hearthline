import * as React from "react"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/lib/product-context"
import { loadMinimumWageReference, type MinimumWageReference } from "@/lib/minimum-wage-reference"
import { loadRentReference, type RentReference } from "@/lib/rent-reference"

type Loaded<T> = { data: T | null; stale: boolean }

function ReferenceAction({ value, period, sourceUrl, stale, loading, label, unavailable, onUse }: { value: string; period: string; sourceUrl?: string; stale: boolean; loading: boolean; label: string; unavailable: string; onUse: () => void }) {
  const { tx } = useProduct()
  return <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hairline pt-3">
    <Button type="button" variant="ghost" size="sm" className="h-auto px-0 py-1.5 text-primary" disabled={loading || !sourceUrl || stale} onClick={onUse}>{loading ? tx("Loading official rate…", "Resmî oran yükleniyor…") : sourceUrl ? `${label} · ${value}` : unavailable}</Button>
    {sourceUrl && <span className="text-[10px] text-muted-foreground">{period}{stale ? ` · ${tx("update pending", "güncelleme bekleniyor")}` : ""} · <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{tx("Official source", "Resmî kaynak")} <ArrowUpRight className="inline size-3" /></a></span>}
  </div>
}

export function MinimumWageGrowthAction({ onUse }: { onUse: (percentage: number) => void }) {
  const { tx, percent } = useProduct()
  const [reference, setReference] = React.useState<Loaded<MinimumWageReference>>({ data: null, stale: false })
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => { let active = true; loadMinimumWageReference().then(result => { if (active) { setReference(result); setLoading(false) } }); return () => { active = false } }, [])
  const data = reference.data
  return <ReferenceAction value={data ? percent(data.percentage, 2) : "—"} period={data?.period ?? ""} sourceUrl={data?.sourceUrl} stale={reference.stale} loading={loading} label={data ? tx(`Use ${data.period} minimum-wage increase`, `${data.period} asgari ücret artışını kullan`) : tx("Use minimum-wage increase", "Asgari ücret artışını kullan")} unavailable={tx("Official wage reference unavailable", "Resmî ücret referansı alınamadı")} onUse={() => { if (data) onUse(data.percentage) }} />
}

export function RentCeilingGrowthAction({ onUse }: { onUse: (percentage: number) => void }) {
  const { language, tx, percent } = useProduct()
  const [reference, setReference] = React.useState<Loaded<RentReference>>({ data: null, stale: false })
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => { let active = true; loadRentReference().then(result => { if (active) { setReference(result); setLoading(false) } }); return () => { active = false } }, [])
  const data = reference.data
  const period = data ? new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long", year: "numeric" }).format(new Date(`${data.period}-01T12:00:00`)) : ""
  return <ReferenceAction value={data ? percent(data.percentage, 2) : "—"} period={period} sourceUrl={data?.sourceUrl} stale={reference.stale} loading={loading} label={tx("Use rent ceiling", "Kira üst sınırını kullan")} unavailable={tx("Official rent reference unavailable", "Resmî kira referansı alınamadı")} onUse={() => { if (data) onUse(data.percentage) }} />
}
