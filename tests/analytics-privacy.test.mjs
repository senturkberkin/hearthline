import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const analytics=readFileSync(new URL('../design-preview/src/lib/analytics.ts',import.meta.url),'utf8');
const consent=readFileSync(new URL('../design-preview/src/components/product/analytics-consent.tsx',import.meta.url),'utf8');
const main=readFileSync(new URL('../design-preview/src/main.tsx',import.meta.url),'utf8');
const legal=readFileSync(new URL('../design-preview/src/pages/legal.tsx',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');

test('A01 analytics is build-time gated and never invents a Measurement ID',()=>{
  assert.match(analytics,/import\.meta\.env\.VITE_GA_MEASUREMENT_ID/);
  assert.match(analytics,/\^G-\[A-Z0-9\]\+\$/);
  assert.match(workflow,/VITE_GA_MEASUREMENT_ID: \$\{\{ vars\.GA_MEASUREMENT_ID \}\}/);
  assert.doesNotMatch(analytics,/G-[A-Z0-9]{6,}/);
});

test('A02 the Google tag stays blocked until an explicit analytics grant',()=>{
  assert.match(consent,/if \(choice === "granted"\) startAnalytics\(\)/);
  assert.match(consent,/choose\("denied"\)/);
  assert.match(consent,/choose\("granted"\)/);
  assert.match(analytics,/analytics_storage: "denied"/);
  assert.match(main,/<AnalyticsConsent \/>/);
});

test('A03 analytics sends only a manually controlled sanitized page view',()=>{
  assert.match(analytics,/send_page_view: false/);
  assert.equal((analytics.match(/gtag\("event"/g)||[]).length,1);
  assert.match(analytics,/gtag\("event", "page_view"/);
  assert.match(analytics,/return `\$\{location\.origin\}\$\{location\.pathname\}`/);
  assert.match(analytics,/new URL\(referrer\)\.origin \+ "\/"/);
  assert.doesNotMatch(analytics,/@\/lib\/engine|product-context|sessionStorage/);
});

test('A04 advertising features are disabled and consent can be withdrawn',()=>{
  assert.match(analytics,/allow_google_signals: false/);
  assert.match(analytics,/allow_ad_personalization_signals: false/);
  assert.match(analytics,/cookie_expires: 60 \* 60 \* 24 \* 90/);
  assert.match(analytics,/cookie_update: false/);
  assert.match(analytics,/export function stopAnalytics/);
  assert.match(analytics,/Max-Age=0/);
});

test('A05 privacy copy distinguishes site analytics from calculator data',()=>{
  assert.match(legal,/calculator inputs, financial values and results are never sent/);
  assert.match(legal,/Query strings and URL fragments are removed/);
  assert.match(legal,/Advertising signals and ad personalization are disabled/);
  assert.match(legal,/Analitik ayarları/);
});
