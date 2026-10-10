import * as React from "react"
import { scenarioFromFacts, validateScenario, withPrincipal, type Scenario } from "@/lib/engine"
import { createSavedScenarioStore, deserializeScenario, serializeScenario, type SavedScenarioRecord, type StorageIssue } from "@/lib/saved-scenarios"

export type Language = "en" | "tr"
export type Theme = "light" | "dark"
const scenarioKey = "hearthline.scenario.v1"
const scenarioActiveKey = "hearthline.scenario.active"
const savedActiveKey = "hearthline.saved.active"
const settingsKey = "hearthline.settings.v1"
const savedStore = createSavedScenarioStore()

const pageMetadata = {
  en: {
    title: "Hearthline — Rent vs. buy planner",
    description: "Compare rent and buy cash flow using your own assumptions. Your data stays in your browser; a planning aid, not advice.",
  },
  tr: {
    title: "Hearthline — Kira mı, ev almak mı?",
    description: "Kira ve ev alma nakit akışını kendi varsayımlarınla karşılaştır. Verilerin tarayıcında kalır; planlama aracıdır, tavsiye değildir.",
  },
} as const

function setMetaContent(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content)
}

export const exampleScenario: Scenario = { ...scenarioFromFacts({ income: 75_000, rent: 28_000, livingCosts: 22_000, savings: 500_000, propertyPrice: 4_500_000 }), incomeGrowth: 8, rentGrowth: 6 }

function readScenario(): Scenario {
  try {
    const activeId = sessionStorage.getItem(savedActiveKey)
    const active = activeId ? savedStore.get(activeId) : null
    const restored = active ? deserializeScenario(active.payload) : null
    if (restored) return restored
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
  savedScenarios: SavedScenarioRecord[]
  activeSavedId: string | null
  saveIssue: StorageIssue | null
  saveStatus: "unsaved" | "saved" | "error"
  saveScenario: (name: string) => boolean
  openSavedScenario: (id: string) => boolean
  renameSavedScenario: (id: string, name: string) => boolean
  duplicateSavedScenario: (id: string, name: string) => boolean
  deleteSavedScenario: (id: string) => boolean
  deleteAllSavedScenarios: () => boolean
  reportOpen: boolean
  setReportOpen: (open: boolean) => void
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
  const [isExample, setIsExample] = React.useState(() => { try { return sessionStorage.getItem(savedActiveKey) === null && sessionStorage.getItem(scenarioActiveKey) !== "1" && JSON.stringify(readScenario()) === JSON.stringify(exampleScenario) } catch { return true } })
  const [savedScenarios, setSavedScenarios] = React.useState(() => savedStore.list().records)
  const [activeSavedId, setActiveSavedId] = React.useState<string | null>(() => { try { const id = sessionStorage.getItem(savedActiveKey); return id && savedStore.get(id) ? id : null } catch { return null } })
  const [saveIssue, setSaveIssue] = React.useState<StorageIssue | null>(() => savedStore.list().issue)
  const [saveStatus, setSaveStatus] = React.useState<"unsaved" | "saved" | "error">("unsaved")
  const [reportOpen, setReportOpen] = React.useState(false)
  const lastSavedPayload = React.useRef<string | null>(activeSavedId ? serializeScenario(scenario) : null)
  const [settings, setSettings] = React.useState(readSettings)
  React.useEffect(() => {
    document.documentElement.lang = settings.language
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.classList.toggle("dark", settings.theme === "dark")
    const metadata = pageMetadata[settings.language]
    document.title = metadata.title
    setMetaContent('meta[name="description"]', metadata.description)
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme === "dark" ? "#191b1e" : "#ffffff")
    try { localStorage.setItem(settingsKey, JSON.stringify(settings)) } catch { /* Keep settings in memory. */ }
  }, [settings])
  React.useEffect(() => { try { sessionStorage.setItem(scenarioKey, JSON.stringify(scenario)) } catch { /* Keep scenario in memory. */ } }, [scenario])
  React.useEffect(() => {
    if (!activeSavedId) return
    const payload = serializeScenario(scenario)
    if (!payload) { setSaveStatus("unsaved"); return }
    if (payload === lastSavedPayload.current) { setSaveStatus("saved"); return }
    const result = savedStore.update(activeSavedId, scenario)
    if (result.record) { lastSavedPayload.current = payload; setSavedScenarios(savedStore.list().records); setSaveIssue(null); setSaveStatus("saved") }
    else { setSaveIssue(result.issue); setSaveStatus("error") }
  }, [activeSavedId, scenario])
  const detachSaved = () => { setActiveSavedId(null); lastSavedPayload.current = null; setSaveStatus("unsaved"); setSaveIssue(null); try { sessionStorage.removeItem(savedActiveKey) } catch { /* Keep in memory. */ } }
  const refreshSaved = () => setSavedScenarios(savedStore.list().records)
  const language = settings.language
  const value: ProductContextValue = {
    scenario, isExample,
    setScenario: next => { setScenario(next); setIsExample(false); try { sessionStorage.setItem(scenarioActiveKey, "1") } catch { /* Keep state in memory. */ } },
    clearScenario: () => { detachSaved(); setScenario(exampleScenario); setIsExample(true); try { sessionStorage.removeItem(scenarioKey); sessionStorage.removeItem(scenarioActiveKey) } catch { /* No stored scenario. */ } },
    savedScenarios, activeSavedId, saveIssue, saveStatus, reportOpen, setReportOpen,
    saveScenario: name => {
      const result = activeSavedId ? savedStore.update(activeSavedId, scenario) : savedStore.create(name, scenario)
      if (!result.record) { setSaveIssue(result.issue); setSaveStatus("error"); return false }
      if (activeSavedId && result.record.name !== name) {
        const renamed = savedStore.rename(activeSavedId, name)
        if (!renamed.record) { setSaveIssue(renamed.issue); setSaveStatus("error"); return false }
      }
      setActiveSavedId(result.record.id); lastSavedPayload.current = serializeScenario(scenario)
      try { sessionStorage.setItem(savedActiveKey, result.record.id) } catch { /* Current tab still works. */ }
      refreshSaved(); setSaveIssue(null); setSaveStatus("saved"); return true
    },
    openSavedScenario: id => {
      const record = savedStore.get(id), restored = record ? deserializeScenario(record.payload) : null
      if (!restored) { setSaveIssue("invalid"); return false }
      lastSavedPayload.current = serializeScenario(restored); setScenario(restored); setIsExample(false); setActiveSavedId(id)
      try { sessionStorage.setItem(savedActiveKey, id); sessionStorage.setItem(scenarioKey, JSON.stringify(restored)); sessionStorage.setItem(scenarioActiveKey, "1") } catch { /* Current tab still works. */ }
      setSaveIssue(null); setSaveStatus("saved"); return true
    },
    renameSavedScenario: (id, name) => { const result = savedStore.rename(id, name); if (!result.record) { setSaveIssue(result.issue); return false } refreshSaved(); setSaveIssue(null); return true },
    duplicateSavedScenario: (id, name) => { const result = savedStore.duplicate(id, name); if (!result.record) { setSaveIssue(result.issue); return false } refreshSaved(); setSaveIssue(null); return true },
    deleteSavedScenario: id => { const issue = savedStore.delete(id); if (issue) { setSaveIssue(issue); return false } if (activeSavedId === id) detachSaved(); refreshSaved(); setSaveIssue(null); return true },
    deleteAllSavedScenarios: () => { const issue = savedStore.deleteAll(); if (issue) { setSaveIssue(issue); return false } detachSaved(); refreshSaved(); return true },
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
