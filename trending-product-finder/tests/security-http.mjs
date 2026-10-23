import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base=process.env.TPF_TEST_BASE||'https://trending-product-finder.buylife.xyz',checks=[];
for(const path of ['/api/cron/generate-reports','/api/cron/dispatch-sourcing-alerts','/api/cron/dispatch-price-alerts']){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});checks.push({path,status:r.status});assert.equal(r.status,401,path);console.log('PASS',path,r.status);}
await fs.writeFile('docs/evidence/security-http.json',JSON.stringify({base,checked_at:new Date().toISOString(),mode:'No cookies or Authorization; reject before report/API/notification operations',checks,paid_calls:0,sends:0},null,2));
