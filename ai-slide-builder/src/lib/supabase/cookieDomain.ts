export function getCookieDomain(): string | undefined {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    return cookieDomainForHost(host);
  }
  return undefined;
}

export function cookieDomainForHost(host?: string | null): string | undefined {
  if (!host) return undefined;
  if (host.endsWith("buylife.xyz")) {
    return ".buylife.xyz";
  }
  return undefined;
}
