// 서버가 대신 가져오는 이미지 URL의 안전성 검사(SSRF 방어). 순수 함수라 서버·테스트 모두에서 쓴다.

/** IPv4/IPv6 주소가 사설·루프백·링크로컬·메타데이터 등 내부망이면 true */
export function isPrivateAddress(ip: string): boolean {
  const addr = ip.trim().toLowerCase();
  if (!addr) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (mapped) return isPrivateAddress(mapped[1]);
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if ([a, b, Number(v4[3]), Number(v4[4])].some((n) => n > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // 링크로컬·클라우드 메타데이터
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // 멀티캐스트·예약
    return false;
  }
  if (addr.includes(":")) {
    if (addr === "::1" || addr === "::") return true;
    if (/^f[cd]/.test(addr)) return true; // fc00::/7
    if (/^fe[89ab]/.test(addr)) return true; // fe80::/10
    return false;
  }
  return true; // 알 수 없는 형식은 거부
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** 문자열 URL 검사: http/https, 사용자 정보 없음, 기본 포트, 내부 호스트명·IP 직접 입력 거부 */
export function checkImageUrl(input: string): UrlCheck {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return { ok: false, reason: "주소 형식이 올바르지 않습니다." }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "http/https 주소만 사용할 수 있습니다." };
  if (u.username || u.password) return { ok: false, reason: "사용자 정보가 포함된 주소는 사용할 수 없습니다." };
  if (u.port && u.port !== "80" && u.port !== "443") return { ok: false, reason: "허용되지 않는 포트입니다." };
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) {
    return { ok: false, reason: "내부 주소는 사용할 수 없습니다." };
  }
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isPrivateAddress(host)) return { ok: false, reason: "내부 주소는 사용할 수 없습니다." };
  }
  return { ok: true, url: u };
}
