// 검색 요약 전용 사전 선별. 외부 호출·AI 점수·관계 판정은 하지 않는다.
const plain = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ')
  .replace(/&(nbsp|amp|lt|gt|quot);/g, (_, key) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"' })[key])
  .replace(/\s+/g, ' ').trim();
const blogId = (value) => /^[a-z0-9_-]+$/i.test(value ?? '') ? value.toLowerCase() : null;

export function parsePost(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
        !['blog.naver.com', 'm.blog.naver.com'].includes(url.hostname)) return null;
    let owner, post;
    if (/^\/PostView\.naver$/i.test(url.pathname)) {
      if (url.searchParams.getAll('blogId').length !== 1 || url.searchParams.getAll('logNo').length !== 1) return null;
      owner = blogId(url.searchParams.get('blogId'));
      post = url.searchParams.get('logNo');
    } else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length !== 2) return null;
      owner = blogId(parts[0]);
      post = parts[1];
    }
    if (!owner || !/^\d+$/.test(post ?? '')) return null;
    return { blogId: owner, postId: post, url: `https://blog.naver.com/${owner}/${post}` };
  } catch { return null; }
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return false;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const stamp = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().startsWith(iso);
}

export function selectCandidates({ requesterId, profile, items, limit = 20 }) {
  if (!requesterId || profile?.userId !== requesterId) throw new Error('owner_mismatch');
  if (!Array.isArray(items) || !Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('invalid_input');
  const keywords = [...new Set((profile.keywords ?? []).map(plain).map(x => x.toLowerCase()).filter(Boolean))];
  if (!keywords.length) throw new Error('preferences_required');
  const excluded = new Set([profile.ownBlogId, ...(profile.excludedBlogs ?? [])].map(blogId).filter(Boolean));
  const seen = new Map();
  const rejected = [];
  items.forEach((item, index) => {
    const post = parsePost(item?.link);
    let reason;
    if (!post) reason = 'unsupported_post_url';
    else if (excluded.has(post.blogId)) reason = 'own_or_excluded_blog';
    else if (!validDate(item.postdate)) reason = 'invalid_postdate';
    const title = plain(item?.title), summary = plain(item?.description);
    const matches = keywords.filter(word => `${title} ${summary}`.toLowerCase().includes(word));
    if (!reason && !matches.length) reason = 'no_summary_keyword_match';
    if (reason) { rejected.push({ index, reason }); return; }
    const candidate = {
      userId: requesterId, ...post, title, summary, postdate: item.postdate,
      matchedKeywords: matches, summaryMatchCount: matches.length,
      evidenceLevel: 'search-summary', relationship: 'unknown', canAutoEngage: false,
    };
    // 동일 블로그에서는 날짜가 최신인 글만 남긴다. 본문 점수나 실제 활동성 점수는 아니다.
    const previous = seen.get(post.blogId);
    if (previous && previous.postdate >= candidate.postdate) {
      rejected.push({ index, reason: 'duplicate_blog' });
    } else {
      if (previous) rejected.push({ index: previous.inputIndex, reason: 'duplicate_blog' });
      seen.set(post.blogId, { ...candidate, inputIndex: index });
    }
  });
  const candidates = [...seen.values()].sort((a, b) => b.summaryMatchCount - a.summaryMatchCount ||
    b.postdate.localeCompare(a.postdate) || a.blogId.localeCompare(b.blogId))
    .slice(0, limit).map(({ inputIndex, ...candidate }) => candidate);
  return { candidates, rejected, textOnly: true, fullBodyAnalyzed: false, aiScoringPerformed: false };
}
