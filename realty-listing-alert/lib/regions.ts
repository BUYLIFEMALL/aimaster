// 지역(시·구·동) 목록 — public/regions.json(국토교통부 전국 법정동, scripts/build-regions.mjs로 생성).
// 화면은 /regions.json을 받아 버튼으로 보여 주고, 서버는 같은 파일로 동 번호를 확인해 이름을 붙인다(화면이 보낸 이름은 믿지 않음).
import regions from "@/public/regions.json";

export type RegionDong = [code: string, name: string];
export type RegionSgg = { c: string; n: string; d: RegionDong[] };
export type RegionSido = { c: string; n: string; g: RegionSgg[] };

export const REGION_MAX_OPTIONS = [3, 5, 10] as const;
export const DEFAULT_REGION_MAX = 5;

/** 동 번호(법정동 10자리 = 네이버 cortarNo)로 표시 이름을 찾는다. 예: 「고양시 일산동구 백석동」. 없으면 null. */
export function regionNameOf(cortarNo: string): string | null {
  if (!/^\d{10}$/.test(cortarNo)) return null;
  const sido = (regions as RegionSido[]).find((s) => s.c === cortarNo.slice(0, 2));
  const sgg = sido?.g.find((g) => g.c === cortarNo.slice(0, 5));
  const dong = sgg?.d.find((d) => d[0] === cortarNo);
  return sgg && dong ? `${sgg.n} ${dong[1]}` : null;
}
