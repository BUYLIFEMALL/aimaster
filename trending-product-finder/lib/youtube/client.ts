import "server-only";

// YouTube Data API v3 클라이언트("server-only" 가드) — 키워드 관련 영상의 최근 업로드량과
// 조회수를 기회 점수의 세 번째 신호로 쓴다. 개인 Google Cloud Console 계정으로 무료·즉시
// 발급 가능한 API Key(OAuth 아님, 단순 API Key)를 쓴다.

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const RECENT_DAYS = 30;

export interface YoutubeSignal {
  recentUploadCount: number; // 최근 30일 내 업로드된 관련 영상 수(검색 결과 최대 25개 기준)
  totalViews: number; // 그 영상들의 조회수 합계
  score: number; // 0~100 정규화 점수(업로드량 50% + 조회수 50%)
}

interface SearchItem {
  id?: { videoId?: string };
}

/** 키워드로 최근 업로드된 관련 유튜브 영상의 업로드량/조회수를 조회한다. */
export async function getYoutubeSignal(keyword: string, apiKey: string): Promise<YoutubeSignal> {
  const publishedAfter = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: keyword,
    type: "video",
    order: "date",
    publishedAfter,
    maxResults: "25",
    regionCode: "KR",
    relevanceLanguage: "ko",
    key: apiKey,
  });

  const searchRes = await fetch(`${SEARCH_URL}?${searchParams.toString()}`);
  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`YouTube API 요청이 실패했습니다. (${searchRes.status}) ${text.slice(0, 300)}`);
  }
  const searchData = (await searchRes.json()) as { items?: SearchItem[] };
  const items = searchData.items ?? [];
  const videoIds = items.map((it) => it.id?.videoId).filter((id): id is string => Boolean(id));

  let totalViews = 0;
  if (videoIds.length > 0) {
    const statsParams = new URLSearchParams({ part: "statistics", id: videoIds.join(","), key: apiKey });
    const statsRes = await fetch(`${VIDEOS_URL}?${statsParams.toString()}`);
    if (statsRes.ok) {
      const statsData = (await statsRes.json()) as { items?: { statistics?: { viewCount?: string } }[] };
      totalViews = (statsData.items ?? []).reduce((sum, v) => sum + Number(v.statistics?.viewCount ?? 0), 0);
    }
  }

  const recentUploadCount = videoIds.length;
  const uploadPart = Math.min(recentUploadCount / 20, 1) * 50; // 20개 이상 업로드면 만점의 절반
  const viewPart = Math.min(totalViews / 100000, 1) * 50; // 조회수 합계 10만 이상이면 만점의 절반
  const score = Math.round(uploadPart + viewPart);

  return { recentUploadCount, totalViews, score };
}
