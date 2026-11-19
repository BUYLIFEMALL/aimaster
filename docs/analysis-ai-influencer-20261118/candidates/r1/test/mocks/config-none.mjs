export const SCHEDULER_SITE_ORIGIN = "https://example.test";
export const SCHEDULER_TABLE = "sched";
export const SCHEDULER_POSTS_TABLE = "posts";
export const SCHEDULER_TOKEN_PREFIX = "tst";
export const PLATFORM_SCHEDULER_ENV = "TST_PLATFORM_SCHEDULER";
export const MEMBER_DISPATCH_PATH = "/api/x/dispatch-member";
export const SCHEDULER_PROGRAM_SLUG = "tst";
export const SCHEDULER_IS_STANDALONE = false;
export async function countRemainingWork(service, userId) { return globalThis.T.remaining[userId] ?? 0; }
