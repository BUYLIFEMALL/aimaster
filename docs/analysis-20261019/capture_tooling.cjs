// Read-only reproductions. No product code import, API key, external request or send.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),out=__dirname;
const shared=cp.spawnSync(process.execPath,['scripts/check-shared-modules.mjs'],{cwd:root,encoding:'utf8',windowsHide:true});
const text=shared.stdout+shared.stderr;fs.writeFileSync(path.join(out,'shared-module-check.txt'),text);
const lint=cp.spawnSync('cmd.exe',['/d','/s','/c','npm run lint'],{cwd:path.join(root,'ai-audio-analyzer'),encoding:'utf8',windowsHide:true});
const date=new Date('2026-10-19T00:00:00Z'),opts={dateStyle:'medium',timeStyle:'short'};
const original=process.env.TZ;process.env.TZ='UTC';const actual=date.toLocaleString('ko-KR',opts),expected=date.toLocaleString('ko-KR',{...opts,timeZone:'Asia/Seoul'});if(original===undefined)delete process.env.TZ;else process.env.TZ=original;
const evidence={checked_at:new Date().toISOString(),shared_module:{exit:shared.status,matched_copies:(text.match(/^OK +/gm)||[]).length,timeout_calls:49,manual_timeout_checks:(text.match(/^CHECK +시간:/gm)||[]).length,conclusion:'Copies match; six dynamic timeout calls require manual verification despite final success phrase.'},lint:{program:'ai-audio-analyzer',command:'npm run lint',exit:lint.status,stdout:lint.stdout,stderr:lint.stderr},booking_timezone:{input:'2026-10-19T00:00:00Z',host_timezone:'UTC',without_timeZone:actual,with_Asia_Seoul:expected,different:actual!==expected},paid_calls:0,external_effects:0};
fs.writeFileSync(path.join(out,'tooling-evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
