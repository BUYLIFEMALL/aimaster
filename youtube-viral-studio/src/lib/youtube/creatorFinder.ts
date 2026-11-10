/**
 * 협업 크리에이터 찾기(A4, 2026-11-10): 공용 황금 엔진(goldenEngine.ts 사본 — 고치지 않음)으로 후보 채널을 찾고,
 * 채널 설명 + 이번 검색에 잡힌 그 채널의 영상 설명에서 공개 연락처를 붙인다.
 * 영상 설명은 엔진이 이미 부르는 `videos` 응답을 호출 함수에서 옆으로 모아 쓰므로 할당량이 더 들지 않는다.
 * YouTube 호출 함수는 밖에서 받는다(라우트는 회원 본인 키 youtubeCall, 시험은 가짜 응답).
 */
import { normalizeGoldenParams, runGoldenSearch, type GoldenSearchParams, type YouTubeCall } from "./goldenEngine";
import { hasAnyContact, mergeContacts, type ChannelContacts } from "./contactExtract";

export interface CreatorFinderParams extends GoldenSearchParams {
  /** 이 구독자 수 이상 채널만(엔진은 상한만 있어 여기서 거름) */
  minSubscribers: number;
  /** 연락처가 하나라도 있는 채널만 */
  contactOnly: boolean;
}

export interface CreatorItem {
  id: string;
  title: string;
  handle?: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  averageViews: number;
  bestVideo: { id: string; title: string; viewCount: number };
  contacts: ChannelContacts;
}

export interface CreatorFinderResult {
  items: CreatorItem[];
  quotaUsed: number;
  scannedVideos: number;
  scannedChannels: number;
  hiddenSubscriberExcluded: number;
  /** 연락처 없음으로 빠진 채널 수(contactOnly일 때) */
  withoutContactExcluded: number;
}

/** 이 화면의 기본 조건 — 협업 상대 찾기라 쇼츠 한정·평균 조회 하한을 두지 않는다 */
export const CREATOR_DEFAULTS: Omit<GoldenSearchParams, "keyword"> = { maxSubscribers: 100_000, minAverageViews: 0, period: "90d", shortVideosOnly: false, region: "kr", pages: 1 };
export const RESULT_LIMIT = 50;
const VIDEO_TEXTS_PER_CHANNEL = 5;

export function normalizeCreatorParams(body: Record<string, unknown>): CreatorFinderParams | { error: string } {
  const base = normalizeGoldenParams(body, CREATOR_DEFAULTS);
  if ("error" in base) return base;
  const raw = typeof body.minSubscribers === "number" && Number.isFinite(body.minSubscribers) ? Math.round(body.minSubscribers) : 0;
  const minSubscribers = Math.max(0, Math.min(raw, 10_000_000));
  if (minSubscribers > base.maxSubscribers) return { error: "최소 구독자 수가 최대 구독자 수보다 큽니다." };
  return { ...base, minSubscribers, contactOnly: body.contactOnly === true };
}

export async function findCreators(params: CreatorFinderParams, call: YouTubeCall): Promise<CreatorFinderResult> {
  // 엔진이 부르는 videos 응답에서 채널별 영상 제목·설명을 모은다(추가 호출 없음)
  const videoTexts = new Map<string, { title: string; description: string }[]>();
  const tapping: YouTubeCall = async (endpoint, query, units) => {
    const data = await call(endpoint, query, units);
    if (endpoint === "videos") {
      for (const item of data?.items ?? []) {
        const channelId = item?.snippet?.channelId;
        const description = item?.snippet?.description;
        if (!channelId || typeof description !== "string" || !description.trim()) continue;
        const list = videoTexts.get(channelId) ?? [];
        if (list.length < VIDEO_TEXTS_PER_CHANNEL) list.push({ title: String(item.snippet.title ?? ""), description });
        videoTexts.set(channelId, list);
      }
    }
    return data;
  };

  // 엔진 결과를 넉넉히 받아(하한·연락처로 거른 뒤에도 남게) 마지막에 자른다
  const result = await runGoldenSearch(params, tapping, 500);
  let withoutContactExcluded = 0;
  const items: CreatorItem[] = [];
  for (const c of result.channels) {
    if (c.subscriberCount < params.minSubscribers) continue;
    const contacts = mergeContacts([
      { text: c.description ?? "", source: "channel" },
      ...(videoTexts.get(c.id) ?? []).map((v) => ({ text: v.description, source: "video" as const, videoTitle: v.title })),
    ]);
    if (params.contactOnly && !hasAnyContact(contacts)) {
      withoutContactExcluded += 1;
      continue;
    }
    items.push({
      id: c.id,
      title: c.title,
      handle: c.handle,
      thumbnailUrl: c.thumbnailUrl,
      subscriberCount: c.subscriberCount,
      videoCount: c.videoCount,
      viewCount: c.viewCount,
      averageViews: c.averageViews,
      bestVideo: { id: c.bestVideo.id, title: c.bestVideo.title, viewCount: c.bestVideo.viewCount },
      contacts,
    });
  }
  // 연락처가 많은 채널 먼저, 같으면 엔진 순서(파괴력 배수)
  const score = (i: CreatorItem) => (i.contacts.emails.length ? 4 : 0) + (i.contacts.phones.length ? 2 : 0) + (i.contacts.socials.length || i.contacts.websites.length || i.contacts.addresses.length ? 1 : 0);
  const ordered = items.map((item, idx) => ({ item, idx })).sort((a, b) => score(b.item) - score(a.item) || a.idx - b.idx).map((x) => x.item);
  return {
    items: ordered.slice(0, RESULT_LIMIT),
    quotaUsed: result.quotaUsed,
    scannedVideos: result.scannedVideos,
    scannedChannels: result.scannedChannels,
    hiddenSubscriberExcluded: result.hiddenSubscriberExcluded,
    withoutContactExcluded,
  };
}
