export const SHARED_COOKIE_DOMAIN = ".buylife.xyz";

export function cookieDomainForHost(host?: string | null): string | undefined {
  const h = (host ?? "").split(":")[0].toLowerCase();
  return h === "buylife.xyz" || h.endsWith(".buylife.xyz") ? SHARED_COOKIE_DOMAIN : undefined;
}
