import { createAdminClient } from "@/lib/supabase/admin";
import { json } from "@/lib/route";
import { BUCKET } from "@/lib/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.23 AI 영상 30일 자동 삭제(회원 생성 데이터 30일 규칙, 생성일 기준). 대상은 회원 폴더의 video/ 아래 mp4만.
// 기존 AI 이미지·음성 파일 정리는 아직 없음 — docs/IMPROVEMENTS.md에 별도 과제로 기록(이번 변경 범위 밖).
// Vercel cron(vercel.json, 매일 03:30 KST)이 부른다. 기준: reverse-prompt/src/app/api/cron/cleanup/route.ts.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const store = createAdminClient().storage.from(BUCKET);
  let users = 0, files = 0;
  for (let offset = 0; ; offset += 1000) {
    const { data: folders, error } = await store.list("", { limit: 1000, offset });
    if (error) return json({ error: error.message }, 500);
    for (const f of folders ?? []) {
      if (f.id) continue; // 폴더만(파일은 id가 있음)
      const { data: items } = await store.list(`${f.name}/video`, { limit: 1000 });
      const stale = (items ?? []).filter((x) => x.id && x.created_at && Date.now() - new Date(x.created_at).getTime() > TTL_MS).map((x) => `${f.name}/video/${x.name}`);
      for (let i = 0; i < stale.length; i += 100) await store.remove(stale.slice(i, i + 100));
      if (stale.length) users++;
      files += stale.length;
    }
    if ((folders?.length ?? 0) < 1000) break;
  }
  return json({ ok: true, users, files });
}
