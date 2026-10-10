// Only the first-party app can request its connected member's category names.
// Never expose connection tokens or provide authoring/publishing commands here.
(() => {
  if (location.origin !== 'https://naver-blog-agent.vercel.app') return;
  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const m = event.data;
    if (m?.source !== 'nba-publishing-app' || m.type !== 'categories' || typeof m.requestId !== 'string') return;
    let result;
    try { result = await chrome.runtime.sendMessage({type:'categories',userId:m.userId,blogId:m.blogId}); }
    catch { result = {error:'확장을 새로고침하고 프로그램 화면도 새로고침해 주세요.'}; }
    window.postMessage({source:'nba-publishing-extension',requestId:m.requestId,result},location.origin);
  });
})();
