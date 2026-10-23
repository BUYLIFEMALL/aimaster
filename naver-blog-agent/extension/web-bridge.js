// Only the first-party app can request its connected member's category names.
// Never expose connection tokens or provide authoring/publishing commands here.
// 2026-10-23: ping(설치·버전 확인)과 connect(웹 「바로 연결」 — 웹이 만든 8자리 연결 번호와 블로그 ID를 받아 확장의 기존 연결 처리에 넘김)만 추가.
(() => {
  if (location.origin !== 'https://naver-blog-agent.vercel.app' && location.origin !== 'https://naver-blog-agent.buylife.xyz') return; // 2026-10-16 새 주소도 허용
  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== 'nba-publishing-app' || !['categories','ping','connect'].includes(m.type) || typeof m.requestId !== 'string') return;
    let result;
    if (m.type === 'ping') result = {ok:true,version:chrome.runtime.getManifest().version_name||''};
    else if (m.type === 'connect') {
      try { result = await chrome.runtime.sendMessage({type:'pairFromWeb',code:String(m.code||''),blogId:String(m.blogId||''),closeTab:m.closeTab===true}); }
      catch { result = {ok:false,error:'확장을 새로고침하고 프로그램 화면도 새로고침해 주세요.'}; }
    } else {
      try { result = await chrome.runtime.sendMessage({type:'categories',userId:m.userId,blogId:m.blogId}); }
      catch { result = {error:'확장을 새로고침하고 프로그램 화면도 새로고침해 주세요.'}; }
    }
    window.postMessage({source:'nba-publishing-extension',requestId:m.requestId,result},location.origin);
  });
})();
