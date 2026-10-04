import { validateScenario, withPrincipal, type Scenario } from "./engine"

export const CURRENT_SCENARIO_SCHEMA_VERSION = 1
export const SAVED_SCENARIOS_KEY = "hearthline:saved-scenarios"

const numericFields = [
  "income", "rent", "livingCosts", "debt", "savings", "reserve", "propertyPrice", "downPayment",
  "upfrontSupport", "closingCosts", "renovation", "termYears", "rate", "ownerCosts",
  "monthlySupport", "supportMonths", "horizon", "incomeGrowth", "rentGrowth", "expenseGrowth",
  "raiseMonth", "rentRenewal",
] as const satisfies readonly (keyof Scenario)[]

export type ScenarioPayload = Omit<Scenario, "principal">
export type SavedScenarioRecord = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  schemaVersion: typeof CURRENT_SCENARIO_SCHEMA_VERSION
  payload: ScenarioPayload
}
export type StorageIssue = "unavailable" | "malformed" | "future" | "write-failed" | "invalid" | "not-found"
export type ReadResult = { records: SavedScenarioRecord[]; invalidCount: number; issue: StorageIssue | null }
export type WriteResult = { record: SavedScenarioRecord | null; issue: StorageIssue | null }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">
type RawStore = { schemaVersion: number; records: unknown[] }

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function scenarioToPayload(scenario: Scenario): ScenarioPayload {
  const payload = Object.fromEntries(numericFields.map(key => [key, scenario[key]])) as unknown as ScenarioPayload
  payload.rateMode = scenario.rateMode
  return payload
}

export function deserializeScenario(value: unknown): Scenario | null {
  if (!object(value) || numericFields.some(key => typeof value[key] !== "number" || !Number.isFinite(value[key]))) return null
  if (value.rateMode !== "monthly" && value.rateMode !== "annual") return null
  if (!["raiseMonth", "rentRenewal"].every(key => Number.isInteger(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 11)) return null
  const payload = Object.fromEntries(numericFields.map(key => [key, value[key]])) as unknown as ScenarioPayload
  payload.rateMode = value.rateMode
  const scenario = withPrincipal(payload as Scenario)
  return validateScenario(scenario) === null ? scenario : null
}

export function serializeScenario(scenario: Scenario): string | null {
  const payload = scenarioToPayload(scenario)
  return deserializeScenario(payload) ? JSON.stringify(payload) : null
}

function validRecord(value: unknown): SavedScenarioRecord | null {
  if (!object(value) || value.schemaVersion !== CURRENT_SCENARIO_SCHEMA_VERSION || typeof value.id !== "string" || !value.id || typeof value.name !== "string" || !value.name.trim() || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)) || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return null
  const scenario = deserializeScenario(value.payload)
  return scenario ? { id: value.id, name: value.name, createdAt: value.createdAt, updatedAt: value.updatedAt, schemaVersion: CURRENT_SCENARIO_SCHEMA_VERSION, payload: scenarioToPayload(scenario) } : null
}

// Version 0 was a full-Scenario record shape. Its derived principal is discarded.
export function migrateScenario(value: unknown): SavedScenarioRecord | null {
  if (!object(value) || value.schemaVersion !== 0) return null
  return validRecord({ ...value, schemaVersion: 1, payload: value.scenario })
}

function browserStorage(): StorageLike | null {
  try { return globalThis.localStorage } catch { return null }
}

