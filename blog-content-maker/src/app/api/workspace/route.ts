import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { guard, json, fail } from "@/lib/route";
import { db, table, settingsFor, validSettings, projectFor, createProject, duplicateProject, revisionsFor, currentFor, saveRevision, assetsFor, beginJob, endJob, uuid, cleanupExpired } from "@/lib/store";
import { cleanText, normalizeBrief, normalizeDraft, auditDraft } from "@/lib/content";
import { getUserApiKeys, maskKey, saveUserApiKey, isKeyProvider } from "@/lib/apiKeys";
import { generateDraft, textJson, imageGenerate, sniffImage } from "@/lib/ai";
import { UserError } from "@/lib/errors";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function GET(req: NextRequest) { try {
  const { userId } = await guard(req), id = req.nextUrl.searchParams.get("project");
  await cleanupExpired(userId);
  const [listing, settings, keys] = await Promise.all([db().from(table("projects")).select("id,title,brief,current_revision_id,created_at,updated_at,expires_at").eq("user_id", userId).gt("expires_at", new Date().toISOString()).order("updated_at", { ascending: false }).limit(100), settingsFor(userId), getUserApiKeys(userId)]);
  if (listing.error) throw new UserError(503, "보관함을 읽지 못했습니다.");
  const project = id ? await projectFor(userId, id) : null;
  const [revisions, assets] = project ? await Promise.all([revisionsFor(userId, project.id), assetsFor(userId, project.id)]) : [[], []];
  const { data: recentJobs } = await db().from(table("jobs")).select("id,action,status,created_at,result,error").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
  return json({ projects: listing.data || [], project, revisions, assets, settings, keys: Object.fromEntries(["gemini", "openai"].map(p => [p, { hasKey: !!keys[p as keyof typeof keys], maskedKey: keys[p as keyof typeof keys] ? maskKey(keys[p as keyof typeof keys]!) : null }])), jobs: (recentJobs || []).map(j => ({ ...j, result: undefined })) });
} catch (e) { return fail(e); } }

