// 음악(SUNO) 리믹스 결과(music_track_remixes + music_track_remix_variants)를 플레이리스트 곡 목록 모양으로 바꾸는 규칙.
// 서버 조회(sunoTracks.ts)와 화면 주소 읽기(SunoImportPanel.tsx)가 같이 쓰고, 순수 함수라 단위 시험한다.
// 규칙은 가사 영상(lyric-video-studio/src/lib/suno.ts ownVariant)과 같다: 반주 추가·연주곡은 가사가 없어 시간 가사를 받지 않는다.

export const REMIX_MODE_LABEL: Record<string, string> = { cover: "커버", add_vocals: "보컬 추가", add_instrumental: "반주 추가", mashup: "매시업" };

export type RemixMeta = { mode: string | null; instrumental: boolean | null; source_title: string | null; task_id: string | null };
export type RemixVariantRow = { id: string; suno_audio_id: string | null; duration_seconds: number | null; created_at: string; audio_url?: string | null };
export type RemixRow = RemixMeta & { id: string; created_at: string; variants: RemixVariantRow[] };
export type RemixTrack = {
  id: string; title: string; mode: "vocal" | "instrumental"; createdAt: string; remix: true;
  variants: { id: string; duration: number | null; canTime: boolean; blocked?: string }[];
};

/** 노래(가사)가 있는 리믹스인가 — 반주 추가·연주곡이면 아니다 */
export const remixIsVocal = (r: Pick<RemixMeta, "mode" | "instrumental">): boolean => !r.instrumental && r.mode !== "add_instrumental";

/** 「원곡 제목 (방식)」 — 같은 원곡의 일반 곡과 구분된다 */
export const remixTitle = (r: Pick<RemixMeta, "mode" | "source_title">): string =>
  `${(r.source_title ?? "").trim() || "제목 없음"} (${REMIX_MODE_LABEL[r.mode ?? ""] ?? "리믹스"})`;

/** 음원이 회원 폴더에 저장되지 않은 변주(음악 쪽 저장 실패로 외부 주소가 남은 것 등)에 붙는 안내 — 목록에서 선택할 수 없다 */
export const REMIX_NOT_STORED = "음원이 내 보관함에 저장되지 않아 가져올 수 없습니다. 음악(SUNO) 자동화에서 「내 보관함에 다시 저장」 뒤 다시 시도해 주세요.";

/** 리믹스 한 건 → 곡 목록 한 줄(변주는 만든 순서). 변주가 없으면 null. stored가 주어지면 false인 변주는 blocked */
export function remixTrack(r: RemixRow, stored?: (v: RemixVariantRow) => boolean): RemixTrack | null {
  if (!r.variants.length) return null;
  const vocal = remixIsVocal(r);
  return {
    id: r.id, title: remixTitle(r), mode: vocal ? "vocal" : "instrumental", createdAt: r.created_at, remix: true,
    variants: [...r.variants].sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((v) => {
        const blocked = stored && !stored(v);
        return { id: v.id, duration: v.duration_seconds, canTime: !blocked && vocal && !!(r.task_id && v.suno_audio_id), ...(blocked ? { blocked: REMIX_NOT_STORED } : {}) };
      }),
  };
}

const UUID = /^[0-9a-f-]{36}$/i;

/** 주소의 쉼표 목록(?suno=a,b / ?remix=c)에서 올바른 곡 번호만, 중복 없이 */
export function parseIdParam(raw: string | null): string[] {
  return Array.from(new Set((raw ?? "").split(",").map((x) => x.trim()).filter((x) => UUID.test(x))));
}

/** 일반 곡 번호 뒤에 리믹스 번호를 이어 붙여 최대 max개(앞쪽 우선, 중복 제거) */
export function mergeIncoming(suno: string[], remix: string[], max: number): string[] {
  return Array.from(new Set([...suno, ...remix])).slice(0, max);
}

/** 리믹스 조회에 필요한 만큼만 — 실제로는 Supabase 관리자 클라이언트, 시험에서는 가짜 */
type Query = { eq(column: string, value: string): Query; maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }> };
export type RemixDb = { from(table: string): { select(columns: string): Query } };
export type RemixVariant = {
  id: string; suno_audio_id: string | null; audio_url: string; image_url: string | null;
  music_tracks: { title: string; task_id: string | null; mode: "vocal" | "instrumental" };
  /** 리믹스 경로 표시 — 파일 주소는 signRemixAssets(회원 폴더 확인)로만 발급한다 */
  remix: true;
};

