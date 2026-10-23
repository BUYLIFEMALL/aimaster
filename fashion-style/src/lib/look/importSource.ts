// AI 인물사진 「이 사진으로 코디」로 넘어온 주소(?src=)를 받을지 판단한다(v1.12).
// 우리 Supabase 저장소의 portrait-photo-files 서명 주소만 받는다. 사진은 지금처럼 브라우저 안에서만 다룬다(서버로 보내지 않음).
export function acceptsPortraitImport(src: string, supabaseUrl: string | undefined): boolean {
  try {
    const u = new URL(src);
    const own = new URL(supabaseUrl ?? "https://invalid.local");
    return u.protocol === "https:" && u.host === own.host && u.pathname.startsWith("/storage/v1/object/sign/portrait-photo-files/");
  } catch {
    return false;
  }
}
