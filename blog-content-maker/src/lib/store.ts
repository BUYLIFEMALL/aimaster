import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import { UserError } from "./errors";
import { DEFAULT_SETTINGS, TEXT_MODELS, IMAGE_MODELS, type Settings, type Project, type Revision, type Draft, type Asset, type Brief } from "./types";
export const table = (name: string) => `blog_content_maker_${name}`;
export function db() { return createAdminClient(); }
export const uuid = (s: unknown): s is string => typeof s === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(s);
export async function settingsFor(user: string): Promise<Settings> {
  const { data, error } = await db().from(table("settings")).select("data").eq("user_id", user).maybeSingle();
  if (error) throw new UserError(503, "설정을 읽지 못했습니다.");
  return validSettings(data?.data || DEFAULT_SETTINGS);
}
export function validSettings(input: Partial<Settings> | null | undefined): Settings {
  const v = input && typeof input === "object" ? input : {};
  const provider = v.provider === "openai" ? "openai" : "gemini";
  const models: readonly string[] = TEXT_MODELS[provider];
  return { provider, model: models.includes(v.model || "") ? v.model! : models[0], imageModel: (IMAGE_MODELS as readonly string[]).includes(v.imageModel || "") ? v.imageModel! : IMAGE_MODELS[0], search: v.search === true };
}
export async function projectFor(user: string, id: unknown): Promise<Project> {
  if (!uuid(id)) throw new UserError(400, "작업 번호가 올바르지 않습니다.");
  const { data, error } = await db().from(table("projects")).select("id,title,brief,current_revision_id,created_at,updated_at,expires_at").eq("user_id", user).eq("id", id).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new UserError(503, "작업을 읽지 못했습니다.");
  if (!data) throw new UserError(404, "본인의 작업을 찾을 수 없거나 보관 기간이 끝났습니다.");
  return data as Project;
}
export async function createProject(user: string, brief: Brief, title?: string): Promise<Project> {
  const { count } = await db().from(table("projects")).select("id", { count: "exact", head: true }).eq("user_id", user);
  if ((count || 0) >= 300) throw new UserError(400, "작업은 최대 300개까지 보관할 수 있습니다.");
  const { data, error } = await db().from(table("projects")).insert({ user_id: user, title: (title || brief.topic || "새 원고").slice(0, 200), brief }).select().single();
  if (error) throw new UserError(503, "새 작업을 저장하지 못했습니다."); return data as Project;
}
export async function duplicateProject(user: string, original: Project): Promise<Project> {
  const copy = await createProject(user, original.brief, original.title + " (복사)"), admin = db(), copiedPaths: string[] = [];
  try {
    if (original.current_revision_id) await saveRevision(user, copy.id, null, { ...(await currentFor(user, original)).data, audit: undefined });
    const originals = await assetsFor(user, original.id), rows = [];
    for (const asset of originals) {
      const id = randomUUID(), path = `${user}/${copy.id}/${id}.${asset.path.split(".").pop()}`;
      const { error } = await admin.storage.from("blog-content-maker").copy(asset.path, path); if (error) throw new UserError(503, "이미지 복제를 완료하지 못했습니다. 원본 작업은 보존됩니다.");
      copiedPaths.push(path); rows.push({ id, user_id: user, project_id: copy.id, path, mime: asset.mime, bytes: asset.bytes, alt: asset.alt, prompt: asset.prompt, plan_id: asset.plan_id, placement: asset.placement, kind: asset.kind });
    }
    if (rows.length) { const { error } = await admin.from(table("assets")).insert(rows); if (error) throw new UserError(503, "복제한 이미지 정보를 저장하지 못했습니다."); }
    return await projectFor(user, copy.id);
  } catch (e) {
    // Compensate only this newly created copy. Original files and rows are never removed.
    if (copiedPaths.length) await admin.storage.from("blog-content-maker").remove(copiedPaths);
    await admin.from(table("projects")).delete().eq("user_id", user).eq("id", copy.id);
    throw e;
  }
}
export async function revisionsFor(user: string, project: string): Promise<Revision[]> {
  const { data, error } = await db().from(table("revisions")).select("id,project_id,version,data,created_at").eq("user_id", user).eq("project_id", project).order("version", { ascending: false }).limit(50);
  if (error) throw new UserError(503, "수정본을 읽지 못했습니다."); return (data || []) as Revision[];
}
export async function currentFor(user: string, project: Project): Promise<Revision> {
  const { data, error } = await db().from(table("revisions")).select("id,project_id,version,data,created_at").eq("user_id", user).eq("project_id", project.id).eq("id", project.current_revision_id || "00000000-0000-0000-0000-000000000000").maybeSingle();
  if (error || !data) throw new UserError(400, "먼저 원고를 작성해 주세요."); return data as Revision;
}
export async function saveRevision(user: string, project: string, expected: string | null, draft: Draft) {
  const { data, error } = await db().rpc("blog_content_maker_save_revision", { p_user: user, p_project: project, p_expected: expected, p_data: draft });
  if (error) throw new UserError(error.message.includes("revision_conflict") ? 409 : 503, error.message.includes("revision_conflict") ? "다른 창에서 원고가 변경됐습니다. 입력 내용을 복사한 뒤 최신 원고를 다시 불러와 주세요." : "수정본을 저장하지 못했습니다. 입력 내용은 화면에 남아 있습니다.");
  return data as string;
}
export async function assetsFor(user: string, project: string): Promise<Asset[]> {
  const { data, error } = await db().from(table("assets")).select("id,project_id,path,mime,bytes,alt,prompt,plan_id,placement,kind").eq("user_id", user).eq("project_id", project).order("created_at");
  if (error) throw new UserError(503, "이미지를 읽지 못했습니다.");
  const assets = (data || []) as Asset[];
  const { data: signed, error: signError } = await db().storage.from("blog-content-maker").createSignedUrls(assets.map(a => a.path), 3600);
  if (assets.length && signError) throw new UserError(503, "이미지 링크를 준비하지 못했습니다.");
  return assets.map((a, i) => ({ ...a, url: signed?.[i]?.signedUrl || undefined }));
}
export function hash(value: unknown) { return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); }
export async function beginJob(user: string, project: string | null, request: unknown, action: string, input: unknown) {
  if (!uuid(request)) throw new UserError(400, "요청 번호가 올바르지 않습니다.");
  const inputHash = hash(input), now = new Date().toISOString();
  // A lost response has an unknown billing outcome. Release the lock, never replay it automatically.
  await db().from(table("jobs")).update({ status: "uncertain", error: "응답 확인 시간이 지났습니다. 중복 과금 여부를 확인한 뒤 새 요청으로 진행하세요.", updated_at: now }).eq("user_id", user).eq("status", "running").lt("created_at", new Date(Date.now() - 6 * 60_000).toISOString());
  const { data, error } = await db().from(table("jobs")).insert({ user_id: user, project_id: project, request_key: request, input_hash: inputHash, action }).select("id").single();
  if (!error) return { id: data.id as string, cached: null };
  const { data: previous } = await db().from(table("jobs")).select("id,input_hash,status,result").eq("user_id", user).eq("request_key", request).maybeSingle();
  if (previous?.input_hash !== inputHash && previous) throw new UserError(409, "같은 요청 번호에 다른 내용이 들어왔습니다.");
  if (previous?.status === "succeeded") return { id: previous.id, cached: previous.result };
  throw new UserError(409, previous?.status === "uncertain" ? "이전 요청의 완료 여부를 확인하지 못했습니다. 저장된 결과와 제공사 사용량을 확인한 뒤 새로 요청해 주세요." : "진행 중이거나 이미 처리한 요청입니다. 작업 결과를 새로 불러와 확인해 주세요.");
}
export async function endJob(user: string, id: string, result: unknown, error?: boolean) {
  const { error: failure } = await db().from(table("jobs")).update({ status: error ? "failed" : "succeeded", result: error ? null : result, error: error ? "요청을 완료하지 못했습니다. 입력과 저장된 결과를 확인해 주세요." : null, updated_at: new Date().toISOString() }).eq("user_id", user).eq("id", id);
  if (failure) throw new UserError(503, "결과 상태를 저장하지 못했습니다. 다시 생성하기 전에 보관함을 확인해 주세요.", { uncertain: true });
}
// Expired records are inaccessible immediately; delete their files on this member's next visit.
// Never remove an active operation or another member's data.
export async function cleanupExpired(user: string) {
  const admin = db(), now = new Date().toISOString();
  const { data: expired } = await admin.from(table("projects")).select("id").eq("user_id", user).lt("expires_at", now).limit(5);
  for (const p of expired || []) {
    const { count } = await admin.from(table("jobs")).select("id", { count: "exact", head: true }).eq("user_id", user).eq("project_id", p.id).eq("status", "running");
    if (count) continue;
    const { data: assets, error } = await admin.from(table("assets")).select("path").eq("user_id", user).eq("project_id", p.id); if (error) continue;
    if (assets?.length) { const { error: removal } = await admin.storage.from("blog-content-maker").remove(assets.map(a => a.path)); if (removal) continue; }
    await admin.from(table("projects")).delete().eq("user_id", user).eq("id", p.id).lt("expires_at", now);
  }
}
