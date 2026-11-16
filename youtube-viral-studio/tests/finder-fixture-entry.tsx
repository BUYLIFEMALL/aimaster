// 떡상 시장 탐색(v1.30) 화면 검수용 — 실제 화면 컴포넌트 + 합성 데이터(유튜브·AI·DB 호출 0). 실행: node tests/finder-fixture-serve.mjs
import React from "react";
import { createRoot } from "react-dom/client";
import ViralFinderPage from "../src/app/(dashboard)/viral-finder/page";
import { buildFinderVideo, computeMarketAnalytics, type RawFinderVideo, type UploadRow } from "../src/lib/youtube/boks/core";
import { computeTrends } from "../src/lib/youtube/boks/trends";

const NOW = Date.now();
const DAY = 86400000;
const thumb = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#242424"/><text x="60" y="100" fill="white" font-size="28">SYNTHETIC</text></svg>');
const TITLES = ["자취요리 초간단 크림당면 레시피", "캠핑 장비 추천 TOP5 (초보 필수)", "10분 만에 끝내는 겨울 캠핑 준비물", "자취생 일주일 식비 3만원 도전!", "캠핑 난로 고르는 법 총정리", "자취요리 계란 하나로 3가지 반찬", "초보 캠핑 실수 7가지", "편의점 재료로 만드는 자취요리", "캠핑 요리 꿀팁 모음", "자취방 꾸미기 저예산"];

const videos = Array.from({ length: 24 }, (_, i) => {
  const isShorts = i % 3 !== 0;
  const raw: RawFinderVideo = {
    title: TITLES[i % TITLES.length] + (i > 9 ? ` ${i}` : ""), description: "합성 데이터", channelId: `UC${String(i % 8).padStart(22, "x")}`, channelTitle: `합성 채널 ${i % 8}`, categoryId: "26",
    publishedAt: new Date(NOW - (i * 3 + 2) * DAY - (i % 7) * 3600000).toISOString(), thumbnails: { medium: { url: thumb } }, liveBroadcastContent: "none",
    tags: ["자취요리", "캠핑", i % 2 ? "꿀팁" : "레시피"], defaultAudioLanguage: "ko", defaultLanguage: "", durationSec: isShorts ? 20 + i * 4 : 400 + i * 60,
    viewCount: 8000 + ((i * 37) % 11) * 45000, likeCount: 900 + i * 50, commentCount: 20 + i, isShorts,
  };
  const uploads: UploadRow[] = Array.from({ length: 8 }, (_, k) => [`u${i}-${k}`, 3000 + (i % 5) * 4000 + k * 500, isShorts ? 40 : 600, NOW - (k + 4) * DAY]);
  return buildFinderVideo(`vid${String(i).padStart(8, "0")}`, raw, i % 5 === 4 ? null : 1500 + (i % 6) * 9000, i % 7 === 6 ? null : { asOf: NOW, uploads }, NOW);
});

const result = {
  mode: "search", query: "자취요리", videos,
  excluded: { live: 1, format: 2, spam: 3, language: 4, offtopic: 2, religion: 1 },
  excludedItems: [{ id: "x1", reason: "spam", title: "#a #b #c", channelTitle: "스팸", viewCount: 10 }, { id: "x2", reason: "language", title: "Cream noodle recipe", channelTitle: "Foreign", viewCount: 99 }],
  baseline: { channels: 8, cached: 3, fetched: 4, failed: 1, quotaHit: false },
  format: "all", searchCalls: 4, searchInfo: { calls: 4, topupStopped: false, source: "search" }, unitsUsed: 466,
  market: computeMarketAnalytics(videos, "자취요리"), trends: computeTrends(videos, "all", NOW),
  usage: { day: "2026-11-16", search: 4, searchLimit: 100, units: 66, unitLimit: 10000, resetAt: NOW + 5 * 3600000, tracked: true },
  fetchedAt: new Date(NOW).toISOString(),
};

const report = {
  summary: "합성 요약 — 숫자 제목과 초보 대상 각도가 터집니다.",
  hookingAngles: ["초보 실수 지적", "가격 도전"], titleFormulas: ["숫자 + 결과"], thumbnailPatterns: ["큰 숫자 자막"], formatStrategy: "쇼츠로 유입, 롱폼으로 정리",
  recommendations: [{ format: "쇼츠", title: "합성 기획 제목", altTitles: ["다른 제목"], targetLength: "35~45초", targetViewer: "자취 초보", thumbnailConcept: "큰 자막", hookIntro: "이거 모르면 손해", outline: ["0~2초: 훅", "2~10초: 재료"], keyPoints: ["자막"], tags: ["자취요리"], reference: "영상 1·3" }],
  blueOceanInsight: "편의점 재료 틈새",
};

const win = window as unknown as { apiCalls: number };
win.apiCalls = 0;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url === "/api/youtube/viral-finder" && (!init || init.method !== "POST")) return new Response(JSON.stringify({ usage: result.usage }), { headers: { "Content-Type": "application/json" } });
  if (url === "/api/youtube/viral-finder") return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  if (url === "/api/ai/viral-plan") return new Response(JSON.stringify({ report, model: "fixture" }), { headers: { "Content-Type": "application/json" } });
  win.apiCalls++;
  throw new Error("Fixture must not call an external API");
};

createRoot(document.getElementById("root")!).render(<main className="mx-auto max-w-7xl p-4"><ViralFinderPage /></main>);
