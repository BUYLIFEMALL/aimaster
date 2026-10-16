import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { CrawlResult, HeadingItem, LinkItem, ImageItem, TableItem, FeedListItem } from "@/lib/types";
import { checkProgramAccessApi } from "@/lib/access";
import { safeFetch, BlockedUrlError } from "@/lib/safeFetch";

export const maxDuration = 60; // Vercel 서버리스 타임아웃 여유 확보
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  // 로그인 + 프로그램 이용 권한 확인 (CLAUDE.md 멀티테넌시 원칙 1)
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "유효한 대상 웹사이트 URL을 입력해주세요." }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "올바른 URL 형식(예: https://buylife.blog)이 아닙니다." }, { status: 400 });
    }

    // 1. 대상 사이트 fetch (User-Agent 포함)
    const { response } = await safeFetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 WebsiteScraper/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `대상 사이트 응답 오류 (HTTP ${response.status}: ${response.statusText})` },
        { status: 502 }
      );
    }

    const rawHtml = await response.text();
    const rawLength = Buffer.byteLength(rawHtml, "utf8");
    const payloadSizeKb = Number((rawLength / 1024).toFixed(2));

    // 2. Cheerio 로드
    const $ = cheerio.load(rawHtml);

    // 3. 메타데이터 파싱
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      parsedUrl.hostname;
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";
    const charset =
      $('meta[charset]').attr("charset") ||
      $('meta[http-equiv="Content-Type"]')
        .attr("content")
        ?.match(/charset=([^;]+)/i)?.[1] ||
      "UTF-8";
    const contentType = response.headers.get("content-type") || "text/html";

    // 4. 시맨틱 헤딩 구조 (H1, H2, H3)
    const h1: HeadingItem[] = [];
    $("h1").each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        const link = $(el).find("a").attr("href") || $(el).closest("a").attr("href");
        h1.push({
          text,
          link: link ? (link.startsWith("http") ? link : new URL(link, targetUrl).href) : undefined,
        });
      }
    });

    const h2: HeadingItem[] = [];
    $("h2").each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        const link = $(el).find("a").attr("href") || $(el).closest("a").attr("href");
        h2.push({
          text,
          link: link ? (link.startsWith("http") ? link : new URL(link, targetUrl).href) : undefined,
        });
      }
    });

    const h3: HeadingItem[] = [];
    $("h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        const link = $(el).find("a").attr("href") || $(el).closest("a").attr("href");
        h3.push({
          text,
          link: link ? (link.startsWith("http") ? link : new URL(link, targetUrl).href) : undefined,
        });
      }
    });

    // 5. 하이퍼링크 추출 (상위 100개, 중복 제거)
    const linkMap = new Map<string, LinkItem>();
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (href && href !== "#" && !href.startsWith("javascript:") && text) {
        try {
          const absHref = href.startsWith("http") ? href : new URL(href, targetUrl).href;
          const isExternal = !absHref.includes(parsedUrl.hostname);
          if (!linkMap.has(absHref)) {
            linkMap.set(absHref, {
              text: text.slice(0, 100),
              href: absHref,
              isExternal,
            });
          }
        } catch {
          // invalid url 무시
        }
      }
    });
    const links = Array.from(linkMap.values()).slice(0, 100);

    // 6. 이미지 추출 (상위 100개, 중복 제거)
    const imageMap = new Map<string, ImageItem>();
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      const alt = $(el).attr("alt")?.trim() || "";
      if (src && !src.startsWith("data:")) {
        try {
          const absSrc = src.startsWith("http") ? src : new URL(src, targetUrl).href;
          if (!imageMap.has(absSrc)) {
            imageMap.set(absSrc, {
              src: absSrc,
              alt: alt || "이미지",
            });
          }
        } catch {
          // ignore
        }
      }
    });
    const images = Array.from(imageMap.values()).slice(0, 100);

    // 7. 테이블 파싱 (상위 10개)
    const tables: TableItem[] = [];
    $("table")
      .slice(0, 10)
      .each((_, tableEl) => {
        const headers: string[] = [];
        $(tableEl)
          .find("th")
          .each((_, th) => {
            headers.push($(th).text().trim());
          });

        const rows: Array<Array<{ text: string; url?: string } | string>> = [];
        $(tableEl)
          .find("tr")
          .each((_, tr) => {
            const rowData: Array<{ text: string; url?: string }> = [];
            $(tr)
              .find("td")
              .each((_, td) => {
                const cellText = $(td).text().trim();
                const cellLink = $(td).find("a").attr("href");
                rowData.push({
                  text: cellText,
                  url: cellLink
                    ? cellLink.startsWith("http")
                      ? cellLink
                      : new URL(cellLink, targetUrl).href
                    : undefined,
                });
              });
            if (rowData.length > 0) {
              rows.push(rowData);
            }
          });

        if (rows.length > 0 || headers.length > 0) {
          tables.push({ headers, rows });
        }
      });

    // 8. 감지된 글/아이템 목록 (상위 50개)
    const listItems: FeedListItem[] = [];
    const candidates = $("article, .post, .item, .card, li, .entry, .board-item");
    candidates.slice(0, 50).each((_, el) => {
      const itemTitle =
        $(el).find("h1, h2, h3, h4, .title, strong").first().text().trim() ||
        $(el).find("a").first().text().trim();
      const itemText = $(el).text().replace(/\s+/g, " ").trim();
      const rawLink = $(el).find("a").attr("href");
      if (itemTitle && itemTitle.length > 2) {
        let absLink: string | undefined = undefined;
        if (rawLink) {
          try {
            absLink = rawLink.startsWith("http") ? rawLink : new URL(rawLink, targetUrl).href;
          } catch {}
        }
        listItems.push({
          title: itemTitle.slice(0, 120),
          text: itemText.slice(0, 200),
          link: absLink,
          url: absLink,
        });
      }
    });

    // 9. 불필요한 태그 제거 후 정리된 cleanedHtml (AI 분석 토큰 절약)
    const $clean = cheerio.load(rawHtml);
    $clean("script, style, noscript, svg, iframe, canvas, form, button, input").remove();
    $clean("header, footer, nav, aside").remove();
    const cleanedHtml = ($clean("main").html() || $clean("body").html() || "")
      .replace(/\s+/g, " ")
      .slice(0, 50000);

    const crawlResult: CrawlResult = {
      metadata: {
        title,
        description,
        charset,
        contentType,
        statusCode: response.status,
        url: targetUrl,
      },
      structure: { h1, h2, h3 },
      stats: {
        payloadSizeKb,
        linksCount: linkMap.size,
        imagesCount: imageMap.size,
        tablesCount: tables.length,
        listItemsCount: listItems.length,
        charset,
      },
      links,
      images,
      tables,
      listItems: listItems.slice(0, 30),
      rawLength,
      cleanedHtml,
    };

    return NextResponse.json(crawlResult);
  } catch (err: any) {
    if (err instanceof BlockedUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Crawl error:", err);
    return NextResponse.json(
      { error: err.message || "웹사이트 크롤링 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
