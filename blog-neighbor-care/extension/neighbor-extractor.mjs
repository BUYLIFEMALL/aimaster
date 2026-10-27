// BuddyListManage frame + actor shell observed in native Edge. Legacy route kept for fixtures.
// DOM extraction and multi-page traversal still require installed-extension verification.
export function parseNeighborPage(value) {
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.hostname!=='admin.blog.naver.com'||u.port||u.username||u.password||u.hash)return null;
    const shell=/^\/([a-z0-9_-]{1,50})$/.exec(u.pathname);if(shell&&!u.search)return {blogId:shell[1],page:1,url:u.href,kind:'shell'};
    if(!['/ManageMyBuddy.naver','/BuddyListManage.naver'].includes(u.pathname)||[...u.searchParams.keys()].some(k=>!['blogId','page','currentPage'].includes(k))||u.searchParams.getAll('blogId').length!==1||u.searchParams.getAll('page').length>1||u.searchParams.getAll('currentPage').length>1||(u.searchParams.has('page')&&u.searchParams.has('currentPage')))return null;
    const blogId=u.searchParams.get('blogId'),page=Number(u.searchParams.get('currentPage')||u.searchParams.get('page')||'1');
    if(!/^[a-z0-9_-]{1,50}$/.test(blogId||'')||!Number.isInteger(page)||page<1||page>100)return null;
    return {blogId,page,url:u.href,kind:u.pathname==='/BuddyListManage.naver'?'list':'legacy'};
  }catch{return null;}
}

