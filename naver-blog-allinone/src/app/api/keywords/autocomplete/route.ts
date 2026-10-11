import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const source = searchParams.get("source") || "naver"; // "naver" | "google"

  if (!query.trim()) {
    return NextResponse.json({ keywords: [] });
  }

  try {
    if (source === "naver") {
      const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(
        query
      )}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        return NextResponse.json({ keywords: [] });
      }

      const data = await res.json();
      // data.items[0] is an array of [keyword, subIndex]
      const items = data?.items?.[0] || [];
      const keywords = items.map((item: unknown) => (Array.isArray(item) ? item[0] : item)).filter(Boolean);

      return NextResponse.json({ keywords });
    } else {
      // Google
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(
        query
      )}&hl=ko`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        return NextResponse.json({ keywords: [] });
      }

      const data = await res.json();
      // Google returns: [query, [kw1, kw2, ...], ...]
      const keywords = Array.isArray(data?.[1]) ? data[1] : [];
      return NextResponse.json({ keywords });
    }
  } catch (error) {
    console.error("Autocomplete fetch error:", error);
    return NextResponse.json({ keywords: [] }, { status: 500 });
  }
}
