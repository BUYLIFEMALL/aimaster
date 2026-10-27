import {createRoot} from 'react-dom/client';
import {NeighborImportPanel} from '../src/components/analysis/NeighborImportPanel';
const account='33333333-3333-4333-8333-333333333333',id='11111111-1111-4111-8111-111111111111';
const source=[{blogId:'synthetic-mutual',relation:'mutual'},{blogId:'synthetic-ordinary',relation:'one_way'}];
let state='ready',directory:any[]=[];
// Demo-only response adapter. Not imported by the program, no real HTTP requests are made.
globalThis.fetch=async(input,init)=>{
 if(input!=='/api/neighbors/import/member')throw Error('이 화면에서는 외부 요청을 하지 않습니다.');
 const {operation,payload}=JSON.parse(String(init?.body));let data:any;
 if(operation==='directory')data={total:directory.length,records:directory};
 else if(operation==='runs')data=[{id,state,captured_count:2,total_count:2,last_page:1,total_pages:1}];
 else if(operation==='get')data={id,state,capturedCount:2,totalCount:2,lastPage:1,totalPages:1,rows:state==='cancelled'?[]:source};
 else if(operation==='confirm'){
  if(state!=='ready'&&state!=='confirmed')return Response.json({error:'준비된 합성 목록이 없습니다.'},{status:409});
  if(state==='ready')directory=source.map(row=>({neighbor_id:row.blogId,relation_type:row.relation,new_posts_enabled:row.relation==='mutual',return_visits_enabled:row.relation==='mutual',observed_at:new Date().toISOString()}));
  state='confirmed';data={id,state,count:2};
 }else if(operation==='configure'){
  if(payload.all&&payload.expected_total!==directory.length)return Response.json({error:'목록이 바뀌었습니다.'},{status:409});
  directory=directory.map(row=>payload.all||payload.ids?.includes(row.neighbor_id)?{...row,new_posts_enabled:payload.new_posts,return_visits_enabled:payload.return_visits}:row);data={updated:payload.all?directory.length:payload.ids.length};
 }else if(operation==='cancel'){state='cancelled';data={id,state};}
 else return Response.json({error:'지원하지 않는 합성 요청입니다.'},{status:400});
 return Response.json({data});
};
createRoot(document.getElementById('root')!).render(<div className="bnc-app"><aside className="bnc-sidebar"><div className="bnc-brand"><span>N↗</span><strong>AI 블로그<br/>이웃 소통 자동화</strong><small>RELAY DESK</small></div><p>릴레이 데스크 · 네이버 그린</p></aside><div className="bnc-workspace"><header className="bnc-top"><strong>기존 이웃 가져오기 · 기능 확인</strong><span className="badge">합성 자료만 · 네이버/서버/AI 연결 없음</span></header><main><div className="page-heading"><h1>받은 범위를 확인하고, 내 이웃에 반영하세요.</h1><p>실제 프로그램과 같은 UI 컴포넌트입니다. ‘가져온 목록·진행 상태 조회’부터 시작하세요. 합성 서로이웃 1명·일반 이웃 1명이 준비되어 있습니다. 새로고침하면 초기화됩니다.</p></div><section className="panel"><NeighborImportPanel accountId={account}/></section></main></div></div>);
