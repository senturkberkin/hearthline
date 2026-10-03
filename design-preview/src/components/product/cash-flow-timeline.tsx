import * as React from "react"
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { Info } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { previewSeries, type PreviewVariant } from "@/lib/fixtures"
import { useProduct } from "@/lib/product-context"
import type { Projection } from "@/lib/engine"

type Mode = "cash" | "housing" | "share"

const config = {
  rentCash: { label: "Renting", color: "var(--rent)" },
  buyCash: { label: "Buying", color: "var(--buy)" },
  rentHousing: { label: "Renting", color: "var(--rent)" },
  buyHousing: { label: "Buying", color: "var(--buy)" },
  rentShare: { label: "Renting", color: "var(--rent)" },
  buyShare: { label: "Buying", color: "var(--buy)" },
} satisfies ChartConfig

const chartModes = {
  cash: { label: "Cash left", rent: "rentCash", buy: "buyCash", title: "Monthly cash left" },
  housing: { label: "Housing cost", rent: "rentHousing", buy: "buyHousing", title: "Monthly housing cost" },
  share: { label: "Of income", rent: "rentShare", buy: "buyShare", title: "Housing share of income" },
} as const

function liveSeries(projection: Projection) {
  return Array.from({ length: Math.ceil(projection.rows.length / 12) }, (_, index) => {
    const group = projection.rows.slice(index * 12, index * 12 + 12)
    const average = (key: "rentSurplus" | "buySurplus" | "rent" | "userHousing") => group.reduce((total, row) => total + row[key], 0) / group.length
    const share = (key: "rent" | "userHousing") => group.reduce((total, row) => total + row[key] / row.income, 0) / group.length * 100
    return { year: index + 1, rentCash: average("rentSurplus"), buyCash: average("buySurplus"), rentHousing: average("rent"), buyHousing: average("userHousing"), rentShare: share("rent"), buyShare: share("userHousing") }
  })
}

