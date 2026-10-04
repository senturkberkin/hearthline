import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('../design-preview/node_modules/typescript');
function transpile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
}
const engineUrl = `data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/engine.ts')).toString('base64')}`;
const engine = await import(engineUrl);
const guidanceUrl = `data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/result-guidance.ts').replace('from "./engine"', `from "${engineUrl}"`)).toString('base64')}`;
const {deriveResultGuidance} = await import(guidanceUrl);

const facts = {income:90000,rent:30000,livingCosts:20000,savings:600000,propertyPrice:4000000};
function result(overrides = {}) {
  const scenario = engine.withPrincipal({...engine.scenarioFromFacts(facts),downPayment:500000,rate:2, ...overrides});
  return {scenario, guidance:deriveResultGuidance(scenario,engine.calculate(scenario))};
}

test('G01 upfront funding gap outranks monthly cash flow', () => {
  const {guidance} = result({savings:100000});
  assert.equal(guidance.code,'funding-gap');
  assert.equal(guidance.fundingGap,400000);
});
test('G02 negative month-one buying cash is a monthly shortfall', () => {
  const {guidance} = result({income:95000});
  assert.equal(guidance.code,'monthly-shortfall');
  assert.equal(guidance.firstDeficitMonth,1);
});
test('G03 temporary monthly support can mask a post-support deficit', () => {
  const {guidance} = result({monthlySupport:20000,supportMonths:6});
  assert.equal(guidance.code,'support-cliff');
  assert.equal(guidance.supportCliffMonth,7);
});
test('G04 support lasting the full horizon is still disclosed as dependence', () => {
  const {guidance} = result({monthlySupport:20000,supportMonths:120});
  assert.equal(guidance.code,'support-dependent');
  assert.equal(guidance.supportCliffMonth,null);
});
test('G05 a later expense-driven deficit is not called affordable', () => {
  const {guidance} = result({propertyPrice:1000000,expenseGrowth:150});
  assert.equal(guidance.code,'future-shortfall');
  assert.ok(guidance.firstDeficitMonth > 1);
});
test('G06 reserve breach is identified even when monthly cash stays positive', () => {
  const {guidance} = result({propertyPrice:1000000,downPayment:500000,reserve:550000});
  assert.equal(guidance.code,'reserve-breach');
  assert.notEqual(guidance.firstReserveBreachMonth,null);
});
test('G07 positive cash flow without higher-priority risks has a neutral code', () => {
  const {guidance} = result({propertyPrice:1000000,downPayment:500000,reserve:100000});
  assert.equal(guidance.code,'cash-positive');
});
test('G08 crossing refers only to sustained monthly cash-flow lead', () => {
  const {guidance} = result({propertyPrice:2000000,rentGrowth:50});
  assert.equal(guidance.trend,'crosses');
  assert.ok(guidance.crossoverMonth > 1);
});
test('G09 narrowing gap without crossing does not become a crossover', () => {
  const {guidance} = result({horizon:2,rentGrowth:20});
  assert.equal(guidance.trend,'narrows');
  assert.equal(guidance.crossoverMonth,null);
});
test('G10 support expiry can widen the monthly gap', () => {
  const {guidance} = result({monthlySupport:20000,supportMonths:6,rentGrowth:0});
  assert.equal(guidance.trend,'widens');
});
test('G11 one-time support is flagged separately from later monthly independence', () => {
  const {guidance} = result({upfrontSupport:250000});
  assert.equal(guidance.usesUpfrontSupport,true);
});
test('G12 zero purchase and ownership costs trigger assumption checks', () => {
  const {guidance} = result();
  assert.equal(guidance.missingOwnerCosts,true);
  assert.equal(guidance.missingBuyingCosts,true);
});
test('G13 price lever changes the modeled first-month cash in the right direction', () => {
  const {guidance} = result();
  assert.ok(guidance.lowerPriceMonthlyGain > 0);
});
test('G14 both paths in deficit are not framed as a buy-only issue', () => {
  const {guidance} = result({income:30000,propertyPrice:1000000});
  assert.equal(guidance.code,'both-shortfall');
});
test('G15 detects when renting gains a sustained monthly lead', () => {
  const {guidance} = result({propertyPrice:2000000,monthlySupport:10000,supportMonths:6});
  assert.equal(guidance.trend,'rent-overtakes');
  assert.equal(guidance.rentOvertakesMonth,7);
});
test('G16 reserve use at signing counts even if month-one income restores it', () => {
  const {guidance} = result({propertyPrice:1000000,downPayment:500000,reserve:150000,income:500000});
  assert.equal(guidance.code,'reserve-breach');
  assert.equal(guidance.firstReserveBreachMonth,0);
});
test('G17 price lever does not use an impossible down-payment combination', () => {
  const {guidance} = result({propertyPrice:1000000,downPayment:950000,savings:1000000});
  assert.equal(guidance.lowerPriceMonthlyGain,null);
});
test('G18 one-time family help and spare savings produce a quantified down-payment test', () => {
  const {scenario,guidance} = result({income:75000,savings:800000,downPayment:300000,upfrontSupport:250000});
  assert.equal(guidance.code,'payment-exceeds-income');
  assert.equal(guidance.downPaymentTest.extra,350000);
  assert.equal(guidance.downPaymentTest.cashAfterPurchase,scenario.reserve);
  assert.ok(guidance.downPaymentTest.monthlyGain > 0);
  assert.ok(guidance.upfrontSupportMonthlyGain > 0);
});
test('G19 no down-payment test is proposed when it would consume the chosen reserve', () => {
  const {guidance} = result({income:75000,upfrontSupport:250000});
  assert.equal(guidance.downPaymentTest,null);
  assert.equal(guidance.cashAfterPurchase,100000);
});
test('G20 a down-payment test can change the conclusion when it closes the monthly gap', () => {
  const {scenario,guidance} = result({income:95000,savings:800000,downPayment:300000,upfrontSupport:250000});
  assert.equal(guidance.code,'monthly-shortfall');
  const tried=engine.withPrincipal({...scenario,downPayment:scenario.downPayment+guidance.downPaymentTest.extra});
  assert.ok(guidance.downPaymentTest.monthOneCash >= 0);
  assert.equal(deriveResultGuidance(tried,engine.calculate(tried)).code,'cash-positive');
});
test('G21 mortgage payment above income has a distinct result, even when renting is also short', () => {
  const {scenario,guidance} = result({income:40000,propertyPrice:9000000});
  const projection=engine.calculate(scenario);
  assert.equal(guidance.code,'payment-exceeds-income');
  assert.ok(guidance.paymentGap > 0);
  assert.equal(guidance.paymentGap,projection.rows[0].payment-projection.rows[0].income);
  assert.equal(guidance.recoveryMonth,null);
});
test('G22 exact income/payment boundary is not falsely called payment-exceeds-income', () => {
  const {scenario}=result({livingCosts:0});
  const payment=engine.calculate(scenario).payment;
  const exact=engine.withPrincipal({...scenario,income:payment});
  const above=engine.withPrincipal({...scenario,income:payment-0.01});
  assert.notEqual(deriveResultGuidance(exact,engine.calculate(exact)).code,'payment-exceeds-income');
  assert.equal(deriveResultGuidance(above,engine.calculate(above)).code,'payment-exceeds-income');
});
test('G23 monthly support defaults to loan term and is capped at the instalment', () => {
  const {scenario}=result({propertyPrice:1000000,monthlySupport:1000000,supportMonths:0,termYears:2,horizon:3});
  const projection=engine.calculate(scenario);
  assert.equal(engine.effectiveSupportMonths(scenario),24);
  assert.equal(projection.rows[0].support,projection.rows[0].payment);
  assert.equal(projection.rows[23].support,projection.rows[23].payment);
  assert.equal(projection.rows[24].support,0);
});
test('G24 earlier end month is an exception; support disappears at its boundary', () => {
  const {scenario}=result({propertyPrice:1000000,monthlySupport:10000,supportMonths:6});
  const projection=engine.calculate(scenario);
  assert.equal(projection.rows[5].support,10000);
  assert.equal(projection.rows[6].support,0);
});
test('G25 repeated lower-price tests move through payment gap, general budget gap and positive buying cash', () => {
  let scenario=engine.withPrincipal({...engine.scenarioFromFacts({income:40000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000}),incomeGrowth:20,rentGrowth:6});
  const codes=[];
  for (let i=0;i<=14;i++) {
    codes.push(deriveResultGuidance(scenario,engine.calculate(scenario)).code);
    scenario=engine.withPrincipal({...scenario,propertyPrice:Math.round(scenario.propertyPrice*.9)});
  }
  assert.equal(codes[0],'payment-exceeds-income');
  assert.equal(codes[7],'payment-exceeds-income');
  assert.equal(codes[8],'both-shortfall');
  assert.equal(codes[14],'cash-positive');
});
test('G26 a later mortgage-payment gap has its own result', () => {
  const {guidance}=result({income:120000,incomeGrowth:-80});
  assert.equal(guidance.code,'future-payment-exceeds-income');
  assert.equal(guidance.futurePaymentGapMonth,13);
  assert.ok(guidance.futurePaymentGapAmount > 0);
});
