// 「오늘의 발행」 화면 계산(순수 함수 — 시험 가능). 시간은 한국 시간 기준.
export type PostLite = {
  id: string;
  platform: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  remote_url: string | null;
  error_detail: string | null;
  created_at: string;
};

const KST_OFFSET_MS = 9 * 3600 * 1000;
const kstDay = (ms: number) => new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);

export function summarize(posts: PostLite[], now = Date.now()) {
  const today = kstDay(now);
  const month = today.slice(0, 7);
  return {
    todayScheduled: posts.filter((p) => p.status === "scheduled" && p.scheduled_at && kstDay(Date.parse(p.scheduled_at)) === today).length,
    drafts: posts.filter((p) => p.status === "draft" || p.status === "writing" || p.status === "ready").length,
    publishedThisMonth: posts.filter((p) => p.status === "published" && p.published_at && kstDay(Date.parse(p.published_at)).slice(0, 7) === month).length,
    needsCheck: posts.filter((p) => p.status === "uncertain" || p.status === "failed").length,
  };
}

// 다음 예약(지금 이후 가장 가까운 것) — 플랫폼별
export function nextScheduled(posts: PostLite[], platform: string, now = Date.now()) {
  return posts
    .filter((p) => p.platform === platform && p.status === "scheduled" && p.scheduled_at && Date.parse(p.scheduled_at) > now)
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!))[0] ?? null;
}

// 「T-02:14」(시:분). 하루 넘으면 「T-3일」.
export function countdown(iso: string, now = Date.now()) {
  const diff = Math.max(0, Date.parse(iso) - now);
  const min = Math.floor(diff / 60000);
  if (min >= 24 * 60) return `T-${Math.floor(min / (24 * 60))}일`;
  return `T-${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function kstLabel(iso: string, now = Date.now()) {
  const t = Date.parse(iso);
  const hm = new Date(t + KST_OFFSET_MS).toISOString().slice(11, 16);
  const d = kstDay(t);
  if (d === kstDay(now)) return `오늘 ${hm}`;
  if (d === kstDay(now + 86400000)) return `내일 ${hm}`;
  return `${d.slice(5).replace("-", "/")} ${hm}`;
}

export const STATUS_LABEL: Record<string, [string, string]> = {
  writing: ["작성 중", "lp-tag-idle"],
  ready: ["발행 준비", "lp-tag-idle"],
  publishing: ["보내는 중", "lp-tag-idle"],
  draft: ["초안", "lp-tag-blogger"],
  scheduled: ["예약", "lp-tag-wp"],
  published: ["발행됨", "lp-tag-ok"],
  failed: ["실패", "lp-tag-warn"],
  uncertain: ["확인 필요", "lp-tag-warn"],
};
export const PLATFORM_LABEL: Record<string, string> = { wordpress: "워드프레스", blogger: "구글 블로그" };
