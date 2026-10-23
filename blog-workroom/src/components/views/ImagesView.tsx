"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, ImagePlus, LayoutGrid, Play, Square, Trash2, X } from "lucide-react";
import { ApiError, deleteItem, getItem, listItems, run, saveItem, type Item } from "@/components/ui/api";
import { Busy, Message, toMsg, type Msg } from "@/components/ui/parts";
import type { FinalData, ImageJobData, ImageNode } from "@/lib/types";

const STYLES = ["스마트폰 생활 사진", "깔끔한 정보 카드", "일러스트", "제품·사물 클로즈업", "풍경·장소"];
const RATIOS = ["4:3", "1:1", "3:4", "16:9"];
type Ref = { data: string; mimeType: string; url: string };

/** 참고 이미지: 긴 변 1280px JPEG로 줄여 보낸다(요청 크기 제한) */
async function toRef(file: File): Promise<Ref | null> {
  if (!/^image\//.test(file.type)) return null;
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return null;
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  return { data: url.split(",")[1], mimeType: "image/jpeg", url };
}

export function ImagesView({ finalId }: { finalId: string }) {
  const [jobs, setJobs] = useState<Item<ImageJobData>[] | null>(null);
  const [current, setCurrent] = useState<Item<ImageJobData> | null>(null);
  const [title, setTitle] = useState(""), [text, setText] = useState(""), [common, setCommon] = useState("");
  const [count, setCount] = useState(6), [ratio, setRatio] = useState("4:3");
  const [refs, setRefs] = useState<Ref[]>([]);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const [stopFlag, setStopFlag] = useState({ v: false });

  const load = useCallback(async () => { try { const l = await listItems<ImageJobData>("image_job"); setJobs(l); setCurrent((c) => (c ? l.find((x) => x.id === c.id) ?? null : null)); } catch (e) { setMsg(toMsg(e)); setJobs([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (finalId) void getItem<FinalData>(finalId).then((f) => { setTitle(f.data.title); setText(f.data.text); }).catch(() => undefined); }, [finalId]);

  async function addFiles(files: FileList | File[]) {
    const list = (await Promise.all([...files].slice(0, 10 - refs.length).map(toRef))).filter((x): x is Ref => !!x);
    setRefs((p) => [...p, ...list].slice(0, 10));
  }
  const plan = async () => {
    setBusy("문단을 나누고 이미지 구성을 기획하는 중…"); setMsg(null);
    try { const it = await run<Item<ImageJobData>>("image.plan", { title, text, count, ratio, common }); setCurrent(it); await load(); setMsg({ text: "이미지 구성을 만들었습니다. 노드별 내용·표현 방식·요청을 확인한 뒤 제작하세요.", ok: true }); }
    catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  };
  const patchNode = (id: string, p: Partial<ImageNode>) => setCurrent((c) => (c ? { ...c, data: { ...c.data, nodes: c.data.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)) } } : c));
  const saveJob = async () => { if (current) try { setCurrent(await saveItem<ImageJobData>(current.id, { data: current.data })); } catch (e) { setMsg(toMsg(e)); } };
  async function generate(ids: string[]) {
    if (!current) return;
    const flag = { v: false }; setStopFlag(flag); setMsg(null);
    await saveJob();
    let ok = 0, failed = 0;
    for (const [i, id] of ids.entries()) {
      if (flag.v) break;
      setBusy(`이미지 제작 중… ${i + 1}/${ids.length} (한 장에 20~60초)`);
      try { setCurrent(await run<Item<ImageJobData>>("image.generate", { id: current.id, nodeId: id, refs: refs.map(({ data, mimeType }) => ({ data, mimeType })) })); ok++; }
      catch (e) { failed++; const item = e instanceof ApiError ? (e.data.item as Item<ImageJobData> | undefined) : undefined; if (item) setCurrent(item); setMsg(toMsg(e)); if (e instanceof ApiError && e.needKey) break; }
    }
    setBusy(""); if (!failed) setMsg({ text: flag.v ? `중지했습니다. ${ok}장을 만들었습니다.` : `${ok}장을 만들었습니다.`, ok: true });
    void load();
  }
  const remove = async () => { if (!window.confirm("이 이미지 작업을 삭제할까요? 만든 이미지 주소도 목록에서 사라집니다.")) return; try { await deleteItem(current!.id); setCurrent(null); await load(); } catch (e) { setMsg(toMsg(e)); } };

  const c = current?.data;
  return (
    <div className="grid-side">
      <div className="stack">
        <section className="card stack">
          <h2>이미지를 만들 블로그 글</h2>
          <label>제목<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>본문(직접 쓴 글도 가능)<textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="제목과 본문을 붙여 넣으세요." /></label>
          <div className="field-grid">
            <label>본문 이미지 수<select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}장 (+대표 1장)</option>)}</select></label>
            <label>비율<select value={ratio} onChange={(e) => setRatio(e.target.value)}>{RATIOS.map((r) => <option key={r}>{r}</option>)}</select></label>
          </div>
          <label>공통 요청(선택)<textarea rows={2} value={common} onChange={(e) => setCommon(e.target.value.slice(0, 1000))} placeholder="원하는 분위기·색감·포함하거나 뺄 요소" /></label>
          <div>
            <strong style={{ fontSize: 12 }}>공통 참고 이미지 · {refs.length}/10</strong>
            <div className="thumbs" style={{ marginTop: 6 }}>{refs.map((r, i) => <span key={i} style={{ position: "relative" }}><img src={r.url} alt={`참고 ${i + 1}`} /><button className="link-button" style={{ position: "absolute", top: -6, right: -6, background: "#fff", borderRadius: 10, padding: 1 }} aria-label="참고 이미지 빼기" onClick={() => setRefs((p) => p.filter((_, j) => j !== i))}><X size={12} /></button></span>)}</div>
            {refs.length < 10 && <label className="button" style={{ marginTop: 6, display: "inline-flex" }}><ImagePlus size={13} />이미지 첨부<input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} /></label>}
            <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>본인이 쓸 권리가 있는 사진만 첨부하세요. 민감한 사진·개인정보는 넣지 마세요.</p>
          </div>
          <button className="primary" disabled={!!busy || text.trim().length < 100} onClick={() => void plan()}><LayoutGrid size={14} />문단 구성하기</button>
        </section>
        <section className="card">
          <h2>이전 작업</h2>
          {jobs === null ? <p className="muted">불러오는 중…</p> : !jobs.length ? <p className="muted">아직 없습니다.</p> : <div className="list">{jobs.map((j) => <button key={j.id} className={`list-item ${j.id === current?.id ? "active" : ""}`} onClick={() => setCurrent(j)}><span><strong>{j.data.title}</strong><small>{j.data.nodes.filter((n) => n.url).length}/{j.data.nodes.length}장 완성</small></span></button>)}</div>}
        </section>
      </div>
      <div className="stack">
        <Message msg={msg} />
        {busy && <div className="row"><Busy on label={busy} />{busy.startsWith("이미지 제작") && <button onClick={() => { stopFlag.v = true; }}><Square size={12} />중지</button>}</div>}
        {!c ? <div className="card muted">왼쪽에 글을 붙여 넣고 [문단 구성하기]를 누르세요. 대표 1장과 본문 5~10장의 이미지 노드를 만듭니다. 이미지 제작에는 본인 Gemini 키와 사용량이 필요합니다.</div> : <>
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>{c.title} · {c.ratio}</h2><button className="link-button danger" onClick={() => void remove()}><Trash2 size={13} />작업 삭제</button></div>
            <div className="actions">
              <button className="primary" disabled={!!busy} onClick={() => void generate(c.nodes.filter((n) => !n.url).map((n) => n.id))}><Play size={14} />남은 이미지 전체 제작 ({c.nodes.filter((n) => !n.url).length}장)</button>
              <small className="muted">공통 참고 이미지 {refs.length}장을 함께 보냅니다. 결과의 글자·모양·사실은 직접 확인하세요.</small>
            </div>
          </section>
          <div className="img-grid">{c.nodes.map((n) => (
            <div key={n.id} className="img-node">
              <div className="row" style={{ justifyContent: "space-between" }}><span className={`badge ${n.role === "대표" ? "골드" : ""}`}>{n.role}</span>{n.status === "error" && <small className="error">실패</small>}</div>
              {n.url ? <a href={n.url} target="_blank" rel="noreferrer"><img src={n.url} alt={n.content} /></a> : <div className="img-empty">아직 만들지 않음</div>}
              <label>담을 내용<textarea rows={2} value={n.content} onChange={(e) => patchNode(n.id, { content: e.target.value })} onBlur={() => void saveJob()} /></label>
              <label>표현 방식<select value={n.style} onChange={(e) => { patchNode(n.id, { style: e.target.value }); }} onBlur={() => void saveJob()}>{STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label>이미지 요청(선택)<textarea rows={2} value={n.request} onChange={(e) => patchNode(n.id, { request: e.target.value.slice(0, 500) })} onBlur={() => void saveJob()} placeholder="비워 두면 문단에 맞게 만듭니다" /></label>
              {n.paragraph && <details><summary className="muted" style={{ cursor: "pointer", fontSize: 11 }}>담당 문단 보기</summary><p className="pre" style={{ fontSize: 11 }}>{n.paragraph}</p></details>}
              <div className="actions"><button disabled={!!busy} onClick={() => void generate([n.id])}>{n.url ? "다시 만들기" : "이 이미지 만들기"}</button>{n.url && <a className="button" href={n.url} download target="_blank" rel="noreferrer"><Download size={12} />저장</a>}</div>
            </div>
          ))}</div>
        </>}
      </div>
    </div>
  );
}
