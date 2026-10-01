import {test} from 'node:test';
import assert from 'node:assert/strict';
import {latestTwelveMonthAverage} from '../scripts/tuik-cpi.mjs';

test('selects the twelve-month CPI average, not monthly or annual inflation', () => {
  const payload={class:'dataset',id:['REF_AREA','DEGISIM','TIME_PERIOD'],size:[1,5,2],dimension:{REF_AREA:{category:{index:['TR']}},DEGISIM:{category:{index:['1','2','3','4','5']}},TIME_PERIOD:{category:{index:['2026-07','2026-08']}}},value:{8:'31.90',9:'31.79'}};
  assert.deepEqual(latestTwelveMonthAverage(payload),{percentage:31.79,period:'2026-08'});
});
