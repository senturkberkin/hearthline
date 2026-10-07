import * as React from "react"
import { ArrowRight, ArrowUpRight, LockKeyhole, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button, buttonVariants } from "@/components/ui/button"
import { BrandHeader, PublicFooter } from "@/components/product/shell"
import { SetupPage } from "@/pages/setup"
import { ResultsPage } from "@/pages/results"
import { ResultGuidance } from "@/components/product/result-guidance"
import { SavedScenariosDialog } from "@/components/product/scenario-library"
import { calculate } from "@/lib/engine"
import { previewScenarios } from "@/lib/fixtures"
import { cn, sitePath } from "@/lib/utils"
import { useProduct } from "@/lib/product-context"

const sections = [
  { id: "how-it-works", label: "The plan" },
  { id: "comparison", label: "The comparison" },
  { id: "methodology", label: "Methodology" },
  { id: "privacy", label: "Privacy" },
]

function useSectionMotion() {
  const [active, setActive] = React.useState(sections[0].id)
  React.useEffect(() => {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.setAttribute("data-visible", "true")
        reveal.unobserve(entry.target)
      }
    }, { threshold: 0.08 })
    document.querySelectorAll(".section-enter").forEach(element => reveal.observe(element))

    const tracker = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
    }, { rootMargin: "-15% 0px -65% 0px" })
    sections.forEach(({ id }) => { const element = document.getElementById(id); if (element) tracker.observe(element) })
    return () => { reveal.disconnect(); tracker.disconnect() }
  }, [])
  return active
}

function SectionNav({ active }: { active: string }) {
  const { tx } = useProduct()
  const translated = [tx("The plan", "Plan"), tx("The comparison", "Karşılaştırma"), tx("Methodology", "Yöntem"), tx("Privacy", "Gizlilik")]
  return <nav aria-label={tx("On this page", "Bu sayfada")} className="section-nav sticky top-0 z-30">
    <div className="mx-auto grid max-w-[1240px] grid-cols-4 gap-1 px-2 py-2 sm:gap-3 sm:px-8">
      {sections.map(({ id }, index) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} data-active={active === id} className="section-nav__item group flex min-h-[78px] flex-col justify-center rounded-[14px] px-1 text-center transition-[background-color,color,box-shadow] duration-200 sm:min-h-[92px] sm:px-4">
        <span className="text-[11px] font-semibold tracking-[.08em] sm:text-[12px]">0{index + 1}</span><span className="mt-1 text-[12px] font-semibold sm:text-[16px]">{translated[index]}</span>
      </a>)}
    </div>
  </nav>
}

function NotebookStep({ number, title, detail, color }: { number: string; title: string; detail: string; color: string }) {
  return <div className={`relative min-h-[200px] rounded-[20px] ${color} p-6 shadow-[0_16px_32px_-28px_#00000020] sm:p-7`}>
    <span className="inline-grid size-9 place-items-center rounded-full bg-white/80 text-[12px] font-semibold text-primary">{number}</span>
    <h3 className="mt-8 text-[19px] font-semibold tracking-[-.04em]">{title}</h3>
    <p className="mt-2 max-w-[240px] text-[12px] leading-5 text-ink-soft">{detail}</p>
  </div>
}

