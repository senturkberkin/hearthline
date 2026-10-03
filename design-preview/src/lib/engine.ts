// Direct port of the existing app.js monthly projection and amortization model.
export type Scenario = {
  income: number; rent: number; livingCosts: number; debt: number; savings: number; reserve: number;
  propertyPrice: number; downPayment: number; upfrontSupport: number; closingCosts: number; renovation: number;
  principal: number; termYears: number; rate: number; rateMode: "monthly" | "annual";
  ownerCosts: number; monthlySupport: number; supportMonths: number; horizon: number;
  incomeGrowth: number; rentGrowth: number; expenseGrowth: number; raiseMonth: number; rentRenewal: number;
}

export type ProjectionRow = {
  m: number; income: number; rent: number; payment: number; userHousing: number; support: number;
  balance: number; interest: number; principalPart: number; rentSurplus: number; buySurplus: number;
  rentLiquid: number; buyLiquid: number; cumulativeRent: number; cumulativeInterest: number; principalRepaid: number;
}

export function scenarioFromFacts(f: Pick<Scenario, "income" | "rent" | "livingCosts" | "savings" | "propertyPrice">, rate = 2.25): Scenario {
  const reserve = Math.min(f.savings, 3 * (f.rent + f.livingCosts))
  const downPayment = Math.min(f.propertyPrice, Math.max(0, f.savings - reserve))
  return { ...f, reserve, downPayment, incomeGrowth: 0, rentGrowth: 0, expenseGrowth: 0, debt: 0, raiseMonth: 0, rentRenewal: 0, upfrontSupport: 0, closingCosts: 0, renovation: 0, principal: Math.max(0, f.propertyPrice - downPayment), termYears: 10, rate, rateMode: "monthly", ownerCosts: 0, monthlySupport: 0, supportMonths: 0, horizon: 10 }
}

export function monthlyPayment(principal: number, monthlyRate: number, months: number) {
  if (principal <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const factor = Math.pow(1 + monthlyRate, months)
  return principal * (monthlyRate * factor) / (factor - 1)
}

// Zero duration means monthly help continues until the mortgage is paid.
export function effectiveSupportMonths(d: Scenario) {
  return d.monthlySupport > 0 ? Math.min(d.supportMonths > 0 ? d.supportMonths : d.termYears * 12, d.termYears * 12) : 0
}

export function calculate(d: Scenario) {
  const months = Number(d.horizon) * 12, loanMonths = Number(d.termYears) * 12
  const supportMonths = effectiveSupportMonths(d)
  const monthlyRate = (d.rateMode === "monthly" ? d.rate / 100 : d.rate / 1200)
  const payment = monthlyPayment(d.principal, monthlyRate, loanMonths)
  let balance = d.principal, rent = d.rent, income = d.income, costs = d.livingCosts
  let rentLiquid = d.savings, buyLiquid = d.savings - d.downPayment - d.closingCosts - d.renovation
  let cumulativeRent = 0, cumulativeInterest = 0, principalRepaid = 0
  const rows: ProjectionRow[] = []
  for (let m = 0; m < months; m++) {
    const month = m % 12
    if (m > 0 && month === Number(d.raiseMonth)) income *= 1 + d.incomeGrowth / 100
    if (m > 0 && month === Number(d.rentRenewal)) rent *= 1 + d.rentGrowth / 100
    if (m > 0 && month === 0) costs *= 1 + d.expenseGrowth / 100
    const interest = m < loanMonths ? balance * monthlyRate : 0
    const paid = m < loanMonths ? Math.min(payment, balance + interest) : 0
    const principalPart = Math.max(0, paid - interest)
    balance = Math.max(0, balance - principalPart)
    const support = m < supportMonths ? Math.min(d.monthlySupport, paid) : 0
    const ownerCost = d.ownerCosts / 12
    const rentSurplus = income - rent - costs - d.debt
    const buySurplus = income + support - paid - ownerCost - costs - d.debt
    rentLiquid += rentSurplus; buyLiquid += buySurplus
    cumulativeRent += rent; cumulativeInterest += interest; principalRepaid += principalPart
    rows.push({ m, income, rent, payment: paid, userHousing: Math.max(0, paid - support) + ownerCost, support, balance, interest, principalPart, rentSurplus, buySurplus, rentLiquid, buyLiquid, cumulativeRent, cumulativeInterest, principalRepaid })
  }
  return { rows, payment, monthlyRate, initialBuyCash: d.downPayment + d.closingCosts + d.renovation, rentLiquid, buyLiquid, cumulativeRent, cumulativeInterest, principalRepaid, balance }
}

export type Projection = ReturnType<typeof calculate>
export function sum(rows: ProjectionRow[], key: keyof ProjectionRow) { return rows.reduce((total, row) => total + row[key], 0) }
export function annualize(rows: ProjectionRow[]) {
  return Array.from({ length: Math.ceil(rows.length / 12) }, (_, i) => {
    const group = rows.slice(i * 12, i * 12 + 12), last = group.at(-1)!
    return { year: i + 1, income: last.income, rent: sum(group, "rent"), buyHousing: sum(group, "userHousing"), balance: last.balance, rentSurplus: sum(group, "rentSurplus"), buySurplus: sum(group, "buySurplus") }
  })
}
export function firstMonth(rows: ProjectionRow[], test: (row: ProjectionRow) => boolean) { const row = rows.find(test); return row ? row.m + 1 : null }
export function independentMonth(d: Scenario, r: Projection) { return firstMonth(r.rows, row => row.m >= effectiveSupportMonths(d) && row.buySurplus >= 0 && r.rows.slice(row.m).every(later => later.buySurplus >= 0)) }

export function validateScenario(d: Scenario): string | null {
  if (![d.income, d.rent, d.propertyPrice, d.livingCosts, d.savings, d.downPayment, d.rate, d.termYears, d.horizon].every(Number.isFinite)) return "invalid"
  if (d.income <= 0 || d.rent <= 0 || d.propertyPrice <= 0 || d.termYears <= 0 || d.horizon <= 0) return "positive"
  if ([d.livingCosts, d.savings, d.downPayment, d.rate, d.upfrontSupport, d.monthlySupport, d.supportMonths, d.closingCosts, d.renovation, d.ownerCosts, d.debt].some(value => value < 0)) return "negative"
  if (d.downPayment + d.upfrontSupport > d.propertyPrice) return "contribution"
  if (d.downPayment + d.closingCosts + d.renovation > d.savings) return "savings"
  return null
}

export function withPrincipal(d: Scenario): Scenario { return { ...d, principal: Math.max(0, d.propertyPrice - d.downPayment - d.upfrontSupport) } }
