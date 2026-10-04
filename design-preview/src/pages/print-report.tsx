import * as React from "react"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/lib/product-context"
import { validateScenario } from "@/lib/engine"
import { buildReportModel, type ReportItem } from "@/lib/report-model"
import { sitePath } from "@/lib/utils"

function ReportSection({ title, items }: { title: string; items: ReportItem[] }) {
  return <section className="report-section mt-8"><h2 className="text-[16px] font-semibold tracking-[-.025em] text-[#19283d]">{title}</h2><dl className="mt-3 grid gap-x-7 gap-y-3 sm:grid-cols-2">{items.map(item => <div key={item.label} className="rounded-[9px] bg-[#f2f6fc] px-3 py-2.5"><dt className="text-[11px] text-[#526276]">{item.label}</dt><dd className="mt-1 text-[14px] font-semibold tabular-nums text-[#19283d]">{item.value}</dd></div>)}</dl></section>
}

export function PrintReportPage() {
  const { scenario, activeSavedId, savedScenarios, language, setReportOpen, tx } = useProduct()
  const generatedAt = React.useRef(new Date())
  React.useEffect(() => { window.scrollTo(0, 0) }, [])
  const problem = validateScenario(scenario)
  const name = savedScenarios.find(record => record.id === activeSavedId)?.name ?? null
  const report = problem ? null : buildReportModel(scenario, language, name, generatedAt.current)
  return <main className="report-shell min-h-screen bg-[#e8eef5] px-3 pb-12 pt-5 text-[#19283d] sm:px-6 sm:pt-8">
    <div className="report-actions mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" onClick={() => setReportOpen(false)}><ArrowLeft className="size-4" />{tx("Back to results", "Sonuçlara dön")}</Button>{report && <Button type="button" onClick={() => window.print()}><Printer className="size-4" />{tx("Print / Save PDF", "Yazdır / PDF kaydet")}</Button>}</div>
    {report ? <article className="report-page mx-auto max-w-[210mm] bg-white px-7 pb-10 pt-8 shadow-[0_18px_55px_-30px_#19283d70] sm:px-12 sm:pb-12 sm:pt-11" aria-label={report.title}>
      <header className="report-section flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><div className="flex items-center gap-3"><img src={sitePath("/hearthline-icon.svg?v=2")} alt="" width="34" height="34" /><strong className="text-[17px] font-semibold tracking-[-.04em]">Hearthline</strong></div><h1 className="mt-6 text-[27px] font-semibold leading-[1.1] tracking-[-.055em] text-[#19283d] sm:text-[31px]">{report.title}</h1>{report.name && <p className="mt-2 break-words text-[14px] font-medium text-[#526276]">{report.name}</p>}</div><p className="text-[11px] text-[#526276]">{report.date}</p></header>
      <section className="report-section report-finding mt-7 rounded-[12px] bg-[#eaf1fa] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#41638b]">{tx("Main finding", "Ana bulgu")}</p><p className="mt-2 text-[18px] font-semibold leading-6 tracking-[-.03em] text-[#19283d]">{report.conclusion}</p></section>
      <ReportSection title={tx("Starting point", "Başlangıç durumu")} items={report.starting} />
      <ReportSection title={tx("Buying scenario", "Ev alma senaryosu")} items={report.buying} />
      {report.support.length > 0 && <ReportSection title={tx("Family support included", "Hesaba katılan aile desteği")} items={report.support} />}
      <ReportSection title={tx("First-month comparison", "İlk ay karşılaştırması")} items={report.comparison} />
      <ReportSection title={tx("Affordability milestones", "Ödenebilirlik dönüm noktaları")} items={report.milestones} />
      <section className="report-section mt-8"><h2 className="text-[16px] font-semibold tracking-[-.025em]">{tx("Future assumptions · entered by you", "Gelecek varsayımları · senin girdilerin")}</h2><p className="mt-1 text-[11px] text-[#526276]">{tx("These are scenario inputs, not Hearthline forecasts.", "Bunlar senaryo girdileridir; Hearthline tahmini değildir.")}</p><dl className="mt-3 grid gap-x-7 gap-y-3 sm:grid-cols-2">{report.assumptions.map(item => <div key={item.label} className="rounded-[9px] bg-[#f2f6fc] px-3 py-2.5"><dt className="text-[11px] text-[#526276]">{item.label}</dt><dd className="mt-1 text-[14px] font-semibold tabular-nums">{item.value}</dd></div>)}</dl></section>
      <footer className="report-section report-note mt-9 rounded-[10px] bg-[#f2f6fc] p-4 text-[11px] leading-5 text-[#526276]"><strong className="block text-[#19283d]">{tx("How to read this", "Bu rapor nasıl okunmalı?")}</strong><p className="mt-1">{report.disclaimer}</p></footer>
    </article> : <div className="report-page mx-auto max-w-[210mm] bg-white p-10"><h1 className="text-[24px] font-semibold">{tx("Check the scenario before printing", "Yazdırmadan önce senaryoyu kontrol et")}</h1></div>}
  </main>
}
