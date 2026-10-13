import "server-only";

export type StockProvider = "unsplash" | "pexels" | "pixabay";

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (res.status === 401 || res.status === 403) throw new Error("invalid-key");
  if (res.status === 429) throw new Error("rate");
  if (!res.ok) throw new Error(`http-${res.status}`);
  return res.json();
}

const pick = <T,>(list: T[]): T | undefined => (list.length ? list[Math.floor(Math.random() * Math.min(list.length, 10))] : undefined);

/** 한 키워드에 대한 이미지 URL을 제공자 API에서 찾는다. 결과가 없으면 null */
export async function searchImage(provider: StockProvider, key: string, keyword: string): Promise<string | null> {
  const q = encodeURIComponent(keyword.replace(/-/g, " "));
  if (provider === "unsplash") {
    const d = (await getJson(`https://api.unsplash.com/search/photos?query=${q}&per_page=10&orientation=landscape`, { Authorization: `Client-ID ${key}` })) as { results?: { urls?: { regular?: string } }[] };
    return pick((d.results ?? []).map((r) => r.urls?.regular).filter((u): u is string => !!u)) ?? null;
  }
  if (provider === "pexels") {
    const d = (await getJson(`https://api.pexels.com/v1/search?query=${q}&per_page=10&orientation=landscape`, { Authorization: key })) as { photos?: { src?: { large2x?: string } }[] };
    return pick((d.photos ?? []).map((p) => p.src?.large2x).filter((u): u is string => !!u)) ?? null;
  }
  const d = (await getJson(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${q}&image_type=photo&orientation=horizontal&per_page=10&safesearch=true`)) as { hits?: { largeImageURL?: string }[] };
  return pick((d.hits ?? []).map((h) => h.largeImageURL).filter((u): u is string => !!u)) ?? null;
}

/** 키워드 목록을 병렬(최대 4개씩)로 조회한다. 키 오류는 즉시 던진다. */
export async function resolveImages(provider: StockProvider, key: string, keywords: string[]) {
  const urls: Record<string, string> = {};
  const failed: string[] = [];
  let i = 0;
  let fatal: Error | null = null;
  const worker = async () => {
    while (!fatal) {
      const idx = i++;
      if (idx >= keywords.length) return;
      const kw = keywords[idx];
      try {
        const u = await searchImage(provider, key, kw);
        if (u) urls[kw] = u; else failed.push(kw);
      } catch (e) {
        if (e instanceof Error && (e.message === "invalid-key" || e.message === "rate")) { fatal = e; return; }
        failed.push(kw);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (fatal) throw fatal;
  return { urls, failed };
}
