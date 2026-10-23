import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base=process.env.YT_TEST_BASE||'https://youtube-auto-reply.buylife.xyz';const checks=[];
for(const [path,method] of [['/api/cron/check-connection','GET'],['/api/cron/sync-comments','GET'],['/api/telegram/migrate-webhooks','GET'],['/api/telegram/webhook/00000000-0000-4000-8000-000000000000','POST']]){
 const r=await fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(20000)});checks.push({path,method,status:r.status});assert.equal(r.status,401,path);console.log('PASS',method,path,r.status);
}
await fs.writeFile('docs/evidence/security-http.json',JSON.stringify({base,checked_at:new Date().toISOString(),mode:'No cookies, Authorization or Telegram secret; must reject before external operations',checks,paid_calls:0,posting_calls:0},null,2));
