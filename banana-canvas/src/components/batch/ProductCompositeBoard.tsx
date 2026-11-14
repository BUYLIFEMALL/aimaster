"use client";
// 메이커 P1·P2(2026-11-13) 「🛍 상품 대표사진 합성」 — 상품마다 메인+서브 → 대표사진 1장, 상품코드 이름, 결과표, ZIP, 상세페이지 반환.
// 기능 화면(담당 A). 디자인은 agy 시안(docs/IMPROVEMENT_HANDOFF_20261113_MAKER_BATCH.md)으로 이어서 입힌다 — 기존 fe-*/bp-* 클래스만 사용.
// 모두 회원 브라우저 안에서 처리(서버 업로드·AI·비용 없음). 상세페이지로 돌려보낼 때만 상세페이지가 회원 저장공간에 저장한다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { Download, ImagePlus, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { ANCHORS, ANCHOR_LABELS } from "@/lib/batch/layout";
import { COMPOSITE_PRESETS, DEFAULT_COMPOSITE, normalizeComposite, settingsVersion, type CompositeSettings } from "@/lib/batch/composite";
import { canvasToBlob, readBitmap, renderComposite } from "@/lib/batch/compositeRender";
import {
  PHOTO_MAX_BYTES, buildJobs, compositeNames, manifestCsv, manifestJson, parseTable, rowsFromFileNames, type JobStatus, type ManifestRow, type ProductJobDraft,
} from "@/lib/batch/productJobs";
import { runQueue } from "@/lib/batch/runQueue";
import { fileKey, imagesFromZip } from "@/lib/batch/zipInput";
import {
  PRODUCT_MSG_READY, PRODUCT_MSG_RESULT, PRODUCT_RESULT_MAX_BYTES, productSenderOrigin, readProductJob, readProductSaved,
} from "@/lib/productPhotoHandoff";

const STORE_KEY = "bnc-product-composite-v1";

interface Job extends Omit<ProductJobDraft, "status"> {
  status: JobStatus;
  error: string | null;
  result: Blob | null;
  resultName: string;
  /** 상세페이지 반환: ""(안 보냄) · "sending" · "saved" · 실패 문구 */
  returned: string;
}