export function HomePage() {
  const active = useSectionMotion()
  const { tx, money, isExample, scenario, savedScenarios, saveIssue } = useProduct()
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

      <SectionNav active={active} />

      <section id="how-it-works" className="landing-section section-enter notebook-dots py-22 lg:py-30"><div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="max-w-[660px]"><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-primary shadow-sm">01 · {tx("The plan", "Plan")}</span><h2 className="mt-6 text-[clamp(2.2rem,4vw,3.8rem)] leading-[1.08] font-semibold tracking-[-.06em]">{tx("Start with what you know.", "Bildiklerinle başla.")}</h2><p className="mt-4 max-w-[500px] text-[15px] text-ink-soft">{tx("Five familiar numbers are enough for a first comparison. Refine the rest when you want to.", "İlk karşılaştırma için bildiğin beş rakam yeterli. Diğerlerini dilediğinde ayrıntılandır.")}</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6"><NotebookStep number="01" title={tx("Your starting point", "Başlangıç durumun")} detail={tx("Income, rent and everyday spending", "Gelir, kira ve günlük giderler")} color="bg-[#eaf1ff]" /><NotebookStep number="02" title={tx("A possible home", "Olası bir ev")} detail={tx("Price, savings and a loan assumption", "Fiyat, birikim ve kredi varsayımı")} color="bg-[#f1f6ff]" /><NotebookStep number="03" title={tx("Two paths", "İki yol")} detail={tx("Cash flow now and over time", "Bugünkü ve gelecekteki nakit akışı")} color="bg-[#edf2ff]" /></div>
        <a href="#workspace" onClick={closeResults} className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-primary shadow-sm transition-transform hover:-translate-y-0.5">{tx("See the setup", "Senaryo adımlarını gör")} <ArrowRight className="size-4" /></a>
      </div></section>

      <section id="comparison" className="landing-section section-enter mx-auto max-w-[1120px] px-5 py-17 sm:px-8 lg:py-22">
        <div className="grid items-end gap-8 lg:grid-cols-[.62fr_1.38fr] lg:gap-14">
          <div className="lg:pb-5"><span className="rounded-full bg-[#edf2ff] px-3 py-1.5 text-[11px] font-semibold text-primary">02 · {tx("The comparison", "Karşılaştırma")}</span><h2 className="mt-6 max-w-[400px] text-[clamp(2.2rem,3.6vw,3.5rem)] leading-[1.08] font-semibold tracking-[-.06em]">{tx("See the monthly difference first.", "Önce aylık farkı gör.")}</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-start"><div className="rounded-[22px] bg-[#edf2ff] p-6 sm:p-7"><span className="text-[12px] font-medium text-ink-soft">{tx("Renting · cash left", "Kirada kalma · elde kalan")}</span><strong className="mt-6 block text-[clamp(2rem,4vw,3.1rem)] leading-none font-semibold tracking-[-.055em] tabular-nums">{money(25_000)}</strong><span className="mt-6 inline-flex rounded-full bg-white/75 px-3 py-1.5 text-[11px] font-medium text-ink-soft">{tx("Month one", "İlk ay")}</span></div><div className="rounded-[22px] bg-[#f1f6ff] p-6 sm:mt-8 sm:p-7"><span className="text-[12px] font-medium text-ink-soft">{tx("Buying · cash left", "Ev alma · elde kalan")}</span><strong className="mt-6 block text-[clamp(2rem,4vw,3.1rem)] leading-none font-semibold tracking-[-.055em] tabular-nums text-destructive">{money(previewScenarios.current.buyingCash)}</strong><span className="mt-6 inline-flex rounded-full bg-white/75 px-3 py-1.5 text-[11px] font-medium text-ink-soft">{tx("Month one", "İlk ay")}</span></div><p className="text-[11px] text-muted-foreground sm:col-span-2">{tx("Fictional example after living costs.", "Yaşam giderleri sonrası kurgusal örnek.")}</p></div>
        </div>
      </section>

      <section id="methodology" className="landing-section section-enter bg-[#f5f8ff] px-5 py-25 sm:px-8 lg:py-30">
        <div className="mx-auto max-w-[1020px] text-center"><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-primary shadow-sm">03 · {tx("Methodology", "Yöntem")}</span><h2 className="mx-auto mt-7 max-w-[720px] text-[clamp(2.2rem,3.5vw,3.4rem)] leading-[1.08] font-semibold tracking-[-.06em]">{tx("How the comparison works.", "Karşılaştırma nasıl hesaplanır?")}</h2><p className="mx-auto mt-5 max-w-[570px] text-[14px] leading-6 text-ink-soft">{tx("The same starting numbers follow two housing paths. Future changes are your assumptions, not market predictions.", "Aynı başlangıç rakamları iki konut seçeneğinde hesaplanır. Gelecekteki değişimler senin varsayımların, piyasa tahmini değil.")}</p>
          <div className="mx-auto mt-12 grid max-w-[940px] items-start gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-5">
            <div><span className="mx-auto grid size-15 place-items-center rounded-full bg-card text-[17px] font-semibold text-primary shadow-sm">01</span><h3 className="mt-5 text-[17px] font-semibold tracking-[-.03em]">{tx("Your inputs", "Senin rakamların")}</h3><p className="mx-auto mt-2 max-w-[210px] text-[12px] leading-5 text-ink-soft">{tx("Income, rent, other spending, home and loan", "Gelir, kira, diğer giderler, ev ve kredi")}</p></div>
            <ArrowRight aria-hidden="true" className="mx-auto size-5 rotate-90 text-ink-soft md:mt-5 md:rotate-0" />
            <div><span className="mx-auto grid size-15 place-items-center rounded-full bg-card text-[17px] font-semibold text-primary shadow-sm">02</span><h3 className="mt-5 text-[17px] font-semibold tracking-[-.03em]">{tx("Two monthly budgets", "İki aylık bütçe")}</h3><p className="mx-auto mt-2 max-w-[210px] text-[12px] leading-5 text-ink-soft">{tx("Cash left after renting or buying", "Kirada ve ev alırken elde kalan")}</p></div>
            <ArrowRight aria-hidden="true" className="mx-auto size-5 rotate-90 text-ink-soft md:mt-5 md:rotate-0" />
            <div><span className="mx-auto grid size-15 place-items-center rounded-full bg-card text-[17px] font-semibold text-primary shadow-sm">03</span><h3 className="mt-5 text-[17px] font-semibold tracking-[-.03em]">{tx("Changes over time", "Zaman içindeki değişim")}</h3><p className="mx-auto mt-2 max-w-[210px] text-[12px] leading-5 text-ink-soft">{tx("Growth assumptions, loan balance and milestones", "Artış varsayımları, kredi borcu ve dönüm noktaları")}</p></div>
          </div>
          <details className="mx-auto mt-10 max-w-[660px] rounded-[14px] bg-card px-5 py-4 text-left"><summary className="cursor-pointer text-[13px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring">{tx("Calculation details", "Hesaplama ayrıntıları")}</summary><p className="mt-4 text-[12px] leading-6 text-ink-soft">{tx("Monthly cash left is take-home income minus housing, other expenses and existing debt. Buying also includes homeowner costs and any temporary support. Income, rent and other expenses change at the annual rates you enter; the loan balance falls as payments are made.", "Aylık elde kalan; net gelirden konut gideri, diğer giderler ve mevcut borçlar çıkarılarak hesaplanır. Ev alma hesabına ev sahipliği giderleri ve varsa geçici destek de katılır. Gelir, kira ve diğer giderler girdiğin yıllık oranlarla değişir; kredi borcu taksitlerle azalır.")}</p></details>
        </div>
      </section>

      <section id="privacy" className="landing-section section-enter px-5 py-13 sm:px-8 lg:py-16"><div className="mx-auto max-w-[660px] text-center"><span className="rounded-full bg-[#edf2ff] px-3 py-1.5 text-[11px] font-semibold text-primary">04 · {tx("Privacy", "Gizlilik")}</span><LockKeyhole className="mx-auto mt-6 size-6 text-primary" /><h2 className="mt-3 text-[clamp(2rem,3vw,2.9rem)] font-semibold tracking-[-.055em]">{tx("Private by default.", "Varsayılan olarak gizli.")}</h2><p className="mx-auto mt-3 max-w-[570px] text-[14px] leading-6 text-ink-soft">{tx("Your financial data stays in your browser. Scenarios are saved on this device only when you choose to save them.", "Finansal verilerin tarayıcında kalır. Senaryolar yalnızca sen kaydetmeyi seçersen bu cihaza kaydedilir.")}</p><a href={sitePath("/privacy/")} className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">{tx("Read the privacy notice", "Gizlilik bildirimini oku")} <ArrowUpRight className="size-4" /></a></div></section>
      <section id="terms" className="mx-auto max-w-[880px] px-5 pb-16 pt-5 text-center sm:px-8 sm:pb-18"><h2 className="text-[27px] font-semibold tracking-[-.045em]">{tx("See what your numbers say.", "Rakamlarının ne söylediğini gör.")}</h2><a href="#workspace" onClick={closeResults} className={cn(buttonVariants({ size: "lg" }), "mt-6 gap-2")}>{tx("Build a scenario", "Senaryo oluştur")} <ArrowRight className="size-4" /></a><p className="mt-4 text-[12px] text-muted-foreground">{tx("Educational scenarios, not financial or mortgage advice.", "Eğitim amaçlı senaryolar; finans veya kredi tavsiyesi değil.")}</p></section>
    </main>
    <PublicFooter />
  </div>
}
