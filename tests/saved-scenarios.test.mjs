import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ts=require('../design-preview/node_modules/typescript');
const transpile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const engineUrl=`data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/engine.ts')).toString('base64')}`;
const engine=await import(engineUrl);
const storageUrl=`data:text/javascript;base64,${Buffer.from(transpile('../design-preview/src/lib/saved-scenarios.ts').replace('from "./engine"',`from "${engineUrl}"`)).toString('base64')}`;
const saved=await import(storageUrl);
const scenario=engine.withPrincipal({...engine.scenarioFromFacts({income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000}),incomeGrowth:8});

function memory(initial=null) {
  const values=new Map(initial===null?[]:[[saved.SAVED_SCENARIOS_KEY,initial]]);
  return { values, getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
}
function store(storage=memory()) { let next=0; return saved.createSavedScenarioStore({storage,id:()=>`id-${++next}`,now:()=>`2026-10-04T00:00:0${Math.min(next,9)}.000Z`}); }

test('P01 financial payload is canonical and omits derived principal and metadata',()=>{
  const payload=saved.scenarioToPayload(scenario);
  assert.equal(payload.propertyPrice,4500000);
  assert.equal('principal' in payload,false);
  assert.equal('id' in payload,false);
  assert.equal(saved.deserializeScenario(payload).principal,scenario.principal);
  assert.deepEqual(JSON.parse(saved.serializeScenario(scenario)),payload);
});
test('P02 no persistent write occurs before explicit first save; save stores one versioned record',()=>{
  const storage=memory(), service=store(storage);
  assert.equal(service.list().records.length,0);
  assert.equal(storage.values.size,0);
  const result=service.create('My scenario',scenario);
  assert.equal(result.issue,null);
  assert.equal(result.record.name,'My scenario');
  assert.equal(result.record.createdAt,result.record.updatedAt);
  const raw=JSON.parse(storage.values.get(saved.SAVED_SCENARIOS_KEY));
  assert.equal(raw.schemaVersion,saved.CURRENT_SCENARIO_SCHEMA_VERSION);
  assert.equal(raw.records.length,1);
  assert.equal('principal' in raw.records[0].payload,false);
});
test('P03 update, rename and duplicate preserve correct identities and payloads',()=>{
  const service=store();
  const first=service.create('Original',scenario).record;
  const changed=engine.withPrincipal({...scenario,propertyPrice:3600000});
  assert.equal(service.update(first.id,changed).record.payload.propertyPrice,3600000);
  assert.equal(service.rename(first.id,'Exact name').record.name,'Exact name');
  const copy=service.duplicate(first.id,'Exact name (copy)').record;
  assert.notEqual(copy.id,first.id);
  assert.deepEqual(copy.payload,service.get(first.id).payload);
  assert.equal(service.get(first.id).createdAt,first.createdAt);
  assert.equal(service.list().records.length,2);
});
test('P04 individual delete and delete-all affect only named saved records',()=>{
  const storage=memory(), service=store(storage);
  const one=service.create('One',scenario).record;
  service.create('Two',scenario);
  assert.equal(service.delete(one.id),null);
  assert.equal(service.list().records.length,1);
  assert.equal(service.deleteAll(),null);
  assert.equal(storage.values.has(saved.SAVED_SCENARIOS_KEY),false);
});
test('P05 malformed JSON is preserved and never overwritten by save',()=>{
  const storage=memory('{bad'), service=store(storage);
  assert.equal(service.list().issue,'malformed');
  assert.equal(service.create('New',scenario).issue,'malformed');
  assert.equal(storage.values.get(saved.SAVED_SCENARIOS_KEY),'{bad');
});
test('P06 invalid individual records are isolated and preserved on later writes',()=>{
  const valid=store().create('Valid',scenario).record;
  const corrupt={id:'broken',payload:{income:'no'}};
  const storage=memory(JSON.stringify({schemaVersion:1,records:[valid,corrupt]})), service=store(storage);
  assert.equal(service.list().records.length,1);
  assert.equal(service.list().invalidCount,1);
  service.create('Another',scenario);
  assert.equal(service.list().records.length,2);
  assert.deepEqual(JSON.parse(storage.values.get(saved.SAVED_SCENARIOS_KEY)).records.at(-1),corrupt);
});
test('P07 unsupported future store is read-only and remains intact',()=>{
  const raw=JSON.stringify({schemaVersion:99,records:[]}), storage=memory(raw), service=store(storage);
  assert.equal(service.list().issue,'future');
  assert.equal(service.create('New',scenario).issue,'future');
  assert.equal(storage.values.get(saved.SAVED_SCENARIOS_KEY),raw);
});
test('P08 version-zero full-Scenario record migrates on first write without derived results',()=>{
  const legacy={id:'old',name:'Old',createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-01T00:00:00Z',schemaVersion:0,scenario};
  const storage=memory(JSON.stringify({schemaVersion:0,records:[legacy]})), service=store(storage);
  assert.equal(service.list().records[0].payload.income,75000);
  service.rename('old','Renamed');
  const raw=JSON.parse(storage.values.get(saved.SAVED_SCENARIOS_KEY));
  assert.equal(raw.schemaVersion,1);
  assert.equal(raw.records[0].schemaVersion,1);
  assert.equal('principal' in raw.records[0].payload,false);
});
test('P09 storage unavailable and write failure leave calculator payload untouched',()=>{
  assert.equal(store(null).create('No storage',scenario).issue,'unavailable');
  const storage={getItem:()=>null,setItem:()=>{throw Error('quota')},removeItem:()=>{throw Error('blocked')}};
  const service=store(storage);
  assert.equal(service.create('Quota',scenario).issue,'write-failed');
  assert.equal(service.deleteAll(),'write-failed');
  assert.equal(scenario.principal,4150000);
});
test('P10 saved payload must pass runtime validation when opened',()=>{
  const storage=memory(), service=store(storage);
  const record=service.create('Valid',scenario).record;
  assert.equal(saved.deserializeScenario(service.get(record.id).payload).principal,4150000);
  const invalid={...record,payload:{...record.payload,termYears:1000000}};
  storage.setItem(saved.SAVED_SCENARIOS_KEY,JSON.stringify({schemaVersion:1,records:[invalid]}));
  assert.equal(service.get(record.id),null);
  assert.equal(service.list().invalidCount,1);
});
