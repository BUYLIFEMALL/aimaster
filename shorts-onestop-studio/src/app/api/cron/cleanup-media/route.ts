import { createAdminClient } from "@/lib/supabase/admin";
import { json } from "@/lib/route";
import { BUCKET } from "@/lib/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 생성 파일 30일 자동 삭제(생성일 기준, 회원 생성 데이터 30일 규칙). v1.23 영상만 → v1.24 AI 이미지·내레이션 음성까지.
// 대상: <user_id>/ 바로 아래 AI 배경 이미지, <user_id>/voice/ 내레이션, <user_id>/video/ AI 영상.
// 제외: <user_id>/bgm/ — 회원이 직접 올린 배경음악(AI 생성물이 아님). 대본(shorts_onestop_items)은 지우지 않으며,
// 지워진 파일은 화면이 「30일이 지나 삭제됨 — 다시 만들기」로 안내한다(useMedia·useAudio의 gone).
// Vercel cron(vercel.json, 매일 03:30 KST)이 부른다. 기준: reverse-prompt/src/app/api/cron/cleanup/route.ts.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SUBFOLDERS = ["", "voice", "video"] as const;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const store = createAdminClient().storage.from(BUCKET);
  const now = Date.now();
  const removed: Record<string, number> = { image: 0, voice: 0, video: 0 };
  // v1.37 회원별 지운 개수 → usage_logs cleanup_expired(메인 관리자 「30일 자동 정리」 표, docs/PLATFORM_PATTERNS.md §35)
  const byOwner: Record<string, { images: number; voices: number; videos: number }> = {};
  for (let offset = 0; ; offset += 1000) {
    const { data: folders, error } = await store.list("", { limit: 1000, offset });
    if (error) return json({ error: error.message }, 500);
    for (const f of folders ?? []) {
      if (f.id) continue; // 폴더만(파일은 id가 있음)
      for (const sub of SUBFOLDERS) {
        const dir = sub ? `${f.name}/${sub}` : f.name;
        // 오래된 순으로 받아 지우고, 한 묶음(1000개)이 모두 지울 대상이었으면 처음부터 다시 받는다(지우면서 넘기면 순서가 밀려 건너뜀)
        for (let round = 0; round < 20; round++) {
          const { data: items } = await store.list(dir, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
          const files = (items ?? []).filter((x) => x.id); // 파일만(하위 폴더는 id가 없음)
          const stale = files.filter((x) => x.created_at && now - new Date(x.created_at).getTime() > TTL_MS).map((x) => `${dir}/${x.name}`);
          for (let i = 0; i < stale.length; i += 100) await store.remove(stale.slice(i, i + 100));
          removed[sub || "image"] += stale.length;
          if (stale.length) {
            const c = (byOwner[f.name] ??= { images: 0, voices: 0, videos: 0 });
            c[sub === "voice" ? "voices" : sub === "video" ? "videos" : "images"] += stale.length;
          }
          if (stale.length < 1000) break;
        }
      }
    }
    if ((folders?.length ?? 0) < 1000) break;
  }
  let loggedOwners = 0;
  const owners = Object.entries(byOwner);
  if (owners.length) {
    const admin = createAdminClient();
    const { data: program } = await admin.from("programs").select("id").eq("slug", "shorts-onestop-studio").maybeSingle();
    if (program) {
      for (const [userId, c] of owners) {
        const { error: logErr } = await admin.from("usage_logs").insert({
          user_id: userId, program_id: program.id, action: "cleanup_expired",
          quantity: c.images + c.voices + c.videos, credits_used: 0, metadata: { ...c },
        });
        if (!logErr) loggedOwners += 1;
      }
    }
  }
  return json({ ok: true, removed, loggedOwners });
}
