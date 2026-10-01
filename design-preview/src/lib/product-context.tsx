import * as React from "react"
import { scenarioFromFacts, validateScenario, withPrincipal, type Scenario } from "@/lib/engine"

export type Language = "en" | "tr"
export type Theme = "light" | "dark"
const scenarioKey = "hearthline.scenario.v1"
const scenarioActiveKey = "hearthline.scenario.active"
const settingsKey = "hearthline.settings.v1"

export const exampleScenario: Scenario = { ...scenarioFromFacts({ income: 75_000, rent: 28_000, livingCosts: 22_000, savings: 500_000, propertyPrice: 4_500_000 }), incomeGrowth: 8, rentGrowth: 6 }

function readScenario(): Scenario {
  try {
    const saved = JSON.parse(sessionStorage.getItem(scenarioKey) || "null")
    if (saved && [null, "savings"].includes(validateScenario(saved))) return withPrincipal(saved)
  } catch { /* Storage may be unavailable. */ }
  return exampleScenario
}

function readSettings(): { language: Language; theme: Theme } {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey) || "null")
    if ((saved?.language === "en" || saved?.language === "tr") && (saved?.theme === "light" || saved?.theme === "dark")) return saved
  } catch { /* Storage may be unavailable. */ }
  return { language: "tr", theme: "light" }
}

type ProductContextValue = {
  scenario: Scenario
  isExample: boolean
  setScenario: React.Dispatch<React.SetStateAction<Scenario>>
  clearScenario: () => void
  language: Language
  setLanguage: (language: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  tx: (en: string, tr: string) => string
  money: (value: number) => string
  percent: (value: number, digits?: number) => string
}

const ProductContext = React.createContext<ProductContextValue | null>(null)

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenario] = React.useState<Scenario>(readScenario)
  const [isExample, setIsExample] = React.useState(() => { try { return sessionStorage.getItem(scenarioActiveKey) !== "1" && JSON.stringify(readScenario()) === JSON.stringify(exampleScenario) } catch { return true } })
  const [settings, setSettings] = React.useState(readSettings)
  React.useEffect(() => {
    document.documentElement.lang = settings.language
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.classList.toggle("dark", settings.theme === "dark")
    document.title = "Hearthline - Konut Kredisi Simülasyonu"
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme === "dark" ? "#0a0a0a" : "#ffffff")
    try { localStorage.setItem(settingsKey, JSON.stringify(settings)) } catch { /* Keep settings in memory. */ }
  }, [settings])
  React.useEffect(() => { try { sessionStorage.setItem(scenarioKey, JSON.stringify(scenario)) } catch { /* Keep scenario in memory. */ } }, [scenario])
  const language = settings.language
  const value: ProductContextValue = {
    scenario, isExample,
    setScenario: next => { setScenario(next); setIsExample(false); try { sessionStorage.setItem(scenarioActiveKey, "1") } catch { /* Keep state in memory. */ } },
    clearScenario: () => { setScenario(exampleScenario); setIsExample(true); try { sessionStorage.removeItem(scenarioKey); sessionStorage.removeItem(scenarioActiveKey) } catch { /* No stored scenario. */ } },
    language, setLanguage: next => setSettings(current => ({ ...current, language: next })),
    theme: settings.theme, setTheme: next => setSettings(current => ({ ...current, theme: next })),
    tx: (en, tr) => language === "tr" ? tr : en,
    money: amount => new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(amount),
    percent: (amount, digits = 1) => new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: digits }).format(amount) + "%",
  }
  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

export function useProduct() {
  const context = React.useContext(ProductContext)
  if (!context) throw new Error("ProductProvider is missing")
  return context
}
