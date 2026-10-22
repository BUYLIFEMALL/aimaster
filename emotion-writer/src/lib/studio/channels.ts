// 「다른 크기로 받기」(v1.18, D-62-03): 같은 글귀·배경·디자인을 AI 재호출 없이 채널 규격 크기로 다시 그린다.
// 배경은 기존처럼 꽉 채워 잘라 그리고(coverRect), 글귀는 높이 70% 안에 들어갈 때까지 글자를 줄인다(drawQuote).
export interface ChannelSize { id: string; label: string; width: number; height: number }

// v1.21: 이미지 변환 스튜디오(v1.12~) 게시처 규격과 이름·숫자 통일(가로 공유 1200×628 → 1200×630, 유튜브 썸네일 추가). 세로 3:4는 이 프로그램 전용으로 유지
export const CHANNEL_SIZES: readonly ChannelSize[] = [
  { id: "insta-feed", label: "인스타 피드 1:1", width: 1080, height: 1080 },
  { id: "insta-portrait", label: "인스타 세로 4:5", width: 1080, height: 1350 },
  { id: "story", label: "스토리·릴스 9:16", width: 1080, height: 1920 },
  { id: "portrait-3x4", label: "세로 3:4", width: 1080, height: 1440 },
  { id: "youtube-thumb", label: "유튜브 썸네일 16:9", width: 1280, height: 720 },
  { id: "share-og", label: "블로그·카톡 공유 1200×630", width: 1200, height: 630 },
];

export function channelFileName(c: ChannelSize, now = Date.now()): string {
  return `감성글귀-${c.id}-${c.width}x${c.height}-${now}.jpg`;
}
