const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const checks=[];function ok(name){checks.push({name,passed:true});console.log('PASS',name);}
let state,reads=[];
function load(file,mocks){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:n=>{if(n==='server-only')return {};if(n in mocks)return mocks[n];throw Error('Unexpected import '+n);},process:{env:{NEXT_PUBLIC_MAIN_SITE_URL:'https://main.example',OPENAI_API_KEY:'operator-must-not-be-used'}},console,Date,Buffer},{filename:file});return exports;}
const member={auth:{getUser:async()=>({data:{user:state.signedOut?null:{id:'member-a'}}})},from(){throw Error('Permission query used member RLS client');}};
const admin={from(table){const filters=[],b={select(columns){b.columns=columns;return b;},eq(k,v){filters.push([k,v]);return b;},maybeSingle(){return b;},single(){return b;},then(resolve,reject){reads.push({table,filters});let data;
 if(table==='profiles')data=b.columns.includes('grade:')?{grade:{sort_order:state.grade??1}}:{is_admin:!!state.admin,is_suspended:!!state.suspended,phone:state.phone===false?null:'01012345678'};
 if(table==='programs')data={id:'program-a',required_grade_id:'grade-a',badges:state.free?['free']:[]};
 if(table==='subscriptions')data=state.sub?[{status:'active',expires_at:state.expired?'2000-01-01':'2999-01-01'}]:[];
 if(table==='user_program_access')data=state.grant?{expires_at:state.expired?'2000-01-01':'2999-01-01'}:null;
 if(table==='member_grades')data={sort_order:1};
 return Promise.resolve({data,error:null}).then(resolve,reject);}};return b;}};
const redirect=url=>{throw Error('REDIRECT:'+url);};
const access=load('lib/access.ts',{'next/navigation':{redirect},'@/lib/auth':{requireUser:async()=>{if(state.signedOut)redirect('/login');return {id:'member-a'};}},'@/lib/supabase/server':{createClient:async()=>member},'@/lib/supabase/admin':{createAdminClient:()=>admin}});
(async()=>{try{
 const cases=[['관리자',{admin:true},true],['FREE',{free:true},true],['활성 구독',{sub:true},true],['등급+이용기간',{grant:true},true],['권한 없음',{},false],['낮은 등급',{grant:true,grade:0},false],['만료 기간',{grant:true,expired:true},false],['만료 구독',{sub:true,expired:true},false],['정지 관리자',{admin:true,suspended:true},false],['정지 FREE',{free:true,suspended:true},false],['핸드폰 없는 FREE',{free:true,phone:false},false],['비로그인',{signedOut:true},false]];
 for(const [name,s,allowed] of cases){state=s;reads=[];const result=await access.checkProgramAccessApi();assert.equal(result.allowed,allowed,name+' API');let accepted=false;try{await access.requireProgramAccess();accepted=true;}catch(e){assert.match(e.message,/^REDIRECT:/);}assert.equal(accepted,allowed,name+' page');ok(name+' 페이지/API 일치');}
 const keyRows=[{user_id:'member-a',provider:'openai',api_key:'own-a'},{user_id:'member-b',provider:'anthropic',api_key:'own-b'}];
 const keys=load('lib/apiKeys.ts',{'./apiKeyLabels':{PROVIDER_LABELS:{}}});
 function keyClient(){const f=[],b={from(){return b},select(){return b},eq(k,v){f.push([k,v]);return b},async maybeSingle(){return {data:keyRows.find(r=>f.every(([k,v])=>r[k]===v))??null}}};return b;}
 assert.equal(await keys.resolveApiKey(keyClient(),'member-a','openai'),'own-a');assert.equal(await keys.resolveApiKey(keyClient(),'member-a','anthropic'),null);assert.equal(await keys.resolveApiKey(keyClient(),'no-member','openai'),null);ok('본인 AI 키만·타 회원/운영자 키 폴백 없음');
 const {formatDateTimeKo}=load('lib/formatDate.ts',{});assert.equal(formatDateTimeKo('2026-10-16T16:05:00.000Z'),'2026년 10월 17일 오전 1:05');assert.equal(formatDateTimeKo('2026-10-17T03:00:00.000Z'),'2026년 10월 17일 오후 12:00');ok('서버 시간대와 무관한 한국 날짜·오전/오후');
 }catch(e){checks.push({name:'FAILED',passed:false,error:e.message});process.exitCode=1;console.error(e.message);}finally{fs.writeFileSync('docs/evidence/permissions.json',JSON.stringify({checked_at:new Date().toISOString(),mode:'actual permission/key/time functions with synthetic auth/admin/member boundaries',checks,network_calls:0},null,2));}})();
