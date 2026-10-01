import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProduct } from "@/lib/product-context"

export function KeyMilestone({ label, value, detail }: { label: string; value: string; detail: string }) {
  const { tx } = useProduct()
  return <div className="flex min-w-0 items-start justify-between gap-3 rounded-[13px] bg-[#f5f7fd] px-4 py-4">
    <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-soft"><span>{label}</span><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`${label}: ${tx("details", "ayrıntılar")}`} className="rounded p-0.5 text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3" /></button></TooltipTrigger><TooltipContent>{detail}</TooltipContent></Tooltip></div>
    <strong className="text-right text-[13px] font-semibold tabular-nums">{value}</strong>
  </div>
}