/**
 * 곡 번호가 회원 본인의 「완료된」 리믹스 결과면 곡 정보로, 아니면 null(부르는 쪽이 기존 404).
 * 곡 목록(listRemixTracks)과 같은 조건 — 변주·부모 모두 user_id, 부모는 status completed.
 * null이면 부르는 쪽은 서명 주소·Suno 키 조회·Suno 호출 전에 멈춘다.
 */
export async function lookupRemixVariant(db: RemixDb, userId: string, variantId: string): Promise<RemixVariant | null> {
  const { data: rv, error: rvErr } = await db
    .from("music_track_remix_variants").select("id, remix_id, suno_audio_id, audio_url, image_url")
    .eq("id", variantId).eq("user_id", userId).maybeSingle();
  if (rvErr) throw new Error(rvErr.message);
  const v = rv as { id: string; remix_id: string; suno_audio_id: string | null; audio_url: string; image_url: string | null } | null;
  if (!v) return null;
  const { data: rm, error: rmErr } = await db
    .from("music_track_remixes").select("task_id, mode, source_title, instrumental")
    .eq("id", v.remix_id).eq("user_id", userId).eq("status", "completed").maybeSingle();
  if (rmErr) throw new Error(rmErr.message);
  const r = rm as (RemixMeta & { task_id: string | null }) | null;
  if (!r) return null;
  const vocal = remixIsVocal(r);
  return {
    id: v.id, suno_audio_id: vocal ? v.suno_audio_id : null, audio_url: v.audio_url, image_url: v.image_url,
    music_tracks: { title: remixTitle(r), task_id: vocal ? r.task_id : null, mode: vocal ? "vocal" : "instrumental" },
    remix: true,
  };
}

/**
 * 저장소 공개 주소 형식(`<base>/storage/v1/object/public/<bucket>/<path>`)이고 그 경로가 회원 본인 폴더(`<userId>/…`)일 때만 경로를 돌려준다.
 * 외부 주소·다른 저장소·다른 회원 폴더·허용 형식(영문·숫자·_ - . — % 인코딩 없음)이 아닌 조각이 있으면 null(관리자 서명을 하지 않는다).
 * 음악(SUNO) 리믹스 결과는 `<user>/remix/…`에 저장된다(운영 6개 모두 확인 2026-11-19).
 */
const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

