import * as React from "react"
import { ArrowDown, ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BrandHeader, PublicFooter } from "@/components/product/shell"
import { RentBuyComparison } from "@/components/product/rent-buy-comparison"
import { CashFlowTimeline } from "@/components/product/cash-flow-timeline"
import { previewScenarios, type PreviewVariant } from "@/lib/fixtures"
import { cn } from "@/lib/utils"
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

function ScenarioDemo() {
  const { tx, money } = useProduct()
  const [variant, setVariant] = React.useState<PreviewVariant>("current")
  return <div className="relative overflow-hidden rounded-[24px] bg-[#f3f7ff] p-3 shadow-[0_30px_80px_-50px_#00000026] sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-4 text-[11px] font-semibold text-ink-soft">
      <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-buy" />{tx("SAMPLE SCENARIO", "ÖRNEK SENARYO")}</span>
      <span className="text-muted-foreground">{money(75_000)} {tx("take-home", "net gelir")} · {money(28_000)} {tx("rent", "kira")}</span>
    </div>
    <div className="rounded-[18px] bg-white p-3 shadow-[0_12px_34px_-26px_#00000026] sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-4">
        <div><p className="text-[11px] text-muted-foreground">{tx("Change one assumption", "Bir varsayımı değiştir")}</p><p className="mt-1 text-[14px] font-semibold">{tx("Home price", "Ev fiyatı")}</p></div>
        <ToggleGroup type="single" value={variant} onValueChange={value => { if (value) setVariant(value as PreviewVariant) }} aria-label={tx("Sample home price", "Örnek ev fiyatı")} className="gap-1 rounded-lg bg-[#edf0fa] p-1">
          <ToggleGroupItem value="current" className="h-8 rounded-md px-3 text-[11px] font-semibold data-[state=on]:bg-white data-[state=on]:text-primary data-[state=on]:shadow-sm">₺4.5m</ToggleGroupItem>
          <ToggleGroupItem value="lower-price" className="h-8 rounded-md px-3 text-[11px] font-semibold data-[state=on]:bg-white data-[state=on]:text-primary data-[state=on]:shadow-sm">₺4.0m</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <RentBuyComparison variant={variant} compact />
      <div className="mt-5 px-1"><CashFlowTimeline variant={variant} compact /></div>
    </div>
    <div className="flex items-center justify-between gap-2 px-2 pt-4 text-[11px] text-muted-foreground"><span>{tx("Illustrative, not a forecast", "Örnek, tahmin değil")}</span><a href="/setup" className="font-semibold text-primary hover:underline">{tx("Try yours", "Kendin dene")} <ArrowUpRight className="inline size-3" /></a></div>
  </div>
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
  const { tx, money } = useProduct()
  return <div className="min-h-screen bg-white text-foreground">
    <BrandHeader />
    <main>
      <section className="relative overflow-hidden bg-white"><div className="pointer-events-none absolute -right-24 top-14 size-[520px] rounded-full bg-[#f1f3ff] blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-18 sm:px-8 md:py-23 lg:grid-cols-[.9fr_1.1fr] lg:gap-14">
          <div className="max-w-[560px]"><p className="mb-5 text-[11px] font-semibold tracking-[.12em] text-primary uppercase">{tx("Rent versus buy, clearly", "Kira mı ev almak mı?")}</p>
            <h1 className="max-w-[570px] text-[clamp(2.8rem,5.25vw,5rem)] leading-[1.035] font-semibold tracking-[-.065em] text-balance">{tx("A home decision, in your own numbers.", "Ev kararını kendi rakamlarınla ver.")}</h1>
            <p className="mt-6 max-w-[450px] text-[16px] leading-[1.6] text-ink-soft">{tx("Compare renting and buying with your own assumptions. No market predictions, no account.", "Kirada kalmayı ve ev almayı kendi varsayımlarınla karşılaştır. Piyasa tahmini yok, hesap açma yok.")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"><a href="/setup" className={cn(buttonVariants({ size: "lg" }), "gap-2 shadow-[0_12px_22px_-15px_#0000002e]")}>{tx("Build your scenario", "Senaryonu oluştur")} <ArrowRight className="size-4" /></a><a href="/results" className="inline-flex h-11 items-center gap-1 text-[13px] font-semibold text-primary hover:underline">{tx("Explore an example", "Örneği incele")} <ArrowUpRight className="size-4" /></a></div>
            <p className="mt-7 flex items-center gap-2 text-[12px] text-muted-foreground"><LockKeyhole className="size-3.5" />{tx("Your financial details stay in this browser.", "Finansal bilgilerin bu tarayıcıda kalır.")}</p>
            <a href="#how-it-works" className="mt-11 inline-flex items-center gap-2 text-[12px] font-medium text-primary hover:underline">{tx("Scroll to explore", "Keşfetmek için kaydır")} <ArrowDown className="size-3.5" /></a>
          </div>
          <ScenarioDemo />
        </div>
      </section>

      <SectionNav active={active} />

      <section id="how-it-works" className="landing-section section-enter notebook-dots px-5 py-22 sm:px-8 lg:py-30"><div className="mx-auto max-w-[1240px]">
        <div className="max-w-[660px]"><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-primary shadow-sm">01 · {tx("The plan", "Plan")}</span><h2 className="mt-6 text-[clamp(2.2rem,4vw,3.8rem)] leading-[1.08] font-semibold tracking-[-.06em]">{tx("Start with what you know.", "Bildiklerinle başla.")}</h2><p className="mt-4 max-w-[500px] text-[15px] text-ink-soft">{tx("Five familiar numbers are enough for a first comparison. Refine the rest when you want to.", "İlk karşılaştırma için bildiğin beş rakam yeterli. Diğerlerini dilediğinde ayrıntılandır.")}</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6"><NotebookStep number="01" title={tx("Your starting point", "Başlangıç durumun")} detail={tx("Income, rent and everyday spending", "Gelir, kira ve günlük giderler")} color="bg-[#eaf1ff]" /><NotebookStep number="02" title={tx("A possible home", "Olası bir ev")} detail={tx("Price, savings and a loan assumption", "Fiyat, birikim ve kredi varsayımı")} color="bg-[#f1f6ff]" /><NotebookStep number="03" title={tx("Two paths", "İki yol")} detail={tx("Cash flow now and over time", "Bugünkü ve gelecekteki nakit akışı")} color="bg-[#edf2ff]" /></div>
        <a href="/setup" className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-primary shadow-sm transition-transform hover:-translate-y-0.5">{tx("See the setup", "Senaryo adımlarını gör")} <ArrowRight className="size-4" /></a>
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

      <section id="privacy" className="landing-section section-enter px-5 py-13 sm:px-8 lg:py-16"><div className="mx-auto max-w-[660px] text-center"><span className="rounded-full bg-[#edf2ff] px-3 py-1.5 text-[11px] font-semibold text-primary">04 · {tx("Privacy", "Gizlilik")}</span><LockKeyhole className="mx-auto mt-6 size-6 text-primary" /><h2 className="mt-3 text-[clamp(2rem,3vw,2.9rem)] font-semibold tracking-[-.055em]">{tx("Private by default.", "Varsayılan olarak gizli.")}</h2><p className="mx-auto mt-3 max-w-[570px] text-[14px] leading-6 text-ink-soft">{tx("Calculations stay in your browser. No account or data upload.", "Hesaplamalar tarayıcında kalır. Hesap açma veya veri yükleme yok.")}</p></div></section>
      <section id="terms" className="mx-auto max-w-[880px] px-5 pb-24 pt-5 text-center sm:px-8"><h2 className="text-[27px] font-semibold tracking-[-.045em]">{tx("See what your numbers say.", "Rakamlarının ne söylediğini gör.")}</h2><a href="/setup" className={cn(buttonVariants({ size: "lg" }), "mt-6 gap-2")}>{tx("Build a scenario", "Senaryo oluştur")} <ArrowRight className="size-4" /></a><p className="mt-4 text-[12px] text-muted-foreground">{tx("Educational scenarios, not financial or mortgage advice.", "Eğitim amaçlı senaryolar; finans veya kredi tavsiyesi değil.")}</p></section>
    </main>
    <PublicFooter />
  </div>
}
