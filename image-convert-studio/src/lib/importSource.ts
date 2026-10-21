// 다른 프로그램 「형식 바꾸기」로 넘어온 주소(?src=)를 받을지 판단한다(v1.10 — 바나나 캔버스에 AI 인물사진·AI 4컷 만화 추가).
// 우리 Supabase 저장소의 아래 버킷 서명 주소만 받는다(다른 주소는 무시). 이미지는 지금처럼 브라우저 안에서만 처리한다.
export const IMPORT_SOURCES: Record<string, string> = {
  "banana-canvas-files": "바나나 캔버스",
  "portrait-photo-files": "AI 인물사진",
  "four-cut-comics-files": "AI 4컷 만화",
};

/** 받을 수 있으면 보낸 프로그램 이름, 아니면 null */
export function importSourceOf(src: string, supabaseUrl: string | undefined): string | null {
  try {
    const u = new URL(src);
    const own = new URL(supabaseUrl ?? "https://invalid.local");
    if (u.protocol !== "https:" || u.host !== own.host) return null;
    const m = u.pathname.match(/^\/storage\/v1\/object\/sign\/([^/]+)\//);
    return m && IMPORT_SOURCES[m[1]] ? IMPORT_SOURCES[m[1]] : null;
  } catch {
    return null;
  }
}
