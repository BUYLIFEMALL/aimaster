export function parsePost(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !['blog.naver.com', 'm.blog.naver.com'].includes(u.hostname)) return null;
    let blogId, postId;
    if (u.pathname.toLowerCase() === '/postview.naver') {
      if (u.searchParams.getAll('blogId').length !== 1 || u.searchParams.getAll('logNo').length !== 1) return null;
      blogId = u.searchParams.get('blogId'); postId = u.searchParams.get('logNo');
    } else {
      const m = /^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/i.exec(u.pathname); if (!m) return null;
      [, blogId, postId] = m;
    }
    if (!/^[a-z0-9_-]{1,50}$/i.test(blogId ?? '') || !/^\d{1,30}$/.test(postId ?? '')) return null;
    return { blogId: blogId.toLowerCase(), postId, url: `https://blog.naver.com/${blogId.toLowerCase()}/${postId}` };
  } catch { return null; }
}

// Serialized by chrome.scripting. All helpers must stay inside this function.
// Read-only: no clicks, fetch, DOM writes, forms, cookies, or browser storage.
export function inspectVisiblePost(expectedBlogId) {
  const fail = reason => ({ ok: false, reason });
  let blogId, postId;
  try {
    const u = new URL(location.href);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !['blog.naver.com', 'm.blog.naver.com'].includes(u.hostname)) return fail('unsupported_frame');
    if (u.pathname.toLowerCase() === '/postview.naver') {
      if (u.searchParams.getAll('blogId').length !== 1 || u.searchParams.getAll('logNo').length !== 1) return fail('ambiguous_url');
      blogId = u.searchParams.get('blogId'); postId = u.searchParams.get('logNo');
    } else {
      const m = /^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/i.exec(u.pathname); if (!m) return fail('open_one_post');
      [, blogId, postId] = m;
    }
  } catch { return fail('unsupported_frame'); }
  if (!/^[a-z0-9_-]{1,50}$/i.test(blogId ?? '') || !/^\d{1,30}$/.test(postId ?? '')) return fail('open_one_post');
  if (blogId.toLowerCase() !== expectedBlogId) return fail('wrong_blog');
  if (document.querySelector('.se-documentTitle [contenteditable="true"], .se-title-text[contenteditable="true"], .se-main-container [contenteditable="true"], .se-editable')) return fail('editor_page');
  const bodySelectors = ['.se-main-container', '#postViewArea', '.se_component_wrap'];
  let bodies = [];
  for (const selector of bodySelectors) {
    bodies = [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length > 0);
    if (bodies.length) break;
  }
  if (bodies.length !== 1) return fail('body_missing_or_ambiguous');
  const titles = [...document.querySelectorAll('.se-title-text, .pcol1 .htitle, .htitle')]
    .filter(el => el.getClientRects().length > 0);
  const titleValues = [...new Set(titles.map(el => el.innerText?.trim()).filter(Boolean))];
  if (titleValues.length !== 1) return fail('title_missing_or_ambiguous');
  const title = titleValues[0], body = bodies[0].innerText?.trim();
  if (!body || title.length > 500 || body.length > 20000) return fail('empty_or_too_large');
  return { ok: true, snapshot: { url: `https://blog.naver.com/${blogId.toLowerCase()}/${postId}`,
    title, body, format: 'naver-visible-text-v1' } };
}

export function chooseSnapshot(results, expectedUrl) {
  const target = parsePost(expectedUrl); if (!target) throw new Error('글 1개의 주소를 열어 주세요.');
  const matches = results.map(x => x.result).filter(x => x?.ok && x.snapshot?.url === target.url);
  const unique = [...new Set(matches.map(x => JSON.stringify(x.snapshot)))];
  if (unique.length !== 1) throw new Error('본문·제목을 하나로 확인하지 못했습니다. 글 1개를 열고 다시 눌러 주세요.');
  return JSON.parse(unique[0]);
}