function load(): Partial<CompositeSettings> | null {
  try { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function saveFile(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const STATUS_LABEL: Record<JobStatus, string> = { ready: "준비", invalid: "고칠 것", running: "만드는 중", done: "완료", failed: "실패", skipped: "건너뜀" };

export function ProductCompositeBoard() {
  const [s, setS] = useState<CompositeSettings>(DEFAULT_COMPOSITE);
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [table, setTable] = useState("");
  const [sharedSub, setSharedSub] = useState<File | null>(null);
  const [linked, setLinked] = useState<{ jobId: string; jobs: Job[] } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const jobsRef = useRef<Job[]>([]); jobsRef.current = jobs;
  const linkedJobId = useRef<string | null>(null);
  const senderOriginRef = useRef<string | null>(null);
  const senderLabelRef = useRef<string>("상세페이지");

  useEffect(() => { setS(normalizeComposite(load())); }, []);
  const update = (patch: Partial<CompositeSettings>) => setS((prev) => {
    const next = normalizeComposite({ ...prev, ...patch });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* 저장이 막혀도 작업은 계속 */ }
    return next;
  });
  const version = useMemo(() => settingsVersion(s), [s]);

  // ── 파일 모드: 작업표·파일 이름 → 작업(실행 전 검사) ──
  const fileJobs = useMemo(() => {
    if (linked) return null;
    const names = [...files.keys()];
    const parsed = table.trim() ? parseTable(table) : { rows: rowsFromFileNames(names), errors: [] as string[] };
    const all = sharedSub ? [...names, sharedSub.name] : names;
    const built = buildJobs(parsed.rows, all, sharedSub?.name ?? null);
    return { ...built, tableErrors: parsed.errors };
  }, [files, table, sharedSub, linked]);

  useEffect(() => {
    if (!fileJobs) return;
    setJobs((prev) => fileJobs.jobs.map((d) => {
      const old = prev.find((p) => p.key === d.key && JSON.stringify(p.photos) === JSON.stringify(d.photos));
      return old && old.status !== "invalid" && d.status === "ready" ? old : { ...d, status: d.status, error: d.problems.join(" ") || null, result: null, resultName: "", returned: "" };
    }));
  }, [fileJobs]);

  const addFiles = useCallback((list: FileList | File[]) => {
    // 입력 칸을 바로 비우면(e.target.value = "") FileList도 비므로, 상태 갱신 전에 먼저 골라 둔다(2026-11-13 운영 결함 수정)
    const picked = Array.from(list);
    void (async () => {
      const skipped: string[] = [];
      const ok: [string, File][] = [];
      for (const f of picked) {
        // P3-F: 공급사 ZIP은 브라우저 안에서 풀어 사진만 넣는다(이름 = ZIP 안 경로, 폴더 이름이 상품코드)
        if (/\.zip$/i.test(f.name)) {
          try { const z = await imagesFromZip(f); z.files.forEach((x) => ok.push([x.name, x])); skipped.push(...z.skipped); }
          catch { skipped.push(`${f.name}(ZIP을 열 수 없습니다)`); }
          continue;
        }
        if (!f.type.startsWith("image/")) continue;
        if (f.size > PHOTO_MAX_BYTES) { skipped.push(`${f.name}(25MB 초과)`); continue; }
        ok.push([fileKey(f), f]); // 폴더로 넣으면 경로가 키(폴더마다 같은 main.jpg가 있어도 섞이지 않음)
      }
      setFiles((prev) => {
        const next = new Map(prev);
        for (const [k, f] of ok) next.set(k, f);
        return next;
      });
      setNotice(skipped.length ? `넣지 못한 것: ${skipped.slice(0, 6).join(", ")}${skipped.length > 6 ? ` 외 ${skipped.length - 6}건` : ""}` : null);
    })();
  }, []);

  async function pickTableFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 1024 * 1024) { setNotice("작업표는 1MB 이하 CSV로 넣어 주세요."); return; }
    setTable(await f.text());
  }

  // ── 상세페이지 / 쇼핑몰 연결 모드(P2 / M1): 부모 창이 연 경우만 ──
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const origin = productSenderOrigin(q.get("from"));
    if (!origin || !window.opener) return;
    senderOriginRef.current = origin;
    const label = q.get("from") === "mall" ? "쇼핑몰" : "상세페이지";
    senderLabelRef.current = label;

    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.opener) return;
      const got = readProductJob(e.origin, e.data, origin);
      if (got) {
        if ("error" in got) { setNotice(`${label}에서 받은 자료에 문제가 있습니다: ${got.error}`); return; }
        const map = new Map<string, File>();
        const list: Job[] = got.products.map((p) => {
          const photos = p.photos.map((ph, i) => {
            const ref = `${p.productId}#${i}`;
            map.set(ref, new File([ph.file], ph.ref.split("/").pop() || `${ph.role}.jpg`, { type: ph.file.type }));
            return { role: ph.role, ref };
          });
          return { key: p.productId, productId: p.productId, code: p.label, option: "", label: p.label, photos, baseRevision: p.baseRevision, problems: [], status: "ready", error: null, result: null, resultName: "", returned: "" };
        });
        linkedJobId.current = got.jobId; setFiles(map); setLinked({ jobId: got.jobId, jobs: list }); setJobs(list); setSel(list[0]?.key ?? null);
        setNotice(`📥 ${label}에서 상품 ${list.length}개를 받았습니다. 규칙을 확인하고 「일괄 만들기」를 누르세요.`);
        return;
      }
      const saved = linkedJobId.current ? readProductSaved(e.origin, e.data, linkedJobId.current, origin) : null;
      if (saved) setJobs((xs) => xs.map((j) => (j.productId === saved.productId ? { ...j, returned: saved.ok ? "saved" : saved.error || "저장하지 못했습니다." } : j)));
    };
    window.addEventListener("message", onMessage);
    window.opener.postMessage({ type: PRODUCT_MSG_READY }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ── 그리기 ──
  const draw = useCallback(async (job: Job, scale: number) => {
    const main = files.get(job.photos.find((p) => p.role === "main")?.ref ?? "");
    if (!main) throw new Error("메인 사진이 없습니다.");
    const subFiles = job.photos.filter((p) => p.role === "sub").map((p) => (p.ref === sharedSub?.name && !files.has(p.ref) ? sharedSub : files.get(p.ref))).filter((f): f is File => !!f);
    const bms = await Promise.all([main, ...subFiles].map((f) => readBitmap(f)));
    try { return renderComposite(bms[0], bms.slice(1), s, scale); } finally { bms.forEach((b) => b.close()); }
  }, [files, sharedSub, s]);

  const cur = jobs.find((j) => j.key === sel) ?? jobs.find((j) => j.status !== "invalid") ?? null;
  useEffect(() => {
    const box = previewRef.current;
    if (!box) return;
    if (!cur || cur.status === "invalid") { box.replaceChildren(); return; }
    let alive = true;
    void draw(cur, Math.min(1, 600 / s.width)).then((c) => {
      if (!alive) return;
      c.style.width = "100%"; c.style.height = "auto"; c.style.display = "block";
      box.replaceChildren(c);
    }).catch((e) => setNotice(e instanceof Error ? e.message : "미리보기를 그리지 못했습니다."));
    return () => { alive = false; };
  }, [cur, draw, s.width]);

  // ── 일괄 실행·중단·실패만 다시 ──
  async function run(retryFailed: boolean) {
    const ac = new AbortController(); abortRef.current = ac;
    setBusy(true); setNotice(null);
    const names = compositeNames(jobsRef.current.map((j) => ({ code: j.code, option: j.option })), { prefix: s.prefix, template: s.template, ext: s.format });
    const nameOf = new Map(jobsRef.current.map((j, i) => [j.key, names[i]]));
    const patch = (key: string, p: Partial<Job>) => setJobs((xs) => xs.map((j) => (j.key === key ? { ...j, ...p } : j)));
    const r = await runQueue(jobsRef.current, async (job) => {
      const blob = await canvasToBlob(await draw(job, 1), s);
      patch(job.key, { result: blob, resultName: nameOf.get(job.key) ?? `${job.code}_main.${s.format}`, error: null });
      if (linked && job.productId) {
        const targetOrigin = senderOriginRef.current;
        const targetLabel = senderLabelRef.current;
        if (!targetOrigin || !window.opener || window.opener.closed) { patch(job.key, { returned: `${targetLabel} 창이 닫혔습니다. ZIP을 받아 직접 올려 주세요.` }); return; }
        if (blob.size > PRODUCT_RESULT_MAX_BYTES) { patch(job.key, { returned: "결과가 10MB를 넘어 보내지 못했습니다. JPG·화질을 낮춰 주세요." }); return; }
        patch(job.key, { returned: "sending" });
        window.opener.postMessage({ type: PRODUCT_MSG_RESULT, jobId: linked.jobId, productId: job.productId, file: blob, settingsVersion: version }, targetOrigin);
      }
    }, { signal: ac.signal, retryFailed, onUpdate: (u) => patch(u.key, { status: u.status, ...(u.error ? { error: u.error } : {}) }) });
    abortRef.current = null; setBusy(false);
    setNotice(r.stopped ? `⏸ 중단했습니다. 완료 ${r.done}개는 그대로 남아 있습니다.` : `✅ 완료 ${r.done}개${r.failed ? ` · 실패 ${r.failed}개(「실패한 것만 다시」)` : ""}${linked ? ` · ${senderLabelRef.current} 저장 결과는 표의 「반환」 칸에 표시됩니다.` : ""}`);
  }

  async function downloadZip() {
    const done = jobs.filter((j) => j.status === "done" && j.result);
    if (!done.length) { setNotice("받을 결과가 없습니다."); return; }
    const zip = new JSZip();
    done.forEach((j) => zip.file(j.resultName, j.result!));
    const createdAt = new Date().toISOString();
    const rows: ManifestRow[] = jobs.filter((j) => j.key !== "__over__").map((j) => ({
      code: j.code, option: j.option, label: j.label, productId: j.productId,
      main: files.get(j.photos.find((p) => p.role === "main")?.ref ?? "")?.name ?? "",
      subs: j.photos.filter((p) => p.role === "sub").map((p) => files.get(p.ref)?.name ?? p.ref),
      result: j.resultName, status: j.status, error: j.error ?? "", returned: j.returned === "sending" ? "" : j.returned,
    }));
    zip.file("결과표.csv", manifestCsv(rows, version, createdAt));
    zip.file("결과표.json", manifestJson(rows, version, createdAt));
    saveFile(await zip.generateAsync({ type: "blob" }), `대표사진_${done.length}개.zip`);
  }

  function clearAll() { if (linked) return; setFiles(new Map()); setTable(""); setSharedSub(null); setJobs([]); setSel(null); }

  const count = (st: JobStatus) => jobs.filter((j) => j.status === st).length;
  const runnable = jobs.some((j) => j.status === "ready" || j.status === "skipped");

  return (
    <div className="fe-wrap">
      <div className="card fe-intro">
        <div className="fe-intro-row">
          <span className="fe-badge">🆓 무료 · 내 PC 처리</span>
          <span className="fe-badge soft">{linked ? "🛒 상세페이지 연결됨" : "사진이 서버로 올라가지 않음"}</span>
          <span className="fe-badge leaf">준비 {count("ready")} · 고칠 것 {count("invalid")} · 완료 {count("done")} · 실패 {count("failed")}</span>
        </div>
        <p className="bp-intro">
          {linked
            ? "상세페이지에서 보낸 상품마다 메인+서브 사진을 대표사진 한 장으로 합성해 그 상품의 대표사진 칸에 새 버전으로 돌려보냅니다(원본 사진은 그대로)."
            : <>사진을 넣고 <b>상품코드 작업표</b>(엑셀에서 복사해 붙여넣기 또는 CSV)를 넣거나, 파일 이름을 <b>코드_main.jpg · 코드_sub1.jpg</b>로 맞추세요. 공급사가 준 <b>ZIP·폴더</b>는 그대로 넣으면 <b>폴더 이름이 상품코드</b>가 됩니다(main·sub1 이름 우선, 없으면 이름순 첫 장이 메인). 본인이 찍었거나 공급사가 허용한 사진만 쓰세요.</>}
        </p>
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>

      <div className="bp-grid">
        {/* 자료·작업표 */}
        <aside className="card fe-list">
          {!linked && (
            <>
              <header>
                <b>사진 {files.size}장</b>
                <label className="button"><ImagePlus size={14} />추가<input type="file" accept="image/*,.zip" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} /></label>
              </header>
              <label className="fe-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
                <ImagePlus size={22} />
                <b>상품 사진을 끌어 놓거나 눌러서 고르세요</b>
                <small>사진 또는 공급사 ZIP · 한 장 25MB · 한 번에 상품 50개까지</small>
                <input type="file" accept="image/*,.zip" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              </label>
              <label className="bp-range" style={{ marginTop: 10 }}>📋 상품코드 작업표(머리줄 예: 상품코드, 옵션, 대표사진, 서브1)
                <textarea value={table} onChange={(e) => setTable(e.target.value)} rows={4} className="bp-input" placeholder={"상품코드\t옵션\t대표사진\t서브1\nA-1001\t화이트\ta1.jpg\ta1_s.jpg"} style={{ marginTop: 4, fontFamily: "monospace" }} />
              </label>
              <div className="bp-row" style={{ flexWrap: "wrap" }}>
                <label className="button">📁 폴더 넣기<input type="file" multiple hidden ref={(el) => { if (el) el.setAttribute("webkitdirectory", ""); }} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} /></label>
                <label className="button">CSV 불러오기<input type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={(e) => { void pickTableFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
                <label className="button"><ImagePlus size={14} />{sharedSub ? `공용 서브: ${sharedSub.name}` : "공용 서브 1장(모든 상품)"}<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= PHOTO_MAX_BYTES) setSharedSub(f); e.target.value = ""; }} /></label>
                {sharedSub && <button type="button" className="bp-link" style={{ marginTop: 0 }} onClick={() => setSharedSub(null)}>공용 서브 빼기</button>}
              </div>
              {fileJobs?.tableErrors.map((t) => <p key={t} className="bp-size bad">{t}</p>)}
              {!!fileJobs?.orphans.length && <p className="bp-hint">작업표에 없는 사진 {fileJobs.orphans.length}장: {fileJobs.orphans.slice(0, 5).join(", ")}{fileJobs.orphans.length > 5 ? " …" : ""}</p>}
            </>
          )}
          <ul className="bp-scroll" style={{ marginTop: 10 }}>
            {jobs.map((j) => (
              <li key={j.key} className={cur?.key === j.key ? "on" : undefined}>
                <button type="button" onClick={() => setSel(j.key)} className="bp-thumbbtn" title={j.label}>
                  <span>
                    <span className="bp-name">{j.code}{j.option ? ` · ${j.option}` : ""}</span>
                    <span className={j.status === "invalid" || j.status === "failed" ? "bp-size bad" : "bp-size"}>
                      {STATUS_LABEL[j.status]} · 사진 {j.photos.length}장{j.returned ? ` · 반환 ${j.returned === "saved" ? "저장됨" : j.returned === "sending" ? "보내는 중" : j.returned}` : ""}
                    </span>
                    {j.error && <span className="bp-size bad">{j.error}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!linked && jobs.length > 0 && <button type="button" className="bp-link" onClick={clearAll}><Trash2 size={12} /> 모두 빼기</button>}
        </aside>

        {/* 미리보기 */}
        <section className="card">
          <div className="bp-head">
            <b>👀 미리보기 {cur && cur.status !== "invalid" ? `— ${cur.label}` : ""}</b>
            <span className="bp-hint">{s.width}×{s.height}px · 설정 {version}</span>
          </div>
          <div ref={previewRef} className="bp-preview" />
          {(!cur || cur.status === "invalid") && <p className="bp-hint">짝이 맞은 상품을 고르면 결과 모습이 여기에 보입니다.</p>}
        </section>

        {/* 규칙 */}
        <section className="card bp-set">
          <div>
            <span className="bp-label">📐 크기·메인 사진</span>
            <div className="bp-seg c3">
              {COMPOSITE_PRESETS.map((p) => (
                <button key={p.id} type="button" className={s.width === p.width && s.height === p.height ? "on" : undefined} onClick={() => update({ width: p.width, height: p.height })}>{p.label}</button>
              ))}
            </div>
            <div className="bp-seg c2" style={{ marginTop: 6 }}>
              <button type="button" className={s.fit === "contain" ? "on" : undefined} onClick={() => update({ fit: "contain" })}>안에 맞춤</button>
              <button type="button" className={s.fit === "cover" ? "on" : undefined} onClick={() => update({ fit: "cover" })}>꽉 채움</button>
            </div>
            <div className="bp-row" style={{ marginTop: 6 }}>
              <label className="bp-row">바탕 <input type="color" value={s.background} onChange={(e) => update({ background: e.target.value })} /></label>
              <label className="bp-range">여백 {s.padding}px <input type="range" min={0} max={200} value={s.padding} onChange={(e) => update({ padding: Number(e.target.value) })} /></label>
            </div>
            <p className="bp-hint">1000×1000은 기본값일 뿐 마켓별 등록 기준을 보장하지 않습니다.</p>
          </div>

          <div>
            <span className="bp-label">🧩 서브 사진</span>
            <div className="bp-anchor" role="radiogroup" aria-label="서브 사진 위치">
              {ANCHORS.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={s.subAnchor === a} aria-label={ANCHOR_LABELS[a]} title={ANCHOR_LABELS[a]} onClick={() => update({ subAnchor: a })} className={s.subAnchor === a ? "on" : undefined} />
              ))}
            </div>
            <label className="bp-range">크기 {s.subRatio}% <input type="range" min={15} max={50} value={s.subRatio} onChange={(e) => update({ subRatio: Number(e.target.value) })} /></label>
            <label className="bp-range">가장자리 여백 {s.subMargin}px <input type="range" min={0} max={60} value={s.subMargin} onChange={(e) => update({ subMargin: Number(e.target.value) })} /></label>
            <label className="bp-range">둥근 모서리 {s.subRadius}px <input type="range" min={0} max={30} value={s.subRadius} onChange={(e) => update({ subRadius: Number(e.target.value) })} /></label>
            <div className="bp-row">
              <label className="bp-row"><input type="checkbox" checked={s.subOutline} onChange={(e) => update({ subOutline: e.target.checked })} />흰 외곽선</label>
              <label className="bp-row"><input type="checkbox" checked={s.subShadow} onChange={(e) => update({ subShadow: e.target.checked })} />그림자</label>
            </div>
          </div>

          <div>
            <span className="bp-label">💾 저장·파일 이름</span>
            <div className="bp-seg c2">
              {(["jpg", "png"] as const).map((f) => <button key={f} type="button" onClick={() => update({ format: f })} className={s.format === f ? "on" : undefined}>{f.toUpperCase()}</button>)}
            </div>
            {s.format === "jpg" && <label className="bp-range">화질 {s.quality} <input type="range" min={60} max={100} value={s.quality} onChange={(e) => update({ quality: Number(e.target.value) })} /></label>}
            <label className="bp-range">앞붙임<input value={s.prefix} maxLength={40} placeholder="예: AIM" onChange={(e) => update({ prefix: e.target.value })} className="bp-input" style={{ marginTop: 4 }} /></label>
            <label className="bp-range">이름 틀<input value={s.template} maxLength={80} onChange={(e) => update({ template: e.target.value })} className="bp-input" style={{ marginTop: 4 }} /></label>
            <p className="bp-hint">예: {compositeNames([{ code: cur?.code ?? "A-1001", option: cur?.option ?? "화이트" }], { prefix: s.prefix, template: s.template, ext: s.format })[0]}</p>
          </div>

          {busy ? (
            <button type="button" className="primary bp-go" onClick={() => abortRef.current?.abort()}><Pause size={15} />전체 일괄 즉시 중단(지금 한 개 마치고 멈춤)</button>
          ) : (
            <button type="button" className="primary bp-go" disabled={!runnable} onClick={() => void run(false)}><Play size={15} />일괄 만들기 ({count("ready") + count("skipped")}개{linked ? " → 상세페이지로 반환" : ""})</button>
          )}
          {!busy && count("failed") > 0 && <button type="button" className="button" onClick={() => void run(true)}><RotateCcw size={14} />실패한 것만 다시 ({count("failed")}개)</button>}
          <button type="button" className="button" disabled={busy || !count("done")} onClick={() => void downloadZip()}><Download size={14} />결과 ZIP + 결과표 받기 ({count("done")}개)</button>
        </section>
      </div>
    </div>
  );
}
