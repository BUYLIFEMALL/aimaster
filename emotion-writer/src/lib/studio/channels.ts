// 「다른 크기로 받기」(v1.18, D-62-03): 같은 글귀·배경·디자인을 AI 재호출 없이 채널 규격 크기로 다시 그린다.
// 배경은 기존처럼 꽉 채워 잘라 그리고(coverRect), 글귀는 높이 70% 안에 들어갈 때까지 글자를 줄인다(drawQuote).
import { presetById } from "./postPresets";

export interface ChannelSize { id: string; label: string; width: number; height: number }

// v1.21~: 이미지 변환 스튜디오 게시처 규격과 같은 이름·숫자 — v1.22부터 공용 기준 코드 post-presets 사본(./postPresets)에서 가져온다.
// 스마트스토어 상품은 글귀 카드에 맞지 않아 빼고, 세로 3:4는 이 프로그램 전용으로 더한다
const pick = (id: string): ChannelSize => { const p = presetById(id)!; return { id: p.id, label: p.label, width: p.width, height: p.height }; };
export const CHANNEL_SIZES: readonly ChannelSize[] = [
  pick("insta-feed"),
  pick("insta-portrait"),
  pick("story"),
  { id: "portrait-3x4", label: "세로 3:4", width: 1080, height: 1440 },
  pick("youtube-thumb"),
  pick("share-og"),
];

export function channelFileName(c: ChannelSize, now = Date.now()): string {
  return `감성글귀-${c.id}-${c.width}x${c.height}-${now}.jpg`;
}
