export type RentReference = { percentage: number; period: string; publishedAt: string; nextPublicationAt: string | null; sourceUrl: string }
const storageKey = "hearthline.rentReference"

export function validateRentReference(data: unknown): RentReference | null {
  if (!data || typeof data !== "object") return null
  const item = data as Record<string, unknown>
  if (!Number.isFinite(Number(item.percentage)) || Number(item.percentage) < 0 || Number(item.percentage) > 1000) return null
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(item.period)) || !Number.isFinite(Date.parse(String(item.publishedAt)))) return null
  if (!/^https:\/\/veriportali\.tuik\.gov\.tr\//.test(String(item.sourceUrl))) return null
  return { percentage: Number(item.percentage), period: String(item.period), publishedAt: String(item.publishedAt), nextPublicationAt: item.nextPublicationAt ? String(item.nextPublicationAt) : null, sourceUrl: String(item.sourceUrl) }
}

export function isRentReferenceStale(data: RentReference, now = new Date()) {
  const next = data.nextPublicationAt && Date.parse(data.nextPublicationAt)
  return next ? now.getTime() >= next : now.getTime() - Date.parse(data.publishedAt) > 45 * 86400000
}

export async function loadRentReference(): Promise<{ data: RentReference | null; stale: boolean }> {
  let cached: RentReference | null = null
  try { cached = validateRentReference(JSON.parse(localStorage.getItem(storageKey) || "null")) } catch { /* No cache. */ }
  try {
    const response = await fetch("/rent-reference.json", { cache: "no-store" })
    if (!response.ok) throw new Error("Reference unavailable")
    const fresh = validateRentReference(await response.json())
    if (!fresh) throw new Error("Invalid reference")
    const data = cached && cached.period > fresh.period ? cached : fresh
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch { /* No cache. */ }
    return { data, stale: isRentReferenceStale(data) }
  } catch { return { data: cached, stale: cached ? isRentReferenceStale(cached) : true } }
}
