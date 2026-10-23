// No session: handlers must reject before member-key lookup or external calls.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base=process.env.YVS_TEST_BASE||'http://127.0.0.1:3028',checks=[];
for(const [method,route] of [...['search-shorts','golden-channels','trending','source-finder','analyze-script'].map(s=>['POST','/api/youtube/'+s]),...['GET','POST','DELETE'].flatMap(m=>[[m,'/api/settings/api-keys'],[m,'/api/favorites']])]){
 const res=await fetch(base+route,{method,redirect:'manual',headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:'{}'})});assert.equal(res.status,401,method+' '+route);checks.push({method,route,status:res.status});console.log('PASS 401',method,route);
}
await fs.writeFile(`docs/evidence/v114/security-${base.includes('127.0.0.1')?'local':'live'}.json`,JSON.stringify({base,checked_at:new Date().toISOString(),checks,authenticated_calls:0,external_api_calls:0},null,2));
