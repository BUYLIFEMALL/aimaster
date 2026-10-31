import http from 'http'; import fs from 'fs'; import crypto from 'crypto'; import path from 'path'; import {fileURLToPath} from 'url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const token=crypto.randomBytes(9).toString('hex'); fs.writeFileSync(path.join(dir,'token.txt'),token);
const page=fs.readFileSync(path.join(dir,'index.html'));
let last=0;
http.createServer(async(q,s)=>{
  const u=new URL(q.url,'http://x'); const pre='/'+token;
  if(!u.pathname.startsWith(pre)){s.writeHead(404);return s.end();}
  const p=u.pathname.slice(pre.length);
  if(p===''||p==='/'){s.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return s.end(page);}
  if(p==='/geo'){
    const lat=+u.searchParams.get('lat'),lng=+u.searchParams.get('lng');
    if(!isFinite(lat)||!isFinite(lng)){s.writeHead(400);return s.end();}
    const wait=Math.max(0,last+1100-Date.now()); last=Date.now()+wait; await new Promise(r=>setTimeout(r,wait));
    try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=ko&lat=${lat}&lon=${lng}`,{headers:{'User-Agent':'buylife-onsite-prevalidation/1 (one-time test)'}});
      const j=await r.json(); s.writeHead(200,{'content-type':'application/json'}); return s.end(JSON.stringify({address:j.display_name||null}));
    }catch(e){s.writeHead(502);return s.end('{}');}
  }
  if(p==='/results'&&q.method==='POST'){
    let b='';for await(const c of q){b+=c;if(b.length>1e6){s.writeHead(413);return s.end();}}
    fs.appendFileSync(path.join(dir,'results.jsonl'),JSON.stringify({at:new Date().toISOString(),body:JSON.parse(b)})+'\n');
    s.writeHead(200);return s.end('{"ok":true}');
  }
  s.writeHead(404);s.end();
}).listen(8765,'127.0.0.1',()=>console.log('ready',token));
