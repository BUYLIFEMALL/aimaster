import { nearestAddress, tilesFor, type AddressHit, type AddressRow } from "./geo";

// 격자 파일은 운영 Supabase Storage 공개 읽기 버킷에 있다(scripts/build-geo-address.mjs). 좌표를 서버로 보내지 않고 주변 격자만 받는다.
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/geo-address/v1/`;
const cache = new Map<string, Promise<AddressRow[]>>();

async function fetchTile(key: string): Promise<AddressRow[]> {
  const res = await fetch(`${BASE}${key}.json.gz`);
  if (res.status === 400 || res.status === 404) return []; // 건물이 없는 격자(바다·산)
  if (!res.ok || !res.body) throw new Error(`주소 자료를 읽지 못했습니다(${res.status})`);
  const text = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
  return JSON.parse(text) as AddressRow[];
}

/** 가장 가까운 건물의 도로명주소. 자료를 못 읽거나 150m 안에 건물이 없으면 null */
export async function findAddress(lat: number, lon: number): Promise<AddressHit | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const lists = await Promise.all(
      tilesFor(lat, lon).map((key) => {
        if (!cache.has(key)) cache.set(key, fetchTile(key).catch((e) => (cache.delete(key), Promise.reject(e))));
        return cache.get(key)!;
      }),
    );
    return nearestAddress(lists.flat(), lat, lon);
  } catch {
    return null;
  }
}
