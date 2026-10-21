import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  fetchPublicHtml,
  rewriteToScrapableListingUrl,
  extractArticleLinks,
  extractMainText,
  pickRandom,
  searchPerplexityTrending,
  searchYoutubeShorts,
  fetchShortContext,
  structureBlogCandidates,
  analyzeShortForBlog,
} from "@/lib/collector";
import { fetchRankingArticles, isRankingKind, RANKING_SOURCES } from "@/lib/naverRanking";
import { articleSourceText, pickBestArticle } from "@/lib/ai/sourceGrounding";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveCollected, SourceError } from "@/lib/collectedMaterials";
import { readFeed } from "@/lib/rss";
import type { BlogViralCandidate } from "@/types/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const fetchCache = "force-no-store";

// AI가 정리하기 전 원문을 회원 서버 글감에 함께 보관해 글 생성 때 사실 근거로 쓴다.
const SOURCE_TEXT_MAX = 4000;

export async function POST(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const body = await req.json();
    const { action } = body;
    const collected = async (candidates: BlogViralCandidate[], extra = {}) => {
      const saved = await saveCollected(createAdminClient(), user.id, candidates);
      return NextResponse.json({success: true, candidates: saved, count: saved.length, ...extra}, {headers: {"Cache-Control": "no-store"}});
    };

    // 공통 AI 키 조회 (OpenAI, Gemini, Anthropic)
    const [openaiKey, geminiKey, anthropicKey] = await Promise.all([
      resolveApiKey(user.id, "openai"),
      resolveApiKey(user.id, "gemini"),
      resolveApiKey(user.id, "anthropic"),
    ]);
    const aiKeys = { openai: openaiKey, gemini: geminiKey, anthropic: anthropicKey };
    const hasAnyAiKey = Boolean(openaiKey || geminiKey || anthropicKey);

    // 공개 RSS/Atom: 추가 계정·API 연결 없이 기존 본인 AI 키로 정리한다.
    if (action === "rss") {
      if (!hasAnyAiKey) return NextResponse.json({error: "글감을 정리할 본인 AI 키를 등록해 주세요.", needKey: true}, {status: 400});
      if (typeof body.url !== "string" || body.url.length > 2000) return NextResponse.json({error: "피드 주소를 확인해 주세요."}, {status: 400});
      const feed = await fetchPublicHtml(body.url.trim());
      const articles = readFeed(feed.html, feed.finalUrl);
      const rawText = articles.map((item, i) => `[피드 ${i + 1}] ${item.title}\n${item.text}\n출처: ${item.url}`).join("\n\n");
      const drafts = await structureBlogCandidates({rawText, maxItems: Math.min(articles.length, 4), aiKeys, targetCategory: typeof body.targetCategory === "string" ? body.targetCategory.trim().slice(0, 100) : undefined});
      const candidates: BlogViralCandidate[] = drafts.map(draft => {
        const article = pickBestArticle(`${draft.title} ${draft.content}`, articles);
        return {id: "pending", method: "rss", source_input: feed.finalUrl, source_urls: article ? [article.url, feed.finalUrl] : [feed.finalUrl, ...articles.map(item => item.url)],
          source_text: articleSourceText(article, rawText), ...draft, status: "ready", created_at: new Date().toISOString()};
      });
      return await collected(candidates);
    }

    // 1. URL 스크랩 글감 수집
    if (action === "url") {
      const { url, targetCategory } = body;
      const rawUrl = String(url || "").trim();
      if (!rawUrl || rawUrl.length > 2000) {
        return NextResponse.json({ error: "주소를 올바르게 입력해 주세요." }, { status: 400 });
      }
      if (!hasAnyAiKey) {
        return NextResponse.json(
          {
            error: "글감을 정리할 AI API 키가 없습니다. [API키등록·플랫폼연동] 메뉴에서 OpenAI, Gemini, 또는 Claude 키를 등록해 주세요.",
            needKey: true,
          },
          { status: 400 }
        );
      }

      const listing = await fetchPublicHtml(rewriteToScrapableListingUrl(rawUrl));
      const links = extractArticleLinks(listing.html, listing.finalUrl);
      let rawText = "";
      let maxItems = 1;
      let sourceArticles: { url: string; title: string; text: string }[] = [];

      if (links.length >= 3) {
        const picked = pickRandom(links, 5);
        const articles = await Promise.all(
          picked.map(async (link) => {
            try {
              const res = await fetchPublicHtml(link.url);
              return { ...link, text: extractMainText(res.html, 2500) };
            } catch {
              return null;
            }
          })
        );
        const valid = articles.filter(
          (a): a is { url: string; title: string; text: string } => Boolean(a && a.text.length > 100)
        );
        if (!valid.length) {
          throw new Error("목록 기사 본문을 읽어오지 못했습니다. 개별 상세 글 주소로 다시 시도해 주세요.");
        }
        rawText = valid
          .map((a, i) => `[기사 ${i + 1}] ${a.title}\n${a.text}\n출처: ${a.url}`)
          .join("\n\n");
        maxItems = Math.min(valid.length, 4);
        sourceArticles = valid;
      } else {
        const text = extractMainText(listing.html);
        if (text.length < 80) {
          throw new Error("페이지에서 본문을 읽지 못했습니다. 로그인이 필요하거나 JS 동적 렌더링 페이지일 수 있습니다.");
        }
        rawText = `${text}\n출처: ${listing.finalUrl}`;
        maxItems = 2;
      }

      const drafts = await structureBlogCandidates({
        rawText,
        maxItems,
        aiKeys,
        targetCategory: targetCategory ? String(targetCategory).trim() : undefined,
      });
      const now = Date.now();
      const candidates: BlogViralCandidate[] = drafts.map((d, index) => ({
        id: `viral-url-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        method: "http",
        source_input: rawUrl,
        source_urls: sourceArticles.length ? (pickBestArticle(`${d.title} ${d.content}`, sourceArticles) ? [pickBestArticle(`${d.title} ${d.content}`, sourceArticles)!.url] : sourceArticles.map(article => article.url)) : [listing.finalUrl],
        source_text: articleSourceText(pickBestArticle(`${d.title} ${d.content}`, sourceArticles), rawText),
        title: d.title,
        content: d.content,
        category: d.category,
        keywords: d.keywords,
        angle: d.angle,
        status: "ready",
        created_at: new Date(now - index * 1000).toISOString(),
      }));

      return await collected(candidates);
    }

    // 1-1. 네이버 연예·스포츠·경제 랭킹 글감 (기사 이미지는 쓰지 않고 텍스트만 정리)
    if (action === "ranking") {
      const { kind, targetCategory } = body;
      if (!isRankingKind(kind)) {
        return NextResponse.json({ error: "랭킹 종류를 다시 선택해 주세요." }, { status: 400 });
      }
      if (!hasAnyAiKey) {
        return NextResponse.json(
          {
            error: "글감을 정리할 AI API 키가 없습니다. [API키등록·플랫폼연동] 메뉴에서 OpenAI, Gemini, 또는 Claude 키를 등록해 주세요.",
            needKey: true,
          },
          { status: 400 }
        );
      }

      const articles = await fetchRankingArticles(kind, 5);
      const rawText = articles
        .map((a, i) => `[랭킹 기사 ${i + 1}] ${a.title}\n${a.text}\n출처: ${a.url}`)
        .join("\n\n");
      const drafts = await structureBlogCandidates({
        rawText,
        maxItems: Math.min(articles.length, 4),
        aiKeys,
        targetCategory: targetCategory ? String(targetCategory).trim() : undefined,
      });
      const now = Date.now();
      const candidates: BlogViralCandidate[] = drafts.map((d, index) => ({
        id: `viral-rank-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        method: "http",
        source_input: `네이버 ${RANKING_SOURCES[kind].label}`,
        source_urls: pickBestArticle(`${d.title} ${d.content}`, articles) ? [pickBestArticle(`${d.title} ${d.content}`, articles)!.url] : articles.map(article => article.url),
        source_text: articleSourceText(pickBestArticle(`${d.title} ${d.content}`, articles), rawText),
        title: d.title,
        content: d.content,
        category: d.category,
        keywords: d.keywords,
        angle: d.angle,
        status: "ready",
        created_at: new Date(now - index * 1000).toISOString(),
      }));

      return await collected(candidates);
    }

    // 2. Perplexity 실시간 화제 트렌드 검색
    if (action === "perplexity") {
      const { topic, targetCategory } = body;
      const rawTopic = String(topic || "").trim();
      if (!rawTopic || rawTopic.length > 200) {
        return NextResponse.json({ error: "검색 주제를 1~200자로 입력해 주세요." }, { status: 400 });
      }

      const perplexityKey = await resolveApiKey(user.id, "perplexity");
      if (!perplexityKey) {
        return NextResponse.json(
          {
            error: "실시간 화제 검색에는 Perplexity API 키(pplx-...)가 필요합니다. [API키등록·플랫폼연동] 메뉴에서 등록해 주세요.",
            needKey: true,
          },
          { status: 400 }
        );
      }
      if (!hasAnyAiKey) {
        return NextResponse.json(
          {
            error: "글감을 구조화할 AI API 키가 없습니다. OpenAI, Gemini, 또는 Claude 키를 등록해 주세요.",
            needKey: true,
          },
          { status: 400 }
        );
      }

      const trendReport = await searchPerplexityTrending(rawTopic, perplexityKey);
      const drafts = await structureBlogCandidates({
        rawText: trendReport.text,
        maxItems: 4,
        aiKeys,
        targetCategory: targetCategory ? String(targetCategory).trim() : undefined,
      });
      const now = Date.now();
      const candidates: BlogViralCandidate[] = drafts.map((d, index) => ({
        id: `viral-pplx-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        method: "perplexity",
        source_input: rawTopic,
        source_text: trendReport.text.slice(0, SOURCE_TEXT_MAX),
        source_urls: trendReport.citations,
        title: d.title,
        content: d.content,
        category: d.category,
        keywords: d.keywords,
        angle: d.angle,
        status: "ready",
        created_at: new Date(now - index * 1000).toISOString(),
      }));

      return await collected(candidates);
    }

    // 3. 유튜브 쇼츠 검색
    if (action === "shorts_search") {
      const { query, dateFrom, dateTo, order = "viewCount" } = body;
      const rawQuery = String(query || "").trim();
      if (!rawQuery) {
        return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });
      }

      const youtubeKey = await resolveApiKey(user.id, "youtube_api_key");
      if (!youtubeKey) {
        return NextResponse.json(
          {
            error: "유튜브 검색을 위해 YouTube Data API v3 키가 필요합니다. [API키등록·플랫폼연동]에서 등록해 주세요.",
            needKey: true,
          },
          { status: 400 }
        );
      }

      const videos = await searchYoutubeShorts(
        { query: rawQuery, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, order },
        youtubeKey
      );

      return NextResponse.json({ success: true, videos });
    }

    // 4. 유튜브 쇼츠 분석 후 글감 생성
    if (action === "shorts_analyze") {
      const { video, targetCategory } = body;
      if (!video || !video.id) {
        return NextResponse.json({ error: "영상 정보가 올바르게 입력되지 않았습니다." }, { status: 400 });
      }
      if (!hasAnyAiKey) {
        return NextResponse.json(
          {
            error: "쇼츠를 분석할 AI API 키가 없습니다. OpenAI, Gemini, 또는 Claude 키를 등록해 주세요.",
            needKey: true,
          },
          { status: 400 }
        );
      }

      const youtubeKey = await resolveApiKey(user.id, "youtube_api_key");
      const extraContext = youtubeKey
        ? await fetchShortContext(video.id, youtubeKey)
        : { description: "", comments: [] };

      const analysis = await analyzeShortForBlog({
        video,
        context: extraContext,
        aiKeys,
        targetCategory: targetCategory ? String(targetCategory).trim() : undefined,
      });
      const now = Date.now();
      const candidates: BlogViralCandidate[] = analysis.candidates.map((d, index) => ({
        id: `viral-shorts-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        method: "shorts",
        source_input: `https://www.youtube.com/shorts/${video.id}`,
        source_urls: [`https://www.youtube.com/shorts/${video.id}`],
        source_text: [`[영상] ${String(video.title || "")}`, extraContext.description, extraContext.comments.length ? `댓글: ${extraContext.comments.join(" / ")}` : ""].filter(Boolean).join("\n").slice(0, SOURCE_TEXT_MAX),
        title: d.title,
        content: `[영상 훅 & 분석] ${analysis.hook} / ${analysis.whyViral}\n\n${d.content}`,
        category: d.category,
        keywords: d.keywords,
        angle: d.angle,
        status: "ready",
        created_at: new Date(now - index * 1000).toISOString(),
      }));

      return await collected(candidates, {hook: analysis.hook, whyViral: analysis.whyViral});
    }

    return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
  } catch (err: any) {
    console.error("Collector API error:", err);
    return NextResponse.json({ error: err.message || "글감 수집 중 오류가 발생했습니다." }, { status: err instanceof SourceError ? err.status : 500 });
  }
}
