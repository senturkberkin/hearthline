import { calculate, effectiveSupportMonths, withPrincipal, type Projection, type Scenario } from "./engine"

export type ResultCode = "funding-gap" | "payment-exceeds-income" | "both-shortfall" | "monthly-shortfall" | "support-cliff" | "support-dependent" | "future-payment-exceeds-income" | "future-shortfall" | "reserve-breach" | "cash-positive"
export type TrendCode = "crosses" | "narrows" | "widens" | "stays-behind" | "buy-ahead" | "rent-overtakes" | "even"
export type ComparisonSummary = {
  state: TrendCode
  firstMonthDifference: number
  finalMonthDifference: number
  transitionMonth: number | null
  buyingHigherThroughout: boolean
  rentingHigherThroughout: boolean
  equalThroughout: boolean
}

export function describeComparisonTakeaway(
  comparison: ComparisonSummary,
  tx: (en: string, tr: string) => string,
  money: (value: number) => string,
) {
  const firstDifference = Math.abs(comparison.firstMonthDifference)
  const lead = comparison.firstMonthDifference > 0
    ? tx(`Buying leaves ${money(firstDifference)} more monthly cash in month one.`, `Ev alımında ilk ay ${money(firstDifference)} daha fazla kalıyor.`)
    : comparison.firstMonthDifference < 0
      ? tx(`Renting leaves ${money(firstDifference)} more monthly cash in month one.`, `Kirada ilk ay ${money(firstDifference)} daha fazla kalıyor.`)
      : tx("Both options leave the same monthly cash in month one.", "İlk ay iki seçenekte de aynı tutar kalıyor.")

  const detail = comparison.state === "crosses"
    ? tx(`From month ${comparison.transitionMonth}, monthly cash left is higher when buying.`, `Ev alımında ${comparison.transitionMonth}. aydan sonra aylık elde kalan tutar daha yüksek.`)
    : comparison.state === "rent-overtakes"
      ? tx(`From month ${comparison.transitionMonth}, monthly cash left is higher when renting.`, `Kirada ${comparison.transitionMonth}. aydan sonra aylık elde kalan tutar daha yüksek.`)
      : comparison.state === "buy-ahead" && comparison.buyingHigherThroughout
        ? tx("Buying leaves more monthly cash throughout the scenario.", "Ev alımında senaryo boyunca aylık elde kalan tutar daha yüksek.")
        : comparison.state === "buy-ahead"
          ? tx("Buying leaves more monthly cash in month one and at the end of the scenario.", "Ev alımında ilk ay ve senaryo sonunda aylık elde kalan tutar daha yüksek.")
          : comparison.state === "narrows"
            ? tx("The monthly cash-left gap narrows over time, but no sustained crossover occurs within the scenario.", "Aylık elde kalan farkı zamanla azalıyor; senaryo içinde kalıcı bir geçiş oluşmuyor.")
            : comparison.state === "widens"
              ? tx("The monthly cash-left gap widens over time.", "Aylık elde kalan farkı zamanla artıyor.")
              : comparison.state === "stays-behind" && comparison.rentingHigherThroughout
                ? tx("Renting leaves more monthly cash throughout the scenario.", "Kirada senaryo boyunca aylık elde kalan tutar daha yüksek.")
                : comparison.state === "stays-behind"
                  ? tx("No sustained crossover occurs within the scenario.", "Senaryo içinde kalıcı bir geçiş oluşmuyor.")
                  : comparison.equalThroughout
                    ? tx("The two monthly cash-flow paths remain equal throughout the scenario.", "İki seçenekte de senaryo boyunca aylık elde kalan tutar aynı.")
                    : comparison.finalMonthDifference > 0
                      ? tx(`By the final month, buying leaves ${money(Math.abs(comparison.finalMonthDifference))} more monthly cash.`, `Son ay ev alımında ${money(Math.abs(comparison.finalMonthDifference))} daha fazla kalıyor.`)
                      : tx(`By the final month, renting leaves ${money(Math.abs(comparison.finalMonthDifference))} more monthly cash.`, `Son ay kirada ${money(Math.abs(comparison.finalMonthDifference))} daha fazla kalıyor.`)

  return { lead, detail }
}

function minimumWorkingValue(start: number, end: number, works: (value: number) => boolean) {
  if (works(start)) return Math.ceil(start)
  if (end <= start || !works(end)) return null
  let low = start, high = end
  for (let step = 0; step < 48; step++) {
    const middle = (low + high) / 2
    if (works(middle)) high = middle
    else low = middle
  }
  return Math.ceil(high)
}

function maximumWorkingValue(start: number, end: number, works: (value: number) => boolean) {
  if (works(end)) return Math.floor(end)
  if (end <= start || !works(start)) return null
  let low = start, high = end
  for (let step = 0; step < 48; step++) {
    const middle = (low + high) / 2
    if (works(middle)) low = middle
    else high = middle
  }
  return Math.floor(low)
}

