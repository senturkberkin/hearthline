const {test} = require('node:test');
const assert = require('node:assert/strict');
const input = require('../input-utils.js');
const salary = require('../salary-history.js');
const months = require('../month-selector.js');
const reference = require('../rent-reference.js');

test('money grouping respects both locales without changing numeric values', () => {
  assert.equal(input.display('1250000','en'), '1,250,000');
  assert.equal(input.display('1250000','tr'), '1.250.000');
  assert.equal(input.parse('1,250,000','en'), 1250000);
  assert.equal(input.parse('1.250.000','tr'), 1250000);
  assert.equal(input.display('92200','en'), '92,200');
});
test('decimal commas and points remain decimals', () => {
  assert.equal(input.parse('2,87','tr',true), 2.87);
  assert.equal(input.parse('2.87','en',true), 2.87);
  assert.equal(input.parse('2.87','tr',true), 2.87);
  assert.equal(input.display('2,87','tr',true), '2,87');
  assert.equal(input.display('2.87','en',true), '2.87');
  assert.equal(input.display('2,','tr',true), '2,');
});
test('live formatting keeps an edited middle caret near the edited digit', () => {
  assert.deepEqual(input.formatEdit('923200',3,'en'), {value:'923,200',caret:4});
  assert.deepEqual(input.formatEdit('92200',5,'tr'), {value:'92.200',caret:6});
});
test('money input keeps a raw value separate from its displayed text', () => {
  const listeners={};
  const field={
    value:'1250000',selectionStart:7,selectionEnd:7,
    addEventListener(name,callback){listeners[name]=callback;},
    setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
  };
  input.bind(field,()=> 'tr');
  listeners.input();
  assert.equal(field.value,'1.250.000');
  assert.equal(input.rawValue(field,'tr'),1250000);
  field.value='875000'; field.selectionStart=6; field.selectionEnd=6;
  listeners.input();
  assert.equal(field.value,'875.000');
  assert.equal(input.rawValue(field,'tr'),875000);
});
test('salary history derives yearly changes from multiple entries', () => {
  const result=salary.summarize([{year:2023,amount:45000},{year:2024,amount:58000},{year:2025,amount:72000},{year:2026,amount:88000}]);
  assert.equal(result.changes.length,3);
  assert.ok(Math.abs(result.changes[0].observed-28.8889)<.001);
  assert.ok(Math.abs(result.latest-22.2222)<.001);
  assert.ok(result.average>24 && result.average<26);
});
test('month selector exposes twelve localized months', () => {
  assert.equal(months.monthNames('en').length,12);
  assert.equal(months.monthNames('en')[0].short,'Jan');
  assert.equal(months.monthNames('tr')[10].short,'Kas');
  assert.equal(months.monthNames('tr')[10].full.toLowerCase(),'kasım');
});
test('reference marks due data stale and falls back to saved data', async () => {
  const data={percentage:31.79,period:'2026-08',publishedAt:'2026-09-03T10:00:00+03:00',nextPublicationAt:'2026-10-05T10:00:00+03:00',sourceName:'TÜİK',sourceUrl:'https://veriportali.tuik.gov.tr/tr/press/58290',updatedAt:'2026-09-29T21:00:00+03:00'};
  assert.equal(reference.isStale(data,new Date('2026-09-29')),false);
  assert.equal(reference.isStale(data,new Date('2026-10-06')),true);
  const storage={getItem:()=>JSON.stringify(data),setItem:()=>{}};
  const result=await reference.load({fetcher:async()=>{throw Error('offline')},storage,now:new Date('2026-10-06')});
  assert.equal(result.data.percentage,31.79);
  assert.equal(result.stale,true);
  assert.equal(result.fromCache,true);
  const selected=reference.toAssumption(data);
  data.percentage=40;
  assert.equal(selected.rate,31.79); // A later current reading cannot change a chosen projection.
  const manuallyOverridden={...selected,rate:25};
  assert.equal(manuallyOverridden.rate,25);
});
