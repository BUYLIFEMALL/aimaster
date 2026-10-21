import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BRIEF, PRESETS, recipe } from '../lib/studio/config.ts';
import { validateBrief, validateStore, parseGenerated, styleIssues } from '../lib/studio/validation.ts';
import { musicPrompt } from '../lib/studio/prompt.ts';
import { blankStore, storageKey, mergeBackup } from '../lib/studio/storage.ts';
import { runLyricQueue } from '../lib/studio/queue.ts';
import { callModel } from '../lib/studio/ai.ts';
const brief={...DEFAULT_BRIEF,concept:'도시에서 새로운 시작을 앞둔 사람의 마음'};
const song=(n=1)=>({id:`t-${n}`,title:`곡 ${n}`,summary:'희망적인 어쿠스틱 음악',style:'acoustic pop, warm piano, 90 BPM',exclude:'',lyrics:'',bpm:90,hook:'다시 한 걸음',reviewed:false});
const output=(n=1)=>({title:'새로운 시작',summary:'도시의 하루',tracks:Array.from({length:n},(_,i)=>song(i+1))});
test('request rejects unsupported model, provider mismatch, invalid counts and ratios',()=>{
  assert.deepEqual(validateBrief(brief),brief);
  for(const patch of [{model:'untrusted-model'},{provider:'openai'},{count:13},{count:2},{bpm:NaN},{rapPct:101},{englishPct:-1},{concept:''},{instrumental:'false'}]) assert.throws(()=>validateBrief({...brief,...patch}));
});
test('locked style requires usable English musical attributes',()=>{
  assert.throws(()=>validateBrief({...brief,locked:true,style:''}));
  assert.ok(styleIssues('한국 발라드').length);assert.ok(styleIssues('sound like a named singer').length);
  assert.deepEqual(styleIssues('piano, warm vocals, 80 BPM'),[]);
});
test('all original preset recipes fit the Style requirements',()=>{
  for(const p of PRESETS) assert.deepEqual(styleIssues(recipe({...brief,...p})),[]);
  assert.match(recipe({...brief,rapPct:100}),/from start to finish/);
  const instrumental=recipe({...brief,instrumental:true,rapPct:100});assert.match(instrumental,/no vocals/);assert.doesNotMatch(instrumental,/rap vocals/);
});
test('current year, pure rap hooks, mix ratios, album count and fixed styles reach prompt',()=>{
  const p=musicPrompt({...brief,rapPct:100,englishPct:25,locked:true,style:'hip hop',count:12},'album');
  assert.match(p.system,new RegExp(String(new Date().getFullYear())));assert.match(p.system,/Exactly 12 tracks/);assert.match(p.system,/Rapped Hook/);assert.match(p.system,/MUST exactly equal/);
  const s=musicPrompt({...brief,englishPct:25},'song');assert.match(s.system,/Korean 75% \/ English 25%/);
});
test('generated output accepts fenced valid JSON, rejects malformed and missing fields',()=>{
  const raw=output();assert.equal(parseGenerated('```json\n'+JSON.stringify(raw)+'\n```',1,false).tracks.length,1);
  assert.throws(()=>parseGenerated('{"tracks":',1,false));
  assert.throws(()=>parseGenerated(JSON.stringify(raw),3,false));
  assert.throws(()=>parseGenerated(JSON.stringify(raw),1,true));
  raw.tracks[0].style='한국어';assert.throws(()=>parseGenerated(JSON.stringify(raw),1,false));
});
test('duplicate album titles and invalid BPM fail instead of invented recovery',()=>{
  const a=output(3);a.tracks[1].title=a.tracks[0].title;assert.throws(()=>parseGenerated(JSON.stringify(a),3,false));
  a.tracks[1].title='다른 곡';a.tracks[0].bpm=999;assert.throws(()=>parseGenerated(JSON.stringify(a),3,false));
});
test('member storage is isolated and backup strips unknown secret-like fields',()=>{
  assert.notEqual(storageKey('member-one'),storageKey('member-two'));assert.throws(()=>storageKey(''));
  const a=blankStore();a.apiKey='sensitive-fixture';a.draft.brief.apiKey='sensitive-fixture';
  const safe=validateStore(a);assert.doesNotMatch(JSON.stringify(safe),/sensitive-fixture/);
});
test('unfinished edited draft is preserved, including temporarily blank style/title',()=>{
  const a=blankStore();a.draft.song={...song(),title:'',style:'수정 중',lyrics:'직접 작성한 가사'};a.draft.brief.genre='';
  const safe=validateStore(a);assert.equal(safe.draft.song.lyrics,'직접 작성한 가사');assert.equal(safe.draft.song.style,'수정 중');
});
test('backup merge preserves current saved work, deduplicates and rejects unsupported schema',()=>{
  const a=blankStore();a.saved=[{id:'existing',name:'보관곡',savedAt:new Date().toISOString(),draft:a.draft}];
  const b=structuredClone(a);b.saved.push({...b.saved[0],id:'new',name:'새 곡'});
  const merged=mergeBackup(a,b);assert.deepEqual(merged.saved.map(s=>s.id),['existing','new']);assert.throws(()=>mergeBackup(a,{...b,schema:99}));assert.equal(a.saved.length,1);
});
test('queue skips completed songs, preserves successful results and stops on failure without retry',async()=>{
  const tracks=[{...song(1),lyrics:'완성 가사'},song(2),song(3),song(4)];const calls=[];const results=[];
  await assert.rejects(()=>runLyricQueue(tracks,new AbortController().signal,async t=>{calls.push(t.id);if(t.id==='t-3')throw new Error('limit');return 'new lyrics';},(t,l)=>results.push([t.id,l])));
  assert.deepEqual(calls,['t-2','t-3']);assert.deepEqual(results,[['t-2','new lyrics']]);assert.equal(tracks[0].lyrics,'완성 가사');
});
test('cancelled late response is discarded and no next track is billed',async()=>{
  const c=new AbortController();let calls=0;const results=[];
  await runLyricQueue([song(1),song(2)],c.signal,async()=>{calls++;c.abort();return 'late response';},(t,l)=>results.push(l));
  assert.equal(calls,1);assert.deepEqual(results,[]);
});
test('already cancelled or finished album performs zero requests',async()=>{
  const c=new AbortController();c.abort();let calls=0;const call=async()=>{calls++;return 'lyrics';};
  await runLyricQueue([song()],c.signal,call,()=>{});await runLyricQueue([{...song(),lyrics:'ready'}],new AbortController().signal,call,()=>{});assert.equal(calls,0);
});
test('provider uses selected model and combines all Anthropic text blocks',async()=>{
  let sent;const send=async(u,options)=>{sent={url:u,...options};return Response.json({content:[{type:'thinking',text:'ignore'},{type:'text',text:'first'},{type:'text',text:'second'}]});};
  const result=await callModel('anthropic','claude-sonnet-5-5','fixture-key','system','user',new AbortController().signal,send);
  assert.equal(result,'first\nsecond');assert.equal(JSON.parse(sent.body).model,'claude-sonnet-5-5');assert.equal(JSON.parse(sent.body).max_tokens,8192);
});
test('Gemini key stays out of URL and parses multi-part text',async()=>{
  let url;const send=async(u)=>{url=u;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'a'},{text:'b'}]}}]});};
  assert.equal(await callModel('gemini','gemini-3.8-flash','fixture-key','s','u',new AbortController().signal,send),'ab');assert.doesNotMatch(url,/fixture-key/);
});
test('API errors redact supplier bodies and do not retry',async()=>{
  let count=0;const send=async()=>{count++;return new Response('fixture-secret-supplier-error',{status:429});};
  await assert.rejects(()=>callModel('openai','gpt-4.1','fixture-key','s','u',new AbortController().signal,send),e=>e.status===429 && !e.message.includes('fixture-secret'));assert.equal(count,1);
});
test('truncated or empty AI responses fail before overwriting existing work',async()=>{
  await assert.rejects(()=>callModel('openai','gpt-4.1','fixture','s','u',new AbortController().signal,async()=>Response.json({choices:[{finish_reason:'length',message:{content:'partial'}}]})));
  await assert.rejects(()=>callModel('anthropic','claude-sonnet-5-5','fixture','s','u',new AbortController().signal,async()=>Response.json({content:[]})));
  await assert.rejects(()=>callModel('anthropic','claude-sonnet-5-5','fixture','s','u',new AbortController().signal,async()=>Response.json({stop_reason:'max_tokens',content:[{type:'text',text:'partial'}]})));
});
