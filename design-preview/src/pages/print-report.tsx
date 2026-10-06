import * as React from "react"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/lib/product-context"
import { validateScenario } from "@/lib/engine"
import { buildReportModel, type ReportItem } from "@/lib/report-model"
import { sitePath } from "@/lib/utils"

type Report = ReturnType<typeof buildReportModel>

function DetailSection({ title, items }: { title: string; items: ReportItem[] }) {
  return <section className="report-section">
    <h2 className="report-section-title">{title}</h2>
    <dl className="report-details">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
  </section>
}

function CashChart({ report, tr }: { report: Report; tr: boolean }) {
  const data = report.chart
  const left = 66, right = 650, top = 16, bottom = 212
  const values = data.flatMap(point => [point.renting, point.buying])
  const low = Math.min(0, ...values), high = Math.max(0, ...values)
  const roughStep = Math.max((high - low) / 4, 1)
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const tickStep = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= roughStep) ?? 10 * magnitude
  const min = Math.floor(low / tickStep) * tickStep, max = Math.ceil(high / tickStep) * tickStep || tickStep
  const x = (index: number) => data.length === 1 ? (left + right) / 2 : left + (right - left) * index / (data.length - 1)
  const y = (value: number) => bottom - (value - min) / (max - min) * (bottom - top)
  const path = (key: "renting" | "buying") => data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ")
  const formatAxis = (value: number) => `${value < 0 ? "−" : ""}₺${Math.abs(value) >= 1000 ? `${Math.round(Math.abs(value) / 1000)}k` : Math.round(Math.abs(value))}`
  const ticks = Array.from({ length: Math.round((max - min) / tickStep) + 1 }, (_, index) => min + tickStep * index)
  const years = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])]
  return <section className="report-chart report-section" aria-label={tr ? "Aylık elde kalan nakdin yıllara göre grafiği" : "Average monthly cash left by year"}>
    <div className="report-chart-heading"><div><h2>{tr ? "Aylık elde kalan · yıllara göre" : "Monthly cash left · by year"}</h2><p>{tr ? "Her nokta o yılın aylık ortalamasıdır." : "Each point is that year's monthly average."}</p></div><div className="report-legend"><span><i className="report-legend-rent" />{tr ? "Kirada kalma" : "Renting"}</span><span><i className="report-legend-buy" />{tr ? "Ev alma" : "Buying"}</span></div></div>
    <svg viewBox="0 0 680 252" role="img" aria-label={tr ? "Kirada kalma ve ev alma için aylık elde kalan nakit" : "Monthly cash left for renting and buying"}>
      {ticks.map((value, index) => <g key={index}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="var(--report-grid)" /><text x={left - 12} y={y(value) + 4} textAnchor="end" className="report-axis">{formatAxis(value)}</text></g>)}
      {min < 0 && max > 0 && <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="var(--report-zero)" strokeDasharray="4 5" />}
      {years.map(index => <text key={index} x={x(index)} y="242" textAnchor="middle" className="report-axis">{tr ? "Yıl" : "Year"} {data[index].year}</text>)}
      <path d={path("renting")} fill="none" stroke="var(--report-rent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path("buying")} fill="none" stroke="var(--report-buy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.length === 1 && <><circle cx={x(0)} cy={y(data[0].renting)} r="4" fill="var(--report-rent)" /><circle cx={x(0)} cy={y(data[0].buying)} r="4" fill="var(--report-buy)" /></>}
    </svg>
  </section>
}

export function PrintReportPage() {
  const { scenario, activeSavedId, savedScenarios, language, setReportOpen, tx } = useProduct()
  const generatedAt = React.useRef(new Date())
  React.useEffect(() => { window.scrollTo(0, 0) }, [])
  const problem = validateScenario(scenario)
  const name = savedScenarios.find(record => record.id === activeSavedId)?.name ?? null
  const report = problem ? null : buildReportModel(scenario, language, name, generatedAt.current)
  return <main className="report-shell min-h-screen px-3 pb-12 pt-5 sm:px-6 sm:pt-8">
    <div className="report-actions mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" onClick={() => setReportOpen(false)}><ArrowLeft className="size-4" />{tx("Back to results", "Sonuçlara dön")}</Button>{report && <Button type="button" onClick={() => window.print()}><Printer className="size-4" />{tx("Print / Save PDF", "Yazdır / PDF kaydet")}</Button>}</div>
    {report ? <article className="report-page mx-auto max-w-[210mm]" aria-label={report.title}>
      <header className="report-header report-section"><div className="report-brand"><img className="report-logo-light" src={sitePath("/hearthline-icon.svg?v=2")} alt="" width="32" height="32" /><img className="report-logo-dark" src={sitePath("/hearthline-icon-dark.svg?v=2")} alt="" width="32" height="32" /><strong>Hearthline</strong><span>{report.date}</span></div><h1>{report.title}</h1>{report.name && <p className="report-name">{report.name}</p>}</header>
      <section className="report-finding report-section"><span>{tx("Main finding", "Ana bulgu")}</span><p>{report.conclusion}</p></section>
      <section className="report-summary report-section"><div className="report-summary-heading"><h2>{tx("First month", "İlk ay")}</h2><p>{tx("Cash left after housing, living costs and debt", "Konut, yaşam giderleri ve borç sonrası kalan")}</p></div><div className="report-summary-values">{report.comparison.slice(0, 2).map((item, index) => <div key={item.label}><span className={index === 0 ? "report-rent-dot" : "report-buy-dot"}>{index === 0 ? tx("Renting", "Kirada kalma") : tx("Buying", "Ev alma")}</span><strong>{item.value}</strong></div>)}</div></section>
      <CashChart report={report} tr={language === "tr"} />
      <div className="report-milestones report-section"><DetailSection title={tx("Affordability milestones", "Ödenebilirlik dönüm noktaları")} items={report.milestones} /></div>
      <div className="report-reference"><h2>{tx("Scenario inputs", "Senaryo bilgileri")}</h2><div className="report-reference-grid"><DetailSection title={tx("Starting point", "Başlangıç durumu")} items={report.starting} /><DetailSection title={tx("Buying", "Ev alma")} items={report.buying} />{report.support.length > 0 && <DetailSection title={tx("Family support", "Aile desteği")} items={report.support} />}<DetailSection title={tx("Future assumptions", "Gelecek varsayımları")} items={report.assumptions} /></div></div>
      <footer className="report-note report-section">{report.disclaimer}</footer>
    </article> : <div className="report-page mx-auto max-w-[210mm] p-10"><h1>{tx("Check the scenario before printing", "Yazdırmadan önce senaryoyu kontrol et")}</h1></div>}
  </main>
}
