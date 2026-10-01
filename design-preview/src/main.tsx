import React from "react"
import ReactDOM from "react-dom/client"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HomePage } from "@/pages/home"
import { SetupPage } from "@/pages/setup"
import { ResultsPage } from "@/pages/results"
import { ProductProvider } from "@/lib/product-context"
import "./index.css"

function App() {
  const path = window.location.pathname
  const page = path === "/setup" || path === "/design/setup" ? <SetupPage /> : path === "/results" || path === "/design/results" ? <ResultsPage /> : <HomePage />
  return <ProductProvider><TooltipProvider>{page}</TooltipProvider></ProductProvider>
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>)
