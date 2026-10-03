import { calculate, withPrincipal, type Projection, type Scenario } from "./engine"

export type ResultCode = "funding-gap" | "both-shortfall" | "monthly-shortfall" | "support-cliff" | "support-dependent" | "future-shortfall" | "reserve-breach" | "cash-positive"
export type TrendCode = "crosses" | "narrows" | "widens" | "stays-behind" | "buy-ahead" | "rent-overtakes" | "even"

// These are observations about the supplied scenario, not lending or investment advice.
export function deriveResultGuidance(scenario: Scenario, projection: Projection) {
  const rows = projection.rows
  const first = rows[0]
  const fundingGap = Math.max(0, projection.initialBuyCash - scenario.savings)
  const firstDeficit = rows.find(row => row.buySurplus < 0)
  const reserveBreachAtPurchase = scenario.reserve > 0 && scenario.savings - projection.initialBuyCash < scenario.reserve
  const firstReserveBreach = scenario.reserve > 0 ? rows.find(row => row.buyLiquid < scenario.reserve) : undefined
  const supportEnd = scenario.monthlySupport > 0 && scenario.supportMonths > 0 && scenario.supportMonths < rows.length
    ? rows[scenario.supportMonths] : undefined
  const supportCliff = !!supportEnd && rows[scenario.supportMonths - 1].buySurplus >= 0 && supportEnd.buySurplus < 0
  const supportDependent = scenario.monthlySupport > 0 && scenario.supportMonths > 0 && first.buySurplus >= 0 && first.buySurplus - first.support < 0
  const recovery = rows.find(row => row.m >= scenario.supportMonths && row.buySurplus >= 0 && rows.slice(row.m).every(later => later.buySurplus >= 0))
  const firstGap = first.buySurplus - first.rentSurplus
  const lastGap = rows.at(-1)!.buySurplus - rows.at(-1)!.rentSurplus
  const crossover = firstGap < 0 ? rows.find(row => row.m > 0 && row.buySurplus >= row.rentSurplus && rows.slice(row.m).every(later => later.buySurplus >= later.rentSurplus)) : undefined
  const rentOvertakes = firstGap > 0 ? rows.find(row => row.m > 0 && row.buySurplus < row.rentSurplus && rows.slice(row.m).every(later => later.buySurplus < later.rentSurplus)) : undefined
  const change = lastGap - firstGap
  const materialChange = Math.abs(firstGap) * .1
  const trend: TrendCode = firstGap === 0 ? "even" : firstGap > 0 ? (rentOvertakes ? "rent-overtakes" : "buy-ahead") : crossover ? "crosses" : change > materialChange ? "narrows" : change < -materialChange ? "widens" : "stays-behind"
  const code: ResultCode = fundingGap > 0 ? "funding-gap" : first.buySurplus < 0 && first.rentSurplus < 0 ? "both-shortfall" : first.buySurplus < 0 ? "monthly-shortfall" : supportCliff ? "support-cliff" : supportDependent ? "support-dependent" : firstDeficit ? "future-shortfall" : reserveBreachAtPurchase || firstReserveBreach ? "reserve-breach" : "cash-positive"

  // A controlled price change gives the user one concrete lever without ranking
  // unlike variables or assuming that a cheaper property is available.
  const lowerPrice = withPrincipal({ ...scenario, propertyPrice: scenario.propertyPrice * .9 })
  const lowerPriceMonthlyGain = lowerPrice.downPayment + lowerPrice.upfrontSupport <= lowerPrice.propertyPrice
    ? calculate(lowerPrice).rows[0].buySurplus - first.buySurplus : null
  const cashAfterPurchase = scenario.savings - projection.initialBuyCash
  const extraDownPayment = Math.floor(Math.max(0, Math.min(scenario.principal, cashAfterPurchase - scenario.reserve)))
  const moreDown = extraDownPayment > 0 ? withPrincipal({ ...scenario, downPayment: scenario.downPayment + extraDownPayment }) : null
  const moreDownCash = moreDown ? calculate(moreDown).rows[0].buySurplus : null
  const upfrontSupportMonthlyGain = scenario.upfrontSupport > 0
    ? calculate(withPrincipal({ ...scenario, upfrontSupport: 0 })).payment - projection.payment
    : 0

  return {
    code, trend, fundingGap, firstDeficitMonth: firstDeficit ? firstDeficit.m + 1 : null,
    firstReserveBreachMonth: reserveBreachAtPurchase ? 0 : firstReserveBreach ? firstReserveBreach.m + 1 : null,
    supportCliffMonth: supportCliff ? supportEnd!.m + 1 : null,
    recoveryMonth: recovery ? recovery.m + 1 : null,
    crossoverMonth: crossover ? crossover.m + 1 : null,
    rentOvertakesMonth: rentOvertakes ? rentOvertakes.m + 1 : null,
    monthOneBuyCash: first.buySurplus, monthOneGap: firstGap,
    lowestBuyCash: Math.min(...rows.map(row => row.buySurplus)),
    lowestLiquid: Math.min(projection.buyLiquid, scenario.savings - projection.initialBuyCash, ...rows.map(row => row.buyLiquid)),
    lowerPriceMonthlyGain,
    downPaymentTest: moreDownCash === null ? null : {
      extra: extraDownPayment,
      monthOneCash: moreDownCash,
      monthlyGain: moreDownCash - first.buySurplus,
      cashAfterPurchase: cashAfterPurchase - extraDownPayment,
    },
    cashAfterPurchase,
    upfrontSupportMonthlyGain,
    usesUpfrontSupport: scenario.upfrontSupport > 0,
    usesMonthlySupport: scenario.monthlySupport > 0 && scenario.supportMonths > 0,
    missingOwnerCosts: scenario.ownerCosts === 0,
    missingBuyingCosts: scenario.closingCosts === 0 && scenario.renovation === 0,
  }
}
