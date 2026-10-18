import * as React from "react"
import { Button } from "@/components/ui/button"
import { useProduct } from "@/lib/product-context"
import { analyticsConfigured, OPEN_ANALYTICS_SETTINGS_EVENT, readAnalyticsConsent, startAnalytics, stopAnalytics, writeAnalyticsConsent, type AnalyticsConsent as ConsentValue } from "@/lib/analytics"
import { sitePath } from "@/lib/utils"

export function AnalyticsConsent() {
  const { tx } = useProduct()
  const [choice, setChoice] = React.useState<ConsentValue | null>(readAnalyticsConsent)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  React.useEffect(() => {
    if (choice === "granted") startAnalytics()
  }, [choice])

  React.useEffect(() => {
    const open = () => setSettingsOpen(true)
    window.addEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, open)
  }, [])

  if (!analyticsConfigured || (choice !== null && !settingsOpen)) return null

  const choose = (value: ConsentValue) => {
    writeAnalyticsConsent(value)
    setChoice(value)
    setSettingsOpen(false)
    if (value === "granted") startAnalytics()
    else stopAnalytics()
  }

  return <aside role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-[680px] rounded-[16px] border border-border bg-card p-4 text-card-foreground shadow-[0_18px_55px_-22px_rgba(25,40,61,.45)] sm:bottom-5 sm:p-5">
    <h2 id="analytics-consent-title" className="text-[15px] font-semibold tracking-[-.02em]">{tx("Optional site analytics", "İsteğe bağlı site analitiği")}</h2>
    <p className="mt-1.5 text-[12px] leading-5 text-ink-soft">{tx("Allow basic visit and traffic-source measurement? Calculator inputs, financial values and results are never sent. Nothing is sent to Google unless you allow it.", "Temel ziyaret ve trafik kaynağı ölçümüne izin verir misin? Hesaplama girdileri, finansal değerler ve sonuçlar hiçbir zaman gönderilmez. İzin vermedikçe Google'a hiçbir veri gönderilmez.")}</p>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button type="button" variant="outline" className="sm:min-w-32" onClick={() => choose("denied")}>{tx("Reject", "Reddet")}</Button>
      <Button type="button" variant="outline" className="sm:min-w-32" onClick={() => choose("granted")}>{tx("Allow analytics", "Analitiğe izin ver")}</Button>
      <a href={sitePath("/privacy/")} className="px-2 py-2 text-center text-[12px] font-medium text-primary hover:underline sm:ml-auto">{tx("Privacy details", "Gizlilik ayrıntıları")}</a>
    </div>
  </aside>
}
