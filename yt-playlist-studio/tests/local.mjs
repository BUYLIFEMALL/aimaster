import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
// Existing platform settings only in child process; local/Vercel env files stay intact.
const env={...process.env};
for(const line of fs.readFileSync(path.resolve('../.env.local'),'utf8').split(/\r?\n/)){
  const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&/^(NEXT_PUBLIC_SUPABASE_|SUPABASE_)/.test(m[1]))env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');
}
const mode=process.argv[2];if(!['build','start'].includes(mode))throw Error('build|start');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',mode,...(mode==='start'?['-p','3012','-H','127.0.0.1']:[])],{env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code??1;});process.on('SIGINT',()=>child.kill('SIGINT'));
