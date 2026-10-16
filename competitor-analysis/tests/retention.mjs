// Actual server actions, provider-boundary mocks only. No network, API keys or live writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';

const mocks = {
  'next/cache': 'export const revalidatePath = () => {};',
  '@/lib/access': 'export const requireProgramAccess = async () => ({id:"member-a"}); export const logProgramUsage=async()=>{};',
  '@/lib/supabase/server': 'export const createClient = async () => globalThis.retentionFixture.client;',
  '@/lib/apiKeys': 'export const resolveApiKey = async (_, user, provider) => { if(user!=="member-a") throw Error("foreign key"); return globalThis.retentionFixture.missingKey === provider ? null : "mock-own-"+provider; };',
  '@/lib/serp/client': 'export const searchSerp=(...args)=>globalThis.retentionFixture.search(...args); export const extractDomain=link=>new URL(link).hostname;',
  '@/lib/ai/research': 'export const researchCompanyByDomain=(...args)=>globalThis.retentionFixture.research(...args); export const extractCompanyName=async text=>"Own "+text;',
  '@/lib/ai/analysis': 'export const analyzeKeywordCompetitors=(...args)=>globalThis.retentionFixture.analyze(...args);',
  '@/lib/ai/report': 'export const generateHtmlReport=(...args)=>globalThis.retentionFixture.report(...args);',
};
const output = await build({ entryPoints: ['lib/actions/analysis.ts'], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{name:'provider-mocks',setup(b){
  b.onResolve({filter:/.*/},args=>mocks[args.path] ? {path:args.path,namespace:'mock'} : undefined);
  b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
}}] });
const actions = await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const day = 86400000, stamp = days => new Date(Date.now()-days*day).toISOString();
const checks=[]; const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};
function fixture() {
  const state = {
    reads:[], writes:[], paid:[], researchCalls:[], reportCalls:0,
    rows:{
      competitor_keywords:[{id:'keyword-a',user_id:'member-a',keyword:'test',engine:'google'}],
      competitor_serp_jobs:[], competitor_serp_results:[],
      competitor_company_profiles:[
        {user_id:'member-a',domain:'own.invalid',company_name:'Own latest',created_at:stamp(1)},
        {user_id:'member-a',domain:'own.invalid',company_name:'Own older',created_at:stamp(5)},
        {user_id:'member-b',domain:'foreign.invalid',company_name:'Foreign private',created_at:stamp(0)},
        {user_id:'member-a',domain:'expired.invalid',company_name:'Expired private',created_at:stamp(31)},
      ],
      competitor_analyses:[{id:'expired-analysis',user_id:'member-a',keyword_id:'keyword-a',summary_text:'EXPIRED',created_at:stamp(31)}],
    },
    async search(_engine,_args,key) { assert.equal(key,'mock-own-serpapi'); state.paid.push('serp'); return {totalResults:3,searchId:'mock-search',items:['own.invalid','foreign.invalid','expired.invalid'].map(domain=>({link:'https://'+domain,title:domain,resultType:'organic'}))}; },
    async research(domain,key) { assert.equal(key,'mock-own-perplexity');state.researchCalls.push(domain); return domain; },
    async analyze({competitorNames},key) { assert.equal(key,'mock-own-openai'); assert.equal(competitorNames.get('own.invalid'),'Own latest'); assert.equal(competitorNames.get('foreign.invalid'),'Own foreign.invalid'); assert.equal(competitorNames.get('expired.invalid'),'Own expired.invalid'); state.paid.push('analysis'); return 'Own report'; },
    async report(_text,key) { assert.equal(key,'mock-own-anthropic');state.reportCalls++; return '<p>Own</p>'; },
  };
  state.client = {from(table) {
    assert.notEqual(table,'competitor_profiles','legacy table access forbidden');
    let single=false, mode='read',payload=null;const filters=[],orders=[]; const q={};
    q.select=()=>q;q.eq=(k,v)=>{filters.push(['eq',k,v]);return q;};q.in=(k,v)=>{filters.push(['in',k,v]);return q;};q.gt=(k,v)=>{filters.push(['gt',k,v]);return q;};q.order=(k,options)=>{orders.push([k,options]);return q;};
    q.insert=value=>{mode='insert';payload=value;return q;};q.update=value=>{mode='update';payload=value;return q;};q.maybeSingle=q.single=()=>{single=true;return q;};
    q.then=(resolve,reject)=>{
      let rows=state.rows[table]??[];
      if(mode==='insert') {
        rows=(Array.isArray(payload)?payload:[payload]).map((r,i)=>({id:table+'-'+i,created_at:stamp(0),...r}));state.rows[table].push(...rows);state.writes.push({table,mode,rows});
      } else {
        rows=rows.filter(row=>filters.every(([op,k,v])=>op==='eq'?row[k]===v:op==='gt'?row[k]>v:v.includes(row[k])));
        for(const [k,{ascending}] of orders) rows.sort((a,b)=>(a[k]<b[k]?-1:a[k]>b[k]?1:0)*(ascending?1:-1));
        if(mode==='update') {if(state.expireOnSave) rows=[];else rows.forEach(r=>Object.assign(r,payload));state.writes.push({table,mode,filters});}
        else state.reads.push({table,filters});
      }
      return Promise.resolve({data:single?rows[0]??null:rows,error:null}).then(resolve,reject);
    };return q;
  }};
  globalThis.retentionFixture=state; return state;
}
let state=fixture();
assert.ok((await actions.runKeywordAnalysisAction('keyword-a')).jobId);
assert.deepEqual(state.researchCalls.sort(),['expired.invalid','foreign.invalid']);
ok('다른 회원·30일 만료 회사정보는 재사용하지 않고 본인 키로 재조사');
assert.ok(state.reads.filter(q=>q.table==='competitor_company_profiles').every(q=>q.filters.some(f=>f[0]==='eq'&&f[1]==='user_id'&&f[2]==='member-a')&&q.filters.some(f=>f[0]==='gt'&&f[1]==='created_at')));
assert.ok(state.writes.every(w=>w.mode!=='insert'||w.rows.every(r=>r.user_id==='member-a')));
ok('회사정보 모든 조회에 소유자·기한, 모든 저장에 본인 소유자 지정');
assert.equal(state.rows.competitor_company_profiles.find(r=>r.company_name==='Own latest').created_at.startsWith(stamp(1).slice(0,10)),true);
ok('유효한 본인 최신 조사만 재사용·생성일 연장 없음');
assert.match((await actions.generateReportAction('expired-analysis')).error,/찾을 수 없습니다/);
assert.equal(state.reportCalls,0);ok('만료된 분석은 리포트 유료 호출 전에 차단');
const analysis=state.rows.competitor_analyses.find(r=>r.summary_text==='Own report');
assert.deepEqual(await actions.generateReportAction(analysis.id),{});
assert.ok(state.writes.at(-1).filters.some(f=>f[1]==='user_id'&&f[2]==='member-a'));
ok('리포트 갱신에도 본인·기한 제한');
state.expireOnSave=true;assert.match((await actions.generateReportAction(analysis.id)).error,/보관기간/);ok('리포트 생성 중 만료·삭제되면 저장 성공으로 오판하지 않음');
state=fixture();state.missingKey='perplexity';assert.deepEqual(await actions.runKeywordAnalysisAction('keyword-a'),{needsApiKey:'perplexity'});assert.deepEqual(state.paid,[]);assert.deepEqual(state.writes,[]);ok('본인 키 없으면 대체 키·분석·저장 없이 등록 안내');
await fs.mkdir('docs/evidence',{recursive:true});
await fs.writeFile('docs/evidence/member-retention-actions.json',JSON.stringify({candidate:'v1.08',checked_at:new Date().toISOString(),mode:'actual actions; mocked DB/providers, no live writes or paid requests',checks,paid_network_calls:0},null,2));
