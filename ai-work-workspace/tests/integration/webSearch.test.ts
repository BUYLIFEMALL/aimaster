// 2026-11-15 AI 비서 검색 도구 고르기(플랜 docs/PLAN_20261115_SEARCH_TOOL_CHOICE.md) — 가짜 응답으로 확인(실제 호출 없음).
// 1. 고르기 규칙: 자동·내장은 Claude·OpenAI 내장, Gemini는 등록된 외부 검색(네이버 → 카카오 → Tavily → Perplexity → SerpAPI).
// 2. 다섯 서비스 응답 → 제목·주소·요약(태그 제거, http만, 8개까지). 3. 회원 본인 키로만 부르고, 키 없음·틀림은 한국어.
// 4. 도구 실행: 「검색 중 → 검색함(출처)」 단계와 출처 번호.
import { describe, expect, it } from 'vitest';
import { withMemberAiKeys } from '@/litpage/server/ai/providers/config.ts';
import { parseSearch, planSearch, runWebSearch, runWebSearchTool, setWebSearchFetch } from '@/litpage/server/ai/providers/webSearch.ts';

const NAVER = { naver_client_id: 'id', naver_client_secret: 'sec' };

describe('검색 고르기', () => {
  it('자동·내장: Claude·OpenAI·Gemini(구글 검색) 모두 내장, 모델을 모르면 등록된 외부 검색을 차례로', () => {
    expect(planSearch('auto', 'anthropic', NAVER)).toBe('builtin');
    expect(planSearch('builtin', 'openai', {})).toBe('builtin');
    expect(planSearch('auto', 'gemini', { kakao_rest_api_key: 'k' })).toBe('builtin');
    expect(planSearch('auto', null, { kakao_rest_api_key: 'k', serpapi: 's' })).toBe('kakao');
    expect(planSearch('auto', null, {})).toBeNull();
  });
  it('직접 고른 서비스: 키가 있으면 그것, 없으면 내장 → 다른 외부 키', () => {
    expect(planSearch('perplexity', 'anthropic', { perplexity: 'p' })).toBe('perplexity');
    expect(planSearch('perplexity', 'anthropic', {})).toBe('builtin');
    expect(planSearch('tavily', null, NAVER)).toBe('naver');
    expect(planSearch('naver', null, { naver_client_id: 'only-id' })).toBeNull(); // 네이버는 두 키가 다 있어야
    expect(planSearch('kakao', 'gemini', { kakao_rest_api_key: 'k' })).toBe('kakao'); // 직접 고르면 Gemini도 그 외부 검색
  });
});

describe('응답 → 결과', () => {
  it('다섯 서비스 모양을 하나로(태그·엔티티 정리, http만)', () => {
    expect(parseSearch('naver', { items: [{ title: '<b>최저임금</b> 2026', link: 'https://a.kr/1', description: '시급 &amp; 월급' }, { title: 'x', link: 'javascript:alert(1)', description: '' }] }).hits)
      .toEqual([{ title: '최저임금 2026', url: 'https://a.kr/1', snippet: '시급 & 월급' }]);
    expect(parseSearch('kakao', { documents: [{ title: '다음', url: 'https://d.net', contents: '<b>내용</b>' }] }).hits[0]).toMatchObject({ title: '다음', snippet: '내용' });
    expect(parseSearch('tavily', { results: [{ title: 'T', url: 'https://t.io', content: 'c' }], answer: '요약' })).toMatchObject({ hits: [{ url: 'https://t.io' }], answer: '요약' });
    expect(parseSearch('serpapi', { organic_results: [{ title: 'G', link: 'https://g.co', snippet: 's' }] }).hits[0].url).toBe('https://g.co');
    const px = parseSearch('perplexity', { choices: [{ message: { content: '답' } }], search_results: [{ title: 'P', url: 'https://p.ai' }] });
    expect(px).toMatchObject({ answer: '답', hits: [{ title: 'P', url: 'https://p.ai' }] });
    expect(parseSearch('perplexity', { citations: ['https://c.one'] }).hits[0].url).toBe('https://c.one');
    expect(parseSearch('naver', { items: Array.from({ length: 12 }, (_, i) => ({ title: `t${i}`, link: `https://x/${i}` })) }).hits).toHaveLength(8);
  });
});

describe('호출·도구 실행', () => {
  it('회원 본인 키로 부르고(네이버 머리글), 키 없음·틀림은 한국어', async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    setWebSearchFetch((async (url: string, init?: RequestInit) => {
      seen.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
      return new Response(JSON.stringify({ items: [{ title: 'r', link: 'https://r.kr', description: 'd' }] }), { status: 200 });
    }) as unknown as typeof fetch);
    const out = await withMemberAiKeys({ search: { choice: 'naver', keys: NAVER } }, () => runWebSearch('naver', '최저임금'));
    expect(out.hits[0].url).toBe('https://r.kr');
    expect(seen[0].url).toContain('openapi.naver.com/v1/search/webkr.json?query=%EC%B5%9C%EC%A0%80%EC%9E%84%EA%B8%88');
    expect(seen[0].headers['X-Naver-Client-Id']).toBe('id');
    await expect(withMemberAiKeys({ search: { choice: 'kakao', keys: {} } }, () => runWebSearch('kakao', 'q'))).rejects.toThrow(/카카오\(다음\) 검색 키가 없습니다/);
    setWebSearchFetch((async () => new Response('{}', { status: 401 })) as unknown as typeof fetch);
    await expect(withMemberAiKeys({ search: { choice: 'naver', keys: NAVER } }, () => runWebSearch('naver', 'q'))).rejects.toThrow(/키가 맞지 않습니다/);
    setWebSearchFetch(undefined);
  });

  it('도구 실행: 검색 중 → 검색함(출처) 단계, 출처 번호를 결과 글에 붙임, 실패는 오류 단계 + 모델에게 안내', async () => {
    setWebSearchFetch((async () => new Response(JSON.stringify({ documents: [{ title: 'A', url: 'https://a.kr', contents: 'a' }, { title: 'B', url: 'https://b.kr', contents: 'b' }] }), { status: 200 })) as unknown as typeof fetch);
    const steps: { status: string; refs?: unknown[]; detail?: string }[] = [];
    let n = 0;
    const r = await withMemberAiKeys({ search: { choice: 'kakao', keys: { kakao_rest_api_key: 'k' } } }, () =>
      runWebSearchTool('kakao', { query: '시험' }, 'st1', { step: (s) => steps.push(s), cite: () => ++n }));
    expect(steps.map((s) => s.status)).toEqual(['running', 'done']);
    expect(steps[1].refs).toHaveLength(2);
    expect(steps[1].detail).toContain('카카오');
    expect(r.content).toContain('[1] A');
    expect(r.content).toContain('[2] B');
    setWebSearchFetch((async () => new Response('{}', { status: 429 })) as unknown as typeof fetch);
    const steps2: { status: string }[] = [];
    const r2 = await withMemberAiKeys({ search: { choice: 'kakao', keys: { kakao_rest_api_key: 'k' } } }, () =>
      runWebSearchTool('kakao', { query: '시험' }, 'st2', { step: (s) => steps2.push(s), cite: () => 1 }));
    expect(steps2.map((s) => s.status)).toEqual(['running', 'error']);
    expect(r2.content).toContain('사용 한도');
    setWebSearchFetch(undefined);
  });
});
