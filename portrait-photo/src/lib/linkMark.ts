// 공용 기준 코드 `link-mark`(2026-10-22) — 프로그램 사이 연계 기록과 받는 쪽 「보낸 곳」 이름표.
// ① 서버: 정해진 값만 받기(`pickAllowed`) · 첫 1회만 저장할 다음 값 계산(`onceMarkNext`, 이미 있으면 null — 그대로 둠)
// ② 화면: 같은 것은 한 화면에서 한 번만 보내기(`createOnceSender`)
// ③ 받는 쪽: 그림 주소를 이미 `?src=`로 받는 프로그램(변환 스튜디오·스토리보드)은 보낸 곳을 `?via=`로 받는다(`VIA_SOURCES`·`viaSource`·`withVia`)
// 저장 위치(표·칸)·인증은 각 프로그램. 사본은 직접 고치지 말고 이 파일만 고친 뒤 사본에 반영(`scripts/check-shared-modules.mjs`)
export function pickAllowed<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export type OnceMark = { kind: "download" } | { kind: "handoff"; to: string };

/** 지금 jsonb 값(`options`·`metadata`)에 첫 시각을 넣은 새 값. 이미 있으면 null(다시 쓰지 않음) */
export function onceMarkNext(current: unknown, mark: OnceMark, now: string): Record<string, unknown> | null {
  const base = (current && typeof current === "object" ? current : {}) as Record<string, unknown>;
  if (mark.kind === "download") return base.downloadedAt ? null : { ...base, downloadedAt: now };
  const handoffs = (base.handoffs && typeof base.handoffs === "object" ? base.handoffs : {}) as Record<string, string>;
  return handoffs[mark.to] ? null : { ...base, handoffs: { ...handoffs, [mark.to]: now } };
}

/** 한 화면에서 같은 키는 한 번만 보내는 함수(다운로드·넘김 버튼을 여러 번 눌러도 요청 1번) */
export function createOnceSender() {
  const sent = new Set<string>();
  return (key: string, send: () => void) => {
    if (!key || sent.has(key)) return;
    sent.add(key);
    send();
  };
}

// 받는 쪽 「보낸 곳」 이름표(`?via=`) — 정해 둔 이름만 안내·돌아가기 링크에 쓴다(`back`은 조사까지 맞춘 링크 문구)
export const VIA_SOURCES = {
  "banana-canvas": { name: "바나나 캔버스", url: "https://banana-canvas.buylife.xyz/history", back: "바나나 캔버스로 돌아가기" },
  "portrait-photo": { name: "AI 인물사진", url: "https://portrait-photo.buylife.xyz/history", back: "AI 인물사진으로 돌아가기" },
  "four-cut-comics": { name: "AI 4컷 만화", url: "https://four-cut-comics.buylife.xyz/works", back: "AI 4컷 만화로 돌아가기" },
  "ai-image-studio": { name: "AI 이미지 스튜디오", url: "https://ai-image-studio.buylife.xyz/gallery", back: "AI 이미지 스튜디오로 돌아가기" },
} as const;
export type ViaSource = keyof typeof VIA_SOURCES;

export function viaSource(v: unknown): { key: ViaSource; name: string; url: string; back: string } | undefined {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(VIA_SOURCES, v) ? { key: v as ViaSource, ...VIA_SOURCES[v as ViaSource] } : undefined;
}

export function withVia(url: string, via: ViaSource): string {
  return `${url}${url.includes("?") ? "&" : "?"}via=${via}`;
}
