// Synthetic management rows only. Never contains a real member/neighbor identity.
export function managementFixture({blogId='fixture-owner',page=1,pages=3,total=125,pageSize=50,emptyText='등록된 이웃이 없습니다.',rss=false}={}) {
 const start=(page-1)*pageSize,count=Math.min(pageSize,Math.max(0,total-start));
 const rows=Array.from({length:count},(_,index)=>{
  const n=start+index,id=`fixture-neighbor-${String(n).padStart(4,'0')}`;
  return `<tr><td><input type="checkbox"></td><td>일반</td><td>${n%2?'이웃':'서로이웃'}</td><td><a href="${rss&&index===0?'https://external.invalid/rss':`https://blog.naver.com/${id}`}">합성 이웃 ${n+1}</a></td><td>ON</td><td>합성 날짜</td><td>합성 날짜</td></tr>`;
 }).join('');
 const next=page<pages?`<a href="https://admin.blog.naver.com/BuddyListManage.naver?blogId=${blogId}&currentPage=${page+1}">${page+1}</a>`:'';
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{font:14px sans-serif;padding:12px;color:#17372b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:5px}caption{padding:8px}a{color:#078447}</style></head><body><h1>내가 추가한 이웃 · 합성 자료</h1><input type="text" placeholder="블로그명, 별명 검색" value=""><p>정렬된 이웃 ${total} 명</p><table><caption>이웃관리 목록</caption><thead><tr><th><input type="checkbox"></th><th>그룹전체</th><th>이웃전체</th><th>이웃</th><th>새글소식전체</th><th>최근 글</th><th>이웃추가일</th></tr></thead><tbody>${rows||`<tr><td colspan="7">${emptyText}</td></tr>`}</tbody></table><p>${page} / ${pages} 페이지 ${next}</p></body></html>`;
}
export const shellFixture=blogId=>`<body><a href="https://admin.blog.naver.com/${blogId}/stat/today">내 블로그 통계</a></body>`;
export const fixtureListUrl=(blogId,page)=>`https://admin.blog.naver.com/BuddyListManage.naver?blogId=${blogId}&currentPage=${page}`;
