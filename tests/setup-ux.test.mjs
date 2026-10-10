import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const setup=readFileSync(new URL('../design-preview/src/pages/setup.tsx',import.meta.url),'utf8');
const fieldInfo=readFileSync(new URL('../design-preview/src/components/product/field-info.tsx',import.meta.url),'utf8');
const financialInput=readFileSync(new URL('../design-preview/src/components/product/financial-input.tsx',import.meta.url),'utf8');
const home=readFileSync(new URL('../design-preview/src/pages/home.tsx',import.meta.url),'utf8');
const monthPicker=readFileSync(new URL('../design-preview/src/components/product/month-picker.tsx',import.meta.url),'utf8');
const incomeHistory=readFileSync(new URL('../design-preview/src/components/product/income-history-calculator.tsx',import.meta.url),'utf8');
const rentGrowth=readFileSync(new URL('../design-preview/src/components/product/rent-growth-calculator.tsx',import.meta.url),'utf8');
const growthReferences=readFileSync(new URL('../design-preview/src/components/product/growth-reference-action.tsx',import.meta.url),'utf8');
const rentReference=JSON.parse(readFileSync(new URL('../rent-reference.json',import.meta.url),'utf8'));
const publicRentReference=JSON.parse(readFileSync(new URL('../design-preview/public/rent-reference.json',import.meta.url),'utf8'));
const wageReference=JSON.parse(readFileSync(new URL('../design-preview/public/minimum-wage-reference.json',import.meta.url),'utf8'));
const rentWorkflow=readFileSync(new URL('../.github/workflows/refresh-rent-reference.yml',import.meta.url),'utf8');

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
  assert.match(rentGrowth,/id="next-rent"[\s\S]*?onValueChange=\{setNextRent\}/);
  assert.match(rentGrowth,/tx\("Use this increase", "Bu artışı kullan"\)/);
  assert.match(rentGrowth,/onApply\(Math\.round\(impliedGrowth \* 10\) \/ 10\)/);
  assert.match(rentGrowth,/tx\("Implied annual increase", "Hesaplanan yıllık artış"\)/);
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

test('S10 growth cards keep months visible and move optional calculators out of the card flow',()=>{
  assert.match(setup,/id="income-growth"[\s\S]*?<MonthPicker value=\{draft\.raiseMonth\}/);
  assert.match(setup,/id="rent-growth"[\s\S]*?<MonthPicker value=\{draft\.rentRenewal\}/);
  assert.match(incomeHistory,/DialogPrimitive\.Content/);
  assert.match(rentGrowth,/DialogPrimitive\.Content/);
  assert.doesNotMatch(incomeHistory,/Collapsible/);
  assert.doesNotMatch(rentGrowth,/Collapsible/);
});

test('S11 official growth shortcuts are dated, click-to-apply and kept current',()=>{
  assert.match(setup,/<MinimumWageGrowthAction onUse=\{incomeGrowth => update\(\{ incomeGrowth \}\)\}/);
  assert.match(setup,/<RentCeilingGrowthAction onUse=\{rentGrowth => update\(\{ rentGrowth \}\)\}/);
  assert.match(growthReferences,/Use latest minimum-wage increase.*Son asgari ücret zammını kullan/);
  assert.match(growthReferences,/Use current rent increase ceiling.*Güncel kira artış üst sınırını kullan/);
  assert.match(growthReferences,/disabled=\{loading \|\| !sourceUrl \|\| stale\}/);
  assert.equal(wageReference.percentage,27.01);
  assert.match(wageReference.sourceUrl,/^https:\/\/(www\.)?csgb\.gov\.tr\//);
  assert.deepEqual(publicRentReference,rentReference);
  assert.match(rentWorkflow,/git add rent-reference\.json design-preview\/public\/rent-reference\.json/);
});