export function ownStoragePath(url: string | null, base: string, bucket: string, userId: string): string | null {
  if (!url || !base || !userId) return null;
  const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  // 디코딩하지 않는다 — 검사한 문자열이 그대로 서명 요청 경로가 되게(%2F 같은 인코딩으로 조각이 바뀌는 일이 없게). 공식 저장 키에는 % 자체가 없다
  const path = url.slice(prefix.length).split(/[?#]/)[0];
  const seg = path.split("/");
  // 조각마다 공식 저장 키 형식만(영문·숫자·_ - 로 시작, 그 뒤 . 허용) — 역슬래시·%·공백·물음표 등 주소 뜻을 바꿀 수 있는 글자와 . .. 빈 조각은 거절
  if (seg.length < 2 || seg[0] !== userId || !seg.every((s) => SAFE_SEGMENT.test(s))) return null;
  return path;
}

/** 리믹스 음악·커버 서명 — 회원 폴더 경로만 sign을 부른다. 음악이 회원 폴더가 아니면 커버도 서명하지 않는다 */
export async function signRemixAssets(
  v: { audio_url: string | null; image_url: string | null }, userId: string, base: string, bucket: string,
  sign: (path: string) => Promise<string | null>,
): Promise<{ audioUrl: string | null; coverUrl: string | null }> {
  const audioPath = ownStoragePath(v.audio_url, base, bucket, userId);
  if (!audioPath) return { audioUrl: null, coverUrl: null };
  const audioUrl = await sign(audioPath);
  if (!audioUrl) return { audioUrl: null, coverUrl: null };
  const coverPath = ownStoragePath(v.image_url, base, bucket, userId);
  return { audioUrl, coverUrl: coverPath ? await sign(coverPath) : null };
}

/** 주소로 받은 곡 번호 — 출처별(?suno= 일반 곡 · ?remix= 리믹스). 합쳐서 최대 max(앞쪽 우선)로 자른 뒤 나눈다 */
export type Incoming = { suno: string[]; remix: string[] };
export function splitIncoming(suno: string[], remix: string[], max: number): Incoming {
  const keep = new Set(mergeIncoming(suno, remix, max));
  const s = suno.filter((id) => keep.has(id));
  const taken = new Set(s);
  return { suno: s, remix: remix.filter((id) => keep.has(id) && !taken.has(id)) };
}

/** 목록 응답 상태 — 대기(이전 목록 유지)·실패·성공을 구분한다. remixOk=false는 일반 곡만 받은 부분 성공 */
export type ListView = { state: "idle" | "loading" } | { state: "error" } | { state: "ok"; selectable: string[]; remixOk: boolean };

/** 지금 목록에서 고를 수 있는 곡 중 선택된 것만 — 목록에서 사라졌거나 받을 수 없는 번호는 추가·20곡 한도 계산에 넣지 않는다 */
export function pickedInList(picked: string[], selectable: string[]): string[] {
  const ok = new Set(selectable);
  return picked.filter((id) => ok.has(id));
}
export const canPickMore = (picked: string[], selectable: string[], max: number): boolean => pickedInList(picked, selectable).length < max;

/**
 * 정상 목록이 올 때마다 선택 정리 — 「활성 선택(picked)」과 「일시 보류(held)」를 나눠 다룬다. 활성 선택은 항상 max 이하.
 * - 활성 선택: 지금 목록에서 고를 수 있는 곡만(기존 순서) 남긴다. 사라진 일반 곡은 지워져 다시 나타나도 되살아나지 않는다.
 * - 리믹스만 못 읽은 부분 성공(remixOk=false): 본 적 있는 리믹스 선택(knownRemix)은 「진짜 없음」이 아니므로 보류(held)로 옮긴다.
 *   보류는 남은 자리만큼만 기억한다(지금 화면에서 고른 곡을 밀어내지 않음).
 * - 정상 응답(remixOk=true): 보류분은 지금 활성 선택 뒤 남은 자리에서만 되돌리고 보류를 비운다(최신 선택이 우선).
 */
export function reconcilePicks(picked: string[], held: string[], view: ListView, knownRemix: ReadonlySet<string>, max: number): { picked: string[]; held: string[] } {
  if (view.state !== "ok") return { picked, held };
  const ok = new Set(view.selectable);
  const visible = picked.filter((id) => ok.has(id)).slice(0, max);
  const room = max - visible.length, inVisible = new Set(visible);
  if (!view.remixOk) {
    const hidden = picked.filter((id) => !ok.has(id) && knownRemix.has(id));
    const nextHeld = Array.from(new Set([...held, ...hidden])).filter((id) => !inVisible.has(id)).slice(0, room);
    return { picked: same(visible, picked) ? picked : visible, held: nextHeld };
  }
  const restore = held.filter((id) => ok.has(id) && !inVisible.has(id)).slice(0, room);
  const out = [...visible, ...restore];
  return { picked: same(out, picked) ? picked : out, held: [] };
}
const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/** 보류를 따로 두지 않는 쪽(시험·단순 호출)용 — 활성 선택 뒤에 남은 자리만큼 보류를 붙인 한 줄 */
export function prunePicked(picked: string[], view: ListView, knownRemix: ReadonlySet<string>, max: number): string[] {
  const r = reconcilePicks(picked, [], view, knownRemix, max);
  const out = [...r.picked, ...r.held];
  return same(out, picked) ? picked : out;
}

/**
 * 「선택한 곡 추가」가 끝났을 때 — 클릭 때 고정한 대상(targetIds)만 선택에서 빼고, 받은 곡 번호는 클릭 때의 처리 상태(doneAtStart) 기준으로만 정리.
 * 추가하는 동안 새로고침으로 복구돼 새로 선택된 리믹스·남은 리믹스 번호는 그대로 둔다.
 */
export function finishAdd(picked: string[], inc: Incoming, targetIds: ReadonlySet<string>, doneAtStart: { suno: boolean; remix: boolean }): { picked: string[]; incoming: Incoming } {
  return { picked: picked.filter((id) => !targetIds.has(id)), incoming: afterAdd(inc, doneAtStart) };
}

/** 「선택한 곡 추가」를 마친 뒤 받은 곡 번호 — 이미 미리 선택까지 처리한 출처만 비우고, 리믹스 부분 실패로 보류 중인 출처는 남긴다 */
export const afterAdd = (inc: Incoming, done: { suno: boolean; remix: boolean }): Incoming => ({ suno: done.suno ? [] : inc.suno, remix: done.remix ? [] : inc.remix });

/** 늦게 도착한 옛 요청의 응답은 버린다(새로고침을 연달아 눌러 응답 순서가 뒤바뀌어도 마지막 요청 결과만) */
export const acceptResponse = (requestId: number, latestId: number): boolean => requestId === latestId;

/**
 * 받은 곡 미리 선택 한 단계 — 실제 성공 응답(state ok)에서만, 출처마다 한 번씩.
 * 리믹스를 못 읽은 부분 성공이면 리믹스 몫은 보류(done.remix 그대로)하고 다음 성공 때 고른다.
 * 이미 고른 곡은 그대로 두고(손으로 해제한 곡을 되살리지 않음) 뒤에 이어 붙이며, 합계 max를 넘기지 않는다.
 */
export function seedStep(inc: Incoming, done: { suno: boolean; remix: boolean }, view: ListView, picked: string[], max: number): { picked: string[]; done: { suno: boolean; remix: boolean } } {
  if (view.state !== "ok") return { picked, done };
  const takeSuno = !done.suno, takeRemix = !done.remix && view.remixOk;
  if (!takeSuno && !takeRemix) return { picked, done };
  const ok = new Set(view.selectable), now = new Set(picked);
  const add = [...(takeSuno ? inc.suno : []), ...(takeRemix ? inc.remix : [])].filter((id) => ok.has(id) && !now.has(id));
  const room = max - pickedInList(picked, view.selectable).length; // 목록에서 사라진 옛 선택은 칸을 차지하지 않음
  return { picked: [...picked, ...add.slice(0, Math.max(0, room))], done: { suno: done.suno || takeSuno, remix: done.remix || takeRemix } };
}

/**
 * 주소로 받은 곡 안내 — 「보낸 수 · 목록에서 찾은 수 · 그중 지금 선택 수」, 리믹스를 못 읽었으면 그 몫은 「아직」.
 * 숫자는 지금 목록·지금 선택으로 계산하므로 다시 불러오거나 손으로 해제해도 지금 상태와 맞는다.
 */
export function incomingNotice(inc: Incoming, view: ListView, picked: string[]): string | null {
  const n = inc.suno.length + inc.remix.length;
  if (!n) return null;
  if (view.state !== "ok") return view.state === "error"
    ? `곡 목록을 불러오지 못해 보낸 곡 ${n}개를 아직 선택하지 못했습니다. 아래 「새로고침」을 눌러 다시 불러와 주세요.`
    : `음악(SUNO) 자동화에서 보낸 곡 ${n}개를 내 곡 목록에서 찾는 중입니다…`;
  const ok = new Set(view.selectable), sel = new Set(picked);
  const pending = view.remixOk ? 0 : inc.remix.length;
  const checked = [...inc.suno, ...(view.remixOk ? inc.remix : [])];
  const found = checked.filter((id) => ok.has(id));
  const now = found.filter((id) => sel.has(id)).length, missing = checked.length - found.length;
  if (!checked.length && pending) return `리믹스 목록을 불러오지 못해 보낸 리믹스 ${pending}개를 아직 선택하지 못했습니다 — 「새로고침」을 눌러 주세요.`;
  return `음악(SUNO) 자동화에서 보낸 곡 ${n}개 중 ${found.length}개를 내 곡 목록에서 찾아 미리 선택했습니다(그중 지금 선택 ${now}개).`
    + (missing ? ` ${missing}개는 목록에 없거나 음원이 저장되지 않아 선택하지 못했습니다(일반 곡 최근 40곡·리믹스 최근 20개, 완성된 내 곡만).` : "")
    + (pending ? ` 리믹스 목록을 불러오지 못해 리믹스 ${pending}개는 아직 선택하지 못했습니다 — 「새로고침」을 눌러 주세요.` : "")
    + " 확인한 뒤 「선택한 곡 추가」를 눌러 주세요.";
}
