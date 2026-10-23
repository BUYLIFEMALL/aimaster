import { NextRequest, NextResponse } from "next/server";

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "최신 뉴스";

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=ko&gl=KR&ceid=KR:ko`;

    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ articles: [] });
    }

    const xml = await res.text();

    // Parse RSS items using RegExp
    const articles: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 10) {
      const itemContent = match[1];

      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
      const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

      let rawTitle = titleMatch ? titleMatch[1] : "";
      rawTitle = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim();

      // Clean title & extract source if present in title (e.g. "제목 - 언론사")
      let sourceName = sourceMatch ? sourceMatch[1].trim() : "주요 언론";
      if (rawTitle.includes(" - ")) {
        const parts = rawTitle.split(" - ");
        sourceName = parts[parts.length - 1].trim();
        rawTitle = parts.slice(0, parts.length - 1).join(" - ").trim();
      }

      const link = linkMatch ? linkMatch[1].trim() : "";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";

      if (rawTitle) {
        articles.push({
          title: rawTitle,
          link,
          pubDate,
          source: sourceName,
        });
      }
    }

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("News RSS fetch error:", error);
    return NextResponse.json({ articles: [] }, { status: 500 });
  }
}
