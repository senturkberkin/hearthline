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
const futureAssumptions=readFileSync(new URL('../design-preview/src/components/product/future-assumptions.tsx',import.meta.url),'utf8');
const integerInput=readFileSync(new URL('../design-preview/src/components/product/integer-input.tsx',import.meta.url),'utf8');
const rentReference=JSON.parse(readFileSync(new URL('../rent-reference.json',import.meta.url),'utf8'));
const publicRentReference=JSON.parse(readFileSync(new URL('../design-preview/public/rent-reference.json',import.meta.url),'utf8'));
const wageReference=JSON.parse(readFileSync(new URL('../design-preview/public/minimum-wage-reference.json',import.meta.url),'utf8'));
const rentWorkflow=readFileSync(new URL('../.github/workflows/refresh-rent-reference.yml',import.meta.url),'utf8');
const main=readFileSync(new URL('../design-preview/src/main.tsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../design-preview/src/index.css',import.meta.url),'utf8');

test('S01 setup asks for present-day facts before home and future assumptions',()=>{
  assert.match(setup,/tx\("Today", "Bugün"\).*tx\("The home", "Ev"\).*tx\("Future assumptions", "Gelecek"\)/s);
  const today=setup.indexOf('id="current-income"');
  const home=setup.indexOf('id="home-price"');
  const future=setup.indexOf('<FutureAssumptions');
  assert.ok(today>=0 && home>today && future>home);
  assert.match(futureAssumptions,/id="income-growth"/);
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
  assert.match(rentGrowth,/tx\("Implied annual increase", "Hesaplanan artış oranı"\)/);
});

test('S04 navigation says what comes next in both languages',()=>{
  assert.match(setup,/tx\("Continue to the home", "Ev bilgilerine geç"\)/);
  assert.match(setup,/tx\("Continue to assumptions", "Varsayımlara geç"\)/);
  assert.match(setup,/tx\("See results", "Sonuçları gör"\)/);
});

