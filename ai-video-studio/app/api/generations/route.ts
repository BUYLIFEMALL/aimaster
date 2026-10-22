import { NextResponse } from "next/server";
import { checkProgramAccessApi, getUserApiKey, logProgramUsage } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { PROVIDERS, clampSeconds, estCostUsd, findModel, type AspectRatio } from "@/lib/providers/catalog";
import { BUCKET, advance, startJob, toClient, type GenerationRow } from "@/lib/generations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// Gemini가 백그라운드 실행을 거절하면 공용 코드가 한 번에 기다리는 방식(최대 270초)으로 다시 보낸다
export const maxDuration = 300;

const MAX_RUNNING = 4;
const MAX_IMAGE_BYTES = 2_500_000;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** data:image/(jpeg|png|webp);base64,... 만 받는다(화면이 미리 줄여서 보냄) */
function parseImage(v: unknown): { bytes: Buffer; type: string; ext: string } | null | "bad" {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return "bad";
  const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m) return "bad";
  const bytes = Buffer.from(m[3], "base64");
  if (bytes.byteLength < 100 || bytes.byteLength > MAX_IMAGE_BYTES) return "bad";
  return { bytes, type: m[1], ext: m[2] === "jpeg" ? "jpg" : m[2] };
}

/** 회원 본인 행만 읽는다. ids가 있으면 그 행만(진행 중이면 한 단계 진행), 없으면 최근 60개 */
export async function GET(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const admin = createAdminClient();
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    .slice(0, 12);

  const load = async () => {
    let q = admin.from("avs_generations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    q = ids.length ? q.in("id", ids) : q.limit(60);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as GenerationRow[];
  };

  try {
    let rows = await load();
    const running = rows.filter((r) => r.status === "running").slice(0, MAX_RUNNING);
    if (running.length) {
      const keys = new Map<string, string | null>();
      let changed = false;
      for (const r of running) {
        const kp = PROVIDERS[r.provider].keyProvider;
        if (!keys.has(kp)) keys.set(kp, await getUserApiKey(user.id, kp));
        if (await advance(admin, r, keys.get(kp) ?? null)) changed = true;
      }
      if (changed) rows = await load();
    }
    return NextResponse.json({ generations: await toClient(admin, rows) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("[generations] 조회 실패:", e);
    return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

/** 영상 생성 접수(모델 1개, 유료 호출 1건 · 자동 재시도 없음) */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4_200_000) return NextResponse.json({ error: "사진이 너무 큽니다. 더 작은 사진을 골라 주세요." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const model = findModel(body.model);
  if (!model) return NextResponse.json({ error: "지원하지 않는 모델입니다." }, { status: 400 });
  const prompt = str(body.prompt, 2000);
  if (prompt.length < 2) return NextResponse.json({ error: "영상 설명(프롬프트)을 적어 주세요." }, { status: 400 });
  const start = parseImage(body.startImage);
  const end = parseImage(body.endImage);
  if (start === "bad" || end === "bad") return NextResponse.json({ error: "사진은 2.5MB 이하의 JPG·PNG·WEBP만 쓸 수 있습니다." }, { status: 400 });
  if (model.needsImage && !start) return NextResponse.json({ error: `${model.name}은(는) 시작 장면 사진이 필요합니다.` }, { status: 400 });
  if (end && !start) return NextResponse.json({ error: "끝 장면 사진은 시작 장면 사진과 함께 넣어 주세요." }, { status: 400 });
  const withEnd = !!end && model.endFrame;
  const aspect: AspectRatio | null = model.aspects.length ? (model.aspects.includes(body.aspectRatio as AspectRatio) ? (body.aspectRatio as AspectRatio) : model.aspects[0]) : null;
  const seconds = clampSeconds(model, body.seconds);

  // 회원 본인 키만 — 없으면 등록 안내(다른 회원·운영자 키로 대신하지 않음)
  const provider = PROVIDERS[model.provider];
  const apiKey = await getUserApiKey(user.id, provider.keyProvider);
  if (!apiKey) {
    return NextResponse.json({ error: `${provider.name} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.`, missingKeys: [provider.name] }, { status: 400 });
  }

  const admin = createAdminClient();
  const { count } = await admin.from("avs_generations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if ((count ?? 0) >= MAX_RUNNING) {
    return NextResponse.json({ error: `동시에 만들 수 있는 영상은 ${MAX_RUNNING}개까지입니다. 진행 중인 영상이 끝난 뒤 다시 시도해 주세요.` }, { status: 429 });
  }

  const id = crypto.randomUUID();
  const upload = async (img: { bytes: Buffer; type: string; ext: string }, name: string) => {
    const path = `${user.id}/${id}/${name}.${img.ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, img.bytes, { contentType: img.type, upsert: true });
    if (error) throw new Error(error.message);
    return path;
  };
  let startPath: string | null = null;
  let endPath: string | null = null;
  try {
    if (start) startPath = await upload(start, "start");
    if (end && withEnd) endPath = await upload(end, "end");
  } catch (e) {
    console.error("[generations] 사진 저장 실패:", e);
    return NextResponse.json({ error: "장면 사진을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }

  const { data: created, error } = await admin
    .from("avs_generations")
    .insert({
      id,
      user_id: user.id,
      provider: model.provider,
      model: model.id,
      status: "running",
      prompt,
      aspect_ratio: aspect,
      duration_s: seconds,
      start_image: startPath,
      end_image: endPath,
      options: {},
      est_cost_usd: estCostUsd(model, seconds, withEnd),
    })
    .select("*")
    .single();
  if (error || !created) {
    console.error("[generations] 저장 실패:", error);
    return NextResponse.json({ error: "생성 요청을 저장하지 못했습니다." }, { status: 500 });
  }

  await startJob(admin, created as GenerationRow, apiKey);
  await logProgramUsage(user.id, "generate_video", 1, { model: model.id, seconds, withEnd });

  const { data: fresh } = await admin.from("avs_generations").select("*").eq("id", id);
  return NextResponse.json({ generations: await toClient(admin, (fresh ?? [created]) as GenerationRow[]) }, { headers: { "Cache-Control": "private, no-store" } });
}
