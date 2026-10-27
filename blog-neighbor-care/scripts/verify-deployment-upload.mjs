import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync,mkdtempSync,copyFileSync,cpSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const raw=execFileSync('vercel',['deploy','--dry','--json','--scope','buylife'],{cwd:root,encoding:'utf8',shell:process.platform==='win32',windowsHide:true,maxBuffer:8*1024*1024});
const upload=JSON.parse(raw.slice(raw.indexOf('{'))),paths=new Set(upload.files.filter(f=>(f.mode&0o170000)===0o100000).map(f=>f.path));
const required=['src/lib/supabase/admin.ts','src/lib/supabase/server.ts','src/lib/supabase/cookieDomain.ts','extension/background.mjs','extension/neighbor-extractor.mjs','extension/neighbor-importer.mjs','scripts/build-extension-archive.mjs','package-lock.json'];
for(const file of required)assert.ok(paths.has(file),`Missing required upload source: ${file}`);
assert.ok(![...paths].some(p=>/(^|\/)\.env(?:\.|$)/.test(p)),'Environment file must not upload');
const scratch=path.resolve(root,'../scratch');mkdirSync(scratch,{recursive:true});
const target=mkdtempSync(path.join(scratch,'blog-neighbor-care-upload-check-20261028-'));
// A fresh filtered source tree is required: stale files would hide missing-upload failures.
for(const file of paths){const dest=path.resolve(target,file);assert.ok(dest.startsWith(target+path.sep),'Unsafe upload path');mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.resolve(root,file),dest);}
// Turbopack enforces its root boundary; copy installed dependencies instead of an outside junction.
cpSync(path.join(root,'node_modules'),path.join(target,'node_modules'),{recursive:true});
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:target,stdio:'inherit',windowsHide:true,shell:process.platform==='win32'});
const result={checkedAt:new Date().toISOString(),source:'Actual Vercel CLI deploy --dry --json file list',uploadedFiles:paths.size,requiredPaths:required,criticalSupabaseFiles:3,filteredSourceBuildPassed:true,remoteDeploymentsCreated:0,realAiCalls:0,rootOnlyExclusions:true};
writeFileSync(new URL('../docs/evidence/deployment-upload-20261028.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
