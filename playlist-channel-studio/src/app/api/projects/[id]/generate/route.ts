import { NextRequest, NextResponse } from "next/server";
import { requireAccessAndKey, decodeImage } from "@/lib/routeGuard";
import { generateImage, generateJson } from "@/lib/llm";
import { downloadForEdit, getOwnedProject, normalizePersona, normalizeThumb, thumbPath, toClient, updateOwnedProject, uploadImage } from "@/lib/projects";
import { lyricsPrompt, metaPrompt, songPlanPrompt, sunoPrompt, thumbnailPrompt, titlesPrompt } from "@/lib/playlist/prompts";
import { chunk, cleanLyricsOptions, cleanMeta, cleanSuno, cleanTitles } from "@/lib/playlist/validate";
import {
  DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL, LIMITS, THUMB_STYLES, imageModelById, resolveStructure, textModelById,
  type Provider, type SongLyrics, type UsageInfo,
} from "@/lib/playlist/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function sumUsage(list: UsageInfo[]): UsageInfo {
  return list.reduce(
    (a, u) => ({ model: u.model, inputTokens: a.inputTokens + u.inputTokens, outputTokens: a.outputTokens + u.outputTokens, ms: a.ms + u.ms, images: (a.images ?? 0) + (u.images ?? 0) }),
    { model: list[0]?.model ?? "", inputTokens: 0, outputTokens: 0, ms: 0, images: 0 },
  );
}

