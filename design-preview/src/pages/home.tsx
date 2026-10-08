import * as React from "react"
import { ArrowRight, ArrowUpRight, ChevronDown, LockKeyhole, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { BrandHeader, PublicFooter } from "@/components/product/shell"
import { SetupPage } from "@/pages/setup"
import { ResultsPage } from "@/pages/results"
import { ResultGuidance } from "@/components/product/result-guidance"
import { SavedScenariosDialog } from "@/components/product/scenario-library"
import { calculate } from "@/lib/engine"
import { sitePath } from "@/lib/utils"
import { useProduct } from "@/lib/product-context"

export function HomePage() {
  const { tx, isExample, scenario, savedScenarios, saveIssue } = useProduct()
  const [workspaceView, setWorkspaceView] = React.useState<"setup" | "results">(isExample ? "setup" : "results")
  const [resultsOpen, setResultsOpen] = React.useState(false)
  const [setupKey, setSetupKey] = React.useState(0)
  const closeResults = () => setResultsOpen(false)
  const editScenario = () => { setWorkspaceView("setup"); closeResults(); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }) }
  const clearResults = () => { setSetupKey(current => current + 1); editScenario() }
  const projection = React.useMemo(() => resultsOpen ? calculate(scenario) : null, [resultsOpen, scenario])
  return <div className="min-h-screen bg-white text-foreground">
    <BrandHeader />
    <main>
      <section id="workspace" aria-label={tx("Rent versus buy planner", "Kira ve ev alma planlayıcısı")} className="scroll-mt-20 bg-background">
        {workspaceView === "setup" && (savedScenarios.length > 0 || saveIssue === "malformed" || saveIssue === "future") && <div className="mx-auto flex max-w-[1240px] justify-end px-5 pt-4 sm:px-8"><SavedScenariosDialog onLoaded={() => { setWorkspaceView("results"); setResultsOpen(false) }}><button type="button" className="text-[12px] font-semibold text-primary hover:underline">{tx("Open saved scenarios", "Kayıtlı senaryolar")}{savedScenarios.length > 0 && ` (${savedScenarios.length})`}</button></SavedScenariosDialog></div>}
        {workspaceView === "setup"
          ? <SetupPage key={setupKey} embedded onComplete={() => { setWorkspaceView("results"); setResultsOpen(true); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }) }} />
          : <ResultsPage embedded onEdit={editScenario} onClear={clearResults} />}
      </section>

      <DialogPrimitive.Root open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="results-overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-[3px]" />
          <DialogPrimitive.Content className="results-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[88dvh] w-[calc(100%-24px)] max-w-[780px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[22px] bg-background text-foreground shadow-[0_30px_100px_-30px_rgba(0,0,0,.4)] ring-1 ring-black/5 outline-none dark:ring-white/15 sm:rounded-[26px]" aria-describedby={undefined}>
            <DialogPrimitive.Title className="sr-only">{tx("Your result", "Sonucun")}</DialogPrimitive.Title>
            <div className="flex justify-end px-4 pt-4 sm:px-7 sm:pt-5">
              <DialogPrimitive.Close asChild><Button type="button" variant="ghost" size="icon" className="size-10 rounded-full" aria-label={tx("Close summary and view full results", "Özeti kapat ve tüm sonuçları gör")}><X className="size-4" /></Button></DialogPrimitive.Close>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-6 sm:px-9 sm:pb-8">
              {projection && <ResultGuidance scenario={scenario} projection={projection} headingId="result-dialog-heading" interactive={false} />}
              <DialogPrimitive.Close asChild><Button type="button" className="h-11 w-full rounded-full sm:w-auto">{tx("View full results", "Tüm sonuçları gör")} <ArrowRight className="size-4" /></Button></DialogPrimitive.Close>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <section id="methodology" aria-label={tx("About this comparison", "Bu karşılaştırma hakkında")} className="scroll-mt-20 bg-[#f5f7fd] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto grid max-w-[1240px] gap-3 md:grid-cols-3">
          <div className="rounded-[16px] bg-card/70 px-5 py-4">
            <LockKeyhole aria-hidden="true" className="size-4 text-primary" />
            <p className="mt-3 text-[14px] font-semibold">{tx("Private in your browser", "Verilerin tarayıcında kalır")}</p>
            <a href={sitePath("/privacy/")} className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-primary hover:underline">{tx("Privacy details", "Gizlilik ayrıntıları")} <ArrowUpRight className="size-3.5" /></a>
          </div>
          <div className="rounded-[16px] bg-card/70 px-5 py-4">
            <span aria-hidden="true" className="block size-4 rounded-full bg-primary/15 ring-[5px] ring-primary/5" />
            <p className="mt-3 text-[14px] font-semibold">{tx("Your assumptions, not a prediction", "Senin varsayımların, piyasa tahmini değil")}</p>
            <p className="mt-1 text-[12px] text-ink-soft">{tx("An educational scenario, not mortgage advice.", "Eğitim amaçlı bir senaryo; kredi tavsiyesi değil.")}</p>
          </div>
          <details className="group rounded-[16px] bg-card/70 px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              {tx("How the calculation works", "Hesaplama nasıl çalışır?")}
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-[12px] leading-5 text-ink-soft">{tx("The tool compares cash left after renting with cash left after buying. It applies the income, rent, spending, support and loan assumptions you enter across time.", "Araç, kirada ve ev alırken giderlerden sonra kalan parayı karşılaştırır. Girdiğin gelir, kira, gider, destek ve kredi varsayımlarını zaman içinde uygular.")}</p>
          </details>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>
}
