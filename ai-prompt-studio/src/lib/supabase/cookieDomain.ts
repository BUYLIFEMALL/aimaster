export function getCookieDomain(): string | undefined {
  if (typeof window === "undefined") {
    const host = process.env.NEXT_PUBLIC_SITE_URL || "";
    if (host.includes("buylife.xyz")) return ".buylife.xyz";
    return undefined;
  }
  const hostname = window.location.hostname;
  if (hostname.endsWith("buylife.xyz")) return ".buylife.xyz";
  return undefined;
}
