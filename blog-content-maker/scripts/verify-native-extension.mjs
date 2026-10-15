import { loadPlatformEnv } from './platform-env.mjs';
// Visible, already signed-in Chrome; real extension/background/editor. No AI or publish calls.
// Ephemeral bridge is loopback-only and admits only the installed extension origin.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const root=process.cwd(),base='https://blog-content-maker.buylife.xyz',extensionId=process.env.BCM_EXTENSION_ID||'konicognhinfmihgblmofjkgnkeopajk',origin='chrome-extension://'+extensionId,port=32719;
if(!/^[a-p]{32}$/.test(extensionId))throw new Error('Invalid installed extension id');
const env = await loadPlatformEnv();
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:link,error:le}=await admin.auth.admin.generateLink({type:'magiclink',email:'buylifemall@naver.com'});if(le)throw new Error('Could not authenticate ordinary test member');
const {data:auth,error:ae}=await anon.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});if(ae||auth.user?.email!=='buylifemall@naver.com')throw new Error('Ordinary member authentication failed');
const cookies=[];await createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}}).auth.setSession(auth.session);
const cookie=cookies.map(c=>c.name+'='+c.value).join('; ');
async function api(endpoint,data){const r=await fetch(base+endpoint,{headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},...(data?{method:'POST',body:JSON.stringify(data)}:{})});const v=await r.json();if(!r.ok)throw new Error('Member API: '+v.error);return v;}
const sourceId='63423cf5-b1a1-4cf6-a163-dd5177c5f5e7';
let projectId=process.env.BCM_VERIFY_PROJECT_ID;
const expectedBody='## 실제 입력 검수\n\n이 원고는 확장 프로그램 검수용이며 외부에 발행하지 않습니다.\n\n굵은 표시 **원문 보존**과 한글 문장을 확인합니다.\n\n이모지 뒤에도 문장이 이어집니다 🙂 뒤쪽 문장까지 보존해야 합니다.\n\n## 표 내용과 순서\n\n| 항목 | 확인 내용 |\n| --- | --- |\n| 원고 | 전체 문장 보존 |\n| 이미지 | 두 장만 삽입 |\n\n첫 번째 이미지와 두 번째 이미지가 중복되지 않는지 확인합니다.\n\n마지막 검수 문장: 제목부터 이 문장까지 빠짐없이 입력되었습니다.';
if(!projectId){const copy=await api('/api/workspace',{action:'duplicate',projectId:sourceId});projectId=copy.project.id;const current=await api('/api/workspace?project='+projectId);await api('/api/workspace',{action:'save',projectId,expectedRevision:current.project.current_revision_id,title:'AI 블로그 콘텐츠 제작 자동화 · 실제 확장 검수 (발행하지 않음)',body:expectedBody,tags:['확장검수','원고보존'],requestKey:randomUUID()});
const images=current.assets.filter(a=>a.kind!=='reference');for(const[i,a]of images.entries())await api('/api/workspace',{action:'asset-meta',projectId,assetId:a.id,alt:'검수 이미지 '+(i+1),placement:i===0?2:5});}
const issued=await api('/api/extension',{action:'issue'}),tokenHash=createHash('sha256').update(issued.token).digest('hex');
const dir=path.join(root,'extension','verify-session');await fs.mkdir(dir);await fs.copyFile(path.join(root,'tests','native-extension-client.js'),path.join(dir,'client.js'));
await fs.writeFile(path.join(dir,'index.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><title>네이버 전용 확장 실제 검수</title><body style="font:16px sans-serif;max-width:900px;margin:40px;color:#18243b"><h1>네이버 전용 확장 실제 검수</h1><p>회원 본인 검수 원고만 입력합니다. 기존 글은 덮어쓰지 않으며 최종 발행은 하지 않습니다.</p><button id="start" disabled>빈 편집기 입력 검수 시작</button> <button id="repeat" disabled>기존 글 보호 검수</button><pre id="state" style="white-space:pre-wrap">연결 준비 중</pre><script src="../editor.js"></script><script src="client.js"></script></body></html>');
const report={base,extensionId,projectId,account:'ordinary test member',events:[],completed:false};await fs.mkdir(path.join(root,'test-artifacts'),{recursive:true});
async function persist(){await fs.writeFile(path.join(root,'test-artifacts','native-extension-result.json'),JSON.stringify(report,null,2));}
async function cleanup(){await admin.from('blog_content_maker_extension_tokens').update({revoked_at:new Date().toISOString()}).eq('user_id',auth.user.id).eq('token_hash',tokenHash);await anon.auth.signOut({scope:'local'});for(const name of ['index.html','client.js'])await fs.unlink(path.join(dir,name));await fs.rmdir(dir);}
const server=http.createServer(async(req,res)=>{try{if(req.headers.origin&&req.headers.origin!==origin){res.writeHead(403).end();return;}res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
if(req.url==='/bootstrap'){if(req.headers.origin!==origin){res.writeHead(403).end();return;}res.end(JSON.stringify({token:issued.token,projectId,expectedBlogId:'buylifemall'}));return;}
if(req.url==='/event'&&req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw new Error('Event too large');}const event=JSON.parse(raw);if(/token|authorization|cookie/i.test(Object.keys(event).join(' ')))throw new Error('Secret field rejected');report.events.push(event);if(event.type==='complete')report.completed=true;await persist();console.log('EVENT',event.type,event.message||'');res.end('{"ok":true}');return;}
if(req.url==='/status'){res.end(JSON.stringify(report));return;}
if(req.url==='/shutdown'&&req.method==='POST'){await cleanup();res.end('{"ok":true}');server.close();return;}res.writeHead(404).end();}catch(e){console.error('Verification bridge:',e.message);res.writeHead(500).end('{"error":"Verification bridge failed"}');}});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({ready:true,projectId,version:'v1.02',verificationPage:origin+'/verify-session/index.html',port})));