/**
 * POST — AI 생성 한 건. body.kind: titles | suno | lyrics | meta | thumbnail
 * 텍스트는 body.textModel(공급사별 회원 본인 키), 이미지는 body.imageModel(회원 본인 키)로 처리한다.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind ?? "");
  const year = new Date().getFullYear();

  const isImage = kind === "thumbnail";
  const modelId = isImage ? String(body?.imageModel || DEFAULT_IMAGE_MODEL) : String(body?.textModel || DEFAULT_TEXT_MODEL);
  const provider: Provider | undefined = isImage ? imageModelById(modelId)?.provider : textModelById(modelId)?.provider;
  if (!["titles", "suno", "lyrics", "meta", "thumbnail"].includes(kind)) return fail("알 수 없는 요청입니다.");
  if (!provider) return fail("지원하지 않는 모델입니다.");

  const a = await requireAccessAndKey(provider);
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p) return fail("프로젝트를 찾을 수 없습니다.", 404);

  // ① 제목 10개
  if (kind === "titles") {
    const r = await generateJson(modelId, a.apiKey, titlesPrompt(p.genre, year));
    if (!r.ok) return fail(r.error, r.status);
    const titles = cleanTitles((r.data as { titles?: unknown })?.titles ?? r.data);
    if (titles.length < 3) return fail("AI가 형식에 맞는 제목을 충분히 만들지 못했습니다. 다시 시도해 주세요.", 502);
    await updateOwnedProject(a.user.id, id, { titles, status: p.title ? p.status : "titled" });
    return NextResponse.json({ titles, usage: r.usage });
  }

  if (!p.title) return fail("먼저 제목을 선택해 주세요.");
  const title = p.title;
  const content = p.content ?? {};

  // ② Suno 프롬프트 3종
  if (kind === "suno") {
    const r = await generateJson(modelId, a.apiKey, sunoPrompt(p.genre, title, year));
    if (!r.ok) return fail(r.error, r.status);
    const suno = cleanSuno(r.data);
    if (!suno.length) return fail("AI가 Suno 프롬프트를 만들지 못했습니다. 다시 시도해 주세요.", 502);
    await updateOwnedProject(a.user.id, id, { content: { ...content, suno }, status: "content" });
    return NextResponse.json({ suno, usage: r.usage });
  }

  // ③ 가사 — 곡 계획을 먼저 뽑고, 4곡씩 병렬로 쓴다
  if (kind === "lyrics") {
    const opts = cleanLyricsOptions(body?.options);
    const plan = await generateJson(modelId, a.apiKey, songPlanPrompt(p.genre, title, opts, year));
    if (!plan.ok) return fail(plan.error, plan.status);
    const rawPlan = ((plan.data as { songs?: unknown })?.songs ?? plan.data) as unknown;
    const planned = (Array.isArray(rawPlan) ? rawPlan : [])
      .map((s, i) => ({ no: i + 1, title: String((s as { title?: unknown })?.title ?? "").trim(), concept: String((s as { concept?: unknown })?.concept ?? "").trim() }))
      .filter((s) => s.title)
      .slice(0, opts.songCount)
      .map((s, i) => ({ ...s, no: i + 1 }));
    if (!planned.length) return fail("AI가 곡 구성을 만들지 못했습니다. 다시 시도해 주세요.", 502);

    const results = await Promise.all(chunk(planned, 4).map((group) => generateJson(modelId, a.apiKey, lyricsPrompt(p.genre, title, opts, group, year))));
    const firstFail = results.find((r) => !r.ok);
    const okResults = results.filter((r): r is Extract<typeof r, { ok: true }> => r.ok);
    if (!okResults.length && firstFail && !firstFail.ok) return fail(firstFail.error, firstFail.status);

    const byNo = new Map<number, SongLyrics>();
    const structure = resolveStructure(opts.structure, p.genre).sections;
    for (const r of okResults) {
      const songs = ((r.data as { songs?: unknown })?.songs ?? r.data) as unknown;
      for (const s of Array.isArray(songs) ? songs : []) {
        const o = s as { no?: unknown; title?: unknown; lyrics?: unknown };
        const no = Math.round(Number(o.no));
        const plannedSong = planned.find((x) => x.no === no);
        const lyrics = typeof o.lyrics === "string" ? o.lyrics.trim() : "";
        if (plannedSong && lyrics) byNo.set(no, { no, title: plannedSong.title, structure, lyrics });
      }
    }
    const songs = planned.map((s) => byNo.get(s.no)).filter((s): s is SongLyrics => !!s);
    if (!songs.length) return fail("AI가 가사를 만들지 못했습니다. 다시 시도해 주세요.", 502);
    const missing = planned.length - songs.length;
    await updateOwnedProject(a.user.id, id, { content: { ...content, lyrics: { options: opts, songs } }, status: "content" });
    return NextResponse.json({ lyrics: { options: opts, songs }, missing, usage: sumUsage([plan.usage, ...okResults.map((r) => r.usage)]) });
  }

  // ④ 유튜브 메타데이터
  if (kind === "meta") {
    const first = (content.lyrics?.songs ?? []).slice(0, 8).map((s) => s.title);
    const r = await generateJson(modelId, a.apiKey, metaPrompt(p.genre, title, first, year));
    if (!r.ok) return fail(r.error, r.status);
    const meta = cleanMeta(r.data);
    if (!meta) return fail("AI가 설명글을 만들지 못했습니다. 다시 시도해 주세요.", 502);
    await updateOwnedProject(a.user.id, id, { content: { ...content, meta }, status: "content" });
    return NextResponse.json({ meta, usage: r.usage });
  }

  // ⑤ 썸네일 배경 이미지(글자는 화면에서 얹는다)
  const style = THUMB_STYLES.some((s) => s.id === body?.style) ? String(body.style) : THUMB_STYLES[0].id;
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim().slice(0, 300) : "";
  let ref: { buffer: Buffer; mime: string } | undefined;
  let usedPrevious = false;
  if (feedback && p.thumb_path) {
    const prev = await downloadForEdit(p.thumb_path);
    if (prev) { ref = { buffer: prev, mime: "image/jpeg" }; usedPrevious = true; }
  }
  if (!ref && body?.persona) {
    const raw = decodeImage(body.persona, LIMITS.personaImageBytes);
    if (!raw) return fail("참고 이미지를 읽지 못했습니다. JPG·PNG 이미지(3MB 이하)를 올려 주세요.");
    try { ref = { buffer: await normalizePersona(raw), mime: "image/jpeg" }; } catch { return fail("참고 이미지 형식을 처리하지 못했습니다."); }
  }
  let prompt = thumbnailPrompt(p.genre, title, style, { hasPersona: !!ref && !usedPrevious, feedback, year });
  if (usedPrevious) prompt += "\nThe attached image is the current thumbnail background. Keep its overall composition and subject, and apply the revision request.";

  const r = await generateImage(modelId, a.apiKey, prompt, ref);
  if (!r.ok) return fail(r.error, r.status);
  let jpg: Buffer;
  try { jpg = await normalizeThumb(r.data.buffer); } catch { return fail("생성된 이미지를 처리하지 못했습니다. 다시 시도해 주세요.", 502); }
  const path = thumbPath(a.user.id, id);
  if (!(await uploadImage(path, jpg))) return fail("이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  const settings = { ...(p.thumb_settings ?? {}), style };
  await updateOwnedProject(a.user.id, id, { thumb_path: path, thumb_prompt: prompt, thumb_settings: settings });
  const next = await getOwnedProject(a.user.id, id);
  return NextResponse.json({ project: next ? await toClient(next) : null, usage: r.usage });
}
