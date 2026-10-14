"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookmarkPlus, CloudUpload, Copy, Download, Layers, Lightbulb, MessageSquare, RefreshCw, Sparkles, Upload } from "lucide-react";
import {
  ASPECTS, BUBBLES, DEFAULT_ASPECT, DEFAULT_IMAGE_MODEL, DEFAULT_PANEL_COUNT, FORMATS, GENRES, GENRE_LABELS, IMAGE_MODELS, NO_SPEAKER, PANEL_COUNTS, STYLES,
  THOUGHT_SPEAKER, isBalloonMode, isImageModel,
} from "@/lib/comic/options";
import { RETENTION_DAYS } from "@/lib/comic/savedIndex";
import { hasDialogue, renameCharacter } from "@/lib/comic/script";
import { defaultBalloon } from "@/lib/comic/balloon";
import type { Balloon } from "@/lib/comic/balloon";
import { BalloonEditor } from "./BalloonEditor";
import type { Script } from "@/lib/comic/script";
import { composePanel, downloadUrl, fileToSheet, layoutPanels, shrinkForUpload, toJpeg } from "@/lib/comic/draw";
import { continueScript, instaText } from "@/lib/comic/extras";
import type { InstaCopy } from "@/lib/comic/extras";
import { saveWork } from "@/lib/comic/gallery";
import { MergeTool } from "./MergeTool";
import type { MergeItem } from "./MergeTool";
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
const empty = <T,>(n: number): (T | null)[] => Array.from({ length: n }, () => null);
const cssRatio = (a: string) => a.replace(":", " / ");
/** 바둑판 저장 이름: 4컷 2x2, 6컷 2x3, 3컷 1x3 */
const gridName = (n: number) => (n === 3 ? "1x3" : n === 6 ? "2x3" : "2x2");

