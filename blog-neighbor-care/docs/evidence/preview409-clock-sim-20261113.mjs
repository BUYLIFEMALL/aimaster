// 운영 함수 100행 조건 그대로: observed>t or observed<=t-30s or observed<created_at → BNC_READ_CONTEXT
const reject=(observed,created,t,tol=0)=>observed>t+tol||observed<=t-30000||observed<created-tol;
// skew = 맥 시계 - DB 시계 (음수 = 맥이 늦음), lat = offer 응답 후 화면 읽기까지, up = preview 요청 도착까지
function run(skew,lat,up,mode){
 const created=0, respGen=created+20, respRecv=respGen+80; // DB 기준 ms
 const offset = mode==='offset' ? respGen-(respRecv+skew) : 0;  // 확장이 서버시각(serverNow)으로 보정
 const readDb=respRecv+lat, checked=readDb+skew+offset, t=readDb+up;
 return reject(checked,created,t,mode==='tol'?5000:0)?'거절':'통과';
}
const cases=[[0,300,200],[-1632,300,200],[-1632,1500,200],[-1632,2000,200],[+1632,300,200],[-4000,300,200],[+4000,300,200],[-12000,300,200]];
console.log('시계차ms 읽기ms | 현재 | 서버시각보정 | 허용오차5초');
for(const [s,l,u] of cases)console.log(String(s).padStart(6),String(l).padStart(5),'|',run(s,l,u,'now'),'|',run(s,l,u,'offset'),'|',run(s,l,u,'tol'));
// 보정안이 재전송·만료를 풀지 않는지: 31초 지난 스냅샷
const stale=(mode)=>{const created=0,respGen=20,respRecv=100,skew=-1632,offset=mode==='offset'?respGen-(respRecv+skew):0;const checked=500+skew+offset,t=500+31000;return reject(checked,created,t,mode==='tol'?5000:0)?'거절':'통과';};
console.log('31초 지난 스냅샷 | 현재',stale('now'),'| 보정',stale('offset'),'| 허용오차',stale('tol'));
