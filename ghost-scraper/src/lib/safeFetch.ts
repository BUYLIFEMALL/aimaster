import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateIPv4(v6.slice(7));
  return v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("ff");
}

export class BlockedUrlError extends Error {}

/** http/https 공개 주소인지 확인하고 URL 객체를 돌려준다. 아니면 BlockedUrlError. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("올바른 URL 형식이 아닙니다.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("http 또는 https 주소만 사용할 수 있습니다.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new BlockedUrlError("내부 주소는 수집할 수 없습니다.");
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((r) => r.address);
  if (addresses.length === 0) {
    throw new BlockedUrlError("주소를 찾을 수 없습니다. 도메인을 확인해주세요.");
  }
  if (addresses.some(isPrivateIP)) {
    throw new BlockedUrlError("내부·사설 네트워크 주소는 수집할 수 없습니다.");
  }
  return url;
}

/** 공개 주소만 허용하는 fetch. 리디렉트를 직접 따라가며 매번 주소를 검사한다. */
export async function safeFetch(raw: string, init: RequestInit = {}): Promise<{ response: Response; finalUrl: URL }> {
  let current = await assertPublicUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = await assertPublicUrl(new URL(location, current).href);
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new BlockedUrlError("리디렉트가 너무 많습니다.");
}
