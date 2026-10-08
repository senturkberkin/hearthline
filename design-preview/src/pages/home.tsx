import * as React from "react"
import { ArrowRight, ChevronDown, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { BrandHeader, PublicFooter } from "@/components/product/shell"
import { SetupPage } from "@/pages/setup"
import { ResultsPage } from "@/pages/results"
import { ResultGuidance } from "@/components/product/result-guidance"
import { SavedScenariosDialog } from "@/components/product/scenario-library"
import { calculate } from "@/lib/engine"
import { useProduct } from "@/lib/product-context"

const sections = ["how-it-works", "methodology"] as const

function useActiveSection() {
  const [active, setActive] = React.useState<(typeof sections)[number]>(sections[0])
  React.useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id as (typeof sections)[number])
    }, { rootMargin: "-18% 0px -62% 0px" })
    sections.forEach(id => { const element = document.getElementById(id); if (element) observer.observe(element) })
    return () => observer.disconnect()
  }, [])
  return active
}

function SectionNav({ active }: { active: (typeof sections)[number] }) {
  const { tx } = useProduct()
  const labels = [tx("The plan", "Plan"), tx("Method", "Yöntem")]
  return <nav aria-label={tx("About the tool", "Araç hakkında")} className="section-nav sticky top-0 z-30">
    <div className="mx-auto grid max-w-[760px] grid-cols-2 gap-2 px-3 py-2 sm:px-8">
      {sections.map((id, index) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} data-active={active === id} className="section-nav__item flex min-h-[58px] items-center justify-center gap-3 rounded-[13px] px-4 text-center transition-[background-color,color,box-shadow] duration-200 sm:min-h-[64px]">
        <span className="text-[11px] font-semibold tracking-[.08em]">0{index + 1}</span>
        <span className="text-[13px] font-semibold sm:text-[15px]">{labels[index]}</span>
      </a>)}
    </div>
  </nav>
}

export function HomePage() {
  const activeSection = useActiveSection()
  const { tx, isExample, scenario, savedScenarios, saveIssue } = useProduct()
  const [workspaceView, setWorkspaceView] = React.useState<"setup" | "results">(() => isExample || new URLSearchParams(window.location.search).get("view") === "setup" ? "setup" : "results")
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

      <SectionNav active={activeSection} />

      <section id="how-it-works" className="landing-section notebook-dots px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-[1180px] items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
          <article className="rounded-[24px] bg-card/85 p-6 shadow-[0_18px_40px_-34px_rgba(23,64,112,.6)] sm:p-8">
            <p className="text-[12px] font-semibold text-primary">01 · {tx("The plan", "Plan")}</p>
            <h2 className="mt-4 max-w-[490px] text-[clamp(2rem,3.2vw,3rem)] leading-[1.07] font-semibold tracking-[-.055em]">{tx("Start with five familiar numbers.", "Bildiğin beş rakamla başla.")}</h2>
            <p className="mt-3 max-w-[480px] text-[14px] leading-6 text-ink-soft">{tx("Add detail only when it changes the comparison.", "Yalnızca karşılaştırmayı etkileyen ayrıntıları ekle.")}</p>
            <div className="mt-7 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[14px] bg-muted/65 px-4 py-3"><p className="text-[12px] font-semibold">{tx("Your starting point", "Başlangıç durumun")}</p><p className="mt-1 text-[11px] text-ink-soft">{tx("Income, rent, spending", "Gelir, kira, giderler")}</p></div>
              <div className="rounded-[14px] bg-muted/65 px-4 py-3"><p className="text-[12px] font-semibold">{tx("A possible home", "Olası bir ev")}</p><p className="mt-1 text-[11px] text-ink-soft">{tx("Price, savings, loan", "Fiyat, birikim, kredi")}</p></div>
              <div className="rounded-[14px] bg-muted/65 px-4 py-3"><p className="text-[12px] font-semibold">{tx("Two paths", "İki seçenek")}</p><p className="mt-1 text-[11px] text-ink-soft">{tx("What remains over time", "Zaman içinde kalan para")}</p></div>
            </div>
          </article>

          <article id="methodology" className="landing-section rounded-[24px] bg-card/85 p-6 shadow-[0_18px_40px_-34px_rgba(23,64,112,.6)] sm:p-8">
            <p className="text-[12px] font-semibold text-primary">02 · {tx("Method", "Yöntem")}</p>
            <h2 className="mt-4 max-w-[490px] text-[clamp(2rem,3.2vw,3rem)] leading-[1.07] font-semibold tracking-[-.055em]">{tx("A cash-flow comparison, not a forecast.", "Bir nakit akışı karşılaştırması; tahmin değil.")}</h2>
            <p className="mt-3 max-w-[500px] text-[14px] leading-6 text-foreground">{tx("Hearthline compares what remains after renting with what remains after buying, using your own assumptions.", "Hearthline, kendi varsayımlarını kullanarak kirada ve ev alırken giderlerden sonra kalan parayı karşılaştırır.")}</p>
            <p className="mt-2 max-w-[500px] text-[12px] leading-5 text-ink-soft">{tx("It does not predict prices, approve a loan or tell you which choice will build more wealth.", "Fiyat tahmini yapmaz, kredi onayı vermez veya hangi seçeneğin daha fazla servet oluşturacağını söylemez.")}</p>
            <details className="group mt-6 rounded-[14px] bg-muted/65 px-4 py-3.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {tx("Calculation details", "Hesaplama ayrıntıları")}
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[12px] leading-5 text-ink-soft">{tx("Monthly cash left is income minus housing, regular spending and debt. The model then applies the income, rent, spending, support and loan assumptions you entered across time.", "Aylık kalan para; gelirden konut gideri, düzenli giderler ve borçlar çıkarılarak hesaplanır. Model daha sonra girdiğin gelir, kira, gider, destek ve kredi varsayımlarını zaman içinde uygular.")}</p>
            </details>
          </article>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>
}
