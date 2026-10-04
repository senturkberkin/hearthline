import React from "react"
import ReactDOM from "react-dom/client"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HomePage } from "@/pages/home"
import { SetupPage } from "@/pages/setup"
import { ResultsPage } from "@/pages/results"
import { PrivacyPage, TermsPage } from "@/pages/legal"
import { PrintReportPage } from "@/pages/print-report"
import { ProductProvider } from "@/lib/product-context"
import { useProduct } from "@/lib/product-context"
import "./index.css"

function AppContent() {
  const { reportOpen } = useProduct()
  const path = window.location.pathname.replace(/\/$/, "")
  const page = path.endsWith("/setup") ? <SetupPage /> : path.endsWith("/results") ? <ResultsPage /> : path.endsWith("/privacy") ? <PrivacyPage /> : path.endsWith("/terms") ? <TermsPage /> : <HomePage />
  return <TooltipProvider>{reportOpen ? <PrintReportPage /> : page}</TooltipProvider>
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><ProductProvider><AppContent /></ProductProvider></React.StrictMode>)
