import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {latestTwelveMonthAverage} from './tuik-cpi.mjs';

const path=resolve(dirname(fileURLToPath(import.meta.url)),'../rent-reference.json');
const reactPath=resolve(dirname(fileURLToPath(import.meta.url)),'../design-preview/public/rent-reference.json');
const endpoint='https://databrowser2.tuik.gov.tr/api/core/nodes/1/datasets/TR,DF_TUFE_SDMX_TT10,1.0';
const withTimeout = async (url,options={}) => {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`TÜİK returned HTTP ${response.status}`);
  return response.json();
};
const existing=JSON.parse(await readFile(path,'utf8'));
const structure=await withTimeout(`${endpoint}/structure`);
const criteria=structure?.template?.criteria;
if(!Array.isArray(criteria) || !criteria.some(item=>item.id==='REF_AREA' && item.filterValues?.includes('TR'))) throw new Error('Unexpected TÜİK selection criteria');
const payload=await withTimeout(`${endpoint}/data`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(criteria)});
const latest=latestTwelveMonthAverage(payload);
if(latest.period < existing.period) throw new Error('Official dataset is older than saved reference');
if(latest.period===existing.period && latest.percentage===existing.percentage) { await writeFile(reactPath,JSON.stringify(existing,null,2)+'\n'); console.log(`Already current: ${latest.period} · ${latest.percentage}%`); process.exit(0); }
const now=new Date();
const nextMonth=Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1);
const updated={
  percentage:latest.percentage,
  period:latest.period,
  publishedAt:latest.period===existing.period?existing.publishedAt:now.toISOString(),
  publicationDateBasis:latest.period===existing.period?(existing.publicationDateBasis || 'verifiedBulletin'):'firstObservedInOfficialDataset',
  nextPublicationAt:new Date(nextMonth).toISOString(),
  sourceName:'TÜİK DataBrowser — 12-month average CPI',
  sourceUrl:latest.period===existing.period?existing.sourceUrl:'https://veriportali.tuik.gov.tr/tr/search?q=T%C3%BCketici%20Fiyat%20Endeksi',
  updatedAt:now.toISOString()
};
await writeFile(path,JSON.stringify(updated,null,2)+'\n');
await writeFile(reactPath,JSON.stringify(updated,null,2)+'\n');
console.log(`Updated official CPI reference: ${latest.period} · ${latest.percentage}%`);
