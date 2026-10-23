// 다른 프로그램 결과를 스토리보드 참고 이미지로 받기(v1.11 — AI 바나나 캔버스 「🎬 스토리보드로」, v1.14 — AI 4컷 만화 완성작, v1.15 — AI 인물사진 서버 보관 사진).
// 우리 Supabase 저장소의 허용 버킷 서명 주소만 받는다. 받은 이미지는 직접 고른 파일과 똑같이 브라우저 미리보기로만 들어간다.
export const IMPORT_SOURCES: Record<string, string> = {
  "banana-canvas-files": "AI 바나나 캔버스",
  "four-cut-comics-files": "AI 4컷 만화",
  "portrait-photo-files": "AI 인물사진",
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
