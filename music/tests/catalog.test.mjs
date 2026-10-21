import {test} from 'node:test';
test('explicit custom models validate provider prefixes and reject paths, arbitrary URLs and malformed flags',()=>{
 for(const [provider,model] of [['gemini','gemini-2.5-flash'],['openai','gpt-4.1-mini'],['anthropic','claude-sonnet-4-6']]) {
  assert.equal(validateBrief({...DEFAULT_BRIEF,concept:'새 음악 기획',provider,model,customModel:true}).model,model);
 }
 for(const model of ['https://external.example/model','gemini/secret','claude-sonnet-4-6','gemini-'])
  assert.throws(()=>validateBrief({...DEFAULT_BRIEF,concept:'새 음악 기획',provider:'gemini',model,customModel:true}));
 assert.throws(()=>validateBrief({...DEFAULT_BRIEF,concept:'새 음악 기획',customModel:'true'}));
});
import assert from 'node:assert/strict';
import {LIBRARY,filterLibrary,applyPreset,automaticExclude,joinTags,insertSection,syncStyleControls,STYLE_PALETTE} from '../lib/studio/catalog.ts';
import {DEFAULT_BRIEF,ERAS,VOICES,TITLE_LANGUAGES} from '../lib/studio/config.ts';
import {validateBrief,validateStore,styleIssues,parseGenerated} from '../lib/studio/validation.ts';
import {generationTargets,assertTargets,mergeSong} from '../lib/studio/generation.ts';
import {blankStore,mergeBackup} from '../lib/studio/storage.ts';
import {musicPrompt} from '../lib/studio/prompt.ts';
const b={...DEFAULT_BRIEF,concept:'도시의 밤을 지나 새로운 아침으로'};
const filter={market:'',era:'',group:'',type:'',query:'',bpm:''};
const track={id:'keep-id',title:'직접 쓴 제목',summary:'직접 설명',style:'warm piano, 90 BPM',exclude:'distortion',bpm:90,lyrics:'직접 쓴 가사',hook:'기존 훅',reviewed:true};
test('public selector metadata covers all 461 reference choices, 243 groups and 200 dance choices',()=>{
 assert.equal(LIBRARY.length,661);assert.equal(LIBRARY.filter(p=>p.type==='reference').length,200);
 assert.equal(LIBRARY.filter(p=>p.type==='template').length,261);assert.equal(LIBRARY.filter(p=>p.type==='dance').length,200);
 assert.equal(new Set(LIBRARY.filter(p=>p.type!=='dance').map(p=>p.group)).size,243);
 assert.equal(new Set(LIBRARY.map(p=>p.id)).size,LIBRARY.length);
});
test('every selectable recipe and artist variation is valid, retains controls and has usable English Style',()=>{
 for(const p of LIBRARY)for(const v of p.type==='reference'?['기본','발라드','축제']:['기본']){
  const next=applyPreset({...b,harmony:true,differentRapVoice:true,rapPct:50,voice:'여성 듀엣'},p,v);
  assert.deepEqual(styleIssues(next.style),[],`${p.name} / ${v}`);assert.equal(next.voice,'여성 듀엣');assert.equal(next.differentRapVoice,true);
  assert.equal(next.locked,true);assert.equal(next.generateStyle,false);validateBrief(next);
 }
});
test('era group and market filters always return matching rows, never stale unrelated presets',()=>{
 for(const era of ERAS){const pool=filterLibrary({...filter,era});assert.ok(pool.length,era);assert.ok(pool.every(p=>p.eras.includes(era)));}
 for(const group of new Set(LIBRARY.map(p=>p.group))){const pool=filterLibrary({...filter,group});assert.ok(pool.every(p=>p.group===group));}
 assert.equal(filterLibrary({...filter,query:'does-not-exist-123456'}).length,0);
 assert.ok(filterLibrary({...filter,type:'reference',query:'BTS'}).length);
 assert.equal(filterLibrary({...filter,market:'한국 가요'}).length,122);assert.equal(filterLibrary({...filter,market:'POP'}).length,115);
});
test('control changes immediately update Style without deleting custom musical tags',()=>{
 const old={...b,style:'custom texture, acoustic pop, 90 BPM, melodic vocals, natural vocals'};
 const rap=syncStyleControls(old,{...old,rapPct:100,bpm:140});assert.match(rap.style,/custom texture/);assert.match(rap.style,/rapped hook/);assert.doesNotMatch(rap.style,/90 BPM|melodic vocals/i);
 const off=syncStyleControls(rap,{...rap,rapPct:0,bpmHint:false});assert.doesNotMatch(off.style,/rapped hook|bpm/i);assert.match(off.style,/custom texture/);
 const manual={...old,style:'manually replaced'};assert.equal(syncStyleControls(old,manual).style,'manually replaced');
});
test('all offered musical tags are ASCII and do not carry imitation instructions',()=>{
 for(const tags of Object.values(STYLE_PALETTE))for(const tag of tags)assert.deepEqual(styleIssues(tag),[],tag);
 assert.equal(joinTags('Piano, piano',['PIANO','bass']),'Piano, bass');
});
test('dance BPM buckets use all range endpoints, half-time hints and strict upper boundary',()=>{
 for(const range of ['40-110','110-125','125-135','135-145','145-160','160-200','200-321']){
  const [lo,hi]=range.split('-').map(Number);assert.ok(filterLibrary({...filter,type:'dance',bpm:range}).every(p=>p.bpmHints.some(n=>n>=lo&&n<hi)));
 }
});
test('voice casting, separate rap voice, high-note restraint and instrumental recipe do not leak incompatible controls',()=>{
 for(const voice of VOICES)validateBrief({...b,voice});for(const titleLanguage of TITLE_LANGUAGES)validateBrief({...b,titleLanguage});
 const p=musicPrompt({...b,differentRapVoice:true,rapVoice:'남성 그룹',voice:'여성 듀엣',rapPct:50,highPitchRestraint:true,titleLanguage:'일본어'},'song');
 assert.match(p.system,/separate performer/);assert.match(p.system,/male vocal group/);assert.match(p.system,/Restrict high notes/);assert.match(p.system,/일본어/);
 const inst=musicPrompt({...b,instrumental:true,differentRapVoice:true,highPitchRestraint:true,rapPct:50},'song');assert.doesNotMatch(inst.system,/separate performer|Restrict high notes/);
 for(const patch of [{titleLanguage:'invalid'},{era:'1800s'},{rapVoice:'invalid'},{generateStyle:'false'},{bpm:321}])assert.throws(()=>validateBrief({...b,...patch}));
 assert.equal(validateBrief({...b,bpm:320}).bpm,320);
});
test('automatic exclusions disappear when controls are disabled, retain manual exclusions and deduplicate',()=>{
 const pure={...b,rapPct:100,highPitchRestraint:true,exclude:'distortion'};
 assert.match(automaticExclude(pure),/singing/);assert.match(automaticExclude(pure),/extreme high notes/);
 assert.equal(automaticExclude({...pure,rapPct:0,highPitchRestraint:false}),'distortion');
 assert.equal(joinTags('piano, piano',['piano','bass']),'piano, bass');
});
test('partial generation merges only selected fields and preserves ID title Style BPM manual lyrics as appropriate',()=>{
 const generated={...track,id:'new',title:'AI 제목',style:'rock',bpm:120,lyrics:'AI 가사',hook:'AI 훅',reviewed:false};
 const lyricsOnly=mergeSong(track,generated,{...b,generateTitle:false,generateStyle:false});
 assert.equal(lyricsOnly.id,track.id);assert.equal(lyricsOnly.title,track.title);assert.equal(lyricsOnly.style,track.style);assert.equal(lyricsOnly.bpm,track.bpm);assert.equal(lyricsOnly.lyrics,'AI 가사');assert.equal(lyricsOnly.reviewed,false);
 const styleOnly=mergeSong(track,generated,{...b,generateTitle:false,generateLyrics:false});assert.equal(styleOnly.lyrics,track.lyrics);assert.equal(styleOnly.hook,track.hook);assert.equal(styleOnly.title,track.title);assert.equal(styleOnly.style,'rock');
});
test('unselected fields may be empty, selected fields must validate; zero effective targets reject before a request',()=>{
 const selection={title:false,style:false,lyrics:true};const raw={title:'기획',summary:'설명',tracks:[{...track,title:'',style:'',lyrics:'새 가사'}]};
 assert.equal(parseGenerated(JSON.stringify(raw),1,true,selection).tracks[0].lyrics,'새 가사');
 assert.throws(()=>parseGenerated(JSON.stringify(raw),1,true,{...selection,style:true}));
 assert.throws(()=>parseGenerated(JSON.stringify({...raw,tracks:[{...raw.tracks[0],lyrics:''}]}),1,true,selection));
 assert.throws(()=>assertTargets({...b,generateTitle:false,generateStyle:false,generateLyrics:false}));
 assert.throws(()=>assertTargets({...b,generateTitle:false,generateStyle:false,instrumental:true}));
 assert.deepEqual(generationTargets(b),{title:true,style:true,lyrics:true});
});
test('context toggle removes current lyrics and title from prompt without losing new controls',()=>{
 const on=musicPrompt(b,'song',track),off=musicPrompt({...b,useContext:false},'song',track);
 assert.match(on.user,/직접 쓴 가사/);assert.doesNotMatch(off.user,/직접 쓴 가사|직접 쓴 제목/);assert.match(off.user,/도시의 밤/);
});
test('legacy v1 backups recover new settings and style library without changing member draft content',()=>{
 const old=blankStore();delete old.styles;for(const k of ['era','market','styleGroup','presetId','titleLanguage','highPitchRestraint','differentRapVoice','rapVoice','bpmHint','useContext','generateTitle','generateStyle','generateLyrics'])delete old.draft.brief[k];old.draft.song=track;
 const migrated=validateStore(old);assert.equal(migrated.draft.song.lyrics,track.lyrics);assert.equal(migrated.draft.brief.titleLanguage,'자동');assert.deepEqual(migrated.styles,[]);
});
test('style presets merge by ID, survive JSON backup and reject malformed imports without mutating originals',()=>{
 const a=blankStore();a.styles=[{id:'style-a',name:'기준',style:'piano',exclude:'',bpm:80,savedAt:new Date().toISOString()}];const incoming=structuredClone(a);incoming.styles.push({...a.styles[0],id:'style-b'});
 const result=mergeBackup(a,incoming);assert.deepEqual(result.styles.map(s=>s.id),['style-a','style-b']);assert.equal(a.styles.length,1);
 assert.throws(()=>mergeBackup(a,{...incoming,styles:[{...a.styles[0],bpm:999}]}));
 assert.throws(()=>validateStore({...a,styles:[a.styles[0],a.styles[0]]}));
});
test('section insertion replaces only selected text, keeps surrounding lyrics and rejects length overflow',()=>{
 assert.deepEqual(insertSection('첫 줄\n끝',4,4,'Chorus'),{text:'첫 줄\n[Chorus]\n끝',cursor:13});
 assert.equal(insertSection('abcxyz',3,6,'Bridge').text,'abc\n[Bridge]\n');
 assert.throws(()=>insertSection('a'.repeat(5000),5000,5000,'Outro'));assert.throws(()=>insertSection('',0,0,'invalid'));
});
