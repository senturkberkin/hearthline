import { ChevronDown } from "lucide-react"
import { useProduct } from "@/lib/product-context"

export function MonthPicker({ value, onValueChange, label }: { value: number; onValueChange: (month: number) => void; label: string }) {
  const { language } = useProduct()
  const locale = language === "tr" ? "tr-TR" : "en-US"
  const formatter = new Intl.DateTimeFormat(locale, { month: "long" })
  return <label className="block space-y-2">
    <span className="block text-[12px] font-semibold text-ink-soft">{label}</span>
    <span className="relative block">
      <select value={value} onChange={event => onValueChange(Number(event.target.value))} aria-label={label} className="h-11 w-full appearance-none rounded-[10px] border border-hairline bg-card px-3 pr-10 text-[13px] font-semibold text-foreground shadow-none outline-none transition-[border-color,box-shadow] hover:border-primary/35 focus:border-ring focus:ring-3 focus:ring-ring/20">
        {Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{formatter.format(new Date(2026, index, 1))}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  </label>
}
