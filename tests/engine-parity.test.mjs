import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('../design-preview/node_modules/typescript');
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const oldCode = source.slice(source.indexOf('function scenarioFromFacts('), source.indexOf('function formatInput('));
const legacy = vm.runInNewContext(`${oldCode}; ({scenarioFromFacts,monthlyPayment,calculate,annualize,independentMonth})`);
const engineSource = readFileSync(new URL('../design-preview/src/lib/engine.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(engineSource, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const current = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

function check(facts, overrides = {}) {
  const oldScenario = {...legacy.scenarioFromFacts(facts), ...overrides};
  const newScenario = {...current.scenarioFromFacts(facts), ...overrides};
  assert.equal(newScenario.principal, oldScenario.principal);
  const oldResult = legacy.calculate(oldScenario);
  const newResult = current.calculate(newScenario);
  assert.deepEqual(JSON.parse(JSON.stringify(newResult)), JSON.parse(JSON.stringify(oldResult)));
  assert.deepEqual(JSON.parse(JSON.stringify(current.annualize(newResult.rows))), JSON.parse(JSON.stringify(legacy.annualize(oldResult.rows))));
  // Support-independent serviceability intentionally no longer waits for help to expire.
  if (!overrides.monthlySupport) assert.equal(current.independentMonth(newScenario,newResult),legacy.independentMonth(oldScenario,oldResult));
}

test('React engine matches the unchanged legacy engine across representative scenarios', () => {
  const facts={income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000};
  check(facts);
  check(facts,{incomeGrowth:8,rentGrowth:6,expenseGrowth:4,raiseMonth:5,rentRenewal:9});
  check(facts,{rate:0,monthlySupport:15000,supportMonths:24,upfrontSupport:100000,principal:4050000});
  check(facts,{rateMode:'annual',rate:18,termYears:15,horizon:15,ownerCosts:24000,debt:5000});
});

test('changing the down payment changes loan, payment, and monthly affordability without changing formulas', () => {
  const base = {...current.scenarioFromFacts({income:75000,rent:28000,livingCosts:22000,savings:1200000,propertyPrice:4500000}),incomeGrowth:8,rentGrowth:6};
  const smaller = current.withPrincipal({...base,downPayment:350000});
  const larger = current.withPrincipal({...base,downPayment:1000000});
  const before = current.calculate(smaller);
  const after = current.calculate(larger);
  assert.equal(smaller.principal,4150000);
  assert.equal(larger.principal,3500000);
  assert.ok(after.payment < before.payment);
  assert.ok(after.rows[0].buySurplus > before.rows[0].buySurplus);
  assert.ok(current.independentMonth(larger,after) < current.independentMonth(smaller,before));
  assert.equal(current.validateScenario(larger),null);
  assert.equal(current.validateScenario({...larger,savings:500000}),'savings');
});

test('annual growth in other monthly expenses affects both housing paths', () => {
  const base = current.scenarioFromFacts({income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000});
  const flat = current.calculate(base);
  const growing = current.calculate({...base,expenseGrowth:10});
  assert.equal(growing.rows[0].rentSurplus,flat.rows[0].rentSurplus);
  assert.equal(growing.rows[11].buySurplus,flat.rows[11].buySurplus);
  assert.ok(Math.abs(growing.rows[12].rentSurplus-(flat.rows[12].rentSurplus-2200))<0.01);
  assert.ok(Math.abs(growing.rows[12].buySurplus-(flat.rows[12].buySurplus-2200))<0.01);
  assert.ok(Math.abs(growing.rows[24].rentSurplus-(flat.rows[24].rentSurplus-4620))<0.01);
});

test('E01 full-term help does not hide a budget that works independently from month one', () => {
  const scenario=current.withPrincipal({...current.scenarioFromFacts({income:90000,rent:30000,livingCosts:20000,savings:600000,propertyPrice:1000000}),monthlySupport:10000,supportMonths:0});
  const projection=current.calculate(scenario);
  assert.ok(projection.rows[0].buySurplus-projection.rows[0].support > 0);
  assert.equal(current.independentMonth(scenario,projection),1);
});

test('E02 payment remains finite at an extreme finite rate', () => {
  assert.equal(current.monthlyPayment(1000000,1000,120),1000000000);
  assert.ok(Number.isFinite(current.monthlyPayment(1000000,1e-17,120)));
});

test('E03 validation rejects invalid optional values and unbounded projection lengths', () => {
  const base=current.scenarioFromFacts({income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000});
  assert.equal(current.validateScenario({...base,upfrontSupport:NaN}),'invalid');
  assert.equal(current.validateScenario({...base,horizon:1000000}),'range');
  assert.equal(current.validateScenario({...base,termYears:41}),'range');
  assert.equal(current.validateScenario({...base,horizon:40,termYears:40}),null);
  assert.equal(current.validateScenario({...base,rate:100}),null);
  assert.equal(current.validateScenario({...base,rate:100.01}),'range');
});
