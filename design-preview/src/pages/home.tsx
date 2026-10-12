import * as React from "react"
import { ArrowRight, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { BrandHeader, PublicFooter } from "@/components/product/shell"
import { SetupPage } from "@/pages/setup"
import { ResultsPage } from "@/pages/results"
import { ResultGuidance } from "@/components/product/result-guidance"
import { SavedScenariosDialog } from "@/components/product/scenario-library"
import { calculate } from "@/lib/engine"
import { useProduct } from "@/lib/product-context"

export function HomePage() {
  const { tx, isExample, scenario, savedScenarios, saveIssue } = useProduct()
  const [workspaceView, setWorkspaceView] = React.useState<"setup" | "results">(() => isExample || new URLSearchParams(window.location.search).get("view") === "setup" ? "setup" : "results")
  const [resultsOpen, setResultsOpen] = React.useState(false)
  const [setupKey, setSetupKey] = React.useState(0)
  const closeResults = () => setResultsOpen(false)
  const editScenario = () => { setWorkspaceView("setup"); closeResults(); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }) }
  const clearResults = () => { setSetupKey(current => current + 1); editScenario() }
  const projection = React.useMemo(() => resultsOpen ? calculate(scenario) : null, [resultsOpen, scenario])
  React.useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
    return () => window.cancelAnimationFrame(frame)
  }, [])
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

    </main>
    <PublicFooter />
  </div>
}
