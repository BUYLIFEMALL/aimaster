/**
 * Meta OAuth requires an exact redirect URI match. Keep this production
 * callback independent from deployment-preview or optional site URL settings.
 */
export const THREADS_CONTENT_OPS_ORIGIN = "https://www.buylife.xyz";
export const THREADS_CONTENT_OPS_CALLBACK_URI =
  "https://www.buylife.xyz/api/threads-content-ops/callback";
