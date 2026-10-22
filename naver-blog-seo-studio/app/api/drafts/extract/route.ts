import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { assertPublicUrl, extractArticle, findNaverMainFrame, readLimited } from "@/lib/safeFetch";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { url?: string } | null;
  const rawUrl = input?.url?.trim() ?? "";
  if (!rawUrl || rawUrl.length > 2_000) return NextResponse.json({ error: "가져올 블로그 주소를 입력해주세요." }, { status: 400 });

  const requestedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let host = "unknown";
  let stage = "validate-url";
  try {
    let url = await assertPublicUrl(requestedUrl);
    host = url.hostname;
    console.info("[drafts/extract] request accepted", { host });
    for (let redirects = 0; redirects < 4; redirects += 1) {
      stage = "fetch-page";
      const response = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "AIMaster-SEO-Studio/1.0 (+https://www.buylife.xyz)" },
        signal: AbortSignal.timeout(12_000),
      });
      console.info("[drafts/extract] response received", { host: url.hostname, status: response.status, contentType: response.headers.get("content-type") ?? "" });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("리디렉션 주소를 확인할 수 없습니다.");
        url = await assertPublicUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) throw new Error(`글을 가져오지 못했습니다. (${response.status})`);
      if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("HTML 블로그 글 주소만 가져올 수 있습니다.");
      stage = "extract-body";
      const html = await readLimited(response);
      let article = extractArticle(html);
      if (article.body.length < 50) {
        const frameSource = findNaverMainFrame(html);
        if (frameSource) {
          stage = "fetch-naver-main-frame";
          const frameUrl = await assertPublicUrl(new URL(frameSource, url).toString());
          const frameResponse = await fetch(frameUrl, {
            redirect: "manual",
            headers: { "User-Agent": "AIMaster-SEO-Studio/1.0 (+https://www.buylife.xyz)" },
            signal: AbortSignal.timeout(12_000),
          });
          console.info("[drafts/extract] Naver mainFrame response received", { host: frameUrl.hostname, status: frameResponse.status, contentType: frameResponse.headers.get("content-type") ?? "" });
          if (!frameResponse.ok) throw new Error(`네이버 글 본문을 가져오지 못했습니다. (${frameResponse.status})`);
          if (!frameResponse.headers.get("content-type")?.includes("text/html")) throw new Error("네이버 글 본문이 HTML 형식이 아닙니다.");
          stage = "extract-naver-main-frame";
          article = extractArticle(await readLimited(frameResponse));
        }
      }
      if (article.body.length < 50) throw new Error("본문을 충분히 찾지 못했습니다. 글을 직접 붙여넣어주세요.");
      console.info("[drafts/extract] article extracted", { host: url.hostname, characters: article.body.length });
      return NextResponse.json({ article: { ...article, url: url.toString() } });
    }
    throw new Error("리디렉션이 너무 많습니다.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "글을 가져오는 중 오류가 발생했습니다.";
    console.error("[drafts/extract] failed", { host, stage, message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
