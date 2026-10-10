import { sitePath } from "@/lib/utils"

export type MinimumWageReference = { percentage: number; period: string; effectiveAt: string; publishedAt: string; nextPublicationAt: string | null; sourceUrl: string }
const storageKey = "hearthline.minimumWageReference"

export function validateMinimumWageReference(data: unknown): MinimumWageReference | null {
  if (!data || typeof data !== "object") return null
  const item = data as Record<string, unknown>
  if (!Number.isFinite(Number(item.percentage)) || Number(item.percentage) < 0 || Number(item.percentage) > 1000) return null
  if (!/^\d{4}$/.test(String(item.period)) || !Number.isFinite(Date.parse(String(item.effectiveAt))) || !Number.isFinite(Date.parse(String(item.publishedAt)))) return null
  if (!/^https:\/\/(www\.)?csgb\.gov\.tr\//.test(String(item.sourceUrl))) return null
  return { percentage: Number(item.percentage), period: String(item.period), effectiveAt: String(item.effectiveAt), publishedAt: String(item.publishedAt), nextPublicationAt: item.nextPublicationAt ? String(item.nextPublicationAt) : null, sourceUrl: String(item.sourceUrl) }
}

export function isMinimumWageReferenceStale(data: MinimumWageReference, now = new Date()) {
  const next = data.nextPublicationAt && Date.parse(data.nextPublicationAt)
  return next ? now.getTime() >= next : now.getFullYear() > Number(data.period)
}

export async function loadMinimumWageReference(): Promise<{ data: MinimumWageReference | null; stale: boolean }> {
  let cached: MinimumWageReference | null = null
  try { cached = validateMinimumWageReference(JSON.parse(localStorage.getItem(storageKey) || "null")) } catch { /* No cache. */ }
  try {
    const response = await fetch(sitePath("/minimum-wage-reference.json"), { cache: "no-store" })
    if (!response.ok) throw new Error("Reference unavailable")
    const fresh = validateMinimumWageReference(await response.json())
    if (!fresh) throw new Error("Invalid reference")
    const data = cached && cached.period > fresh.period ? cached : fresh
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch { /* No cache. */ }
    return { data, stale: isMinimumWageReferenceStale(data) }
  } catch { return { data: cached, stale: cached ? isMinimumWageReferenceStale(cached) : true } }
}
