import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { checkProgramAccessApi, getUserApiKey, logProgramUsage } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { MAX_COMPARE, MAX_IMAGES, PROVIDERS, clampDuration, findModel, validateForModel, type InputImage, type MusicModel } from "@/lib/providers/catalog";
import { adapterOf, advance, runSynchronous, startAsync, toClient, type GenerationRow } from "@/lib/generations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// Gemini·ElevenLabs는 응답 뒤(waitUntil)에서 최대 4분 기다려 저장한다
export const maxDuration = 300;

const MAX_RUNNING = 6;
const LANGUAGES = new Set(["auto", "Korean", "English", "Japanese", "Chinese", "Spanish"]);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

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
    let q = admin.from("ams_generations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    q = ids.length ? q.in("id", ids) : q.limit(60);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as GenerationRow[];
  };

  try {
    let rows = await load();
    const running = rows.filter((r) => r.status === "running").slice(0, 6);
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

/** 생성 접수 — 모델 1개면 일반 생성, 2~3개면 같은 설명으로 비교 생성 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    // v1.06 분위기 이미지(최대 4장, 화면에서 1024px로 줄임) 때문에 Vercel 본문 한도(4.5MB) 안쪽으로
    if (raw.length > 4_300_000) return NextResponse.json({ error: "입력이 너무 큽니다(이미지를 줄여 주세요)." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const modelKeys = Array.from(new Set(Array.isArray(body.models) ? body.models.filter((m): m is string => typeof m === "string") : []));
  if (modelKeys.length < 1 || modelKeys.length > MAX_COMPARE) {
    return NextResponse.json({ error: `모델을 1~${MAX_COMPARE}개 골라 주세요.` }, { status: 400 });
  }
  const models = modelKeys.map(findModel);
  if (models.some((m) => !m)) return NextResponse.json({ error: "지원하지 않는 모델이 있습니다." }, { status: 400 });

  const prompt = str(body.prompt, 2000);
  if (prompt.length < 2) return NextResponse.json({ error: "곡 설명(장르·분위기)을 적어 주세요." }, { status: 400 });
  const title = str(body.title, 80);
  const lyrics = str(body.lyrics, 5000);
  const instrumental = body.instrumental === true;
  const language = LANGUAGES.has(String(body.language)) ? String(body.language) : "auto";
  const requested = typeof body.durationS === "number" ? body.durationS : null;
  const format = body.format === "wav" ? "wav" : "mp3";
  const images: InputImage[] = (Array.isArray(body.images) ? body.images : [])
    .filter((im): im is InputImage =>
      !!im && typeof im === "object" &&
      ["image/jpeg", "image/png", "image/webp"].includes((im as InputImage).mimeType) &&
      typeof (im as InputImage).data === "string" && /^[A-Za-z0-9+/=]+$/.test((im as InputImage).data.slice(0, 200)) &&
      (im as InputImage).data.length <= 1_500_000)
    .slice(0, MAX_IMAGES);

  for (const m of models as MusicModel[]) {
    const why = validateForModel(m, { instrumental, lyrics });
    if (why) return NextResponse.json({ error: why }, { status: 400 });
  }

  // 회원 본인 키만 — 없으면 등록 안내(다른 회원·운영자 키로 대신하지 않음)
  const keys = new Map<string, string>();
  const missing: string[] = [];
  for (const m of models as MusicModel[]) {
    const p = PROVIDERS[m.provider];
    if (keys.has(p.keyProvider) || missing.includes(p.name)) continue;
    const k = await getUserApiKey(user.id, p.keyProvider);
    if (k) keys.set(p.keyProvider, k);
    else missing.push(p.name);
  }
  if (missing.length) {
    return NextResponse.json(
      { error: `${missing.join(", ")} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.`, missingKeys: missing },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { count } = await admin.from("ams_generations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if ((count ?? 0) + models.length > MAX_RUNNING) {
    return NextResponse.json({ error: `동시에 만들 수 있는 곡은 ${MAX_RUNNING}개까지입니다. 진행 중인 곡이 끝난 뒤 다시 시도해 주세요.` }, { status: 429 });
  }

  const compareGroup = models.length > 1 ? crypto.randomUUID() : null;
  const inserts = (models as MusicModel[]).map((m) => {
    const durationS = clampDuration(m, requested);
    return {
      user_id: user.id,
      compare_group: compareGroup,
      provider: m.provider,
      model: m.model,
      status: "running",
      title: title || null,
      prompt,
      lyrics: lyrics || null,
      instrumental,
      duration_s: durationS,
      options: { language, ...(m.wavOutput && format === "wav" ? { format: "wav" } : {}), ...(m.imageInput && images.length ? { images: images.length } : {}) },
      est_cost_usd: m.estCostUsd(durationS),
    };
  });
  const { data: created, error } = await admin.from("ams_generations").insert(inserts).select("*");
  if (error || !created) {
    console.error("[generations] 저장 실패:", error);
    return NextResponse.json({ error: "생성 요청을 저장하지 못했습니다." }, { status: 500 });
  }

  const rows = created as GenerationRow[];
  for (const row of rows) {
    const key = keys.get(PROVIDERS[row.provider].keyProvider) as string;
    const model = findModel(`${row.provider}:${row.model}`);
    if (adapterOf(row.provider).synchronous) waitUntil(runSynchronous(admin, row, key, model?.imageInput && images.length ? images : undefined));
    else await startAsync(admin, row, key);
  }
  await logProgramUsage(user.id, "generate_music", rows.length, {
    models: rows.map((r) => `${r.provider}:${r.model}`),
    compare: !!compareGroup,
  });

  const { data: fresh } = await admin.from("ams_generations").select("*").in("id", rows.map((r) => r.id));
  const ordered = rows.map((r) => ((fresh ?? []) as GenerationRow[]).find((f) => f.id === r.id) ?? r);
  return NextResponse.json({ generations: await toClient(admin, ordered) }, { headers: { "Cache-Control": "private, no-store" } });
}
