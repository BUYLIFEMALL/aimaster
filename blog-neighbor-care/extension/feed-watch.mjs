export const FEED_ALARM='bnc-feed-watch';
const CHECK_EVERY=15*60000,SYNC_EVERY=60*60000,BLOCK_FOR=60*60000,OFFLINE_LIMIT=24*60*60000,MAX_READS=20,START_BUDGET=25000,READ_GAP=1000,MAX_BYTES=1048576,KEEP_SEEN=200,MAX_COUNT=5000;
const FIRST_READ_WINDOW=7*24*60*60000,KEY='feedWatch',OWNER=/^[a-z0-9_-]{1,50}$/;
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const decode=text=>text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]+);/gi,(all,code)=>{
 if(code[0]!=='#')return ENTITIES[code.toLowerCase()]??all;
 const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);
 return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
});
const field=(block,tag)=>{
 const m=new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,'i').exec(block);if(!m)return '';
 const cdata=/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(m[1]);
 return (cdata?cdata[1]:decode(m[1])).trim();
};
const plain=text=>text.replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f​-‏﻿]/g,' ').replace(/\s+/g,' ').trim();
function postOf(link,owner){
 let url;try{url=new URL(link);}catch{return null;}
 if(url.protocol!=='https:'&&url.protocol!=='http:'||!['blog.naver.com','m.blog.naver.com'].includes(url.hostname))return null;
 const path=/^\/([A-Za-z0-9_-]{1,50})\/(\d{1,30})\/?$/.exec(url.pathname);
 const blog=path?path[1]:url.searchParams.get('blogId'),postId=path?path[2]:url.searchParams.get('logNo');
 return String(blog).toLowerCase()===owner&&/^\d{1,30}$/.test(String(postId))?postId:null;
}
/** A service worker has no DOM parser. Only title, post number and date leave this function; the excerpt never does. */
export function parseFeedPosts(xml,owner){
 if(!OWNER.test(owner)||typeof xml!=='string'||xml.length>MAX_BYTES||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<rss[\s>]/i.test(xml))throw Error('Feed format');
 const seen=new Set(),posts=[];
 for(const [,block] of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
  const postId=postOf(field(block,'link'),owner);if(!postId)throw Error('Feed owner');
  const title=plain(field(block,'title'));if(!title||title.length>500||seen.has(postId))continue;
  const date=Date.parse(field(block,'pubDate'));seen.add(postId);
  posts.push({postId,title,publishedAt:Number.isFinite(date)?new Date(date).toISOString():null});
  if(posts.length===50)break;
 }
 return posts;
}
async function readFeed(owner,fetcher){
 const r=await fetcher(`https://rss.blog.naver.com/${owner}.xml`,{redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Object.assign(Error('Feed unavailable'),{status:r.status});
 const bytes=await r.arrayBuffer();if(bytes.byteLength>MAX_BYTES)throw Error('Feed size');
 return parseFeedPosts(new TextDecoder('utf-8').decode(bytes),owner);
}
/** Reads public feeds from this PC. The server is called only when a post has not been seen, and about once an hour to check the session. */
export function createFeedWatch(browser,api,fetcher=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))){
 let busy=false;
 const read=async()=>(await browser.storage.local.get(KEY))[KEY]??null;
 const save=s=>browser.storage.local.set({[KEY]:s});
 const alarmOn=()=>browser.alarms.create(FEED_ALARM,{delayInMinutes:0.5,periodInMinutes:5});
 async function clear(){await browser.alarms?.clear(FEED_ALARM);await browser.storage.local.remove(KEY);}
 const describe=s=>{
  if(!s)return {active:false,message:'꺼짐 · 프로그램에서 이웃을 고르고 시작하세요.'};
  const when=t=>t?new Date(t).toLocaleString('ko-KR'):'아직 없음';
  return {active:true,neighbors:s.neighbors.length,message:`${s.blockedUntil>now()?'잠시 대기 중 · 네이버가 읽기를 제한해 1시간 뒤 다시 시도합니다':'확인 중'} · 이웃 ${s.neighbors.length}명 · 마지막 확인 ${when(s.lastReadAt)} · 이번에 저장한 새 글 ${s.savedCount}건${s.failures>0?` · 연속 실패 ${s.failures}회`:''}`};
 };
 async function sync(){
  const s=await read();
  const r=await api('sync',{reads:Math.min(s?.reads??0,MAX_COUNT),failures:Math.min(s?.failures??0,MAX_COUNT),lastReadAt:s?.lastReadAt?new Date(s.lastReadAt).toISOString():null});
  if(!r.active){await clear();return describe(null);}
  const same=s?.sessionId===r.sessionId;
  const next={sessionId:r.sessionId,neighbors:r.neighbors,expiresAt:Date.parse(r.expiresAt),syncedAt:now(),reads:0,failures:same?s.failures:0,lastReadAt:same?s.lastReadAt:null,savedCount:same?s.savedCount:0,blockedUntil:same?s.blockedUntil:0,rows:same?s.rows:{}};
  await save(next);await alarmOn();return describe(next);
 }
 async function stop(){
  const s=await read();if(s)await api('stop',{sessionId:s.sessionId});
  await clear();return {active:false,message:'새 글 확인을 중단했습니다.'};
 }
 // A failed report leaves the post unseen, so the next due check sends it again; saving the same post twice changes nothing.
 async function checkOne(s,owner){
  const row=s.rows[owner]??{checkedAt:0,seen:[]};
  s.rows[owner]={...row,checkedAt:now()};s.reads++;
  let posts;
  try{posts=await readFeed(owner,fetcher);}
  catch(e){s.failures++;await save(s);return e.status===403||e.status===429?'blocked':'next';}
  s.failures=0;s.lastReadAt=now();
  const known=new Set(row.seen),first=row.seen.length===0;
  // A feed's backlog is not news: the first read only stores what appeared in the last week. A post without a date stays out of that first batch.
  const fresh=posts.filter(p=>!known.has(p.postId)&&(!first||(p.publishedAt&&now()-Date.parse(p.publishedAt)<=FIRST_READ_WINDOW)));
  if(fresh.length){
   const r=await api('report',{sessionId:s.sessionId,neighborId:owner,posts:fresh});
   s.savedCount+=r.savedCount??0;
  }
  s.rows[owner].seen=[...posts.map(p=>p.postId),...row.seen.filter(id=>!posts.some(p=>p.postId===id))].slice(0,KEEP_SEEN);
  await save(s);return 'next';
 }
 async function alarm(name){
  if(name!==FEED_ALARM||busy)return;busy=true;const started=now();
  try{
   let s=await read();if(!s){await browser.alarms.clear(FEED_ALARM);return;}
   if(started>=s.expiresAt||started-s.syncedAt>=SYNC_EVERY){
    try{await sync();}catch(e){if(e.status===401||e.status===403){await clear();return;}}
    s=await read();if(!s)return;
    // A session that cannot be confirmed for a day no longer counts as the member's current choice.
    if(started>=s.expiresAt||started-s.syncedAt>=OFFLINE_LIMIT)return;
   }
   if(s.blockedUntil>started)return;
   const due=s.neighbors.filter(n=>started-(s.rows[n]?.checkedAt??0)>=CHECK_EVERY).sort((a,b)=>(s.rows[a]?.checkedAt??0)-(s.rows[b]?.checkedAt??0)).slice(0,MAX_READS);
   for(const [i,owner] of due.entries()){
    if(now()-started>=START_BUDGET)break;
    if(i)await sleep(READ_GAP);
    let outcome;
    try{outcome=await checkOne(s,owner);}
    catch(e){
     if(e.status===401||e.status===403){await clear();return;}
     await save(s);
     // The session or neighbor list changed: ask the server before reading anything else.
     if(e.status===409){s.syncedAt=0;await save(s);}
     break;
    }
    if(outcome==='blocked'){s.blockedUntil=now()+BLOCK_FOR;await save(s);break;}
   }
  }finally{busy=false;}
 }
 async function resume(){if(await read())await alarmOn();}
 return {sync,stop,clear,alarm,resume,status:async()=>describe(await read())};
}