test('S05 mobile context and active mortgage assumptions stay visible',()=>{
  assert.match(setup,/lg:hidden.*Entered values.*Girilen bilgiler/s);
  assert.match(setup,/tx\("Loan assumption", "Kredi varsayımı"\)/);
  assert.match(setup,/id="rate"/);
  assert.match(setup,/id="loan-term"/);
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

test('S10 future assumptions use a stable overview and one focused responsive editor',()=>{
  assert.match(futureAssumptions,/type FutureEditor = "income" \| "rent" \| "expenses" \| "other"/);
  assert.match(futureAssumptions,/const \[active, setActive\] = React\.useState<FutureEditor \| null>\(null\)/);
  assert.equal((futureAssumptions.match(/<AssumptionChoice/g) || []).length,3);
  assert.match(futureAssumptions,/<PlanningChoice/);
  assert.match(futureAssumptions,/setActive\("income"\)/);
  assert.match(futureAssumptions,/setActive\("rent"\)/);
  assert.match(futureAssumptions,/setActive\("expenses"\)/);
  assert.match(futureAssumptions,/setActive\("other"\)/);
  assert.match(futureAssumptions,/DialogPrimitive\.Content className="assumption-editor-panel/);
  assert.match(futureAssumptions,/id="income-growth"[\s\S]*?<MonthPicker value=\{scenario\.raiseMonth\}/);
  assert.match(futureAssumptions,/id="rent-growth"[\s\S]*?<MonthPicker value=\{scenario\.rentRenewal\}/);
  assert.match(futureAssumptions,/Annual scenario assumptions—not forecasts/);
  assert.match(futureAssumptions,/Yıllık senaryo varsayımlarıdır; tahmin değildir/);
  assert.match(styles,/assumption-editor-panel\[data-state="open"\]/);
  assert.doesNotMatch(futureAssumptions,/AssumptionFieldLabel/);
  assert.match(incomeHistory,/DialogPrimitive\.Content/);
  assert.match(rentGrowth,/DialogPrimitive\.Content/);
  assert.doesNotMatch(incomeHistory,/Collapsible/);
  assert.doesNotMatch(rentGrowth,/Collapsible/);
});

test('S11 official growth shortcuts are dated, click-to-apply and kept current',()=>{
  assert.match(futureAssumptions,/<MinimumWageGrowthAction onUse=\{incomeGrowth => update\(\{ incomeGrowth \}\)\}/);
  assert.match(futureAssumptions,/<RentCeilingGrowthAction onUse=\{rentGrowth => update\(\{ rentGrowth \}\)\}/);
  assert.match(growthReferences,/\$\{data\.period\} minimum-wage increase.*\$\{data\.period\} asgari ücret artışı/);
  assert.match(growthReferences,/Rent ceiling.*Kira artış üst sınırı/);
  assert.doesNotMatch(growthReferences,/Applied every year in this scenario; not a forecast/);
  assert.doesNotMatch(growthReferences,/Bu senaryoda her yıl uygulanır; tahmin değildir/);
  assert.doesNotMatch(growthReferences,/Apply official preset|Resmî oranı uygula/);
  assert.match(growthReferences,/border border-primary\/30 bg-primary/);
  assert.match(growthReferences,/disabled=\{loading \|\| unavailableOrStale\}/);
  assert.match(growthReferences,/<a href=\{sourceUrl\}/);
  assert.equal(wageReference.percentage,27.01);
  assert.match(wageReference.sourceUrl,/^https:\/\/(www\.)?csgb\.gov\.tr\//);
  assert.deepEqual(publicRentReference,rentReference);
  assert.match(rentWorkflow,/git add rent-reference\.json design-preview\/public\/rent-reference\.json/);
});

test('S12 growth inputs expose the strict lower boundary and explain rejected values',()=>{
  for (const id of ['income-growth','rent-growth','expense-growth']) {
    assert.match(futureAssumptions,new RegExp(`id="${id}"[\\s\\S]*?min=\\{-99\\.9\\}`));
  }
  assert.match(futureAssumptions,/Annual changes must be greater than −100%/);
  assert.match(futureAssumptions,/Artış oranları −%100'den büyük olmalı/);
  assert.match(futureAssumptions,/Yıllık gelir artış oranı/);
  assert.match(futureAssumptions,/Yıllık kira artış oranı/);
  assert.match(futureAssumptions,/Gider artış oranı/);
});

test('S13 monthly support is visibly capped by the current mortgage payment',()=>{
  const support=readFileSync(new URL('../design-preview/src/components/product/support-inputs.tsx',import.meta.url),'utf8');
  assert.match(support,/const payment = monthlySupportLimit\(scenario\)/);
  assert.match(support,/max=\{payment\}/);
  assert.match(support,/disabled=\{payment <= 0\}/);
  assert.match(support,/Monthly support cannot exceed the mortgage payment/);
  assert.match(support,/Aylık destek kredi taksitini aşamaz/);
});

test('S14 a fresh direct results visit redirects instead of presenting the demo as personal',()=>{
  assert.match(main,/function ResultsRoute\(\)/);
  assert.match(main,/if \(isExample\) window\.location\.replace\(sitePath\("\/setup\/"\)\)/);
  assert.match(main,/path\.endsWith\("\/results"\) \? <ResultsRoute \/>/);
});

test('S15 print media uses the dedicated light report palette even when the app is dark',()=>{
  assert.match(styles,/@media print \{[\s\S]*?html\.dark \.report-page \{[\s\S]*?--report-page: #fff;[\s\S]*?color-scheme: light;/);
  assert.match(styles,/@media print \{[\s\S]*?\.report-logo-light \{ display: block !important; \}/);
  assert.match(styles,/@media print \{[\s\S]*?\.report-logo-dark \{ display: none !important; \}/);
});
