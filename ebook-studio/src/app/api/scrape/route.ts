import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "분석할 웹 주소를 최소 하나 이상 입력해 주세요." },
        { status: 400 }
      );
    }

    const targetUrls = urls.slice(0, 12).map((u) => String(u).trim()).filter(Boolean);
    const results: Array<{
      url: string;
      success: boolean;
      title: string;
      content: string;
      charCount: number;
      error?: string;
    }> = [];

    const failedUrls: string[] = [];

    for (const urlStr of targetUrls) {
      try {
        let validUrl: URL;
        try {
          validUrl = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
        } catch {
          failedUrls.push(urlStr);
          results.push({
            url: urlStr,
            success: false,
            title: urlStr,
            content: "",
            charCount: 0,
            error: "유효하지 않은 URL 형식입니다.",
          });
          continue;
        }

        // Fetch URL content
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(validUrl.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko,en-US;q=0.9,en;q=0.8",
          },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          failedUrls.push(urlStr);
          results.push({
            url: urlStr,
            success: false,
            title: urlStr,
            content: "",
            charCount: 0,
            error: `HTTP ${res.status}`,
          });
          continue;
        }

        const html = await res.text();

        // Title 추출
        let pageTitle = validUrl.hostname;
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          pageTitle = titleMatch[1].trim().replace(/\s+/g, " ");
        }

        // 불필요한 태그 제거 (script, style, nav, footer, header, svg, noscript 등)
        let cleaned = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
          .replace(/<!--[\s\S]*?-->/g, " ");

        // 본문 태그 위주 추출 (<article>, <main>, 혹은 전체 body)
        let bodyContent = cleaned;
        const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
        const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
        if (articleMatch && articleMatch[1].length > 200) {
          bodyContent = articleMatch[1];
        } else if (mainMatch && mainMatch[1].length > 200) {
          bodyContent = mainMatch[1];
        }

        // HTML 태그 제거 및 텍스트 정제
        const text = bodyContent
          .replace(/<br\s*[\/]?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<\/h[1-6]>/gi, "\n\n")
          .replace(/<li[^>]*>/gi, "\n- ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("\n\n");

        if (text.length < 50) {
          failedUrls.push(urlStr);
          results.push({
            url: urlStr,
            success: false,
            title: pageTitle,
            content: "",
            charCount: 0,
            error: "추출된 본문 텍스트가 너무 짧습니다.",
          });
        } else {
          results.push({
            url: urlStr,
            success: true,
            title: pageTitle,
            content: text,
            charCount: text.length,
          });
        }
      } catch (err: unknown) {
        failedUrls.push(urlStr);
        const errMsg = err instanceof Error ? err.message : "스크래핑 실패";
        results.push({
          url: urlStr,
          success: false,
          title: urlStr,
          content: "",
          charCount: 0,
          error: errMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: targetUrls.length,
      successCount: results.filter((r) => r.success).length,
      failedUrls,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
