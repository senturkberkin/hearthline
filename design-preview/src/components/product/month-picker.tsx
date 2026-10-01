import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useProduct } from "@/lib/product-context"

const months = [
  ["Jan", "January"], ["Feb", "February"], ["Mar", "March"], ["Apr", "April"],
  ["May", "May"], ["Jun", "June"], ["Jul", "July"], ["Aug", "August"],
  ["Sep", "September"], ["Oct", "October"], ["Nov", "November"], ["Dec", "December"],
]

export function MonthPicker({ value, onValueChange, label }: { value: number; onValueChange: (month: number) => void; label: string }) {
  const { language } = useProduct()
  return <div className="space-y-2">
    <span className="text-[12px] font-semibold text-ink-soft">{label}</span>
    <ToggleGroup type="single" value={String(value)} onValueChange={next => { if (next) onValueChange(Number(next)) }} aria-label={label} className="month-picker">
      {months.map(([short, full], index) => <ToggleGroupItem
        key={full}
        value={String(index)}
        aria-label={language === "tr" ? new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(2026, index, 1)) : full}
        title={language === "tr" ? new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(2026, index, 1)) : full}
        className="h-9 min-w-0 rounded-[7px] border border-hairline bg-card px-0 text-[11px] font-semibold text-ink-soft shadow-none data-[state=on]:border-[#b7c5e5] data-[state=on]:bg-[#e9edf8] data-[state=on]:text-primary hover:bg-muted"
      >{language === "tr" ? new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(new Date(2026, index, 1)) : short}</ToggleGroupItem>)}
    </ToggleGroup>
  </div>
}