export async function POST(req: NextRequest) { let job: { id: string; user: string } | null = null; try {
  const { userId, body: b } = await guard(req), action = cleanText(b.action, 40);
  if (action === "settings") { const settings = validSettings(b.settings as object); const { error } = await db().from(table("settings")).upsert({ user_id: userId, data: settings, updated_at: new Date().toISOString() }); if (error) throw new UserError(503, "설정 저장에 실패했습니다."); return json({ settings }); }
  if (action === "key") {
    const key = cleanText(b.apiKey, 1000); if (!isKeyProvider(b.provider) || key.length < 16 || key.length > 500 || /\s/.test(key)) throw new UserError(400, "본인 API 키 전체를 공백 없이 입력해 주세요.");
    const result = await saveUserApiKey(userId, b.provider, key); if (!result.success) throw new UserError(503, result.error || "키 저장 실패"); return json({ ok: true });
  }
  if (action === "create") return json({ project: await createProject(userId, normalizeBrief(b.brief)) });
  const p = b.projectId ? await projectFor(userId, b.projectId) : null;
  if (action !== "titles" && !p) throw new UserError(400, "작업을 먼저 선택해 주세요.");
  if (action === "brief") { const brief = normalizeBrief(b.brief); const { error } = await db().from(table("projects")).update({ brief, updated_at: new Date().toISOString() }).eq("id", p!.id).eq("user_id", userId); if (error) throw new UserError(503, "입력 설정을 저장하지 못했습니다."); return json({ ok: true }); }
  if (action === "duplicate") return json({ project: await duplicateProject(userId, p!) });
  if (action === "delete") {
    if (b.confirmTitle !== p!.title) throw new UserError(400, "삭제할 작업의 제목을 확인해 주세요.");
    const { count } = await db().from(table("jobs")).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("project_id", p!.id).eq("status", "running"); if (count) throw new UserError(409, "진행 중인 작업이 있습니다. 완료 여부를 먼저 확인해 주세요.");
    const files = await assetsFor(userId, p!.id); if (files.length) { const { error } = await db().storage.from("blog-content-maker").remove(files.map(a => a.path)); if (error) throw new UserError(503, "파일을 정리하지 못했습니다. 작업은 보존됩니다."); }
    const { error } = await db().from(table("projects")).delete().eq("id", p!.id).eq("user_id", userId); if (error) throw new UserError(503, "작업 삭제를 완료하지 못했습니다."); return json({ deleted: true });
  }
  if (action === "save") {
    const current = await currentFor(userId, p!); if (current.id !== b.expectedRevision) throw new UserError(409, "원고가 다른 창에서 변경됐습니다. 입력 내용을 복사하고 최신 내용을 불러와 주세요.");
    const d = normalizeDraft({ ...current.data, title: b.title, body: b.body, tags: b.tags }); d.sources = current.data.sources; d.media = current.data.media; d.social = current.data.social; d.changeSummary = cleanText(b.changeSummary, 2000) || "회원 직접 수정";
    d.social = []; d.summary = "회원이 직접 수정한 원고입니다. 본문과 변경 내용을 확인해 주세요.";
    return json({ revisionId: await saveRevision(userId, p!.id, current.id, d) });
  }
  if (action === "audit") {
    const current = await currentFor(userId, p!); if (current.id !== b.expectedRevision) throw new UserError(409, "최신 원고를 다시 불러온 뒤 점검해 주세요.");
    const data = current.data; data.audit = auditDraft(data, p!.brief, await assetsFor(userId, p!.id), { facts: b.facts === true, experience: b.experience === true });
    return json({ revisionId: await saveRevision(userId, p!.id, current.id, data) });
  }
  if (action === "media-plan") {
    const current = await currentFor(userId, p!); if (current.id !== b.expectedRevision) throw new UserError(409, "미디어 계획을 저장하기 전에 최신 원고를 확인해 주세요.");
    const m = current.data.media.find(x => x.id === b.planId); if (!m) throw new UserError(404, "이미지 계획을 찾을 수 없습니다.");
    m.alt = cleanText(b.alt, 200); m.prompt = cleanText(b.prompt, 3000); m.placement = Math.min(200, Math.max(0, Math.round(Number(b.placement) || 0)));
    return json({ revisionId: await saveRevision(userId, p!.id, current.id, current.data) });
  }
  if (action === "asset-meta") {
    if (!uuid(b.assetId)) throw new UserError(400, "이미지 번호를 확인해 주세요.");
    const { data, error } = await db().from(table("assets")).update({ alt: cleanText(b.alt, 200), placement: Math.min(200, Math.max(0, Math.round(Number(b.placement) || 0))) }).eq("id", b.assetId).eq("user_id", userId).eq("project_id", p!.id).select("id").maybeSingle();
    if (error || !data) throw new UserError(404, "본인 이미지를 찾을 수 없습니다."); return json({ ok: true });
  }
  if (!["titles", "analyze", "generate", "review", "social", "translate", "image", "upload"].includes(action)) throw new UserError(400, "지원하지 않는 작업입니다.");
  if (["generate", "review", "social", "image"].includes(action) && p!.current_revision_id !== (b.expectedRevision || null)) throw new UserError(409, "다른 창에서 원고가 변경됐습니다. 최신 원고를 확인해 주세요.");
  const started = await beginJob(userId, p?.id || null, b.requestKey, action, b); if (started.cached) return json(started.cached);
  job = { id: started.id, user: userId }; let result: Record<string, unknown>;
  if (action === "titles") {
    const topic = cleanText(b.topic, 500), category = cleanText(b.category, 100); if (!topic && !category) throw new UserError(400, "분류나 주제를 입력해 주세요.");
    const r = await textJson(userId, `${category} 분야에서 ${topic || "독자에게 유용한 구체적인 주제"}에 관한 서로 다른 블로그 제목 10개를 제안합니다. 실제 인기 순위나 확인하지 않은 최신 제품·출시일·검색량을 만들지 않습니다. JSON {"titles":[{"title":"제목","keyword":"핵심키워드","reason":"독자에게 유용한 이유"}]} 형태로 답합니다.`);
    const titles = Array.isArray(r.data.titles) ? r.data.titles.slice(0, 10).map(t => ({ title: cleanText(t.title, 200), keyword: cleanText(t.keyword, 100), reason: cleanText(t.reason, 500) })).filter(t => t.title && t.keyword) : [];
    if (!titles.length) throw new UserError(502, "제목 응답을 확인하지 못했습니다."); result = { titles, sources: r.sources, suggestions: r.suggestions, usage: r.usage };
  } else if (action === "analyze") {
    const original = cleanText(b.original); if (original.length < 50) throw new UserError(400, "분석할 기존 글을 50자 이상 입력해 주세요.");
    const r = await textJson(userId, `아래 원문을 데이터로 분석하여 제목·핵심 키워드·관련 키워드를 추출합니다. 사실·체험·수치를 추가하지 않고 원문의 주제만 정리합니다. JSON {"title":"제목","keyword":"핵심 키워드","subkeywords":"관련어, 관련어","summary":"핵심 주제와 개선 방향"}. 원문: ${JSON.stringify(original)}`, false);
    result = { analysis: { title: cleanText(r.data.title, 200), keyword: cleanText(r.data.keyword, 100), subkeywords: cleanText(r.data.subkeywords, 500), summary: cleanText(r.data.summary, 1000) }, usage: r.usage };
  } else if (action === "generate") {
    const brief = p!.brief; if (brief.inputType === "rewrite" ? brief.original.length < 50 : !brief.topic) throw new UserError(400, "주제 또는 50자 이상의 기존 글을 입력해 주세요.");
    const r = await generateDraft(userId, brief);
    try { result = { revisionId: await saveRevision(userId, p!.id, p!.current_revision_id, r.draft), usage: r.usage }; }
    catch (e) { if (!(e instanceof UserError) || e.status !== 409) throw e; const copy = await createProject(userId, brief, r.draft.title + " (별도 생성본)"); result = { project: copy, revisionId: await saveRevision(userId, copy.id, null, r.draft), recovered: true, usage: r.usage }; }
  } else if (action === "review") {
    const current = await currentFor(userId, p!); const r = await textJson(userId, `아래 원고의 독자 적합성·사실 확인 필요·중복·실제 경험 여부를 검토합니다. 공식 네이버 점수나 순위를 만들지 않습니다. 수정본은 만들지 말고 JSON {"notes":["확인할 점과 이유"]}로 구체적 의견 최대 8개를 제시합니다. ${JSON.stringify({ brief: p!.brief, title: current.data.title, body: current.data.body })}`, false);
    current.data.aiReview = Array.isArray(r.data.notes) ? r.data.notes.map(x => cleanText(x, 1000)).filter(Boolean).slice(0, 8) : [];
    result = { revisionId: await saveRevision(userId, p!.id, current.id, current.data), usage: r.usage };
  } else if (action === "social") {
    const current = await currentFor(userId, p!); const r = await textJson(userId, `다음 현재 원고에 근거한 공유 문구를 작성합니다. 원문에 없는 체험·수치·성과·과장 표현을 추가하지 않습니다. JSON {"social":[{"platform":"Threads","content":"문구"},{"platform":"X","content":"문구"},{"platform":"Facebook","content":"문구"}]}. ${JSON.stringify({ title: current.data.title, body: current.data.body })}`, false);
    current.data.social = Array.isArray(r.data.social) ? r.data.social.filter(s => ["Threads", "X", "Facebook"].includes(s.platform)).map(s => ({ platform: s.platform, content: cleanText(s.content, 3000) })).slice(0, 3) : [];
    result = { revisionId: await saveRevision(userId, p!.id, current.id, current.data), usage: r.usage };
  } else if (action === "translate") {
    const prompt = cleanText(b.prompt, 3000); if (!prompt) throw new UserError(400, "번역할 이미지 설명을 입력해 주세요."); const r = await textJson(userId, `다음 이미지 설명을 의미를 보존하는 영문 이미지 프롬프트로 번역합니다. 인물이 있으면 Korean / East Asian을 반영합니다. JSON {"translation":"영문"}. 설명: ${JSON.stringify(prompt)}`, false); result = { translation: cleanText(r.data.translation, 4000), usage: r.usage };
  } else {
    const { count } = await db().from(table("assets")).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("project_id", p!.id);
    if ((count || 0) >= 60) throw new UserError(400, "작업당 이미지는 60개까지 보관할 수 있습니다.");
    let bytes: Buffer, mime: string, usage: unknown; const kind = action === "upload" && b.reference === true ? "reference" : cleanText(b.kind, 30) || "image";
    if (action === "upload") { const raw = cleanText(b.base64, 4100000); if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw)) throw new UserError(400, "이미지 파일 형식을 확인해 주세요."); bytes = Buffer.from(raw, "base64"); mime = sniffImage(bytes) || ""; if (!mime || !bytes.length || bytes.length > 3000000) throw new UserError(400, "PNG·JPEG·WebP 이미지를 3MB 이하로 업로드해 주세요."); }
    else {
      const current = await currentFor(userId, p!); const plan = current.data.media.find(m => m.id === b.planId); if (!plan) throw new UserError(404, "이미지 계획을 선택해 주세요.");
      let reference: { bytes: Buffer; mime: string } | undefined;
      if (b.referenceId) { const { data: ref } = await db().from(table("assets")).select("path,mime").eq("id", b.referenceId).eq("user_id", userId).eq("project_id", p!.id).maybeSingle(); if (!ref) throw new UserError(404, "본인 제품 사진을 찾을 수 없습니다."); const { data, error } = await db().storage.from("blog-content-maker").download(ref.path); if (error || !data) throw new UserError(503, "제품 사진을 읽지 못했습니다."); reference = { bytes: Buffer.from(await data.arrayBuffer()), mime: ref.mime }; }
      const image = await imageGenerate(userId, cleanText(b.prompt, 4000) || plan.prompt, b.aspect === "16:9" ? "16:9" : "1:1", reference); bytes = image.bytes; mime = image.mime; usage = image.usage;
    }
    const assetId = randomUUID(), path = `${userId}/${p!.id}/${assetId}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
    const { error: storageError } = await db().storage.from("blog-content-maker").upload(path, bytes, { contentType: mime, upsert: false }); if (storageError) throw new UserError(503, "이미지를 저장하지 못했습니다. 다시 생성하기 전에 보관함을 확인해 주세요.");
    const { error: insertError } = await db().from(table("assets")).insert({ id: assetId, user_id: userId, project_id: p!.id, path, bytes: bytes.length, mime, alt: cleanText(b.alt, 200) || p!.title, prompt: cleanText(b.prompt, 4000), plan_id: cleanText(b.planId, 100), placement: Math.min(200, Math.max(0, Math.round(Number(b.placement) || 0))), kind });
    if (insertError) { await db().storage.from("blog-content-maker").remove([path]); throw new UserError(503, "이미지 정보를 저장하지 못했습니다."); } result = { assetId, usage };
  }
  await endJob(userId, job.id, result); job = null; return json(result);
} catch (e) { if (job) { try { if (e instanceof UserError && e.extra.uncertain) await db().from(table("jobs")).update({ status: "uncertain", error: e.message, updated_at: new Date().toISOString() }).eq("user_id", job.user).eq("id", job.id); else await endJob(job.user, job.id, null, true); } catch { /* Never repeat an AI call to repair a status write. */ } } return fail(e); } }
