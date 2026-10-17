import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base=process.env.PLAYLIST_TEST_BASE||'http://127.0.0.1:3012',checks=[];
for(const [route,method] of [['/api/user-key','GET'],['/api/user-key','POST'],['/api/generate-bg','POST']]){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},redirect:'manual',...(method==='POST'?{body:'{}'}:{})});assert.equal(r.status,401);checks.push({route,method,status:r.status});console.log('PASS 401',method,route);}
await fs.writeFile('docs/evidence/v108/security-'+(base.includes('127.0.0.1')?'local':'live')+'.json',JSON.stringify({base,checked_at:new Date().toISOString(),checks,ai_calls:0,key_writes:0},null,2));