// These are observations about the supplied scenario, not lending or investment advice.
export function deriveResultGuidance(scenario: Scenario, projection: Projection) {
  const rows = projection.rows
  const first = rows[0]
  const supportMonths = effectiveSupportMonths(scenario)
  const fundingGap = Math.max(0, projection.initialBuyCash - scenario.savings)
  const firstDeficit = rows.find(row => row.buySurplus < 0)
  const futurePaymentGap = rows.find(row => row.m > 0 && row.payment > row.income + row.support)
  const reserveBreachAtPurchase = scenario.reserve > 0 && scenario.savings - projection.initialBuyCash < scenario.reserve
  const firstReserveBreach = scenario.reserve > 0 ? rows.find(row => row.buyLiquid < scenario.reserve) : undefined
  const supportEnd = supportMonths > 0 && supportMonths < rows.length ? rows[supportMonths] : undefined
  const supportCliff = !!supportEnd && rows[supportMonths - 1].buySurplus >= 0 && supportEnd.buySurplus < 0
  const supportDependent = first.support > 0 && first.buySurplus >= 0 && first.buySurplus - first.support < 0
  const recovery = rows.find(row => row.buySurplus - row.support >= 0 && rows.slice(row.m).every(later => later.buySurplus - later.support >= 0))
  const firstGap = first.buySurplus - first.rentSurplus
  const lastGap = rows.at(-1)!.buySurplus - rows.at(-1)!.rentSurplus
  const crossover = firstGap < 0 ? rows.find(row => row.m > 0 && row.buySurplus >= row.rentSurplus && rows.slice(row.m).every(later => later.buySurplus >= later.rentSurplus)) : undefined
  const rentOvertakes = firstGap > 0 ? rows.find(row => row.m > 0 && row.buySurplus < row.rentSurplus && rows.slice(row.m).every(later => later.buySurplus < later.rentSurplus)) : undefined
  const change = lastGap - firstGap
  const materialChange = Math.abs(firstGap) * .1
  const trend: TrendCode = firstGap === 0 ? "even" : firstGap > 0 ? (rentOvertakes ? "rent-overtakes" : "buy-ahead") : crossover ? "crosses" : change > materialChange ? "narrows" : change < -materialChange ? "widens" : "stays-behind"
  const comparison: ComparisonSummary = {
    state: trend,
    firstMonthDifference: firstGap,
    finalMonthDifference: lastGap,
    transitionMonth: crossover ? crossover.m + 1 : rentOvertakes ? rentOvertakes.m + 1 : null,
    buyingHigherThroughout: rows.every(row => row.buySurplus >= row.rentSurplus),
    rentingHigherThroughout: rows.every(row => row.rentSurplus >= row.buySurplus),
    equalThroughout: rows.every(row => row.buySurplus === row.rentSurplus),
  }
  const paymentGap = Math.max(0, first.payment - first.income - first.support)
  const code: ResultCode = fundingGap > 0 ? "funding-gap" : paymentGap > 0 ? "payment-exceeds-income" : first.buySurplus < 0 && first.rentSurplus < 0 ? "both-shortfall" : first.buySurplus < 0 ? "monthly-shortfall" : supportCliff ? "support-cliff" : supportDependent ? "support-dependent" : futurePaymentGap ? "future-payment-exceeds-income" : firstDeficit ? "future-shortfall" : reserveBreachAtPurchase || firstReserveBreach ? "reserve-breach" : "cash-positive"

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
  const maximumDownPayment = scenario.downPayment + extraDownPayment
  const downPaymentToBalance = first.buySurplus < 0 ? minimumWorkingValue(
    scenario.downPayment,
    maximumDownPayment,
    downPayment => calculate(withPrincipal({ ...scenario, downPayment })).rows[0].buySurplus >= 0,
  ) : scenario.downPayment
  const minimumPrice = Math.max(1, scenario.downPayment + scenario.upfrontSupport)
  const homePriceToBalance = first.buySurplus < 0 ? maximumWorkingValue(
    minimumPrice,
    scenario.propertyPrice,
    propertyPrice => calculate(withPrincipal({ ...scenario, propertyPrice })).rows[0].buySurplus >= 0,
  ) : scenario.propertyPrice
  const incomeToBalance = Math.ceil(scenario.income + Math.max(0, -first.buySurplus))

  return {
    code, trend, comparison, fundingGap, paymentGap, supportMonths, firstDeficitMonth: firstDeficit ? firstDeficit.m + 1 : null,
    futurePaymentGapMonth: futurePaymentGap ? futurePaymentGap.m + 1 : null,
    futurePaymentGapAmount: futurePaymentGap ? futurePaymentGap.payment - futurePaymentGap.income - futurePaymentGap.support : 0,
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
    downPaymentToBalance,
    additionalDownPaymentToBalance: downPaymentToBalance === null ? null : Math.max(0, downPaymentToBalance - scenario.downPayment),
    homePriceToBalance,
    homePriceReductionToBalance: homePriceToBalance === null ? null : Math.max(0, scenario.propertyPrice - homePriceToBalance),
    incomeToBalance,
    incomeIncreaseToBalance: Math.max(0, incomeToBalance - scenario.income),
    upfrontSupportMonthlyGain,
    usesUpfrontSupport: scenario.upfrontSupport > 0,
    usesMonthlySupport: first.support > 0,
    missingOwnerCosts: scenario.ownerCosts === 0,
    missingBuyingCosts: scenario.closingCosts === 0 && scenario.renovation === 0,
  }
}