export function createSavedScenarioStore(options: { storage?: StorageLike | null; now?: () => string; id?: () => string } = {}) {
  const storage = options.storage === undefined ? browserStorage() : options.storage
  const now = options.now ?? (() => new Date().toISOString())
  const id = options.id ?? (() => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  function read(): ReadResult & { opaque: unknown[] } {
    if (!storage) return { records: [], invalidCount: 0, issue: "unavailable", opaque: [] }
    let raw: string | null
    try { raw = storage.getItem(SAVED_SCENARIOS_KEY) } catch { return { records: [], invalidCount: 0, issue: "unavailable", opaque: [] } }
    if (raw === null) return { records: [], invalidCount: 0, issue: null, opaque: [] }
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return { records: [], invalidCount: 0, issue: "malformed", opaque: [] } }
    if (!object(parsed) || typeof parsed.schemaVersion !== "number" || !Array.isArray(parsed.records)) return { records: [], invalidCount: 0, issue: "malformed", opaque: [] }
    if (parsed.schemaVersion > CURRENT_SCENARIO_SCHEMA_VERSION) return { records: [], invalidCount: 0, issue: "future", opaque: [] }
    if (parsed.schemaVersion !== 0 && parsed.schemaVersion !== 1) return { records: [], invalidCount: 0, issue: "malformed", opaque: [] }
    const records: SavedScenarioRecord[] = [], opaque: unknown[] = [], seen = new Set<string>()
    for (const candidate of parsed.records) {
      const record = parsed.schemaVersion === 0 ? migrateScenario(candidate) : validRecord(candidate)
      if (record && !seen.has(record.id)) { records.push(record); seen.add(record.id) }
      else opaque.push(candidate)
    }
    return { records, invalidCount: opaque.length, issue: null, opaque }
  }

  function write(records: SavedScenarioRecord[], opaque: unknown[]): StorageIssue | null {
    if (!storage) return "unavailable"
    const value: RawStore = { schemaVersion: CURRENT_SCENARIO_SCHEMA_VERSION, records: [...records, ...opaque] }
    try { storage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(value)); return null } catch { return "write-failed" }
  }

  function mutate(change: (records: SavedScenarioRecord[]) => SavedScenarioRecord | null): WriteResult {
    const current = read()
    if (current.issue) return { record: null, issue: current.issue }
    const record = change(current.records)
    if (!record) return { record: null, issue: "not-found" }
    const issue = write(current.records, current.opaque)
    return { record: issue ? null : record, issue }
  }
  function uniqueId(records: SavedScenarioRecord[]) {
    let candidate = id()
    while (records.some(record => record.id === candidate)) candidate = id()
    return candidate
  }

  return {
    list: (): ReadResult => { const { records, invalidCount, issue } = read(); return { records, invalidCount, issue } },
    get: (recordId: string) => read().records.find(record => record.id === recordId) ?? null,
    create(name: string, scenario: Scenario): WriteResult {
      const payload = deserializeScenario(scenarioToPayload(scenario))
      if (!name.trim() || !payload) return { record: null, issue: "invalid" }
      return mutate(records => { const date = now(); const record: SavedScenarioRecord = { id: uniqueId(records), name, createdAt: date, updatedAt: date, schemaVersion: 1, payload: scenarioToPayload(payload) }; records.unshift(record); return record })
    },
    update(recordId: string, scenario: Scenario): WriteResult {
      const payload = deserializeScenario(scenarioToPayload(scenario))
      if (!payload) return { record: null, issue: "invalid" }
      return mutate(records => { const index = records.findIndex(record => record.id === recordId); if (index < 0) return null; records[index] = { ...records[index], updatedAt: now(), payload: scenarioToPayload(payload) }; return records[index] })
    },
    rename(recordId: string, name: string): WriteResult {
      if (!name.trim()) return { record: null, issue: "invalid" }
      return mutate(records => { const index = records.findIndex(record => record.id === recordId); if (index < 0) return null; records[index] = { ...records[index], name, updatedAt: now() }; return records[index] })
    },
    duplicate(recordId: string, name: string): WriteResult {
      if (!name.trim()) return { record: null, issue: "invalid" }
      return mutate(records => { const source = records.find(record => record.id === recordId); if (!source) return null; const date = now(); const record = { ...source, id: uniqueId(records), name, createdAt: date, updatedAt: date }; records.unshift(record); return record })
    },
    delete(recordId: string): StorageIssue | null {
      const current = read()
      if (current.issue) return current.issue
      const index = current.records.findIndex(record => record.id === recordId)
      if (index < 0) return "not-found"
      current.records.splice(index, 1)
      return write(current.records, current.opaque)
    },
    deleteAll(): StorageIssue | null {
      if (!storage) return "unavailable"
      try { storage.removeItem(SAVED_SCENARIOS_KEY); return null } catch { return "write-failed" }
    },
  }
}
