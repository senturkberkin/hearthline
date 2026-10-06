import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ts=require('../design-preview/node_modules/typescript');
const transpile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const engineUrl=`data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/engine.ts')).toString('base64')}`;
const guidanceUrl=`data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/result-guidance.ts').replace('from "./engine"',`from "${engineUrl}"`)).toString('base64')}`;
const modelUrl=`data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/report-model.ts').replace('from "./engine"',`from "${engineUrl}"`).replace('from "./result-guidance"',`from "${guidanceUrl}"`)).toString('base64')}`;
const engine=await import(engineUrl);
const {buildReportModel}=await import(modelUrl);
const base=engine.withPrincipal({...engine.scenarioFromFacts({income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000}),incomeGrowth:8,rentGrowth:6,expenseGrowth:4});
const date=new Date('2026-10-04T10:00:00Z');

test('R01 report uses canonical scenario and existing engine outputs',()=>{
  const report=buildReportModel(base,'en',null,date);
  const projection=engine.calculate(base);
  assert.equal(report.title,'Rent vs buy scenario summary');
  assert.equal(report.name,null);
  assert.equal(report.starting.length,5);
  assert.equal(report.comparison[0].value,new Intl.NumberFormat('en-US',{style:'currency',currency:'TRY',currencyDisplay:'narrowSymbol',maximumFractionDigits:0}).format(projection.rows[0].rentSurplus));
  assert.ok(report.buying.some(item=>item.label==='Loan amount'));
});
test('R02 optional name is preserved and family support is absent when not entered',()=>{
  const report=buildReportModel(base,'en','My exact name',date);
  assert.equal(report.name,'My exact name');
  assert.equal(report.support.length,0);
});
test('R03 entered family support appears only when present',()=>{
  const scenario=engine.withPrincipal({...base,upfrontSupport:150000,monthlySupport:10000,supportMonths:6});
  const report=buildReportModel(scenario,'tr',null,date);
  assert.equal(report.support.length,3);
  assert.ok(report.support.some(item=>item.label==='Hesaplanan destek süresi' && item.value==='6 ay'));
  assert.ok(report.buying.some(item=>item.label==='Kredi tutarı'));
});
test('R04 English and Turkish mark future rates as user assumptions, not forecasts',()=>{
  const en=buildReportModel(base,'en',null,date), tr=buildReportModel(base,'tr',null,date);
  assert.ok(en.assumptions.some(item=>item.label==='Annual income change'));
  assert.ok(tr.assumptions.some(item=>item.label==='Yıllık gelir değişimi'));
  assert.ok(en.assumptions.some(item=>item.label==='Income raise month' && item.value==='January'));
  assert.ok(tr.assumptions.some(item=>item.label==='Kira yenileme ayı' && item.value==='Ocak'));
  assert.match(en.disclaimer,/not a forecast/);
  assert.match(tr.disclaimer,/tahmin veya finans/);
  assert.ok(en.milestones.length>=2 && tr.milestones.length>=2);
});
test('R06 nonzero debt and chosen savings reserve appear in the findings',()=>{
  const report=buildReportModel(engine.withPrincipal({...base,debt:5000}),'en',null,date);
  assert.ok(report.starting.some(item=>item.label==='Other monthly debt payments'));
  assert.ok(report.buying.some(item=>item.label==='Savings set aside'));
});
test('R07 printed trend is derived from the same monthly projection as the results',()=>{
  const projection=engine.calculate(base);
  const report=buildReportModel(base,'tr',null,date);
  assert.equal(report.chart.length,base.horizon);
  assert.equal(report.chart[0].year,1);
  assert.equal(report.chart[0].renting,projection.rows.slice(0,12).reduce((sum,row)=>sum+row.rentSurplus,0)/12);
  assert.equal(report.chart[0].buying,projection.rows.slice(0,12).reduce((sum,row)=>sum+row.buySurplus,0)/12);
  const cheaper=engine.withPrincipal({...base,propertyPrice:base.propertyPrice*.9});
  assert.notEqual(buildReportModel(cheaper,'tr',null,date).chart[0].buying,report.chart[0].buying);
  assert.match(report.conclusion,/₺/);
});
test('R05 print composition is separate from app controls and has A4 rules',()=>{
  const report=readFileSync(new URL('../design-preview/src/pages/print-report.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../design-preview/src/index.css',import.meta.url),'utf8');
  assert.match(report,/className="report-page/);
  assert.match(report,/window\.print\(\)/);
  assert.match(report,/<CashChart report=\{report\}/);
  assert.doesNotMatch(report,/ScenarioControlRail|CashFlowTimeline|ResultActions/);
  assert.match(css,/@page \{ size: A4 portrait/);
  assert.match(css,/\.report-actions \{ display: none !important/);
});
test('R08 printed report follows the selected light or dark theme',()=>{
  const report=readFileSync(new URL('../design-preview/src/pages/print-report.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../design-preview/src/index.css',import.meta.url),'utf8');
  assert.match(css,/\.dark \.report-page \{[\s\S]*?--report-page: #222324/);
  assert.match(css,/\.report-page \{[\s\S]*?--report-page: #fff/);
  assert.match(css,/\.report-page \{ width: 100% !important;[^\n]*background: var\(--report-page\) !important/);
  assert.match(css,/html\.dark, html\.dark body, html\.dark #root, html\.dark \.report-shell/);
  assert.match(css,/\.dark \.report-actions \[data-variant="outline"\] \{ color: #f4f4f2/);
  assert.doesNotMatch(css,/\.dark \.report-page \{ background-color: #fff !important/);
  assert.match(report,/hearthline-icon-dark\.svg/);
  assert.match(report,/stroke="var\(--report-buy\)"/);
});