export function Studio({ userId }: { userId: string }) {
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
  // v1.05: 컷 수(3·4·6)·비율 — 대본을 만들 때 정해지고 이어서 만들기에도 그대로 쓴다
  const [panelCount, setPanelCount] = useState<number>(DEFAULT_PANEL_COUNT);
  const [aspect, setAspect] = useState<string>(DEFAULT_ASPECT);
  const [raw, setRaw] = useState<(string | null)[]>(empty<string>(4));
  const [composed, setComposed] = useState<(string | null)[]>(empty<string>(4));
  const [panelErr, setPanelErr] = useState<(string | null)[]>(empty<string>(4));
  const [balloons, setBalloons] = useState<(Balloon | null)[]>(empty<Balloon>(4));
  const [placing, setPlacing] = useState<boolean[]>([false, false, false, false]);
  const [editing, setEditing] = useState<number | null>(null);
  const pending = useRef(new Set<number>());
  // v1.04: 인스타 문구·이어서 만들기·만화 합치기·내 작품
  const [insta, setInsta] = useState<InstaCopy | null>(null);
  const [nextTopic, setNextTopic] = useState("");
  const [ending, setEnding] = useState<"continue" | "end">("continue");
  const [episode, setEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<MergeItem[]>([]);
  const [mergeSeed, setMergeSeed] = useState<MergeItem[] | null>(null);
  const [showMerge, setShowMerge] = useState(false);
  const [savedEpisode, setSavedEpisode] = useState(0);
  // v1.05: 완결 처리·서버 보관함
  const [finished, setFinished] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [retention, setRetention] = useState(30);
  const [serverSavedEpisode, setServerSavedEpisode] = useState(0);
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

  /** 컷 수 n에 맞춰 컷 관련 상태를 비운다 */
  function resetPanels(n: number) {
    setRaw(empty<string>(n)); setComposed(empty<string>(n)); setPanelErr(empty<string>(n));
    setBalloons(empty<Balloon>(n)); setPlacing(Array.from({ length: n }, () => false)); setEditing(null);
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
      const r = await post<{ script: Script }>("/api/script", { kind: "script", genreId, topic, format, panelCount });
      setScript(r.script); setSheets(r.script.characters.map(() => null)); resetPanels(r.script.panels.length);
      setInsta(null); setEpisode(1); setEpisodes([]); setMergeSeed(null); setSavedEpisode(0);
      setFinished(false); setExtraOpen(false); setServerSavedEpisode(0);
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
      description: script.panels[i].description, styleId, model, aspect, sheets: refs.slice(0, 3),
    });
    setRaw((cur) => cur.map((s, k) => (k === i ? imgUrl(r.image) : s)));
    setBalloons((cur) => cur.map((b, k) => (k === i ? null : b))); // 새 그림이면 말풍선 위치도 새로 정한다
    setPanelErr((cur) => cur.map((s, k) => (k === i ? null : s)));
  }
  async function makePanels(only?: number) {
    if (!script) return;
    clearMsg(); setBusy(only === undefined ? "panels" : `panel-${only}`);
    const targets = only === undefined ? script.panels.map((_, i) => i).filter((i) => !raw[i]) : [only];
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

  // ---- 말풍선(AI 자동·직접 배치) ----
  const setBalloonAt = (i: number, b: Balloon | null) => setBalloons((cur) => cur.map((x, k) => (k === i ? b : x)));
  const setPlacingAt = (i: number, v: boolean) => setPlacing((cur) => cur.map((x, k) => (k === i ? v : x)));

  /** 컷 i의 말풍선 위치. AI 방식이면 본인 키로 1회 판단, 실패하면 컷 상단 중앙 기본 위치 */
  const placeBalloon = useCallback(async (i: number, useAi: boolean) => {
    const img = raw[i];
    if (!script || !img || pending.current.has(i)) return;
    const panel = script.panels[i];
    if (!useAi) { setBalloonAt(i, defaultBalloon(panel)); return; }
    pending.current.add(i); setPlacingAt(i, true);
    try {
      const image = await shrinkForUpload(img, 768);
      const r = await post<{ balloon: Balloon; fallback: boolean }>("/api/balloon", { dialogue: panel.dialogue, character: panel.character, image });
      setBalloonAt(i, r.balloon);
      if (r.fallback) setNotice(`${i + 1}컷은 AI가 빈 곳을 찾지 못해 위쪽 가운데에 놓았습니다. [말풍선 편집]으로 옮겨 주세요.`);
    } catch (e) {
      setBalloonAt(i, defaultBalloon(panel));
      if ((e as ApiError).needKey) fail(e, "말풍선을 놓지 못했습니다.");
      else setNotice(`${i + 1}컷 말풍선 자동 배치에 실패해 위쪽 가운데에 놓았습니다. (${e instanceof Error ? e.message : "오류"})`);
    } finally { pending.current.delete(i); setPlacingAt(i, false); }
  }, [raw, script]);

  // 말풍선 방식이면 그림이 생긴(또는 다시 그린) 대사 있는 컷에 말풍선을 자동으로 놓는다
  useEffect(() => {
    if (!script || !isBalloonMode(bubbleId)) return;
    script.panels.forEach((p, i) => {
      if (raw[i] && !balloons[i] && hasDialogue(p)) placeBalloon(i, bubbleId === "ai");
    });
  }, [raw, balloons, script, bubbleId, placeBalloon]);

  // 대사·말풍선 방식·말풍선 위치가 바뀌면 합성 결과를 다시 만든다
  useEffect(() => {
    if (!script) return;
    let alive = true;
    (async () => {
      const out: (string | null)[] = [];
      for (let i = 0; i < script.panels.length; i++) out.push(raw[i] ? await composePanel(raw[i] as string, script.panels[i], bubbleId, balloons[i]).catch(() => raw[i]) : null);
      if (alive) setComposed(out);
    })();
    return () => { alive = false; };
  }, [raw, script, bubbleId, balloons]);

  const count = script?.panels.length ?? panelCount;
  const allDone = composed.length === count && composed.every(Boolean);
  const missing = useMemo(() => raw.filter((r) => !r).length, [raw]);

  async function saveLayout(layout: SaveLayout) {
    try {
      const url = await layoutPanels(composed as string[], layout);
      downloadUrl(url, `4컷만화-${layout}.png`);
    } catch (e) { fail(e, "저장하지 못했습니다."); }
  }
  // ---- v1.04: 내 작품 저장·인스타 문구·이어서 만들기·연재 합치기 ----
  const titleOf = () => (topic.trim() || script?.panels[0]?.dialogue || "4컷 만화").slice(0, 60);
  async function gridJpeg() { return toJpeg(await layoutPanels(composed as string[], "grid")); }

  async function saveToWorks() {
    if (!script) return;
    clearMsg(); setBusy("work");
    try {
      const r = await saveWork(userId, { title: titleOf(), episode, styleId, script, image: await gridJpeg() });
      setSavedEpisode(episode);
      setNotice(`[내 작품]에 저장했습니다(${episode}화).${r.dropped ? ` 20개를 넘어 가장 오래된 작품 ${r.dropped}개를 지웠습니다.` : ""}`);
    } catch (e) { fail(e, "내 작품에 저장하지 못했습니다."); }
    finally { setBusy(""); }
  }

  /** 서버 보관함(선택): 바둑판 JPEG와 대본을 비공개 저장소에 저장해 다른 기기에서도 본다 */
  async function saveToServer() {
    if (!script) return;
    clearMsg(); setBusy("server");
    try {
      const image = (await gridJpeg()).split(",")[1];
      const r = await post<{ id: string; dropped: number }>("/api/saved", {
        image, title: titleOf(), episode, panelCount: count, aspect, styleId, script, retentionDays: retention,
      });
      setServerSavedEpisode(episode);
      setNotice(`서버 보관함에 저장했습니다(${episode}화, ${retention ? `${retention}일 보관` : "직접 지울 때까지"}).${r.dropped ? ` 30개를 넘어 가장 오래된 작품 ${r.dropped}개를 지웠습니다.` : ""}`);
    } catch (e) { fail(e, "서버 보관함에 저장하지 못했습니다."); }
    finally { setBusy(""); }
  }

  async function makeInsta() {
    if (!script) return;
    clearMsg(); setBusy("insta");
    try { setInsta((await post<{ copy: InstaCopy }>("/api/insta", { topic, script })).copy); }
    catch (e) { fail(e, "인스타 문구를 만들지 못했습니다."); }
    finally { setBusy(""); }
  }
  async function copyInsta() {
    if (!insta) return;
    try { await navigator.clipboard.writeText(instaText(insta)); setNotice("인스타 문구를 복사했습니다."); }
    catch { setError("복사하지 못했습니다. 글상자에서 직접 선택해 복사해 주세요."); }
  }

  /** 같은 등장인물·캐릭터 그림으로 다음 화 대본을 만든다. 지금 화의 바둑판 이미지는 연재 합치기용으로 보관 */
  async function makeNextEpisode() {
    if (!script) return;
    clearMsg(); setBusy("followup");
    try {
      const r = await post<{ script: Script }>("/api/script", { kind: "followup", genreId, topic, script, nextTopic, ending });
      const current = await gridJpeg();
      setEpisodes((cur) => [...cur, { name: `${episode}화`, url: current }]);
      setScript(continueScript(script, r.script));
      resetPanels(script.panels.length); setInsta(null); setMergeSeed(null); setNextTopic("");
      setFinished(ending === "end"); setExtraOpen(false);
      setEpisode((n) => n + 1);
      setNotice(`${episode + 1}화${ending === "end" ? "(완결)" : ""} 대본을 만들었습니다. 등장인물과 캐릭터 그림은 그대로 다시 씁니다.`);
      setEnding("continue");
      setStep(2);
    } catch (e) { fail(e, "다음 화 대본을 만들지 못했습니다."); }
    finally { setBusy(""); }
  }

  async function prepareSeriesMerge() {
    clearMsg(); setBusy("merge");
    try { setMergeSeed([...episodes, { name: `${episode}화`, url: await gridJpeg() }]); }
    catch (e) { fail(e, "합칠 이미지를 준비하지 못했습니다."); }
    finally { setBusy(""); }
  }

  function saveEach() {
    (composed as string[]).forEach((u, i) => setTimeout(() => downloadUrl(u, `만화-${i + 1}컷.png`), i * 250));
  }

  function restart() {
    setStep(1); setScript(null); setSheets([]); resetPanels(panelCount); clearMsg();
    setInsta(null); setEpisode(1); setEpisodes([]); setMergeSeed(null); setSavedEpisode(0); setNextTopic("");
    setFinished(false); setExtraOpen(false); setServerSavedEpisode(0); setEnding("continue");
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
          <div className="cc-two">
            <div>
              <b className="cc-label">컷 수</b>
              <div className="chips">
                {PANEL_COUNTS.map((n) => <button key={n} type="button" className={`chip${panelCount === n ? " on" : ""}`} aria-pressed={panelCount === n} onClick={() => setPanelCount(n)}>{n}컷</button>)}
              </div>
              <small className="muted">컷이 많을수록 그림 생성 횟수(본인 키 사용량)도 늘어납니다.</small>
            </div>
            <div>
              <b className="cc-label">컷 비율</b>
              <div className="chips">
                {ASPECTS.map((a) => <button key={a.id} type="button" className={`chip${aspect === a.id ? " on" : ""}`} aria-pressed={aspect === a.id} onClick={() => setAspect(a.id)}>{a.name}</button>)}
              </div>
              <small className="muted">{ASPECTS.find((a) => a.id === aspect)?.hint}</small>
            </div>
          </div>
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
            <button type="button" onClick={() => setShowMerge((v) => !v)} aria-expanded={showMerge}><Layers size={15} />만화 합치기</button>
          </div>
          {showMerge && <MergeTool />}
          <small className="muted">대본·그림 생성은 등록한 본인 Gemini 키 사용량으로 계산됩니다. 결과는 서버에 저장되지 않고 이 화면에만 있으니 저장 전에 새로고침하지 마세요.</small>
        </section>
      )}

      {step === 2 && script && (
        <section className="card cc-form">
          {episode > 1 && <p className="notice">{episode}화 — 이전 화와 같은 등장인물·캐릭터 그림을 씁니다. 대본을 확인하고 [캐릭터 생성하고 계속하기]를 누르면 그림 생성 없이 바로 넘어갑니다.</p>}
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
          <p className="muted">캐릭터 그림은 모든 컷에 참고 이미지로 들어가 같은 인물이 같은 모습으로 나오게 해 줍니다. 마음에 들 때까지 다듬어 주세요.</p>
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
          <h2 className="cc-h">만화 생성{episode > 1 ? ` — ${episode}화` : ""}{finished ? " (완결)" : ""}</h2>
          <small className="muted">{count}컷 · 비율 {aspect} — 컷 수와 비율은 1단계에서 정하며 이어서 만들기에도 그대로 쓰입니다.</small>
          <div className="actions">
            <button type="button" className="primary" onClick={() => makePanels()} disabled={!!busy || missing === 0}>
              {busy === "panels" ? "그리는 중..." : missing === count ? "모든 이미지 한번에 생성" : missing === 0 ? "모든 컷 완성" : "남은 이미지 생성"}
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
            {script.panels.map((_, i) => (
              <figure key={i} className="cc-cut">
                {composed[i]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={composed[i] as string} alt={`${i + 1}컷`} style={{ aspectRatio: cssRatio(aspect) }} />
                  : <div className="cc-placeholder" style={{ aspectRatio: cssRatio(aspect) }}>{busy === "panels" || busy === `panel-${i}` ? "그리는 중..." : panelErr[i] ? "실패" : `${i + 1}컷`}</div>}
                {panelErr[i] && <small className="error" role="alert">{panelErr[i]}</small>}
                {placing[i] && <small className="muted" role="status">AI가 말풍선 자리를 찾는 중...</small>}
                <div className="actions">
                  <button type="button" onClick={() => makePanels(i)} disabled={!!busy}><RefreshCw size={14} />{raw[i] ? "다시 그리기" : panelErr[i] ? "다시 시도" : "이 컷 그리기"}</button>
                  {isBalloonMode(bubbleId) && raw[i] && balloons[i] && hasDialogue(script.panels[i]) && (
                    <button type="button" className={editing === i ? "on" : ""} onClick={() => setEditing(editing === i ? null : i)} aria-expanded={editing === i}>
                      <MessageSquare size={14} />말풍선 편집
                    </button>
                  )}
                </div>
              </figure>
            ))}
          </div>
          {editing !== null && isBalloonMode(bubbleId) && raw[editing] && balloons[editing] && (
            <BalloonEditor
              key={editing}
              index={editing}
              image={raw[editing] as string}
              ratio={cssRatio(aspect)}
              text={script.panels[editing].dialogue.trim()}
              balloon={balloons[editing] as Balloon}
              busy={placing[editing]}
              onCommit={(b) => setBalloonAt(editing, b)}
              onReset={() => setBalloonAt(editing, defaultBalloon(script.panels[editing]))}
              onRelayout={bubbleId === "ai" ? () => placeBalloon(editing, true) : undefined}
              onClose={() => setEditing(null)}
            />
          )}
          {allDone && (
            <div className="cc-save">
              <b className="cc-label">저장하기</b>
              <div className="actions">
                <button type="button" className="primary" onClick={() => saveLayout("grid")}><Download size={14} />바둑판({gridName(count)})</button>
                <button type="button" onClick={() => saveLayout("horizontal")}><Download size={14} />가로 연속</button>
                <button type="button" onClick={() => saveLayout("vertical")}><Download size={14} />세로 연속</button>
                <button type="button" onClick={saveEach}><Download size={14} />개별 파일 {count}장</button>
                <button type="button" onClick={saveToWorks} disabled={!!busy || savedEpisode === episode}><BookmarkPlus size={14} />{busy === "work" ? "저장 중..." : savedEpisode === episode ? "내 작품에 저장됨" : "내 작품에 저장"}</button>
              </div>
              <small className="muted">개별 파일은 브라우저가 여러 파일 다운로드 허용을 물으면 허용해 주세요. [내 작품]은 이 브라우저에만 최근 20개까지 보관됩니다.</small>
              <div className="actions">
                <button type="button" onClick={saveToServer} disabled={!!busy || serverSavedEpisode === episode}><CloudUpload size={14} />{busy === "server" ? "올리는 중..." : serverSavedEpisode === episode ? "서버 보관함에 저장됨" : "서버 보관함에 저장"}</button>
                <label className="cc-inline">보관 기간
                  <select value={retention} onChange={(e) => setRetention(Number(e.target.value))}>
                    {RETENTION_DAYS.map((d) => <option key={d} value={d}>{d ? `${d}일` : "직접 지울 때까지"}</option>)}
                  </select>
                </label>
              </div>
              <small className="muted">서버 보관함은 선택 기능입니다. 누른 작품만 비공개로 저장되어 다른 기기·브라우저의 [내 작품]에서도 볼 수 있습니다(회원당 최대 30개, 기간이 지나면 자동 삭제).</small>
            </div>
          )}
          {allDone && (
            <div className="cc-save">
              <b className="cc-label">인스타 게시 문구</b>
              <div className="actions">
                <button type="button" onClick={makeInsta} disabled={!!busy}><Sparkles size={14} />{busy === "insta" ? "문구 만드는 중..." : insta ? "다시 만들기" : "인스타 문구 만들기"}</button>
                {insta && <button type="button" onClick={copyInsta}><Copy size={14} />복사</button>}
              </div>
              {insta && <textarea className="cc-insta" readOnly rows={7} value={instaText(insta)} aria-label="인스타 게시 문구" />}
            </div>
          )}
          {allDone && finished && (
            <div className="cc-save cc-finished">
              <b className="cc-label">완결</b>
              <p>이 이야기는 <b>{episode}화로 완결</b>되었습니다. 지금 화를 저장하고, 새 이야기를 시작하거나 연재 전체를 한 장으로 합쳐 보세요.</p>
              <div className="actions">
                {episodes.length > 0 && <button type="button" className="primary" onClick={prepareSeriesMerge} disabled={!!busy}><Layers size={14} />{busy === "merge" ? "준비 중..." : `1~${episode}화 세로로 합치기`}</button>}
                <button type="button" onClick={restart}><Sparkles size={14} />새 이야기 시작하기</button>
                <button type="button" onClick={() => setExtraOpen((v) => !v)} aria-expanded={extraOpen}>그래도 이어서 만들기(번외편)</button>
              </div>
              {mergeSeed && !extraOpen && <MergeTool key={mergeSeed.length} seed={mergeSeed} title="연재 합치기" />}
            </div>
          )}
          {allDone && (!finished || extraOpen) && (
            <div className="cc-save">
              <b className="cc-label">{finished ? `번외편 만들기 (${episode + 1}화)` : `이어서 만들기 (${episode + 1}화)`}</b>
              <label>다음 화 주제 (비우면 AI가 이야기를 이어서 정합니다)
                <textarea rows={2} value={nextTopic} maxLength={2000} onChange={(e) => setNextTopic(e.target.value)} placeholder="예: 다음 날 팀장이 커피를 두 잔 사 온다" />
              </label>
              <div className="chips">
                <button type="button" className={`chip${ending === "continue" ? " on" : ""}`} onClick={() => setEnding("continue")}>계속 (다음 화가 궁금하게)</button>
                <button type="button" className={`chip${ending === "end" ? " on" : ""}`} onClick={() => setEnding("end")}>완결 (다음 화로 마무리)</button>
              </div>
              <small className="muted">{ending === "end" ? `${episode + 1}화가 마지막 화가 됩니다. 다 만들면 이어서 만들기 대신 저장·새 이야기 시작을 안내합니다.` : `${episode + 1}화는 다음 화가 궁금하게 끝납니다.`}</small>
              <div className="actions">
                <button type="button" className="primary" onClick={makeNextEpisode} disabled={!!busy}><Sparkles size={14} />{busy === "followup" ? "다음 화 대본 만드는 중..." : `${episode + 1}화${ending === "end" ? "(완결)" : ""} 대본 만들기`}</button>
                {episodes.length > 0 && <button type="button" onClick={prepareSeriesMerge} disabled={!!busy}><Layers size={14} />{busy === "merge" ? "준비 중..." : `1~${episode}화 세로로 합치기`}</button>}
              </div>
              <small className="muted">지금 화는 다음 화로 넘어갈 때 연재 합치기용으로 이 화면에만 보관됩니다. 남기려면 먼저 [내 작품에 저장]을 눌러 주세요.</small>
              {mergeSeed && <MergeTool key={mergeSeed.length} seed={mergeSeed} title="연재 합치기" />}
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
