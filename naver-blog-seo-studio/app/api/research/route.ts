import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { purgeExpiredResearch } from "@/lib/draftRetention";
import { withApproval, type ResearchSource } from "@/lib/grounding";
import { naverSearch } from "@/lib/naverSearch";
import { fetchPublicArticle } from "@/lib/safeFetch";
import { readPdf, readYoutube } from "@/lib/sourceReaders";
import { classifySourceUrl, readPaste } from "@/lib/sourceUrl";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180; // D-4: 유튜브 영상 정리(최대 110초)를 다른 주소와 함께 기다린다

// BLC-08a (2026-10-22): 「자료부터 집필」 1단계 — 자료 수집(AI 호출 없음).
// 키워드 → 네이버 블로그 상위 5건 본문 + 뉴스 5건(회원 본인 네이버 검색 키), 직접 넣은 공개 URL 3개·메모를 자료로 저장한다.
const LIST_COLUMNS = "id, keyword, sources, points, angle, approved_at, approval_hash, created_at, updated_at";
const SOURCE_TEXT_MAX = 5_000;
const MEMO_MAX = 2_000;

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  await purgeExpiredResearch(supabase, access.user.id);
  const { data, error } = await supabase.from("naver_blog_seo_research").select(LIST_COLUMNS)
    .eq("user_id", access.user.id).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "자료 목록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ research: (data ?? []).map(withApproval) });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { keyword?: unknown; urls?: unknown; memo?: unknown; paste?: unknown; pasteLink?: unknown } | null;
  const keyword = typeof input?.keyword === "string" ? input.keyword.trim() : "";
  if (!keyword || keyword.length > 60) return NextResponse.json({ error: "검색어를 1~60자로 입력해주세요." }, { status: 400 });
  const urls = (Array.isArray(input?.urls) ? input.urls : []).filter((u): u is string => typeof u === "string" && Boolean(u.trim())).map((u) => u.trim()).slice(0, 3);
  const memo = typeof input?.memo === "string" ? input.memo.trim() : "";
  if (memo.length > MEMO_MAX) return NextResponse.json({ error: `내 메모는 ${MEMO_MAX.toLocaleString("ko-KR")}자 이내로 입력해주세요.` }, { status: 400 });
  const pasted = readPaste(input?.paste, input?.pasteLink); // D-4: 읽기 실패 대비 원문 붙여넣기(「사이트 직접 확인 아님」으로 구분 저장)
  if (pasted && "error" in pasted) return NextResponse.json({ error: pasted.error }, { status: 400 });
  const paste = pasted;

  const supabase = await createClient();
  const [clientId, clientSecret] = await Promise.all([
    resolveApiKey(supabase, access.user.id, "naver_client_id"),
    resolveApiKey(supabase, access.user.id, "naver_client_secret"),
  ]);
  if ((!clientId || !clientSecret) && !urls.length && !memo && !paste) {
    return NextResponse.json({ code: "NAVER_KEY_REQUIRED", error: "네이버 검색 자료를 모으려면 본인 네이버 검색 API(Client ID·Secret)를 [API키등록·플랫폼연동]에서 등록해주세요. 키 없이도 직접 URL·원문 붙여넣기·메모로 자료를 넣을 수 있습니다." }, { status: 400 });
  }

  const sources: Omit<ResearchSource, "n">[] = [];
  const warnings: string[] = [];
  try {
    if (clientId && clientSecret) {
      const auth = { clientId, clientSecret };
      const [blogs, news] = await Promise.all([
        naverSearch(auth, "blog", keyword, 15),
        naverSearch(auth, "news", keyword, 5).catch(() => []),
      ]);
      const top = blogs.filter((it) => /^https?:\/\/(m\.)?blog\.naver\.com\//.test(it.link)).slice(0, 5);
      const texts = await Promise.all(top.map((it) => fetchPublicArticle(it.link).then((a) => a.body).catch(() => "")));
      top.forEach((it, i) => sources.push({ kind: "blog", title: it.title, link: it.link, text: (texts[i] || it.description).slice(0, SOURCE_TEXT_MAX), ok: Boolean(texts[i]) }));
      news.forEach((it) => sources.push({ kind: "news", title: it.title, link: it.originallink || it.link, text: `${it.title} ${it.description}`.slice(0, SOURCE_TEXT_MAX), ok: true }));
    } else warnings.push("네이버 검색 키가 없어 직접 넣은 자료만 사용했습니다.");
  } catch (error) {
    if (!urls.length && !memo) return NextResponse.json({ error: error instanceof Error ? error.message : "네이버 자료를 모으지 못했습니다." }, { status: 502 });
    warnings.push(error instanceof Error ? error.message : "네이버 자료를 모으지 못했습니다.");
  }
  // D-4: 주소 종류별로 동시에 읽는다 — 유튜브(회원 Gemini 키로 영상 정리)·텍스트 PDF·일반 웹. 실패한 주소는 경고만 남기고 붙여넣기를 안내한다.
  const geminiKey = urls.some((url) => classifySourceUrl(url).kind === "youtube") ? await resolveApiKey(supabase, access.user.id, "gemini") : null;
  const read = await Promise.all(urls.map(async (url): Promise<{ source?: Omit<ResearchSource, "n">; warning?: string }> => {
    const type = classifySourceUrl(url);
    try {
      if (type.kind === "youtube") {
        if (!geminiKey) throw new Error("유튜브 영상은 본인 Gemini API 키가 있어야 읽을 수 있습니다. 자막·내용을 「원문 붙여넣기」에 넣어 주세요.");
        const video = await readYoutube(geminiKey, type.videoId);
        return { source: { kind: "video", title: video.title, link: video.link, text: video.text.slice(0, SOURCE_TEXT_MAX), ok: true } };
      }
      if (type.kind === "pdf") {
        const pdf = await readPdf(url);
        return { source: { kind: "pdf", title: pdf.title, link: pdf.link, text: pdf.text.slice(0, SOURCE_TEXT_MAX), ok: true } };
      }
      const article = await fetchPublicArticle(url);
      if (article.body.length < 50) throw new Error("본문을 충분히 찾지 못했습니다. 내용을 「원문 붙여넣기」에 넣어 주세요.");
      return { source: { kind: "url", title: article.title, link: article.url, text: article.body.slice(0, SOURCE_TEXT_MAX), ok: true } };
    } catch (error) {
      return { warning: `${url}: ${error instanceof Error ? error.message : "가져오지 못했습니다."}` };
    }
  }));
  for (const r of read) { if (r.source) sources.push(r.source); if (r.warning) warnings.push(r.warning); }
  if (paste) {
    sources.push({ kind: "paste", title: paste.link ? `붙여 넣은 원문 (${new URL(paste.link).hostname})` : "붙여 넣은 원문", link: paste.link, text: paste.text.slice(0, SOURCE_TEXT_MAX), ok: true });
    if (paste.text.length > SOURCE_TEXT_MAX) warnings.push(`붙여 넣은 원문은 앞 ${SOURCE_TEXT_MAX.toLocaleString("ko-KR")}자만 자료로 썼습니다.`);
  }
  if (memo) sources.push({ kind: "memo", title: "내 메모", link: "", text: memo, ok: true });
  if (!sources.length) return NextResponse.json({ error: "모은 자료가 없습니다. 다른 검색어나 URL·메모로 다시 시도해주세요.", warnings }, { status: 404 });

  await purgeExpiredResearch(supabase, access.user.id);
  const numbered: ResearchSource[] = sources.map((s, i) => ({ ...s, n: i + 1 }));
  const { data, error } = await supabase.from("naver_blog_seo_research")
    .insert({ user_id: access.user.id, keyword, sources: numbered, points: [] })
    .select(LIST_COLUMNS).single();
  if (error) return NextResponse.json({ error: "자료를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ research: withApproval(data), warnings });
}
