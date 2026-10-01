import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {test} from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('../design-preview/node_modules/typescript');
const source = readFileSync(new URL('../design-preview/src/lib/income-history.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {summarizeIncomeHistory} = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('income history calculates consecutive yearly changes and their average', () => {
  const result = summarizeIncomeHistory([{year:2026,income:92000},{year:2024,income:50000},{year:2025,income:80000}]);
  assert.deepEqual(result.rows.map(row => row.year),[2024,2025,2026]);
  assert.ok(Math.abs(result.rows[1].change-60)<1e-9);
  assert.ok(Math.abs(result.rows[2].change-15)<1e-9);
  assert.ok(Math.abs(result.average-37.5)<1e-9);
});

test('income history does not infer a rate from missing or nonconsecutive years', () => {
  assert.equal(summarizeIncomeHistory([{year:2025,income:0},{year:2026,income:92000}]).average,null);
  assert.equal(summarizeIncomeHistory([{year:2023,income:50000},{year:2026,income:92000}]).average,null);
});