export function CashFlowTimeline({ variant = "current", projection, compact = false }: { variant?: PreviewVariant; projection?: Projection; compact?: boolean }) {
  const { tx, money } = useProduct()
  const [mode, setMode] = React.useState<Mode>("cash")
  const data = React.useMemo(() => projection ? liveSeries(projection) : previewSeries(variant), [projection, variant])
  const current = chartModes[mode]
  const title = mode === "cash" ? tx("Monthly cash left over time", "Aylık elde kalan · yıllara göre") : mode === "housing" ? tx("Monthly housing cost over time", "Aylık konut gideri · yıllara göre") : tx("Housing share of income over time", "Konut giderinin gelire oranı · yıllara göre")
  const chartHelp = compact
    ? tx("In this fictional example, each point shows the average monthly cash left in that year after housing, living costs and debt. The dashed line is zero cash left.", "Bu kurgusal örnekte her nokta, o yıl konut, yaşam giderleri ve borçlar sonrası ayda ortalama kalan nakdi gösterir. Kesikli çizgi sıfır noktasıdır.")
    : mode === "cash"
      ? tx("Each point shows that year's average monthly cash left after housing, living costs and debt. Below the dashed zero line means a monthly shortfall, not a total-wealth loss.", "Her nokta, o yıl konut, yaşam giderleri ve borçlar sonrası ayda ortalama kalan nakdi gösterir. Kesikli sıfır çizgisinin altı aylık açık demektir; toplam servet kaybı değildir.")
      : mode === "housing"
        ? tx("Each point compares that year's average monthly rent with the mortgage payment after any monthly support, plus homeowner costs. Upfront costs are not included.", "Her nokta, o yılın ortalama aylık kirasını kredi taksiti ve ev sahipliği giderleriyle karşılaştırır. Aylık destek düşülür; peşin giderler dahil değildir.")
        : tx("Each point shows average monthly housing cost divided by projected net income for that year. Lower means a lighter burden; above 100% means housing alone exceeds income.", "Her nokta, o yılki ortalama aylık konut giderinin öngörülen net gelire oranıdır. Düşük oran daha hafif yük demektir; %100'ün üstünde konut gideri tek başına geliri aşar.")
  const format = (value: number) => mode === "share" ? `${value.toFixed(0)}%` : money(value)
  const axis = (value: number) => mode === "share" ? `${Math.round(value)}%` : `${value < 0 ? "−" : ""}₺${Math.abs(value) < 1000 ? Math.round(Math.abs(value)) : `${Math.round(Math.abs(value) / 1000)}k`}`

  return <section aria-label={title} className={compact ? "" : "rounded-[20px] bg-[#f7f9ff] p-5 sm:p-6"}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div>
        <h2 className={`font-semibold tracking-[-.03em] ${compact ? "text-[14px]" : "text-[19px]"}`}>{title}</h2>
        </div>
        <Popover><PopoverTrigger asChild><button type="button" aria-label={`${title}: ${tx("how to read this chart", "grafik nasıl okunur")}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><Info className="size-3.5" /></button></PopoverTrigger><PopoverContent align="start" className="max-w-[290px] p-4 text-[12px] leading-5">{chartHelp}</PopoverContent></Popover>
      </div>
      {!compact && <ToggleGroup type="single" value={mode} onValueChange={value => { if (value) setMode(value as Mode) }} aria-label={tx("Chart metric", "Grafik ölçütü")} className="gap-0 rounded-[9px] bg-[#eaf0ff] p-[3px]">
        {(Object.keys(chartModes) as Mode[]).map(key => <ToggleGroupItem key={key} value={key} className="h-8 rounded-[7px] px-3 text-[11px] font-semibold text-ink-soft data-[state=on]:bg-card data-[state=on]:text-primary data-[state=on]:shadow-sm">{key === "cash" ? tx("Cash left", "Elde kalan") : key === "housing" ? tx("Housing cost", "Konut gideri") : tx("Of income", "Gelire oranı")}</ToggleGroupItem>)}
      </ToggleGroup>}
    </div>
    <div className="mt-4 flex items-center gap-5 text-[11px] font-medium text-ink-soft"><span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-rent" />{tx("Renting", "Kirada kalma")}</span><span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-buy" />{tx("Buying", "Ev alma")}</span></div>
    <ChartContainer config={config} className={`mt-2 w-full aspect-auto ${compact ? "h-[155px]" : "h-[270px] sm:h-[310px]"}`}>
      <LineChart accessibilityLayer data={data} margin={{ left: compact ? 0 : 4, right: 12, top: 14, bottom: 2 }}>
        <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} minTickGap={25} tickFormatter={value => value === 0 ? tx("Today", "Bugün") : `Y${value}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        <YAxis tickLine={false} axisLine={false} width={compact ? 44 : 58} tickCount={compact ? 3 : 5} tickFormatter={axis} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        {mode === "cash" && <ReferenceLine y={0} stroke="#aeb4bb" strokeDasharray="4 4" />}
        <ChartTooltip cursor={{ stroke: "#a9afb8", strokeDasharray: "3 4" }} content={<ChartTooltipContent
          labelFormatter={(_, payload) => `${tx("Year", "Yıl")} ${payload?.[0]?.payload?.year ?? 0}`}
          formatter={(value, name) => <span className="flex w-full min-w-[150px] items-center justify-between gap-3"><span className="text-muted-foreground">{String(name).startsWith("rent") ? tx("Renting", "Kirada kalma") : tx("Buying", "Ev alma")}</span><strong className="font-semibold tabular-nums">{format(Number(value))}</strong></span>}
        />} />
        <Line type="monotone" dataKey={current.rent} name={current.rent} stroke="var(--rent)" strokeWidth={compact ? 2 : 2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line type="monotone" dataKey={current.buy} name={current.buy} stroke="var(--buy)" strokeWidth={compact ? 2 : 2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  </section>
}
