import { locateDong, sggCandidates, type DongBoundary, type SggBox } from "./geo";

let indexPromise: Promise<SggBox[]> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`경계 자료를 읽지 못했습니다(${res.status})`);
  return res.json();
}

/** 좌표를 서버로 보내지 않고 브라우저에서 시·군·구와 행정동을 정한다. 자료를 못 읽으면 분류 없이 저장한다 */
export async function locateAdminDong(lat: number, lon: number): Promise<{ sggCd: string | null; adminDong: string | null }> {
  try {
    indexPromise ??= fetchJson<SggBox[]>("/dong-boundaries/index.json");
    for (const sggCd of sggCandidates(await indexPromise, lat, lon)) {
      const adminDong = locateDong(await fetchJson<DongBoundary[]>(`/dong-boundaries/${sggCd}.json`), lat, lon);
      if (adminDong) return { sggCd, adminDong };
    }
  } catch {
    indexPromise = null;
  }
  return { sggCd: null, adminDong: null };
}
