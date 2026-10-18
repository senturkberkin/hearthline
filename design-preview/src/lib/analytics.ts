export type AnalyticsConsent = "granted" | "denied"

export const ANALYTICS_CONSENT_KEY = "hearthline.analytics-consent.v1"
export const OPEN_ANALYTICS_SETTINGS_EVENT = "hearthline:open-analytics-settings"

const configuredId = (import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim()

export function isGaMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/i.test(value)
}

export const analyticsMeasurementId = isGaMeasurementId(configuredId) ? configuredId.toUpperCase() : null
export const analyticsConfigured = analyticsMeasurementId !== null

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY)
    return value === "granted" || value === "denied" ? value : null
  } catch {
    return null
  }
}

export function writeAnalyticsConsent(value: AnalyticsConsent) {
  try { localStorage.setItem(ANALYTICS_CONSENT_KEY, value) } catch { /* Keep the choice in memory. */ }
}

export function sanitizedPageLocation(location: Pick<Location, "origin" | "pathname"> = window.location) {
  return `${location.origin}${location.pathname}`
}

export function sanitizedReferrer(referrer = document.referrer) {
  if (!referrer) return ""
  try { return new URL(referrer).origin + "/" } catch { return "" }
}

function safePageTitle(pathname: string) {
  const path = pathname.replace(/\/$/, "")
  if (path.endsWith("/setup")) return "Hearthline — Planner"
  if (path.endsWith("/results")) return "Hearthline — Results"
  if (path.endsWith("/privacy")) return "Hearthline — Privacy"
  if (path.endsWith("/terms")) return "Hearthline — Terms"
  return "Hearthline"
}

function getGtag() {
  window.dataLayer ||= []
  window.gtag ||= (...args: unknown[]) => { window.dataLayer?.push(args) }
  return window.gtag
}

let analyticsStarted = false

export function startAnalytics() {
  if (!analyticsMeasurementId || analyticsStarted || typeof window === "undefined") return
  analyticsStarted = true

  const gtag = getGtag()
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  })
  gtag("set", "ads_data_redaction", true)
  gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  })
  gtag("js", new Date())
  const pageLocation = sanitizedPageLocation()
  const pageReferrer = sanitizedReferrer()
  gtag("config", analyticsMeasurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: 60 * 60 * 24 * 90,
    cookie_update: false,
    page_location: pageLocation,
    ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
    send_page_view: false,
  })

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsMeasurementId)}`
  script.dataset.hearthlineAnalytics = "true"
  document.head.appendChild(script)

  gtag("event", "page_view", {
    page_title: safePageTitle(window.location.pathname),
    page_location: pageLocation,
    ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
  })
}

function expireCookie(name: string, domain?: string) {
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`
}

export function stopAnalytics() {
  if (window.gtag) {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    })
  }
  if (!analyticsMeasurementId) return
  const names = ["_ga", `_ga_${analyticsMeasurementId.slice(2).replace(/-/g, "_")}`]
  for (const name of names) {
    expireCookie(name)
    expireCookie(name, window.location.hostname)
    expireCookie(name, `.${window.location.hostname}`)
  }
}
