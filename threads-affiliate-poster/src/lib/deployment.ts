// Where this copy of the program runs.
// - AIMaster (default): accounts, grants and manuals live on the AIMaster site (buylife.xyz).
// - Standalone (NEXT_PUBLIC_STANDALONE_MODE=true): a clone on someone else's Vercel/Supabase
//   (clone-kit/ has the manual). It takes its own sign-ups, hosts its own legal pages and
//   does not touch the other AIMaster Threads programs' tables.
// NEXT_PUBLIC_* values are inlined at build time, so this is safe in client components too.

export const IS_STANDALONE = process.env.NEXT_PUBLIC_STANDALONE_MODE === "true";

const AIMASTER_SITE_URL = "https://www.buylife.xyz";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** Site that owns sign-up and the program catalog. In standalone mode it is this app itself. */
export const MAIN_SITE_URL = IS_STANDALONE
  ? (process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? SITE_URL)
  : (process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz");

/**
 * Base of the public integration manuals (`/guides/<id>`). Standalone copies show no manual
 * buttons unless the operator points this at their own manual site.
 */
export const GUIDE_BASE_URL = IS_STANDALONE
  ? (process.env.NEXT_PUBLIC_GUIDE_BASE_URL ?? "").replace(/\/$/, "")
  : AIMASTER_SITE_URL;

/** Data-deletion status page returned to Meta by the delete callback. */
export const DATA_DELETION_URL = IS_STANDALONE
  ? `${SITE_URL}/legal/data-deletion`
  : `${AIMASTER_SITE_URL}/data-deletion`;

/** Shown on the standalone legal pages. */
export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "",
  email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL ?? "",
};
