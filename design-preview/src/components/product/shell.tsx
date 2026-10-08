import { ArrowRight, Menu, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useProduct } from "@/lib/product-context"
import { sitePath } from "@/lib/utils"

export function Brand() {
  return <a href={sitePath("/?view=setup")} className="inline-flex items-center gap-2.5 font-semibold tracking-[-.035em] text-foreground" aria-label="Hearthline home">
    <img src={sitePath("/hearthline-icon.svg?v=2")} alt="" width="42" height="42" className="size-[42px] dark:hidden" />
    <img src={sitePath("/hearthline-icon-dark.svg?v=2")} alt="" width="42" height="42" className="hidden size-[42px] dark:block" />
    <span className="text-[18px]">Hearthline</span>
  </a>
}

export function BrandHeader({ mode = "public" }: { mode?: "public" | "app" }) {
  const { tx, language, setLanguage, theme, setTheme } = useProduct()
  const settings = <div className="flex items-center gap-2"><ToggleGroup type="single" value={language} onValueChange={value => { if (value === "en" || value === "tr") setLanguage(value) }} aria-label={tx("Language", "Dil")} className="gap-0 rounded-full bg-muted p-1"><ToggleGroupItem value="en" className="h-7 rounded-full px-2 text-[11px] font-semibold data-[state=on]:bg-card data-[state=on]:shadow-sm">EN</ToggleGroupItem><ToggleGroupItem value="tr" className="h-7 rounded-full px-2 text-[11px] font-semibold data-[state=on]:bg-card data-[state=on]:shadow-sm">TR</ToggleGroupItem></ToggleGroup><Button type="button" variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? tx("Turn on dark mode", "Koyu modu aç") : tx("Turn on light mode", "Açık modu aç")}>{theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}</Button></div>
  return <header className="bg-white">
    <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-5 px-5 sm:px-8">
      <Brand />
      <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[13px] font-medium text-ink-soft md:flex">
        {mode === "public" ? <><a href={sitePath("/#methodology")} className="hover:text-foreground">{tx("Methodology", "Yöntem")}</a><a href={sitePath("/privacy/")} className="hover:text-foreground">{tx("Privacy", "Gizlilik")}</a></> : <><a href={sitePath("/")} className="hover:text-foreground">{tx("About the tool", "Araç hakkında")}</a><a href={sitePath("/#methodology")} className="hover:text-foreground">{tx("Methodology", "Yöntem")}</a></>}
        {settings}
        {mode === "app" && <a href={sitePath("/#workspace")} className="rounded-full bg-[#eef1ff] px-4 py-2 font-semibold text-primary hover:bg-[#e2e8ff]">{tx("Back to planner", "Planlayıcıya dön")}</a>}
      </nav>
      <Sheet>
        <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label={tx("Open navigation", "Menüyü aç")} className="md:hidden"><Menu /></Button></SheetTrigger>
        <SheetContent side="right" className="w-[min(85vw,330px)] bg-card">
          <SheetHeader><SheetTitle className="text-left">{tx("Navigate", "Gezin")}</SheetTitle></SheetHeader>
          <nav aria-label="Mobile navigation" className="grid gap-1 px-4 text-[15px] font-medium">
            {mode === "app" && <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/#workspace")}>{tx("Back to planner", "Planlayıcıya dön")}</a>}
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/#methodology")}>{tx("Methodology", "Yöntem")}</a>
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/privacy/")}>{tx("Privacy", "Gizlilik")}</a>
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/terms/")}>{tx("Terms", "Koşullar")}</a>
            <div className="px-3 pt-4">{settings}</div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  </header>
}

export function PublicFooter() {
  const { tx } = useProduct()
  return <footer className="bg-[#f5f7fd]">
    <MakerInvitation />
    <div className="mx-auto grid max-w-[1240px] gap-9 px-5 pb-8 pt-7 sm:px-8 sm:pb-10 md:grid-cols-[1fr_auto]">
      <div><Brand /><p className="mt-4 max-w-[350px] text-[13px] leading-5 text-muted-foreground">{tx("A private place to understand a housing decision. Your scenario, not our prediction.", "Konut kararını anlamak için özel bir alan. Senin senaryon, bizim tahminimiz değil.")}</p></div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-[13px] font-medium text-ink-soft"><a href={sitePath("/#methodology")} className="hover:text-primary">{tx("Methodology", "Yöntem")}</a><a href={sitePath("/privacy/")} className="hover:text-primary">{tx("Privacy", "Gizlilik")}</a><a href={sitePath("/terms/")} className="hover:text-primary">{tx("Terms", "Koşullar")}</a><a href={sitePath("/#workspace")} className="inline-flex items-center gap-1 text-primary hover:underline">{tx("Back to planner", "Planlayıcıya dön")} <ArrowRight className="size-3.5" /></a></div>
    </div>
    <div className="mx-auto max-w-[1240px] px-5 pb-5 text-[11px] text-muted-foreground sm:px-8">© 2026 Hearthline</div>
  </footer>
}

export function MakerInvitation() {
  const { tx } = useProduct()
  return <aside aria-labelledby="maker-invitation-title" className="maker-invitation py-9 sm:py-11">
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
      <div className="grid max-w-[1040px] gap-6 md:grid-cols-[.72fr_1.28fr] md:gap-14">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">{tx("Meet the maker", "Projeyi yapan kişi")}</p>
          <h2 id="maker-invitation-title" className="mt-3 max-w-[330px] text-[clamp(1.75rem,3vw,2.45rem)] font-semibold leading-[1.08] tracking-[-.055em]">{tx("Building something?", "Sen de bir şeyler mi üretiyorsun?")}</h2>
        </div>
        <div className="md:pt-1">
          <p className="max-w-[630px] text-[14px] leading-6 text-foreground">{tx("I'm Berkin Şentürk. I build Hearthline as an independent project to make complex financial decisions easier to understand.", "Ben Berkin Şentürk. Hearthline’ı, karmaşık finansal kararları daha anlaşılır hale getiren bağımsız bir proje olarak geliştiriyorum.")}</p>
          <p className="mt-3 max-w-[610px] text-[13px] leading-5 text-muted-foreground">{tx("Follow my work on LinkedIn or GitHub—or send me a note if you'd like to meet, share an idea or report a problem.", "Ürettiğim diğer işleri LinkedIn ve GitHub’dan takip edebilir; tanışmak, fikir paylaşmak veya bir sorun bildirmek için bana yazabilirsin.")}</p>
          <div className="mt-5 flex min-h-10 flex-wrap items-center gap-3 text-[13px] font-semibold">
            <a href="https://www.linkedin.com/in/senturkberkin/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{tx("Follow on LinkedIn →", "LinkedIn’de takip et →")}</a>
            <a href="https://github.com/senturkberkin/hearthline" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center px-2 text-ink-soft hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{tx("GitHub →", "GitHub →")}</a>
            <a href="mailto:senturkberkin@gmail.com" className="inline-flex min-h-9 items-center px-2 text-ink-soft hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{tx("Email →", "E-posta →")}</a>
          </div>
        </div>
      </div>
    </div>
  </aside>
}
