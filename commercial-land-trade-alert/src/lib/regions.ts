// 네이버 cortarNo는 법정동 코드 10자리다. 표: regions.json(국토교통부 전국 법정동, realty-listing-alert에서 복사).
import regions from "./regions.json";

type Sido = { c: string; n: string; g: { c: string; n: string; d: [string, string][] }[] };

export function dongOf(cortarNo: string): { sggCd: string; sggNm: string; dong: string } | null {
  if (!/^\d{10}$/.test(cortarNo)) return null;
  const sgg = (regions as unknown as Sido[]).find((s) => s.c === cortarNo.slice(0, 2))?.g.find((g) => g.c === cortarNo.slice(0, 5));
  const dong = sgg?.d.find((d) => d[0] === cortarNo);
  return sgg && dong ? { sggCd: sgg.c, sggNm: sgg.n, dong: dong[1] } : null;
}
