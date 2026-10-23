import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'website-scraper-security-'));
const out = path.join(tmp, 'guard.mjs');
await build({entryPoints:['src/lib/safeFetch.ts'],outfile:out,bundle:true,platform:'node',format:'esm',plugins:[{name:'isolated-network',setup(b){
  b.onResolve({filter:/^(server-only|node:dns\/promises|undici)$/},a=>({path:a.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='server-only'?'':a.path==='undici'?'export class Agent{constructor(options){this.options=options}async close(){globalThis.fixtureClosed++}}':'export async function lookup(host){globalThis.fixtureLookups++;return globalThis.fixtureDNS[host]||[]}',loader:'js'}));
}}]});
const api = await import('file:///'+out.replaceAll('\\','/'));
const checks=[];
const blocked=['http://127.0.0.1','http://127.1','http://2130706433','http://0x7f000001','http://10.2.3.4','http://172.31.2.3','http://192.168.1.1','http://169.254.169.254','http://100.64.1.1','http://[::1]','http://[::ffff:127.0.0.1]','http://[::ffff:7f00:1]','http://[fe90::1]','http://[fd12::1]','http://localhost','http://a.localhost','http://a.internal','file:///etc/passwd','https://name:password@example.com'];
globalThis.fixtureDNS={'example.com':[{address:'93.184.216.34',family:4}],'mixed.test':[{address:'93.184.216.34',family:4},{address:'127.0.0.1',family:4}]};
globalThis.fixtureClosed=0;globalThis.fixtureLookups=0;
for(const url of blocked){let rejected=false;try{await api.assertPublicUrl(url)}catch(e){rejected=e instanceof api.BlockedUrlError}checks.push({name:'Block '+url.replace('name:password@','[credentials]@'),passed:rejected});}
if(process.argv.includes('--baseline')){
 await fs.mkdir('docs/evidence',{recursive:true});await fs.writeFile('docs/evidence/security-before.json',JSON.stringify({mode:'pure URL validation; no target connections',checks},null,2));console.log(JSON.stringify({accepted_internal:checks.filter(x=>!x.passed)}));
}else{
 try{
  assert.ok(checks.every(c=>c.passed),checks.filter(c=>!c.passed).map(c=>c.name).join(', '));
  await assert.rejects(api.assertPublicUrl('https://mixed.test'),api.BlockedUrlError);checks.push({name:'Mixed public/private DNS rejected',passed:true});
  await assert.rejects(api.assertPublicUrl('https://missing.test'),api.BlockedUrlError);checks.push({name:'Missing DNS rejected',passed:true});
  assert.equal((await api.assertPublicUrl('https://example.com')).hostname,'example.com');checks.push({name:'Public host allowed',passed:true});
  let requests=0;globalThis.fixtureLookups=0;
  globalThis.fetch=async(url,init)=>{requests++;assert.equal(init.redirect,'manual');const lookup=init.dispatcher.options.connect.lookup;await new Promise((resolve,reject)=>lookup('example.com',{},(e,address,family)=>{if(e)return reject(e);assert.equal(address,'93.184.216.34');assert.equal(family,4);resolve()}));return new Response('ok')};
  const result=await api.safeFetch('https://example.com');assert.equal(await result.response.text(),'ok');assert.equal(requests,1);assert.equal(globalThis.fixtureLookups,1);checks.push({name:'Connection pins already validated address; no second DNS lookup',passed:true});
  requests=0;globalThis.fetch=async()=>{requests++;return new Response('',{status:302,headers:{Location:'http://127.0.0.1'}})};
  await assert.rejects(api.safeFetch('https://example.com'),api.BlockedUrlError);assert.equal(requests,1);checks.push({name:'Private redirect blocked before second request',passed:true});
  requests=0;globalThis.fetch=async()=>{requests++;return new Response('',{status:302,headers:{Location:'/again'}})};
  await assert.rejects(api.safeFetch('https://example.com'),api.BlockedUrlError);assert.equal(requests,6);checks.push({name:'Redirect loop bounded to six requests',passed:true});
  assert.ok(globalThis.fixtureClosed>=8);checks.push({name:'Per-request dispatchers closed',passed:true});
  console.log('PASS',checks.length,'security checks');
 }catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error(e.message);process.exitCode=1;}
 await fs.mkdir('docs/evidence',{recursive:true});await fs.writeFile('docs/evidence/security.json',JSON.stringify({mode:'isolated URL/DNS/fetch guards; no internal connections',checked_at:new Date().toISOString(),checks},null,2));
}
if (!path.isAbsolute(tmp) || path.dirname(tmp) !== os.tmpdir() || !path.basename(tmp).startsWith('website-scraper-security-')) throw Error('Unexpected temporary cleanup target');
await fs.rm(tmp,{recursive:true,force:true});
