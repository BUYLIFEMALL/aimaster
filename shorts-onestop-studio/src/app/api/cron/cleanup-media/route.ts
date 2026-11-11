import { createAdminClient } from "@/lib/supabase/admin";
import { json } from "@/lib/route";
import { BUCKET } from "@/lib/media";
import { loadRetentionExemptIds } from "@/lib/retentionExempt";
import { EXPIRING_KINDS, rowCutoffIso } from "@/lib/retentionRows";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 생성 파일 30일 자동 삭제(생성일 기준, 회원 생성 데이터 30일 규칙). v1.23 영상만 → v1.24 AI 이미지·내레이션 음성까지.
// 대상: <user_id>/ 바로 아래 AI 배경 이미지, <user_id>/voice/ 내레이션, <user_id>/video/ AI 영상.
// v1.38 <user_id>/ams/ — AI 음악 스튜디오에서 고른 곡의 복사본(AI 생성물)도 대상.
// 제외: <user_id>/bgm/ — 회원이 직접 올린 배경음악(AI 생성물이 아님). v1.49부터 대본·발행 계획 행도 30일(lib/retentionRows.ts),
// 유튜브에 업로드했어도 똑같이 30일(2026-11-11 주인님 최종). 프리셋·지침·설정은 지우지 않는다.
// 지워진 파일은 화면이 「30일이 지나 삭제됨 — 다시 만들기」로 안내한다(useMedia·useAudio의 gone).
// Vercel cron(vercel.json, 매일 03:30 KST)이 부른다. 기준: reverse-prompt/src/app/api/cron/cleanup/route.ts.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SUBFOLDERS = ["", "voice", "video", "ams"] as const;

export async function GET(request: Request) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  const store = createAdminClient().storage.from(BUCKET);
  // 예외 회원(관리자·시험 계정) 폴더는 지우지 않는다. 목록을 읽지 못하면 정리 전체를 멈춘다(2026-11-03).
  let exempt: Set<string>;
  try { exempt = await loadRetentionExemptIds(createAdminClient()); } catch { return json({ error: "자동 삭제 예외 회원 목록을 읽지 못해 정리를 멈췄습니다." }, 503); }
  const now = Date.now();
  const removed: Record<string, number> = { image: 0, voice: 0, video: 0, ams: 0, scripts: 0 };
  // v1.37 회원별 지운 개수 → usage_logs cleanup_expired(메인 관리자 「30일 자동 정리」 표, docs/PLATFORM_PATTERNS.md §35)
  const byOwner: Record<string, { images: number; voices: number; videos: number; tracks: number; scripts: number }> = {};
  for (let offset = 0; ; offset += 1000) {
    const { data: folders, error } = await store.list("", { limit: 1000, offset });
    if (error) return json({ error: error.message }, 500);
    for (const f of folders ?? []) {
      if (f.id) continue; // 폴더만(파일은 id가 있음)
      if (exempt.has(f.name)) continue; // 예외 회원 폴더
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
            const c = (byOwner[f.name] ??= { images: 0, voices: 0, videos: 0, tracks: 0, scripts: 0 });
            c[sub === "voice" ? "voices" : sub === "video" ? "videos" : sub === "ams" ? "tracks" : "images"] += stale.length;
          }
          if (stale.length < 1000) break;
        }
      }
    }
    if ((folders?.length ?? 0) < 1000) break;
  }
  // v1.49 대본·발행 계획 행도 30일(발행 여부 무관, 2026-11-11 최종 규칙). 예외 회원은 조회 조건으로 뺀다.
  const { data: goneRows, error: rowErr } = await createAdminClient().from("shorts_onestop_items")
    .delete().in("kind", [...EXPIRING_KINDS]).lt("updated_at", rowCutoffIso(now))
    .not("user_id", "in", `(${exempt.size ? Array.from(exempt).join(",") : "00000000-0000-0000-0000-000000000000"})`)
    .select("user_id");
  if (rowErr) return json({ error: "대본 정리에 실패했습니다.", removed }, 500);
  removed.scripts = goneRows?.length ?? 0;
  for (const r of (goneRows ?? []) as { user_id: string }[]) {
    (byOwner[r.user_id] ??= { images: 0, voices: 0, videos: 0, tracks: 0, scripts: 0 }).scripts += 1;
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
          quantity: c.images + c.voices + c.videos + c.tracks + c.scripts, credits_used: 0, metadata: { ...c },
        });
        if (!logErr) loggedOwners += 1;
      }
    }
  }
  return json({ ok: true, removed, loggedOwners });
}
