import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('../design-preview/node_modules/typescript');
function loadTs(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
const {downPaymentAllocation} = await loadTs('../design-preview/src/lib/down-payment-allocation.ts');
const engine = await loadTs('../design-preview/src/lib/engine.ts');
const base = {savings:500000,downPayment:350000,propertyPrice:4500000,upfrontSupport:0,rent:28000,livingCosts:22000};

test('A01 starting allocation shows the chosen share and savings left', () => {
  assert.deepEqual(downPaymentAllocation(base), {
    limit:500000,remaining:150000,suggestedReserve:150000,share:70,
    outsideLimit:false,belowSuggestedReserve:false,
  });
});
test('A02 reserve boundary: exact amount is not warned, one lira below is warned', () => {
  assert.equal(downPaymentAllocation({...base,downPayment:350000}).belowSuggestedReserve,false);
  assert.equal(downPaymentAllocation({...base,downPayment:350001}).belowSuggestedReserve,true);
});
test('A03 slider bounds include zero and all available savings', () => {
  assert.equal(downPaymentAllocation({...base,downPayment:0}).outsideLimit,false);
  assert.equal(downPaymentAllocation({...base,downPayment:500000}).outsideLimit,false);
  assert.equal(downPaymentAllocation({...base,downPayment:-1}).outsideLimit,true);
  assert.equal(downPaymentAllocation({...base,downPayment:500001}).outsideLimit,true);
});
test('A04 home price and outside support can lower the available maximum', () => {
  const scenario={...base,propertyPrice:300000,upfrontSupport:50000};
  assert.equal(downPaymentAllocation({...scenario,downPayment:250000}).limit,250000);
  assert.equal(downPaymentAllocation({...scenario,downPayment:250000}).outsideLimit,false);
  assert.equal(downPaymentAllocation({...scenario,downPayment:250001}).outsideLimit,true);
});
test('A05 zero savings leaves no amount to allocate', () => {
  const summary=downPaymentAllocation({...base,savings:0,downPayment:0});
  assert.equal(summary.limit,0);
  assert.equal(summary.share,0);
  assert.equal(summary.remaining,0);
});
test('A06 allocating more savings reduces the existing engine loan and payment', () => {
  const facts={income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000};
  const scenario=engine.scenarioFromFacts(facts);
  const smaller=engine.withPrincipal({...scenario,downPayment:250000});
  const larger=engine.withPrincipal({...scenario,downPayment:350000});
  assert.equal(larger.principal,smaller.principal-100000);
  assert.ok(engine.calculate(larger).payment < engine.calculate(smaller).payment);
});
