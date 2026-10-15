// Owner-authorized verification. Uses the ordinary test member, never an admin workspace session.
// Generates a sign-in link without sending email or changing a password. Tokens stay in memory.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import JSZip from 'jszip';
const root=process.cwd(),base=process.env.VERIFY_BASE||'http://localhost:3065',mode=process.env.VERIFY_MODE||'flow';
const raw=await fs.readFile(path.join(root,'.env.local'),'utf8');
const env=Object.fromEntries(raw.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const n=l.indexOf('=');let value=l.slice(n+1).trim();if(value.startsWith('"'))value=JSON.parse(value);return[l.slice(0,n),value];}));
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:'magiclink',email:'buylifemall@naver.com'});
if(linkError||!link?.properties?.hashed_token)throw new Error('Could not prepare ordinary member sign-in.');
const anonymous=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:auth,error:authError}=await anonymous.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});
if(authError||auth.user?.email!=='buylifemall@naver.com'||!auth.session)throw new Error('Test member authentication failed.');
const cookies=[];
const ssr=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[],setAll:items=>cookies.push(...items)}});
await ssr.auth.setSession({access_token:auth.session.access_token,refresh_token:auth.session.refresh_token});
const output=path.join(root,'test-artifacts');await fs.mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,'.local','browser-'+mode),{channel:'chrome',headless:false,viewport:{width:1280,height:900},args:['--disable-extensions-except='+path.join(root,'extension'),'--load-extension='+path.join(root,'extension')]});
const host=new URL(base).hostname;
await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:host,path:'/',secure:base.startsWith('https:'),httpOnly:false,sameSite:'Lax'})));
const page=context.pages()[0]||await context.newPage();const result={base,mode,testAccount:'ordinary member',checks:[],projectId:null};
const check=(name,value)=>{result.checks.push({name,passed:!!value});if(!value)throw new Error('Verification failed: '+name);console.log('PASS',name);};
async function state(){return page.evaluate(async()=>{const id=new URLSearchParams(location.search).get('project')||localStorage.getItem('bcm-active-project');const r=await fetch('/api/workspace'+(id?'?project='+id:''));return await r.json();});}
async function action(action,data={}){return page.evaluate(async({action,data})=>{const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,requestKey:crypto.randomUUID(),...data})});return {status:r.status,data:await r.json()};},{action,data});}
async function waitAction(name,click){const response=page.waitForResponse(r=>r.url().includes('/api/workspace')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action===name,{timeout:290000});await click();const r=await response;const body=await r.json();if(!r.ok())throw new Error(name+': '+body.error);await page.locator('.notice.status').waitFor({state:'hidden',timeout:30000});return body;}
try{
 await page.goto(base+'/dashboard');await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();await page.getByText('buylifemall@naver.com',{exact:true}).first().waitFor();check('ordinary-member workspace',true);await page.getByText('회원님의 작업을 불러오고 있습니다.',{exact:true}).waitFor({state:'hidden'});await page.getByRole('button',{name:'새 콘텐츠 만들기 →'}).waitFor();await page.screenshot({path:path.join(output,mode+'-desktop.png'),fullPage:true});
 if(mode==='flow'){
  await page.getByRole('button',{name:'새 콘텐츠 만들기 →'}).click();await page.getByLabel('주제·제목',{exact:true}).waitFor();
  await page.getByLabel('주제·제목',{exact:true}).fill('2026년 작은 주방 정리: 수납 전 확인할 기준과 순서');await page.getByLabel('핵심 키워드',{exact:true}).fill('작은 주방 정리');
  await page.getByLabel('목표 분량 (공백 제외)').fill('1800');await page.getByLabel('일반 이미지 계획 (0 = 제외)').fill('1');
  await page.getByLabel('직접 확인한 경험·사실').fill('검수용 원고입니다. 실제 제품 사용·구매·여행 경험을 꾸며 쓰지 않습니다. 비용과 수치는 자료로 확인하지 않았다면 단정하지 않습니다.');
  const generated=await waitAction('generate',()=>page.getByRole('button',{name:'원고 생성하기 →'}).click());check('own-key AI draft saved',!!generated.revisionId);
  let s=await state();result.projectId=s.project.id;check('original brief preserved',s.project.brief.experience.includes('검수용'));check('media plan count',s.revisions[0].data.media.length===1);
  await page.goto(base+'/review?project='+s.project.id);await page.getByLabel('본문 (마크다운)').waitFor();
  const initial=await page.getByLabel('본문 (마크다운)').inputValue();const ending='검수용 마지막 문장: 이 원고는 외부에 발행하지 않았습니다.';
  await page.getByLabel('본문 (마크다운)').fill(initial+'\n\n'+ending);
  await waitAction('save',()=>page.getByRole('button',{name:'수정본 저장',exact:true}).click());
  await page.reload();await page.getByLabel('본문 (마크다운)').waitFor();check('save and reload preserves full ending',(await page.getByLabel('본문 (마크다운)').inputValue()).endsWith(ending));
  s=await state();check('previous revision preserved',s.revisions.length>=2&&s.revisions.some(r=>!r.data.body.includes(ending)));
  await waitAction('audit',()=>page.getByRole('button',{name:'현재 원고 점검하기',exact:true}).click());s=await state();check('missing generated image does not pass',s.revisions[0].data.audit.items.find(i=>i.id==='images').status==='warn');
  await page.screenshot({path:path.join(output,'flow-review.png'),fullPage:true});
  await page.goto(base+'/images?project='+s.project.id);await page.getByRole('button',{name:'이미지 생성',exact:true}).waitFor();
  await waitAction('image',()=>page.getByRole('button',{name:'이미지 생성',exact:true}).click());s=await state();check('own-key image stored privately',s.assets.length===1&&s.assets[0].url?.includes('/object/sign/'));check('previous audit retained for stale detection',!!s.revisions[0].data.audit);
  await page.screenshot({path:path.join(output,'flow-images.png'),fullPage:true});
  const audit=await action('audit',{projectId:s.project.id,expectedRevision:s.project.current_revision_id});check('fresh audit after image',audit.status===200);
  const foreign=await action('save',{projectId:'00000000-0000-0000-0000-000000000001',title:'forbidden',body:'not allowed',tags:[]});check('foreign or absent project rejected',foreign.status===404);
  s=await state();const conflict=await action('save',{projectId:s.project.id,expectedRevision:s.revisions.at(-1).id,title:'old',body:initial,tags:[]});check('stale revision rejected',conflict.status===409);
  const md=await page.request.get(base+'/api/export?project='+s.project.id+'&format=md');check('markdown export preserves ending',md.status()===200&&(await md.text()).includes(ending));
  const zip=await page.request.get(base+'/api/export?project='+s.project.id+'&format=zip');check('image bundle export',zip.status()===200&&(await zip.body()).subarray(0,2).toString()==='PK');
  await page.goto(base+'/export?project='+s.project.id);await page.getByRole('heading',{name:'최종 미리보기'}).waitFor();await page.screenshot({path:path.join(output,'flow-export.png'),fullPage:true});
 }else{
  const {data:projects}=await admin.from('blog_content_maker_projects').select('id').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(1);if(projects?.[0]){result.projectId=projects[0].id;await page.goto(base+'/review?project='+result.projectId);await page.getByLabel('본문 (마크다운)').waitFor();check('deployed stored draft accessible',true);}
 }
 if(mode==='search'){
  const s=await state();try{await action('settings',{settings:{...s.settings,search:true}});const searched=await action('titles',{topic:'구글 공식 문서에 근거한 검색 색인과 robots.txt의 차이',category:'디지털·도구'});if(searched.status!==200)throw new Error('Search verification: '+searched.data.error);check('actual search citations returned',searched.data.sources.length>0&&searched.data.sources.every(s=>s.url.startsWith('https://')));}finally{await action('settings',{settings:s.settings});}
 }
 if(mode==='media'){
  const before=await state(),created=await action('create',{brief:{...before.project.brief,topic:'하얀 머그잔을 정리하는 안전한 주방 수납',imageCount:0,sceneCount:1,includeFaq:false,targetLength:800,experience:''}});check('scene fixture project created',created.status===200);result.projectId=created.data.project.id;
  const generated=await action('generate',{projectId:result.projectId,expectedRevision:null});if(generated.status!==200)throw new Error('Scene draft: '+generated.data.error);check('scene fixture article generated',!!generated.data.revisionId);
  await page.goto(base+'/images?project='+result.projectId);await page.getByText('영상 첫 장면 이미지',{exact:true}).waitFor();let s=await state();check('one pair produces distinct start and end plans',s.revisions[0].data.media.length===2&&s.revisions[0].data.media[0].kind==='scene-start'&&s.revisions[0].data.media[1].kind==='scene-end'&&new Set(s.revisions[0].data.media.map(m=>m.id)).size===2);
  const sharp=(await import('sharp')).default;const fixture=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#eee"/><path d="M240 140h160v160q-80 60-160 0z" fill="white" stroke="#bbb" stroke-width="4"/><path d="M400 170q90-15 65 80q-15 35-65 5" fill="none" stroke="white" stroke-width="22"/></svg>')).jpeg().toBuffer();
  const uploaded=await action('upload',{projectId:s.project.id,reference:true,base64:fixture.toString('base64'),alt:'검수용 직접 그린 머그잔 참고 이미지'});check('own reference image uploaded privately',uploaded.status===200&&!!uploaded.data.assetId);
  for(const [i,m] of s.revisions[0].data.media.entries()) {const image=await action('image',{projectId:s.project.id,expectedRevision:s.project.current_revision_id,planId:m.id,kind:m.kind,alt:m.alt,placement:m.placement,prompt:'흰색 머그잔을 밝은 주방 선반에 자연스럽게 놓은 장면, 글자와 로고 없음',aspect:'16:9',...(i===0?{referenceId:uploaded.data.assetId}:{})});if(image.status!==200)throw new Error('Scene image: '+image.data.error);check(i===0?'reference composition image generated':'end scene image generated',!!image.data.assetId);}
  s=await state();check('reference preserved beside two separate scene files',s.assets.filter(a=>a.kind==='reference').length===1&&s.assets.filter(a=>a.kind!=='reference').length===2&&s.assets.every(a=>a.url.includes('/object/sign/')));
  const exported=await page.request.get(base+'/api/export?project='+s.project.id+'&format=zip'),zip=await JSZip.loadAsync(await exported.body());check('scene ZIP contains exactly two current images',Object.keys(zip.files).filter(n=>n.startsWith('images/')&&!zip.files[n].dir).length===2);await page.reload();await page.getByText('영상 첫 장면 이미지',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'media-composition.png'),fullPage:true});
 }
 if(mode==='duplicate'){
  const before=await state(),copy=await action('duplicate',{projectId:before.project.id});check('project and private images duplicated',copy.status===200&&!!copy.data.project?.id);
  const copied=await page.evaluate(async id=>(await fetch('/api/workspace?project='+id)).json(),copy.data.project.id);check('copy preserves complete current text and image count',copied.revisions[0].data.body===before.revisions[0].data.body&&copied.assets.length===before.assets.length&&copied.assets.every(a=>a.path.includes('/'+copy.data.project.id+'/')));
  const removed=await action('delete',{projectId:copy.data.project.id,confirmTitle:copy.data.project.title});check('only disposable duplicate removed',removed.status===200&&removed.data.deleted);const after=await state();check('original text and image files remain',after.project.id===before.project.id&&after.revisions[0].data.body===before.revisions[0].data.body&&after.assets.length===before.assets.length&&(await page.request.get(after.assets[0].url)).ok());
 }
 if(mode==='features'){
  let s=await state();
  const titleKey=randomUUID(),titles=await action('titles',{topic:'작은 주방 정리',category:'생활·정리',requestKey:titleKey});
  check('ten usable title ideas',titles.status===200&&titles.data.titles.length===10&&titles.data.titles.every(t=>t.title&&t.keyword));
  const repeated=await action('titles',{topic:'작은 주방 정리',category:'생활·정리',requestKey:titleKey});check('completed paid request replay uses saved result',repeated.status===200&&isDeepStrictEqual(repeated.data.titles,titles.data.titles));
  const analyzed=await action('analyze',{projectId:s.project.id,original:s.revisions[0].data.body});check('existing article title and keywords extracted',analyzed.status===200&&!!analyzed.data.analysis?.title&&!!analyzed.data.analysis?.keyword);
  const originalSettings=s.settings;
  try{await action('settings',{settings:{...originalSettings,provider:'openai',model:'gpt-4.1-mini',search:false}});const reviewed=await action('review',{projectId:s.project.id,expectedRevision:s.project.current_revision_id});check('own OpenAI key article review',reviewed.status===200&&!!reviewed.data.revisionId);}finally{await action('settings',{settings:originalSettings});}
  s=await state();const social=await action('social',{projectId:s.project.id,expectedRevision:s.project.current_revision_id});check('current revision social snippets',social.status===200&&!!social.data.revisionId);s=await state();check('three saved platform snippets',s.revisions[0].data.social.length===3);
  const translation=await action('translate',{projectId:s.project.id,prompt:'하얀 주방 선반 위에 정돈된 유리 그릇, 자연광'});check('image prompt English translation',translation.status===200&&/[a-z]{3}/i.test(translation.data.translation));
 }
 if(['features','extension'].includes(mode)){
  const s=await state();
  const tokenResponse=await page.request.post(base+'/api/extension',{data:{action:'issue'},headers:{origin:base}});const issued=await tokenResponse.json();check('member extension token issued',tokenResponse.status()===200&&issued.token?.length===43);
  const authorization='Bearer '+issued.token;
  const ext=await page.request.get(base+'/api/extension?project='+s.project.id,{headers:{authorization}});const payload=await ext.json();const plans=new Set(s.revisions[0].data.media.map(m=>m.id)),imageCount=new Set(s.assets.filter(a=>a.kind!=='reference'&&plans.has(a.plan_id)).map(a=>a.plan_id)).size;check('extension current revision and real images',ext.status()===200&&payload.revisionId===s.project.current_revision_id&&payload.images.length===imageCount);
  check('extension foreign project blocked',(await page.request.get(base+'/api/extension?project=00000000-0000-0000-0000-000000000001',{headers:{authorization}})).status()===404);
  const tokenHash=createHash('sha256').update(issued.token).digest('hex');const {data:storedToken}=await admin.from('blog_content_maker_extension_tokens').select('token_hash').eq('user_id',auth.user.id).eq('token_hash',tokenHash).single();check('extension token stored only as hash',storedToken?.token_hash===tokenHash);
  await admin.from('blog_content_maker_extension_tokens').update({revoked_at:new Date().toISOString()}).eq('user_id',auth.user.id).eq('token_hash',tokenHash);check('revoked extension token rejected',(await page.request.get(base+'/api/extension',{headers:{authorization}})).status()===401);
  const disposable=await action('create',{brief:{topic:'검수 후 정리할 빈 작업',imageCount:0}});check('disposable owner fixture created',disposable.status===200&&!!disposable.data.project?.id);const deleted=await action('delete',{projectId:disposable.data.project.id,confirmTitle:disposable.data.project.title});check('explicitly confirmed owner fixture removed',deleted.status===200&&deleted.data.deleted===true);
  await page.goto(base+'/review?project='+s.project.id);await page.getByLabel('본문 (마크다운)').waitFor();await page.screenshot({path:path.join(output,'features-review.png'),fullPage:true});
 }
 await page.setViewportSize({width:400,height:850});
 for(const route of ['dashboard','ideas','write','review','images','export','library','settings','guide']){
  await page.goto(base+'/'+route+(result.projectId?'?project='+result.projectId:''));await page.getByRole('heading',{name:route==='settings'?'API키등록·플랫폼연동':route==='guide'?'사용 안내':route==='library'?'작업 보관함':route==='export'?'네이버로 옮기기':route==='images'?'이미지·장면 준비':route==='review'?'글 점검·다듬기':route==='write'?'원고 만들기':route==='ideas'?'글감·제목 찾기':'대시보드',exact:true}).first().waitFor();
  await page.getByText('회원님의 작업을 불러오고 있습니다.',{exact:true}).waitFor({state:'hidden'});const layout=await page.evaluate(()=>({sidebar:getComputedStyle(document.querySelector('.desktop-sidebar')).display,mobile:getComputedStyle(document.querySelector('.mobile-sidebar')).display,overflow:document.documentElement.scrollWidth>innerWidth}));check('mobile '+route,layout.sidebar==='none'&&layout.mobile!=='none'&&!layout.overflow);
 }
 await page.getByRole('button',{name:'메뉴 펼치기'}).click();await page.screenshot({path:path.join(output,mode+'-mobile.png'),fullPage:true});check('mobile menu expanded',await page.getByRole('navigation',{name:'작업 메뉴'}).last().isVisible());
 const noAuth=await fetch(base+'/api/workspace');check('anonymous API blocked',noAuth.status===401);
 const worker=context.serviceWorkers().find(w=>w.url().includes('/background.js'));result.extensionLoaded=!!worker;
 await fs.writeFile(path.join(output,mode+'-result.json'),JSON.stringify(result,null,2));console.log('RESULT',JSON.stringify({checks:result.checks.length,projectId:result.projectId,extensionLoaded:!!worker}));
}catch(e){result.error=e.message;await fs.writeFile(path.join(output,mode+'-result.json'),JSON.stringify(result,null,2));console.error('VERIFY ERROR',e.message);await page.screenshot({path:path.join(output,mode+'-failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await context.close();await anonymous.auth.signOut({scope:'local'});}