// chrome.scripting serializes this function; all helpers are intentionally inside.
// Reads the currently rendered management table only; no network, navigation, clicks or writes.
export function inspectVisibleNeighbors(expectedBlogId) {
  const fail=reason=>({ok:false,reason});
  const visible=e=>e.getClientRects().length>0;
  const clean=e=>(e.innerText||e.textContent||'').replace(/\s+/g,'').trim();
  let here;try{here=new URL(location.href);}catch{return fail('wrong_management_page');}
  if(here.protocol==='https:'&&here.hostname==='admin.blog.naver.com'&&!here.port&&!here.username&&!here.password&&!here.search&&!here.hash&&here.pathname===`/${expectedBlogId}`){
    const proof=[...document.querySelectorAll('a[href]')].filter(visible).some(a=>{try{return clean(a)==='내블로그통계'&&new URL(a.getAttribute('href'),location.href).href===`${here.origin}/${expectedBlogId}/stat/today`;}catch{return false;}});
    return proof?{ok:true,context:{blogId:expectedBlogId,url:here.href}}:fail('owner_not_confirmed');
  }
  if(here.pathname==='/BuddyListManage.naver'){
    if(here.protocol!=='https:'||here.hostname!=='admin.blog.naver.com'||here.port||here.username||here.password||here.hash||here.searchParams.getAll('blogId').length!==1||here.searchParams.get('blogId')!==expectedBlogId||[...here.searchParams.keys()].some(k=>!['blogId','page','currentPage'].includes(k))||here.searchParams.getAll('page').length>1||here.searchParams.getAll('currentPage').length>1||(here.searchParams.has('page')&&here.searchParams.has('currentPage')))return fail('wrong_management_page');
    const page=Number(here.searchParams.get('currentPage')||here.searchParams.get('page')||1);
    const body=document.body.innerText||document.body.textContent||'';
    if(!Number.isInteger(page)||page<1||page>100||!/내가\s*추가한\s*이웃/.test(body))return fail('wrong_list_scope');
    const search=[...document.querySelectorAll('input')].filter(visible).filter(e=>[e.value,e.defaultValue,e.getAttribute('placeholder'),e.getAttribute('title'),e.getAttribute('value')].some(v=>String(v||'').replace(/\s/g,'')==='블로그명,별명검색'));
    if(search.length!==1||![ '', '블로그명,별명검색'].includes(String(search[0].value||'').replace(/\s/g,'')))return fail('search_filter_active');
    const tables=[...document.querySelectorAll('table')].filter(visible).filter(t=>[...t.querySelectorAll('caption')].some(c=>clean(c)==='이웃관리목록'));
    if(tables.length!==1)return fail('table_not_confirmed');
    const table=tables[0],trs=[...table.querySelectorAll('tr')].filter(r=>r.closest('table')===table),header=trs[0];
    const cells=r=>[...r.children].filter(e=>['TH','TD'].includes(e.tagName));
    const names=header?cells(header).map(c=>clean(c).replace(/^dummy/,'')):[];
    if(!['그룹전체','이웃전체','새글소식전체'].every(label=>names.filter(n=>n===label).length===1))return fail('all_filter_not_confirmed');
    const relationIndex=names.indexOf('이웃전체'),blogIndex=names.indexOf('이웃');if(blogIndex<0)return fail('columns_not_confirmed');
    const totals=[...new Set([...body.matchAll(/정렬된\s*이웃\s*([\d,]+)\s*명/g)].map(m=>Number(m[1].replaceAll(',',''))))];
    if(totals.length!==1||!Number.isInteger(totals[0])||totals[0]<0||totals[0]>5000)return fail('total_not_confirmed');
    const totalCount=totals[0],rows=[];let emptyProof=false;
    for(const tr of trs.slice(1).filter(visible)){
      const tds=cells(tr);if(totalCount===0&&tds.length===1){
        if(emptyProof||Number(tds[0].getAttribute('colspan'))!==names.length||!/^(?:등록된|추가한)?이웃이없습니다[.!]?$/.test(clean(tds[0])))return fail('empty_list_not_confirmed');
        emptyProof=true;continue;
      }
      if(tds.length!==names.length)return fail('columns_not_confirmed');
      let label=clean(tds[relationIndex]).replace(/[♡♥]/g,'');
      if(!label){const labels=[...new Set([...tds[relationIndex].querySelectorAll('img[alt]')].filter(visible).map(e=>e.getAttribute('alt')))];if(labels.length===1)label=labels[0];}
      const relation=label==='서로이웃'?'mutual':label==='이웃'?'one_way':null;
      const ids=[...new Set([...tds[blogIndex].querySelectorAll('a[href]')].filter(visible).map(a=>{try{const u=new URL(a.getAttribute('href'),location.href),m=/^\/([a-z0-9_-]{1,50})\/?$/i.exec(u.pathname);return ['http:','https:'].includes(u.protocol)&&u.hostname==='blog.naver.com'&&!u.username&&!u.password&&!u.port&&m?m[1].toLowerCase():null;}catch{return null;}}).filter(Boolean))];
      if(!relation||ids.length!==1||ids[0]===expectedBlogId)return fail('row_not_confirmed');rows.push({blogId:ids[0],relation});
    }
    if(totalCount===0&&(!emptyProof||rows.length))return fail('empty_list_not_confirmed');
    if(rows.length>100||new Set(rows.map(r=>r.blogId)).size!==rows.length||(totalCount>0&&!rows.length))return fail('ambiguous_rows');
    let totalPages=1,nextUrl=null;
    if(rows.length!==totalCount||page!==1){
      const counters=[...body.matchAll(/(\d+)\s*\/\s*(\d+)\s*페이지/g)].map(m=>[Number(m[1]),Number(m[2])]);
      if(new Set(counters.map(c=>c.join('/'))).size!==1||counters[0]?.[0]!==page)return fail('pagination_not_confirmed');totalPages=counters[0][1];
      if(!Number.isInteger(totalPages)||totalPages<page||totalPages>100)return fail('pagination_not_confirmed');
      if(page<totalPages){const next=[...document.querySelectorAll('a[href]')].filter(visible).map(a=>{try{const u=new URL(a.getAttribute('href'),location.href);if(u.protocol!=='https:'||u.hostname!==here.hostname||u.pathname!==here.pathname||u.port||u.username||u.password||u.hash||u.searchParams.get('blogId')!==expectedBlogId||[...u.searchParams.keys()].some(k=>!['blogId','page','currentPage'].includes(k)))return null;return Number(u.searchParams.get('currentPage')||u.searchParams.get('page'))===page+1?u.href:null;}catch{return null;}}).filter(Boolean);const unique=[...new Set(next)];if(unique.length!==1)return fail('next_page_not_confirmed');nextUrl=unique[0];}
    }
    return {ok:true,snapshot:{format:'naver-visible-neighbors-v1',url:here.href,listScope:'all',page,totalPages,totalCount,rows,nextUrl}};
  }
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

// Navigation is separate from extraction. Only an exact next-page anchor in the list frame may click.
export function advanceVisibleNeighborPage(expectedBlogId,currentUrl,nextUrl){
  try{
    if(location.href!==currentUrl)return {advanced:false};
    const current=new URL(currentUrl),next=new URL(nextUrl),page=u=>Number(u.searchParams.get('currentPage')||u.searchParams.get('page')||1);
    if(current.protocol!=='https:'||current.hostname!=='admin.blog.naver.com'||current.pathname!=='/BuddyListManage.naver'||next.origin!==current.origin||next.pathname!==current.pathname||next.port||next.username||next.password||next.hash||next.searchParams.get('blogId')!==expectedBlogId||current.searchParams.get('blogId')!==expectedBlogId||[...next.searchParams.keys()].some(k=>!['blogId','page','currentPage'].includes(k))||page(next)!==page(current)+1)return {advanced:false};
    const links=[...document.querySelectorAll('a[href]')].filter(a=>a.getClientRects().length>0&&new URL(a.getAttribute('href'),location.href).href===next.href&&new RegExp(`^(?:${page(next)}|다음)$`).test((a.innerText||a.textContent||'').replace(/\s/g,'')));
    if(links.length!==1)return {advanced:false};links[0].click();return {advanced:true};
  }catch{return {advanced:false};}
}
export function neighborPageReady(expectedUrl){return {ready:location.href===expectedUrl&&document.readyState==='complete'};}
