import "server-only";
import { fetchVideosDetails, YouTubeApiError } from "./client";
import { parseDuration } from "./metrics";
import type { YouTubeVideoItem } from "./types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface SourceFinderResult {
  shortsVideo: YouTubeVideoItem;
  directLinkedVideos: YouTubeVideoItem[];
  candidateVideos: {
    video: YouTubeVideoItem;
    similarityScore: number; // 0 ~ 100%
    matchReason: string;
  }[];
}

/**
 * YouTube 쇼츠 URL이나 ID에서 비디오 ID 추출
 */
export function extractVideoId(input: string): string | null {
  const clean = input.trim();
  // 단순 11자리 ID인 경우
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  // shorts URL: youtube.com/shorts/VIDEO_ID
  const shortsMatch = clean.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // 일반 watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = clean.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // 단축 URL: youtu.be/VIDEO_ID
  const shortUrlMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortUrlMatch) return shortUrlMatch[1];

  return null;
}

/**
 * 텍스트 내에서 YouTube 영상 링크나 ID 추출
 */
function extractYoutubeLinks(text: string): string[] {
  const matches: string[] = [];
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) matches.push(match[1]);
  }
  return Array.from(new Set(matches));
}

/**
 * 두 문자열 사이의 단어 자카드 유사도 (0 ~ 100)
 */
function calculateTextSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(
    textA.toLowerCase().replace(/[^\w\s가-힣]/g, "").split(/\s+/).filter((w) => w.length > 1)
  );
  const wordsB = new Set(
    textB.toLowerCase().replace(/[^\w\s가-힣]/g, "").split(/\s+/).filter((w) => w.length > 1)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++;
  });

  const union = new Set([...Array.from(wordsA), ...Array.from(wordsB)]).size;
  return Math.round((intersection / union) * 100);
}

export async function findShortsOriginalSource(
  shortsUrlOrId: string,
  apiKey: string
): Promise<SourceFinderResult> {
  const videoId = extractVideoId(shortsUrlOrId);
  if (!videoId) {
    throw new Error("유효한 YouTube 쇼츠 URL 또는 영상 ID가 아닙니다.");
  }

  // 1. 쇼츠 영상 정보 가져오기
  const detailsMap = await fetchVideosDetails([videoId], apiKey);
  const shortsData = detailsMap.get(videoId);

  if (!shortsData) {
    throw new Error("해당 영상을 YouTube에서 찾을 수 없습니다.");
  }

  const channelId = shortsData.snippet?.channelId;
  const description = shortsData.snippet?.description || "";
  const title = shortsData.snippet?.title || "";

  const shortsVideo: YouTubeVideoItem = {
    id: videoId,
    title,
    description,
    thumbnailUrl:
      shortsData.snippet?.thumbnails?.maxres?.url ||
      shortsData.snippet?.thumbnails?.high?.url ||
      "",
    publishedAt: shortsData.snippet?.publishedAt || "",
    channelId,
    channelTitle: shortsData.snippet?.channelTitle || "",
    viewCount: parseInt(shortsData.statistics?.viewCount || "0", 10),
    isShort: true,
    vph: 0,
    vsRatio: 0,
    viralScore: 0,
    viralBadge: "NORMAL",
  };

  // 2. 설명란에 직접 링크된 유튜브 영상 ID들 추출
  const linkedVideoIds = extractYoutubeLinks(description).filter((id) => id !== videoId);
  let directLinkedVideos: YouTubeVideoItem[] = [];

  if (linkedVideoIds.length > 0) {
    const linkedDetails = await fetchVideosDetails(linkedVideoIds, apiKey);
    linkedDetails.forEach((v, id) => {
      directLinkedVideos.push({
        id,
        title: v.snippet?.title || "",
        description: v.snippet?.description || "",
        thumbnailUrl: v.snippet?.thumbnails?.high?.url || "",
        publishedAt: v.snippet?.publishedAt || "",
        channelId: v.snippet?.channelId || "",
        channelTitle: v.snippet?.channelTitle || "",
        viewCount: parseInt(v.statistics?.viewCount || "0", 10),
        isShort: parseDuration(v.contentDetails?.duration) <= 60,
        vph: 0,
        vsRatio: 0,
        viralScore: 0,
        viralBadge: "NORMAL",
      });
    });
  }

  // 3. 동일 채널의 롱폼 영상 중 제목/내용 유사도 분석
  const channelSearchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  channelSearchUrl.searchParams.set("part", "snippet");
  channelSearchUrl.searchParams.set("channelId", channelId);
  channelSearchUrl.searchParams.set("type", "video");
  channelSearchUrl.searchParams.set("videoDuration", "medium"); // 4분 ~ 20분
  channelSearchUrl.searchParams.set("order", "date");
  channelSearchUrl.searchParams.set("maxResults", "20");
  channelSearchUrl.searchParams.set("key", apiKey);

  const res = await fetch(channelSearchUrl.toString(), { next: { revalidate: 300 } });
  const channelSearchData = await res.json();

  const candidateVideoIds = (channelSearchData.items || [])
    .map((item: any) => item.id?.videoId)
    .filter((id: string) => id && id !== videoId && !linkedVideoIds.includes(id));

  const candidateDetailsMap = await fetchVideosDetails(candidateVideoIds, apiKey);
  const candidates: {
    video: YouTubeVideoItem;
    similarityScore: number;
    matchReason: string;
  }[] = [];

  candidateDetailsMap.forEach((v, id) => {
    const cTitle = v.snippet?.title || "";
    const simScore = calculateTextSimilarity(title, cTitle);

    let matchReason = "동일 채널 롱폼 영상";
    if (simScore >= 50) {
      matchReason = "제목 및 핵심 키워드 50% 이상 일치 (강력 추천)";
    } else if (simScore >= 30) {
      matchReason = "주제 및 주요 어휘 유사";
    }

    candidates.push({
      video: {
        id,
        title: cTitle,
        description: v.snippet?.description || "",
        thumbnailUrl: v.snippet?.thumbnails?.high?.url || "",
        publishedAt: v.snippet?.publishedAt || "",
        channelId: v.snippet?.channelId || "",
        channelTitle: v.snippet?.channelTitle || "",
        viewCount: parseInt(v.statistics?.viewCount || "0", 10),
        isShort: false,
        vph: 0,
        vsRatio: 0,
        viralScore: 0,
        viralBadge: "NORMAL",
      },
      similarityScore: simScore,
      matchReason,
    });
  });

  // 유사도 높은 순으로 정렬
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    shortsVideo,
    directLinkedVideos,
    candidateVideos: candidates.slice(0, 10),
  };
}
