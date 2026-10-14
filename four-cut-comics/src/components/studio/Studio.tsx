"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Lightbulb, RefreshCw, Sparkles, Upload } from "lucide-react";
import {
  BUBBLES, DEFAULT_IMAGE_MODEL, FORMATS, GENRES, GENRE_LABELS, IMAGE_MODELS, NO_SPEAKER, STYLES, THOUGHT_SPEAKER, isImageModel,
} from "@/lib/comic/options";
import { renameCharacter } from "@/lib/comic/script";
import type { Script } from "@/lib/comic/script";
import { composePanel, downloadUrl, fileToSheet, layoutPanels, shrinkForUpload } from "@/lib/comic/draw";
import type { SaveLayout } from "@/lib/comic/draw";

type Step = 1 | 2 | 3 | 4;
type ApiError = Error & { needKey?: boolean };
const MODEL_KEY = "four-cut-comics.imageModel";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "요청을 처리하지 못했습니다.") as ApiError;
    err.needKey = !!data.needKey;
    throw err;
  }
  return data as T;
}

const imgUrl = (i: { data: string; mimeType: string }) => `data:${i.mimeType};base64,${i.data}`;

export function Studio() {
  const [step, setStep] = useState<Step>(1);
  const [styleId, setStyleId] = useState(STYLES[0].id);
  const [model, setModel] = useState<string>(DEFAULT_IMAGE_MODEL);
  const [bubbleId, setBubbleId] = useState(BUBBLES[0].id);
  const [genreId, setGenreId] = useState(GENRES[0].id);
  const [format, setFormat] = useState<"single" | "serial">("single");
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [sheets, setSheets] = useState<(string | null)[]>([]);
  const [raw, setRaw] = useState<(string | null)[]>([null, null, null, null]);
  const [composed, setComposed] = useState<(string | null)[]>([null, null, null, null]);
  const [panelErr, setPanelErr] = useState<(string | null)[]>([null, null, null, null]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { const m = localStorage.getItem(MODEL_KEY); if (isImageModel(m)) setModel(m); } catch { /* 저장소 없이도 동작 */ }
  }, []);
  function chooseModel(id: string) {
    setModel(id);
    try { localStorage.setItem(MODEL_KEY, id); } catch { /* 무시 */ }
  }

  function fail(e: unknown, fallback: string) {
    const err = e as ApiError;
    setError(err instanceof Error ? err.message : fallback);
    setNeedKey(!!err?.needKey);
  }
  function clearMsg() { setError(""); setNeedKey(false); setNotice(""); }

  // ---- 1단계: 아이디어·대본 ----
  async function loadIdeas() {
    clearMsg(); setBusy("ideas");
    try { setIdeas((await post<{ ideas: string[] }>("/api/script", { kind: "ideas", genreId })).ideas); }
    catch (e) { fail(e, "아이디어를 가져오지 못했습니다."); }
    finally { setBusy(""); }
  }
  async function makeScript() {
    if (!topic.trim()) { setError("주제를 입력해 주세요."); return; }
    clearMsg(); setBusy("script");
    try {
      const r = await post<{ script: Script }>("/api/script", { kind: "script", genreId, topic, format });
      setScript(r.script); setSheets(r.script.characters.map(() => null)); setRaw([null, null, null, null]); setComposed([null, null, null, null]);
      setStep(2);
    } catch (e) { fail(e, "대본을 만들지 못했습니다."); }
    finally { setBusy(""); }
  }

  // ---- 2단계: 대본 편집 ----
  function editCharacterName(i: number, value: string) {
    if (!script) return;
    const next = renameCharacter(script, i, value);
    if (next) setScript(next);
  }
  function editCharacterDesc(i: number, value: string) {
    if (!script) return;
    setScript({ ...script, characters: script.characters.map((c, k) => (k === i ? { ...c, description: value } : c)) });
  }
  function editPanel(i: number, patch: Partial<Script["panels"][number]>) {
    if (!script) return;
    setScript({ ...script, panels: script.panels.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  }

  // ---- 3단계: 캐릭터 시트 ----
  const makeSheet = useCallback(async (i: number) => {
    if (!script) return;
    const c = script.characters[i];
    const r = await post<{ image: { data: string; mimeType: string } }>("/api/character", { name: c.name, description: c.description, styleId, model });
    setSheets((cur) => cur.map((s, k) => (k === i ? imgUrl(r.image) : s)));
  }, [script, styleId, model]);

  async function makeAllSheets() {
    if (!script) return;
    clearMsg(); setBusy("sheets"); setStep(3);
    let failed = 0;
    for (let i = 0; i < script.characters.length; i++) {
      if (sheets[i]) continue;
      try { await makeSheet(i); } catch (e) { failed++; fail(e, "캐릭터 그림을 만들지 못했습니다."); if ((e as ApiError).needKey) break; }
    }
    if (failed) setNotice("일부 캐릭터 그림이 실패했습니다. 실패한 캐릭터만 [다시 그리기]를 눌러 주세요.");
    setBusy("");
  }
  async function regenSheet(i: number) {
    clearMsg(); setBusy(`sheet-${i}`);
    try { await makeSheet(i); } catch (e) { fail(e, "캐릭터 그림을 만들지 못했습니다."); }
    finally { setBusy(""); }
  }
  async function replaceSheet(i: number, file: File | undefined) {
    if (!file) return;
    clearMsg();
    try { const url = await fileToSheet(file); setSheets((cur) => cur.map((s, k) => (k === i ? url : s))); }
    catch (e) { fail(e, "이미지를 읽지 못했습니다."); }
  }

  // ---- 4단계: 컷 그림 ----
  async function makePanel(i: number) {
    if (!script) return;
    const refs = await Promise.all(sheets.filter((s): s is string => !!s).map((s) => shrinkForUpload(s)));
    const r = await post<{ image: { data: string; mimeType: string } }>("/api/panel", {
      description: script.panels[i].description, styleId, model, sheets: refs.slice(0, 3),
    });
    setRaw((cur) => cur.map((s, k) => (k === i ? imgUrl(r.image) : s)));
    setPanelErr((cur) => cur.map((s, k) => (k === i ? null : s)));
  }
  async function makePanels(only?: number) {
    if (!script) return;
    clearMsg(); setBusy(only === undefined ? "panels" : `panel-${only}`);
    const targets = only === undefined ? [0, 1, 2, 3].filter((i) => !raw[i]) : [only];
    for (const i of targets) {
      try { await makePanel(i); }
      catch (e) {
        const msg = e instanceof Error ? e.message : "그림을 만들지 못했습니다.";
        setPanelErr((cur) => cur.map((s, k) => (k === i ? msg : s)));
        if ((e as ApiError).needKey) { fail(e, msg); break; }
      }
    }
    setBusy("");
  }

  // 대사·말풍선 방식이 바뀌면 합성 결과를 다시 만든다
  useEffect(() => {
    if (!script) return;
    let alive = true;
    (async () => {
      const out: (string | null)[] = [];
      for (let i = 0; i < 4; i++) out.push(raw[i] ? await composePanel(raw[i] as string, script.panels[i], bubbleId).catch(() => raw[i]) : null);
      if (alive) setComposed(out);
    })();
    return () => { alive = false; };
  }, [raw, script, bubbleId]);

  const allDone = composed.every(Boolean);
  const missing = useMemo(() => raw.filter((r) => !r).length, [raw]);

  async function saveLayout(layout: SaveLayout) {
    try {
      const url = await layoutPanels(composed as string[], layout);
      downloadUrl(url, `4컷만화-${layout}.png`);
    } catch (e) { fail(e, "저장하지 못했습니다."); }
  }
  function saveEach() {
    (composed as string[]).forEach((u, i) => setTimeout(() => downloadUrl(u, `4컷만화-${i + 1}컷.png`), i * 250));
  }

  function restart() {
    setStep(1); setScript(null); setSheets([]); setRaw([null, null, null, null]); setComposed([null, null, null, null]); setPanelErr([null, null, null, null]); clearMsg();
  }

  const stepper = (
    <ol className="cc-steps" aria-label="진행 단계">
      {["주제 선정", "대본 확인", "등장인물 확인", "만화 생성"].map((t, i) => (
        <li key={t} className={step === i + 1 ? "on" : step > i + 1 ? "done" : ""}><span>{i + 1}</span>{t}</li>
      ))}
    </ol>
  );

  return (
    <div className="studio">
      {stepper}
      {error && (
        <p role="alert" className="notice lp-alert">
          {error}{needKey && <> <a className="subtle-link" href="/settings">API키등록·플랫폼연동으로 이동</a></>}
        </p>
      )}
      {notice && <p role="status" className="notice">{notice}</p>}

      {step === 1 && (
        <section className="card cc-form">
          <label>그림 스타일
            <select value={styleId} onChange={(e) => setStyleId(e.target.value)}>
              {STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <small className="muted">{STYLES.find((s) => s.id === styleId)?.summary}</small>
          </label>
          <div>
            <b className="cc-label">그림 모델</b>
            <div className="chips">
              {IMAGE_MODELS.map((m) => <button key={m.id} type="button" className={`chip${model === m.id ? " on" : ""}`} onClick={() => chooseModel(m.id)}>{m.name}</button>)}
            </div>
            <small className="muted">{IMAGE_MODELS.find((m) => m.id === model)?.hint}</small>
          </div>
          <label>대사 표시 방식
            <select value={bubbleId} onChange={(e) => setBubbleId(e.target.value)}>
              {BUBBLES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <small className="muted">{BUBBLES.find((b) => b.id === bubbleId)?.hint}</small>
          </label>
          <div>
            <b className="cc-label">만화 장르</b>
            <div className="cc-row">
              <select value={genreId} onChange={(e) => { setGenreId(e.target.value); setIdeas([]); }} aria-label="만화 장르">
                {GENRES.map((g) => <option key={g.id} value={g.id}>{GENRE_LABELS[g.id]}</option>)}
              </select>
              <button type="button" onClick={loadIdeas} disabled={!!busy} title="이 장르의 주제 5개 추천"><Lightbulb size={15} />{busy === "ideas" ? "추천 중..." : "주제 추천"}</button>
            </div>
            {ideas.length > 0 && (
              <ul className="cc-ideas">
                {ideas.map((x) => <li key={x}><button type="button" onClick={() => setTopic(x)}>{x}</button></li>)}
              </ul>
            )}
          </div>
          <div>
            <b className="cc-label">만화 형식</b>
            <div className="chips">
              {FORMATS.map((f) => <button key={f.id} type="button" className={`chip${format === f.id ? " on" : ""}`} onClick={() => setFormat(f.id)}>{f.name}</button>)}
            </div>
            <small className="muted">{FORMATS.find((f) => f.id === format)?.hint}</small>
          </div>
          <label>주제 또는 직접 쓴 대본
            <textarea rows={5} value={topic} maxLength={2000} onChange={(e) => setTopic(e.target.value)}
              placeholder={"예: 월요일 아침 알람을 다섯 번 끈 직장인\n또는 1컷 철수: 오늘은 운동한다! / 2컷 ... 처럼 이름과 대사를 직접 적어도 됩니다."} />
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={makeScript} disabled={!!busy}><Sparkles size={15} />{busy === "script" ? "대본 만드는 중..." : "대본 생성하기"}</button>
          </div>
          <small className="muted">대본·그림 생성은 등록한 본인 Gemini 키 사용량으로 계산됩니다. 결과는 서버에 저장되지 않고 이 화면에만 있으니 저장 전에 새로고침하지 마세요.</small>
        </section>
      )}

      {step === 2 && script && (
        <section className="card cc-form">
          <h2 className="cc-h">등장인물</h2>
          {script.characters.map((c, i) => (
            <div key={i} className="cc-char">
              <label>이름
                <input defaultValue={c.name} key={`${i}-${c.name}`} maxLength={40} onBlur={(e) => { const v = e.target.value.trim(); if (v !== c.name && !renameCharacter(script, i, v)) e.target.value = c.name; else editCharacterName(i, v); }} />
              </label>
              <label>외형·성격 묘사
                <textarea rows={2} value={c.description} maxLength={1200} onChange={(e) => editCharacterDesc(i, e.target.value)} />
              </label>
            </div>
          ))}
          <h2 className="cc-h">컷 대본</h2>
          {script.panels.map((p, i) => (
            <div key={i} className="cc-panel-edit">
              <b>{i + 1}컷</b>
              <label>화자
                <select value={p.character} onChange={(e) => editPanel(i, { character: e.target.value })}>
                  {script.characters.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  <option value={THOUGHT_SPEAKER}>생각</option>
                  <option value={NO_SPEAKER}>없음 (나레이션)</option>
                </select>
              </label>
              <label>장면 묘사 (그림 지시문)
                <textarea rows={3} value={p.description} maxLength={1200} onChange={(e) => editPanel(i, { description: e.target.value })} />
              </label>
              <label>대사 (비우면 그림만 나옵니다)
                <textarea rows={2} value={p.dialogue} maxLength={1200} onChange={(e) => editPanel(i, { dialogue: e.target.value })} />
              </label>
            </div>
          ))}
          <small className="muted">그림 속 글자(간판 등)는 AI가 한글을 잘 못 그려 영어로만 그려지고, 한글 대사는 앱이 그림 위에 얹습니다.</small>
          <div className="actions">
            <button type="button" onClick={() => setStep(1)}><ArrowLeft size={15} />주제로 돌아가기</button>
            <button type="button" className="primary" onClick={makeAllSheets} disabled={!!busy}>{busy === "sheets" ? "캐릭터 그리는 중..." : "캐릭터 생성하고 계속하기"}</button>
          </div>
        </section>
      )}

      {step === 3 && script && (
        <section className="card cc-form">
          <h2 className="cc-h">등장인물 확인</h2>
          <p className="muted">캐릭터 그림은 4컷 모두에 참고 이미지로 들어가 같은 인물이 같은 모습으로 나오게 해 줍니다. 마음에 들 때까지 다듬어 주세요.</p>
          <div className="cc-sheets">
            {script.characters.map((c, i) => (
              <figure key={c.name} className="cc-sheet">
                {sheets[i]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={sheets[i] as string} alt={`${c.name} 캐릭터 그림`} />
                  : <div className="cc-placeholder">{busy === "sheets" || busy === `sheet-${i}` ? "그리는 중..." : "그림 없음"}</div>}
                <figcaption><b>{c.name}</b></figcaption>
                <div className="actions">
                  <button type="button" onClick={() => regenSheet(i)} disabled={!!busy}><RefreshCw size={14} />{sheets[i] ? "재생성" : "다시 그리기"}</button>
                  <label className="cc-file"><Upload size={14} />교체
                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { replaceSheet(i, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </div>
              </figure>
            ))}
          </div>
          <div className="actions">
            <button type="button" onClick={() => setStep(2)}><ArrowLeft size={15} />대본으로 돌아가기</button>
            <button type="button" className="primary" onClick={() => { setStep(4); clearMsg(); }} disabled={!!busy}>만화 생성하러 가기</button>
          </div>
        </section>
      )}

      {step === 4 && script && (
        <section className="card cc-form">
          <h2 className="cc-h">만화 생성</h2>
          <div className="actions">
            <button type="button" className="primary" onClick={() => makePanels()} disabled={!!busy || missing === 0}>
              {busy === "panels" ? "그리는 중..." : missing === 4 ? "모든 이미지 한번에 생성" : missing === 0 ? "모든 컷 완성" : "남은 이미지 생성"}
            </button>
            <label className="cc-inline">모델
              <select value={model} onChange={(e) => chooseModel(e.target.value)}>
                {IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="cc-inline">대사
              <select value={bubbleId} onChange={(e) => setBubbleId(e.target.value)}>
                {BUBBLES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>
          <div className="cc-grid">
            {[0, 1, 2, 3].map((i) => (
              <figure key={i} className="cc-cut">
                {composed[i]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={composed[i] as string} alt={`${i + 1}컷`} />
                  : <div className="cc-placeholder">{busy === "panels" || busy === `panel-${i}` ? "그리는 중..." : panelErr[i] ? "실패" : `${i + 1}컷`}</div>}
                {panelErr[i] && <small className="error" role="alert">{panelErr[i]}</small>}
                <div className="actions">
                  <button type="button" onClick={() => makePanels(i)} disabled={!!busy}><RefreshCw size={14} />{raw[i] ? "다시 그리기" : panelErr[i] ? "다시 시도" : "이 컷 그리기"}</button>
                </div>
              </figure>
            ))}
          </div>
          {allDone && (
            <div className="cc-save">
              <b className="cc-label">저장하기</b>
              <div className="actions">
                <button type="button" className="primary" onClick={() => saveLayout("grid")}><Download size={14} />바둑판(2x2)</button>
                <button type="button" onClick={() => saveLayout("horizontal")}><Download size={14} />가로 연속</button>
                <button type="button" onClick={() => saveLayout("vertical")}><Download size={14} />세로 연속</button>
                <button type="button" onClick={saveEach}><Download size={14} />개별 파일 4장</button>
              </div>
              <small className="muted">개별 파일은 브라우저가 여러 파일 다운로드 허용을 물으면 허용해 주세요.</small>
            </div>
          )}
          <div className="actions">
            <button type="button" onClick={() => setStep(3)}><ArrowLeft size={15} />등장인물로 돌아가기</button>
            <button type="button" onClick={restart}>처음부터 새로 만들기</button>
          </div>
        </section>
      )}
    </div>
  );
}
