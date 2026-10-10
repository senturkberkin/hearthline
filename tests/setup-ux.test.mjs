import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const setup=readFileSync(new URL('../design-preview/src/pages/setup.tsx',import.meta.url),'utf8');
const fieldInfo=readFileSync(new URL('../design-preview/src/components/product/field-info.tsx',import.meta.url),'utf8');
const financialInput=readFileSync(new URL('../design-preview/src/components/product/financial-input.tsx',import.meta.url),'utf8');
const home=readFileSync(new URL('../design-preview/src/pages/home.tsx',import.meta.url),'utf8');
const monthPicker=readFileSync(new URL('../design-preview/src/components/product/month-picker.tsx',import.meta.url),'utf8');
const futureAssumptions=readFileSync(new URL('../design-preview/src/components/product/future-assumptions.tsx',import.meta.url),'utf8');
const incomeHistory=readFileSync(new URL('../design-preview/src/components/product/income-history-calculator.tsx',import.meta.url),'utf8');
const integerInput=readFileSync(new URL('../design-preview/src/components/product/integer-input.tsx',import.meta.url),'utf8');

test('S01 setup asks for present-day facts before home and future assumptions',()=>{
  assert.match(setup,/tx\("Today", "Bugün"\).*tx\("The home", "Ev"\).*tx\("Future assumptions", "Gelecek"\)/s);
  const today=setup.indexOf('id="current-income"');
  const home=setup.indexOf('id="home-price"');
  const future=setup.indexOf('<FutureAssumptions');
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
  assert.match(futureAssumptions,/id="next-rent"[\s\S]*?onValueChange=\{setNextRent\}/);
  assert.match(futureAssumptions,/tx\("Use this increase", "Bu artışı kullan"\)/);
  assert.match(futureAssumptions,/onClick=\{\(\) => update\(\{ rentGrowth: Math\.round\(impliedRentGrowth \* 10\) \/ 10 \}\)\}/);
  assert.match(futureAssumptions,/tx\("Implied annual change", "Hesaplanan yıllık değişim"\)/);
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
  assert.match(integerInput,/function IntegerInput/);
  assert.match(integerInput,/if \(raw === ""\) return/);
  assert.match(integerInput,/if \(text === ""\) \{ setText\(String\(value\)\); return \}/);
  assert.match(setup,/<IntegerInput id="loan-term" value=\{draft\.termYears\}/);
  assert.match(futureAssumptions,/<IntegerInput id="horizon" value=\{scenario\.horizon\}/);
});

test('S08 aligned labels and methodology links do not leave the user on the results view',()=>{
  assert.match(financialInput,/min-h-7 items-center text-\[12px\]/);
  assert.match(setup,/mt-7 grid gap-5 sm:grid-cols-2 sm:items-end/);
  assert.match(home,/window\.location\.hash\.slice\(1\)/);
  assert.match(home,/document\.getElementById\(id\)\?\.scrollIntoView\(\)/);
});

test('S09 month selection uses a compact native control in narrow assumption columns',()=>{
  assert.match(monthPicker,/<select value=\{value\}/);
  assert.match(monthPicker,/Array\.from\(\{ length: 12 \}/);
  assert.doesNotMatch(monthPicker,/ToggleGroup/);
});

test('S10 future assumptions use human questions with one conditional detail per choice',()=>{
  assert.match(futureAssumptions,/How should your income change over time\?.*Gelirin zaman içinde nasıl değişsin\?/);
  assert.match(futureAssumptions,/How should your rent change over time\?.*Kiran zaman içinde nasıl değişsin\?/);
  assert.match(futureAssumptions,/Should your regular expenses change over time\?.*Düzenli giderlerin zaman içinde değişsin mi\?/);
  assert.match(futureAssumptions,/incomeMode === "annual"/);
  assert.match(futureAssumptions,/incomeMode === "history"/);
  assert.match(futureAssumptions,/rentMode === "next"/);
  assert.match(futureAssumptions,/rentMode === "annual"/);
  assert.match(futureAssumptions,/expenseMode === "annual"/);
  assert.match(futureAssumptions,/tx\("More assumptions", "Diğer varsayımlar"\)/);
  assert.match(futureAssumptions,/<SupportInputs scenario=\{scenario\} update=\{update\}/);
  assert.doesNotMatch(incomeHistory,/Collapsible/);
  assert.equal((futureAssumptions.match(/<Collapsible className=/g) ?? []).length,1);
});
