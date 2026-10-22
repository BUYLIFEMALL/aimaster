import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "undici";

// 외부 웹페이지를 대신 가져오는 API(크롤링·미리보기·이미지)가 서버 내부망·사설 주소로
// 요청을 보내지 못하게 막는다(SSRF 방지). 리디렉트도 한 번씩 다시 검사한다.

const MAX_REDIRECTS = 5;

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  if (isIP(ip) !== 6) return true;
  const v6 = new URL(`http://[${ip}]/`).hostname.slice(1, -1).toLowerCase();
  if (v6.startsWith("::ffff:")) {
    // URL은 ::ffff:127.0.0.1도 ::ffff:7f00:1로 정규화한다.
    const words = v6.slice(7).split(":").map((part) => parseInt(part, 16));
    if (words.length !== 2 || words.some((n) => !Number.isFinite(n))) return true;
    return isPrivateIPv4([words[0] >> 8, words[0] & 255, words[1] >> 8, words[1] & 255].join("."));
  }
  if (v6.startsWith("::")) return true;
  const first = parseInt(v6.split(":")[0], 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
}

export class BlockedUrlError extends Error {}

/** http/https 공개 주소인지 확인하고 URL 객체를 돌려준다. 아니면 BlockedUrlError. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  return (await resolvePublicUrl(raw)).url;
}

async function resolvePublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("올바른 URL 형식이 아닙니다.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("http 또는 https 주소만 사용할 수 있습니다.");
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("인증 정보가 포함된 URL은 수집할 수 없습니다.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new BlockedUrlError("내부 주소는 수집할 수 없습니다.");
  }
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) {
    throw new BlockedUrlError("주소를 찾을 수 없습니다. 도메인을 확인해주세요.");
  }
  if (addresses.some((value) => isPrivateIP(value.address))) {
    throw new BlockedUrlError("내부·사설 네트워크 주소는 수집할 수 없습니다.");
  }
  return { url, addresses };
}

/** 공개 주소만 허용하는 fetch. 리디렉트를 직접 따라가며 매번 주소를 검사한다. */
export async function safeFetch(raw: string, init: RequestInit = {}): Promise<{ response: Response; finalUrl: URL }> {
  let current = raw;
  const signal = init.signal ?? AbortSignal.timeout(20_000);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const { url, addresses } = await resolvePublicUrl(current);
    const pinned = addresses.find((value) => value.family === 4) ?? addresses[0];
    // fetch가 DNS를 다시 조회하면 검사 뒤 사설 IP로 바꾸는 rebinding이 가능하다.
    // 원래 hostname/TLS 검증은 유지하고 연결의 lookup만 검사한 주소에 고정한다.
    const dispatcher = new Agent({ connect: {
      autoSelectFamily: false,
      lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
    } });
    let response: Response;
    try {
      const options = { ...init, signal, redirect: "manual" as const, dispatcher };
      response = await fetch(url, options);
    } finally {
      // close는 이미 받은 응답 본문을 소비할 때까지 기다리므로 여기서 await하지 않는다.
      void dispatcher.close().catch(() => {});
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      current = new URL(location, url).href;
      continue;
    }
    return { response, finalUrl: url };
  }
  throw new BlockedUrlError("리디렉트가 너무 많습니다.");
}
