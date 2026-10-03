import type { Scenario } from "./engine"

export function downPaymentAllocation(scenario: Scenario) {
  const limit = Math.max(0, Math.min(scenario.savings, scenario.propertyPrice - scenario.upfrontSupport))
  const remaining = scenario.savings - scenario.downPayment
  const suggestedReserve = Math.max(0, 3 * (scenario.rent + scenario.livingCosts))
  return {
    limit,
    remaining,
    suggestedReserve,
    share: scenario.savings > 0 ? scenario.downPayment / scenario.savings * 100 : 0,
    outsideLimit: scenario.downPayment < 0 || scenario.downPayment > limit,
    belowSuggestedReserve: remaining < suggestedReserve,
  }
}
