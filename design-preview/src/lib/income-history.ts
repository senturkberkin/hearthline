export type IncomeYear = { year: number; income: number }

export function summarizeIncomeHistory(entries: IncomeYear[]) {
  const sorted = [...entries].sort((a, b) => a.year - b.year)
  const changes = sorted.map((entry, index) => {
    if (index === 0) return null
    const previous = sorted[index - 1]
    if (entry.year !== previous.year + 1 || entry.income <= 0 || previous.income <= 0) return null
    return (entry.income / previous.income - 1) * 100
  })
  const complete = changes.length > 1 && changes.slice(1).every(change => change !== null)
  const average = complete ? changes.slice(1).reduce<number>((sum, change) => sum + (change ?? 0), 0) / (changes.length - 1) : null
  return { rows: sorted.map((entry, index) => ({ ...entry, change: changes[index] })), average }
}
