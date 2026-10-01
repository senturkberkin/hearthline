import { ArrowRight, Menu, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useProduct } from "@/lib/product-context"
import { sitePath } from "@/lib/utils"

export function Brand() {
  return <a href={sitePath("/")} className="inline-flex items-center gap-2.5 font-semibold tracking-[-.035em] text-foreground" aria-label="Hearthline home">
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 8h24M4 24h24M7 8c7 0 7 16 14 16M25 8c-7 0-7 16-14 16" stroke="var(--buy)" strokeWidth="2.2" strokeLinecap="round" /></svg>
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
        {mode === "public" ? <><a href={sitePath("/#how-it-works")} className="hover:text-foreground">{tx("How it works", "Nasıl çalışır?")}</a><a href={sitePath("/#methodology")} className="hover:text-foreground">{tx("Methodology", "Yöntem")}</a><a href={sitePath("/#privacy")} className="hover:text-foreground">{tx("Privacy", "Gizlilik")}</a></> : <><a href={sitePath("/")} className="hover:text-foreground">{tx("About the tool", "Araç hakkında")}</a><a href={sitePath("/#methodology")} className="hover:text-foreground">{tx("Methodology", "Yöntem")}</a></>}
        {settings}
        <a href={sitePath(mode === "public" ? "/setup/" : "/")} className="rounded-full bg-[#eef1ff] px-4 py-2 font-semibold text-primary hover:bg-[#e2e8ff]">{mode === "public" ? tx("Open planner", "Planlayıcıyı aç") : tx("Back to home", "Ana sayfaya dön")}</a>
      </nav>
      <Sheet>
        <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label={tx("Open navigation", "Menüyü aç")} className="md:hidden"><Menu /></Button></SheetTrigger>
        <SheetContent side="right" className="w-[min(85vw,330px)] bg-card">
          <SheetHeader><SheetTitle className="text-left">{tx("Navigate", "Gezin")}</SheetTitle></SheetHeader>
          <nav aria-label="Mobile navigation" className="grid gap-1 px-4 text-[15px] font-medium">
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/")}>{tx("Home", "Ana sayfa")}</a>
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/setup/")}>{tx("Build a scenario", "Senaryo oluştur")}</a>
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/results/")}>{tx("Results", "Sonuçlar")}</a>
            <a className="rounded-lg px-3 py-3 hover:bg-muted" href={sitePath("/#methodology")}>{tx("Methodology", "Yöntem")}</a>
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
    <div className="mx-auto grid max-w-[1240px] gap-9 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto]">
      <div><Brand /><p className="mt-4 max-w-[350px] text-[13px] leading-5 text-muted-foreground">{tx("A private place to understand a housing decision. Your scenario, not our prediction.", "Konut kararını anlamak için özel bir alan. Senin senaryon, bizim tahminimiz değil.")}</p></div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 text-[13px] font-medium text-ink-soft"><a href={sitePath("/#methodology")} className="hover:text-primary">{tx("Methodology", "Yöntem")}</a><a href={sitePath("/#privacy")} className="hover:text-primary">{tx("Privacy", "Gizlilik")}</a><a href={sitePath("/#terms")} className="hover:text-primary">{tx("Terms", "Koşullar")}</a><a href={sitePath("/setup/")} className="inline-flex items-center gap-1 text-primary hover:underline">{tx("Open planner", "Planlayıcıyı aç")} <ArrowRight className="size-3.5" /></a></div>
    </div>
    <div className="mx-auto max-w-[1240px] px-5 pb-5 text-[11px] text-muted-foreground sm:px-8">© 2026 Hearthline</div>
  </footer>
}
