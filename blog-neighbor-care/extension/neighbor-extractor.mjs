// Conservative legacy-route fixture contract. Real Naver management route/DOM NOT verified yet.
// Other routes/layouts stop; the separate server read gate remains off pending that verification.
export function parseNeighborPage(value) {
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.hostname!=='admin.blog.naver.com'||u.port||u.username||u.password||u.hash||u.pathname!=='/ManageMyBuddy.naver')return null;
    if([...u.searchParams.keys()].some(k=>!['blogId','page'].includes(k))||u.searchParams.getAll('blogId').length!==1||u.searchParams.getAll('page').length>1)return null;
    const blogId=u.searchParams.get('blogId'),page=Number(u.searchParams.get('page')||'1');
    if(!/^[a-z0-9_-]{1,50}$/.test(blogId||'')||!Number.isInteger(page)||page<1||page>100)return null;
    return {blogId,page,url:u.href};
  }catch{return null;}
}

// chrome.scripting serializes this function; all helpers are intentionally inside.
// Reads the currently rendered management table only; no network, navigation, clicks or writes.
export function inspectVisibleNeighbors(expectedBlogId) {
  const fail=reason=>({ok:false,reason});
  const visible=e=>e.getClientRects().length>0;
  const clean=e=>(e.innerText||e.textContent||'').replace(/\s+/g,'').trim();
  const manage=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='admin.blog.naver.com'||u.port||u.username||u.password||u.hash||u.pathname!=='/ManageMyBuddy.naver'||[...u.searchParams.keys()].some(k=>!['blogId','page'].includes(k))||u.searchParams.getAll('blogId').length!==1||u.searchParams.getAll('page').length>1)return null;const b=u.searchParams.get('blogId'),p=Number(u.searchParams.get('page')||'1');return /^[a-z0-9_-]{1,50}$/.test(b||'')&&Number.isInteger(p)&&p>=1&&p<=100?{blogId:b,page:p,url:u.href}:null;}catch{return null;}};
  const profile=value=>{try{const u=new URL(value,location.href),m=/^\/([a-z0-9_-]{1,50})\/?$/i.exec(u.pathname);return ['http:','https:'].includes(u.protocol)&&u.hostname==='blog.naver.com'&&!u.username&&!u.password&&!u.port&&m?m[1].toLowerCase():null;}catch{return null;}};
  const page=manage(location.href);if(!page||page.blogId!==expectedBlogId)return fail('wrong_management_page');
  const ownerLinks=[...document.querySelectorAll('a[href]')].filter(visible).filter(a=>clean(a)==='내블로그');
  if(ownerLinks.length!==1||profile(ownerLinks[0].getAttribute('href'))!==expectedBlogId)return fail('owner_not_confirmed');
  const body=document.body.innerText||document.body.textContent||'';
  if(!/내가\s*추가한\s*이웃/.test(body))return fail('wrong_list_scope');
  const all=[...document.querySelectorAll('select option:checked,[role=tab][aria-selected=true],[aria-current=page]')]
    .some(e=>/^(전체|전체이웃|모든이웃)$/.test(clean(e)));
  if(!all)return fail('all_filter_not_confirmed');
  const totals=[...body.matchAll(/(?:전체|총)\s*(?:이웃\s*)?([\d,]+)\s*명/g)].map(m=>Number(m[1].replaceAll(',','')));
  const uniqueTotals=[...new Set(totals)];if(uniqueTotals.length!==1||!Number.isInteger(uniqueTotals[0])||uniqueTotals[0]>5000)return fail('total_not_confirmed');
  const totalCount=uniqueTotals[0];
  const tables=[...document.querySelectorAll('table')].filter(visible).filter(t=>[...t.querySelectorAll('thead th')].some(h=>/^(이웃관계|관계|구분)$/.test(clean(h))));
  if(tables.length!==1)return fail('table_not_confirmed');
  const headers=[...tables[0].querySelectorAll('thead th')].map(clean);
  const relations=headers.map((v,i)=>/^(이웃관계|관계|구분)$/.test(v)?i:-1).filter(i=>i>=0);
  const blogs=headers.map((v,i)=>/^(블로그|이웃|블로거|블로그명)$/.test(v)?i:-1).filter(i=>i>=0);
  if(relations.length!==1||blogs.length!==1)return fail('columns_not_confirmed');
  const rows=[];
  for(const row of [...tables[0].querySelectorAll('tbody tr')].filter(visible)){
    const cells=[...row.querySelectorAll('td')];
    if(totalCount===0&&cells.length===1&&/이웃이없습니다/.test(clean(row)))continue;
    const relationText=cells[relations[0]]?clean(cells[relations[0]]):'';
    const relation=relationText==='서로이웃'?'mutual':['일반이웃','이웃'].includes(relationText)?'one_way':null;
    const links=cells[blogs[0]]?[...cells[blogs[0]].querySelectorAll('a[href]')].filter(visible):[];
    const ids=[...new Set(links.map(a=>profile(a.getAttribute('href'))).filter(Boolean))];
    if(!relation||ids.length!==1||ids[0]===expectedBlogId)return fail('row_not_confirmed');
    rows.push({blogId:ids[0],relation});
  }
  if(rows.length>100||new Set(rows.map(r=>r.blogId)).size!==rows.length||(totalCount>0&&rows.length===0))return fail('ambiguous_rows');
  const counters=[...body.matchAll(/(\d+)\s*\/\s*(\d+)\s*페이지/g)].map(m=>[Number(m[1]),Number(m[2])]);
  const uniqueCounters=[...new Set(counters.map(c=>c.join('/')))];
  let totalPages;
  if(totalCount===0)totalPages=1;
  else{if(uniqueCounters.length!==1||counters[0][0]!==page.page)return fail('pagination_not_confirmed');totalPages=counters[0][1];}
  if(!Number.isInteger(totalPages)||totalPages<page.page||totalPages>100)return fail('pagination_not_confirmed');
  let nextUrl=null;
  if(page.page<totalPages){const next=[...document.querySelectorAll('a[href]')].filter(visible).map(a=>manage(new URL(a.getAttribute('href'),location.href).href)).filter(p=>p?.blogId===expectedBlogId&&p.page===page.page+1);const urls=[...new Set(next.map(p=>p.url))];if(urls.length!==1)return fail('next_page_not_confirmed');nextUrl=urls[0];}
  return {ok:true,snapshot:{format:'naver-visible-neighbors-v1',url:page.url,listScope:'all',page:page.page,totalPages,totalCount,rows,nextUrl}};
}
