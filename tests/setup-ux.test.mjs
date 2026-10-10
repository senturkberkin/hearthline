import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const setup=readFileSync(new URL('../design-preview/src/pages/setup.tsx',import.meta.url),'utf8');
const fieldInfo=readFileSync(new URL('../design-preview/src/components/product/field-info.tsx',import.meta.url),'utf8');

test('S01 setup asks for present-day facts before home and future assumptions',()=>{
  assert.match(setup,/tx\("Today", "Bugün"\).*tx\("The home", "Ev"\).*tx\("Future assumptions", "Gelecek"\)/s);
  const today=setup.indexOf('id="current-income"');
  const home=setup.indexOf('id="home-price"');
  const future=setup.indexOf('id="income-growth"');
  assert.ok(today>=0 && home>today && future>home);
  assert.match(setup,/id="current-rent"/);
  assert.match(setup,/id="living-costs"/);
  assert.match(setup,/id="savings"/);
});

test('S02 field explanations reuse an accessible popover with a mobile-safe width',()=>{
  assert.match(fieldInfo,/PopoverTrigger asChild/);
  assert.match(fieldInfo,/aria-label=\{label\}/);
  assert.match(fieldInfo,/w-\[min\(290px,calc\(100vw-32px\)\)\]/);
  assert.doesNotMatch(fieldInfo,/Tooltip/);
});

test('S03 known next rent remains calculation-only until explicitly applied',()=>{
  assert.match(setup,/id="next-rent"[\s\S]*?onValueChange=\{setNextRent\}/);
  assert.match(setup,/tx\("Use this increase", "Bu artışı kullan"\)/);
  assert.match(setup,/onClick=\{\(\) => update\(\{ rentGrowth: Math\.round\(observedRentRise \* 10\) \/ 10 \}\)\}/);
  assert.match(setup,/The scenario still uses.*until you apply this increase/);
});

test('S04 navigation says what comes next in both languages',()=>{
  assert.match(setup,/tx\("Continue to the home", "Ev bilgilerine geç"\)/);
  assert.match(setup,/tx\("Continue to assumptions", "Varsayımlara geç"\)/);
  assert.match(setup,/tx\("See results", "Sonuçları gör"\)/);
});

test('S05 mobile context and active mortgage assumptions stay visible',()=>{
  assert.match(setup,/lg:hidden.*Entered values.*Girilen bilgiler/s);
  assert.match(setup,/tx\("Loan assumption", "Kredi varsayımı"\)/);
  assert.match(setup,/percent\(draft\.rate, 2\)/);
  assert.match(setup,/Additional buying costs.*Ek alım giderleri/);
});

test('S06 obvious fields remain explanation-free while high-risk fields are explained',()=>{
  assert.match(setup,/id="current-rent" label=\{tx\("Current monthly rent", "Güncel aylık kira"\)\}/);
  assert.match(setup,/id="home-price" label=\{tx\("Home price", "Ev fiyatı"\)\}/);
  assert.match(setup,/htmlFor="loan-term">\{tx\("Mortgage term \(years\)", "Kredi vadesi \(yıl\)"\)\}/);
  assert.match(setup,/Konut kredisi faiz oranı hakkında/);
  assert.match(setup,/Düzenli giderlere neleri eklemeli\?/);
});

test('S07 year fields can be cleared while someone replaces their value',()=>{
  assert.match(setup,/function IntegerInput/);
  assert.match(setup,/if \(raw === ""\) return/);
  assert.match(setup,/if \(text === ""\) \{ setText\(String\(value\)\); return \}/);
  assert.match(setup,/<IntegerInput id="loan-term" value=\{draft\.termYears\}/);
  assert.match(setup,/<IntegerInput id="horizon" value=\{draft\.horizon\}/);
});
