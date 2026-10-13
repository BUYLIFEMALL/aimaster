/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Component, Download, FileJson, FileText, FolderOpen, Group, HelpCircle, ImagePlus, Layers, Moon, Redo2, Sun, Ungroup, Undo2, X,
} from "lucide-react";
import type { CanvasComponent, CanvasSize, ComponentType, DesignSpec, ProjectDoc } from "@/lib/canvas/types";
import { CANVAS_PRESETS } from "@/lib/canvas/types";
import { PRESETS } from "@/lib/canvas/constants";
import {
  applyPreset, buildComponentsJson, buildDesignSpecJson, clampToCanvas, deleteComponents, duplicateComponent, groupComponents,
  makeComponent, marqueeSelect, moveLayer, parseImportedJson, topLevelId, ungroupComponents, type LayerMove,
} from "@/lib/canvas/model";
import { useHistory } from "@/lib/canvas/useHistory";
import { ComponentView } from "./ComponentView";
import { ContextMenu, LayersPanel, PropertiesPanel, Toolbox } from "./Panels";

interface Props { projectId: string; initialName: string; initialDoc: ProjectDoc; initialUpdatedAt: string }
type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 이미지를 AI에 보내기 좋은 크기(긴 변 1600px, JPEG)로 줄인다 */
async function prepareImage(file: File): Promise<{ data: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리할 수 없습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { data: url.split(",")[1] ?? "", mimeType: "image/jpeg" };
}

export function Editor({ projectId, initialName, initialDoc, initialUpdatedAt }: Props) {
  const history = useHistory<CanvasComponent[]>(initialDoc.components);
  const components = history.value;
  const [spec, setSpec] = useState<DesignSpec>(initialDoc.spec);
  const [canvas, setCanvas] = useState<CanvasSize>(initialDoc.canvas);
  const [dark, setDark] = useState(initialDoc.dark);
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<string[]>([]);
  const [tool, setTool] = useState<ComponentType | null>(null);
  const [leftTab, setLeftTab] = useState<"tools" | "layers">("tools");
  const [zoom, setZoom] = useState(1);
  const [draw, setDraw] = useState<{ sx: number; sy: number; ex: number; ey: number; mode: "draw" | "marquee" } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [aiBusy, setAiBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const [help, setHelp] = useState(false);
  const [pendingAi, setPendingAi] = useState<{ spec: DesignSpec; components: CanvasComponent[] } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const textEl = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<{ sx: number; sy: number; ex: number; ey: number; mode: "draw" | "marquee" } | null>(null);
  const updatedAtRef = useRef(initialUpdatedAt);
  const dirtyRef = useRef(false);
  const gesture = useRef<null | { kind: "move"; startX: number; startY: number; ids: string[]; origin: Record<string, { x: number; y: number }>; moved: boolean }
    | { kind: "resize"; id: string; startX: number; startY: number; w: number; h: number; moved: boolean }>(null);

  const say = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setToast({ text, kind });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.kind === "error" ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const byId = useMemo(() => new Map(components.map((c) => [c.id, c])), [components]);
  const selectedComp = selected.length ? byId.get(selected[selected.length - 1]) ?? null : null;
  const singleSelected = selected.length === 1 ? byId.get(selected[0]) ?? null : null;

  // ---------- 저장 ----------
  const markDirty = useCallback(() => { dirtyRef.current = true; setSaveState((s) => (s === "saving" ? s : "dirty")); }, []);
  const docNow = useMemo<ProjectDoc>(() => ({ components, spec, canvas, dark }), [components, spec, canvas, dark]);
  const docRef = useRef(docNow);
  docRef.current = docNow;
  const nameRef = useRef(name);
  nameRef.current = name;

  const saveNow = useCallback(async () => {
    if (!dirtyRef.current) return true;
    setSaveState("saving");
    dirtyRef.current = false;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameRef.current, doc: docRef.current, expectedUpdatedAt: updatedAtRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) { setSaveState("conflict"); say(data.error ?? "다른 창에서 먼저 저장되었습니다.", "error"); dirtyRef.current = true; return false; }
      if (!res.ok) { dirtyRef.current = true; setSaveState("error"); say(data.error ?? "저장하지 못했습니다.", "error"); return false; }
      updatedAtRef.current = data.project.updated_at;
      setSaveState(dirtyRef.current ? "dirty" : "saved");
      return true;
    } catch {
      dirtyRef.current = true;
      setSaveState("error");
      say("네트워크 오류로 저장하지 못했습니다. 연결을 확인하면 자동으로 다시 시도합니다.", "error");
      return false;
    }
  }, [projectId, say]);

  useEffect(() => {
    if (saveState !== "dirty" && saveState !== "error") return;
    const t = setTimeout(() => { void saveNow(); }, saveState === "error" ? 8000 : 1500);
    return () => clearTimeout(t);
  }, [saveState, components, spec, canvas, dark, name, saveNow]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // ---------- 컴포넌트 변경 ----------
  const change = useCallback((fn: (prev: CanvasComponent[]) => CanvasComponent[], replace = false) => {
    history.set(fn, replace);
    markDirty();
  }, [history, markDirty]);

  const patch = useCallback((id: string, fn: (c: CanvasComponent) => CanvasComponent, replace = false) => {
    change((prev) => prev.map((c) => (c.id === id ? fn(c) : c)), replace);
  }, [change]);

  const removeIds = useCallback((ids: string[]) => {
    change((prev) => deleteComponents(prev, ids));
    setSelected((s) => s.filter((x) => !ids.includes(x)));
  }, [change]);

  const duplicate = useCallback((id: string) => {
    const r = duplicateComponent(components, id);
    if (!r.newId) return;
    change(() => r.components);
    setSelected([r.newId]);
  }, [components, change]);

  const group = useCallback(() => {
    const r = groupComponents(components, selected);
    if (!r.ok) { say(r.error, "error"); return; }
    change(() => r.components);
    setSelected([r.groupId]);
  }, [components, selected, change, say]);

  const ungroup = useCallback(() => {
    if (!singleSelected) return;
    const r = ungroupComponents(components, singleSelected.id);
    if (!r) return;
    change(() => r.components);
    setSelected(r.childIds);
  }, [components, singleSelected, change]);

  const moveLayerOf = useCallback((id: string, dir: LayerMove) => change((prev) => moveLayer(prev, id, dir)), [change]);

  const toggleLock = useCallback((id: string) => patch(id, (c) => ({ ...c, isLocked: !c.isLocked })), [patch]);

  const applyPresetByName = useCallback((id: string, presetName: string) => {
    const c = byId.get(id);
    const preset = c && PRESETS[c.type]?.find((p) => p.name === presetName);
    if (!c || !preset) return;
    patch(id, (x) => applyPreset(x, preset));
  }, [byId, patch]);

  // ---------- 단축키 ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) history.redo(); else history.undo();
        markDirty();
        return;
      }
      if (mod && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); history.redo(); markDirty(); return; }
      if (typing) return;
      if (e.key === "Escape") { setTool(null); setMenu(null); setSelected([]); return; }
      const last = selected[selected.length - 1];
      if (!last) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeIds(selected.filter((id) => !byId.get(id)?.parentId)); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(last); return; }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroup(); else if (selected.length > 1) group();
        return;
      }
      if (e.key.startsWith("Arrow") && selected.length >= 1) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (!e.repeat) history.checkpoint();
        change((prev) => prev.map((c) => (selected.includes(c.id) && !c.parentId && !c.isLocked ? { ...c, position: { x: c.position.x + dx, y: c.position.y + dy } } : c)), true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, byId, history, change, removeIds, duplicate, group, ungroup, markDirty]);

  // ---------- 스테이지 마우스 ----------
  const toStage = useCallback((e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  }, [zoom]);

  const startDraw = (d: { sx: number; sy: number; ex: number; ey: number; mode: "draw" | "marquee" }) => {
    drawRef.current = d;
    setDraw(d);
  };

  const onStageDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setMenu(null);
    const target = e.target as HTMLElement;
    if (target.closest("[data-nodrag]")) return;
    const handle = target.closest("[data-resize]") as HTMLElement | null;
    const { x, y } = toStage(e);
    const holder = target.closest("[data-cid]") as HTMLElement | null;

    if (tool) {
      startDraw({ sx: x, sy: y, ex: x, ey: y, mode: "draw" });
      return;
    }
    if (handle) {
      const id = handle.dataset.resize!;
      const c = byId.get(id);
      if (c) {
        history.checkpoint();
        gesture.current = { kind: "resize", id, startX: e.clientX, startY: e.clientY, w: c.size.width, h: c.size.height, moved: false };
      }
      e.preventDefault();
      return;
    }
    if (holder) {
      const rawId = holder.dataset.cid!;
      const tid = topLevelId(rawId, components);
      const c = byId.get(tid);
      if (!c) return;
      if (c.type === "Container" && c.isLocked) {
        startDraw({ sx: x, sy: y, ex: x, ey: y, mode: "marquee" });
        setSelected([]);
        return;
      }
      if (editingId === tid) return;
      let ids = selected;
      if (e.shiftKey) ids = selected.includes(tid) ? selected.filter((s) => s !== tid) : [...selected, tid];
      else if (!selected.includes(tid)) ids = [tid];
      setSelected(ids);
      const moving = ids.filter((id) => byId.get(id) && !byId.get(id)!.isLocked);
      if (moving.length && ids.includes(tid)) {
        history.checkpoint();
        const origin: Record<string, { x: number; y: number }> = {};
        moving.forEach((id) => { origin[id] = { ...byId.get(id)!.position }; });
        gesture.current = { kind: "move", startX: e.clientX, startY: e.clientY, ids: moving, origin, moved: false };
      }
      return;
    }
    setSelected([]);
    setEditingId(null);
    startDraw({ sx: x, sy: y, ex: x, ey: y, mode: "marquee" });
  };

  // 마우스 이동/놓기 리스너는 한 번만 등록하고 최신 값은 ref로 읽는다(빠른 드래그에서도 놓침 방지)
  const live = useRef({ tool, components, zoom, change });
  live.current = { tool, components, zoom, change };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const { zoom: z, change: ch } = live.current;
      const g = gesture.current;
      if (g?.kind === "move") {
        const dx = (e.clientX - g.startX) / z;
        const dy = (e.clientY - g.startY) / z;
        if (!g.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
        g.moved = true;
        ch((prev) => prev.map((c) => (g.origin[c.id] ? { ...c, position: { x: Math.round(g.origin[c.id].x + dx), y: Math.round(g.origin[c.id].y + dy) } } : c)), true);
      } else if (g?.kind === "resize") {
        const w = Math.max(10, Math.round(g.w + (e.clientX - g.startX) / z));
        const h = Math.max(10, Math.round(g.h + (e.clientY - g.startY) / z));
        g.moved = true;
        ch((prev) => prev.map((c) => (c.id === g.id ? { ...c, size: { width: w, height: h } } : c)), true);
      } else if (drawRef.current) {
        const r = stageRef.current?.getBoundingClientRect();
        if (r) {
          drawRef.current = { ...drawRef.current, ex: (e.clientX - r.left) / z, ey: (e.clientY - r.top) / z };
          setDraw(drawRef.current);
        }
      }
    };
    const up = (e: MouseEvent) => {
      if (gesture.current) { gesture.current = null; return; }
      const d0 = drawRef.current;
      if (!d0) return;
      drawRef.current = null;
      // 놓은 위치를 최종 끝점으로 쓴다(이동 이벤트 없이 곧바로 놓는 경우 대비)
      const sr = stageRef.current?.getBoundingClientRect();
      const z0 = live.current.zoom;
      const d = sr ? { ...d0, ex: (e.clientX - sr.left) / z0, ey: (e.clientY - sr.top) / z0 } : d0;
      const { tool: t, components: comps, change: ch } = live.current;
      const rect = { x: Math.min(d.sx, d.ex), y: Math.min(d.sy, d.ey), width: Math.abs(d.sx - d.ex), height: Math.abs(d.sy - d.ey) };
      if (d.mode === "draw" && t) {
        if (rect.width > 5 && rect.height > 5) {
          const comp = makeComponent(t, { x: rect.x, y: rect.y }, { width: rect.width, height: rect.height }, comps);
          ch((prev) => [...prev, comp]);
          setSelected([comp.id]);
        }
        setTool(null);
      } else if (d.mode === "marquee" && (rect.width > 5 || rect.height > 5)) {
        setSelected(marqueeSelect(comps, rect));
      }
      setDraw(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const onContext = (e: React.MouseEvent) => {
    const holder = (e.target as HTMLElement).closest("[data-cid]") as HTMLElement | null;
    if (!holder) return;
    e.preventDefault();
    const tid = topLevelId(holder.dataset.cid!, components);
    if (!selected.includes(tid)) setSelected([tid]);
    const r = scrollRef.current!.getBoundingClientRect();
    setMenu({ x: e.clientX - r.left + scrollRef.current!.scrollLeft, y: e.clientY - r.top + scrollRef.current!.scrollTop, id: tid });
  };

  const onDouble = (e: React.MouseEvent) => {
    const holder = (e.target as HTMLElement).closest("[data-cid]") as HTMLElement | null;
    if (!holder) return;
    const c = byId.get(holder.dataset.cid!);
    if (c?.type === "Text" && !c.isLocked) {
      setEditingId(c.id);
      setTimeout(() => {
        const el = textEl.current;
        if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
      }, 0);
    }
  };

  // ---------- 내보내기 / 불러오기 ----------
  const safeName = (suffix: string) => `${(name || "design").replace(/[\\/:*?"<>|]/g, "_")}${suffix}`;

  const exportPng = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    const prevSel = selected, prevZoom = zoom;
    setSelected([]); setEditingId(null); setZoom(1);
    await new Promise((r) => setTimeout(r, 120));
    try {
      const html2canvas = (await import("html2canvas")).default;
      const shot = await html2canvas(stage, { backgroundColor: dark ? "#0f172a" : "#ffffff", useCORS: true, scale: 1 });
      const blob: Blob | null = await new Promise((res) => shot.toBlob(res, "image/png"));
      if (!blob) throw new Error("이미지 생성 실패");
      download(safeName(".png"), blob);
      say("이미지(PNG)로 저장했습니다.");
    } catch {
      say("이미지로 저장하지 못했습니다. 외부 이미지 주소(CORS) 때문일 수 있습니다.", "error");
    } finally {
      setZoom(prevZoom); setSelected(prevSel);
    }
  };

  const exportComponents = () => { download(safeName("-components.json"), new Blob([buildComponentsJson(components)], { type: "application/json" })); say("컴포넌트 JSON을 저장했습니다."); };
  const exportSpec = () => {
    if (!spec.appName.trim() || !spec.appDescription.trim()) { say("디자인 명세 JSON을 저장하려면 우측 [명세]에서 애플리케이션 이름과 설명을 입력해 주세요.", "error"); return; }
    download(safeName("-design-spec.json"), new Blob([buildDesignSpecJson(spec, components)], { type: "application/json" }));
    say("디자인 명세 JSON을 저장했습니다.");
  };

  const onJsonFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    try {
      const texts = await Promise.all(Array.from(files).map((f) => f.text()));
      const r = parseImportedJson(texts);
      if (components.length > 0 && !window.confirm("현재 캔버스의 내용을 불러온 파일로 바꿉니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다. 계속할까요?")) return;
      change(() => clampToCanvas(r.components, canvas));
      if (r.spec) setSpec(r.spec);
      setSelected([]);
      say(`파일 ${files.length}개를 불러왔습니다. (컴포넌트 ${r.components.length}개)`);
    } catch (e) {
      say(e instanceof Error && e.message.includes("지원하지") ? e.message : "파일을 읽지 못했습니다. 이 프로그램에서 저장한 JSON 파일인지 확인해 주세요.", "error");
    } finally {
      if (jsonInput.current) jsonInput.current.value = "";
    }
  };

  // ---------- AI ----------
  const aiFill = async () => {
    if (!components.length) { say("AI 제안을 받으려면 캔버스에 컴포넌트를 하나 이상 추가해 주세요.", "error"); return; }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/spec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ components }) });
      const data = await res.json().catch(() => ({}));
      if (data.needKey) { setNeedKey(true); return; }
      if (!res.ok) { say(data.error ?? "AI 제안을 받지 못했습니다.", "error"); return; }
      setSpec(data.spec);
      markDirty();
      say("AI가 명세를 채웠습니다. 내용을 확인하고 필요하면 고쳐 주세요.");
    } catch {
      say("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setAiBusy(false);
    }
  };

  const onImageFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { say("PNG, JPG, WEBP 이미지만 사용할 수 있습니다.", "error"); return; }
      if (file.size > MAX_IMAGE_BYTES) { say("이미지가 너무 큽니다. 12MB 이하의 이미지를 사용해 주세요.", "error"); return; }
      setImageBusy(true);
      const img = await prepareImage(file);
      const res = await fetch("/api/ai/from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: img.data, mimeType: img.mimeType, canvas }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.needKey) { setNeedKey(true); return; }
      if (!res.ok) { say(data.error ?? "이미지를 분석하지 못했습니다.", "error"); return; }
      setPendingAi({ spec: data.spec, components: data.components });
    } catch {
      say("이미지를 처리하지 못했습니다. 다른 이미지로 다시 시도해 주세요.", "error");
    } finally {
      setImageBusy(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const acceptAi = () => {
    if (!pendingAi) return;
    change(() => pendingAi.components);
    setSpec(pendingAi.spec);
    setSelected([]);
    say(`이미지에서 컴포넌트 ${pendingAi.components.length}개와 디자인 명세를 만들었습니다. 실행 취소로 이전 상태로 되돌릴 수 있습니다.`);
    setPendingAi(null);
  };

  // ---------- 화면 ----------
  const topLevel = components.filter((c) => !c.parentId);
  const canvasLabel = CANVAS_PRESETS.find((p) => p.size.width === canvas.width && p.size.height === canvas.height)?.label ?? "사용자 지정";
  const statusText = { saved: "저장됨", dirty: "저장 대기", saving: "저장 중…", error: "저장 실패 · 다시 시도합니다", conflict: "다른 창에서 먼저 저장됨" }[saveState];

  return (
    <div className="uc-editor">
      <header className="uc-top">
        <Link href="/dashboard" className="uc-back" title="프로젝트 목록" onClick={(e) => { if (dirtyRef.current) { e.preventDefault(); void saveNow().then((ok) => { if (ok) window.location.assign("/dashboard"); }); } }}><ArrowLeft size={16} />목록</Link>
        <input className="uc-name" value={name} maxLength={80} aria-label="프로젝트 이름" onChange={(e) => { setName(e.target.value); markDirty(); }} />
        <span className={`uc-save ${saveState}`} aria-live="polite">{statusText}</span>
        <span className="uc-spacer" />
        <button type="button" title="실행 취소 (Ctrl+Z)" disabled={!history.canUndo} onClick={() => { history.undo(); markDirty(); }}><Undo2 size={15} /></button>
        <button type="button" title="다시 실행 (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={() => { history.redo(); markDirty(); }}><Redo2 size={15} /></button>
        <button type="button" disabled={imageBusy} onClick={() => imageInput.current?.click()} title="UI 스크린샷에서 컴포넌트를 AI로 만듭니다"><ImagePlus size={15} />이미지로 만들기</button>
        <button type="button" onClick={() => jsonInput.current?.click()} title="저장한 JSON 불러오기"><FolderOpen size={15} />불러오기</button>
        <button type="button" onClick={exportComponents}><FileJson size={15} />컴포넌트 JSON</button>
        <button type="button" onClick={exportSpec}><FileText size={15} />명세 JSON</button>
        <button type="button" className="primary" onClick={exportPng}><Download size={15} />이미지로 저장</button>
        <button type="button" title="도움말" onClick={() => setHelp(true)}><HelpCircle size={15} /></button>
        <input ref={jsonInput} type="file" accept=".json,application/json" multiple hidden onChange={(e) => onJsonFiles(e.target.files)} />
        <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onImageFile(e.target.files?.[0])} />
      </header>

      <div className="uc-body">
        <aside className="uc-left" aria-label="컴포넌트·레이어">
          <div className="uc-tabs">
            <button type="button" aria-pressed={leftTab === "tools"} onClick={() => setLeftTab("tools")}><Component size={15} />컴포넌트</button>
            <button type="button" aria-pressed={leftTab === "layers"} onClick={() => setLeftTab("layers")}><Layers size={15} />레이어 ({components.length})</button>
          </div>
          <div className="uc-left-body">
            {leftTab === "tools" ? (
              <Toolbox active={tool} onPick={setTool} />
            ) : (
              <LayersPanel
                components={components}
                selectedIds={selected}
                onSelect={(id, add) => setSelected((s) => (add ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]))}
                onMove={moveLayerOf}
                onDelete={(id) => removeIds([id])}
              />
            )}
          </div>
        </aside>

        <main className="uc-center">
          <div className="uc-bar">
            <label>캔버스
              <select value={canvasLabel} onChange={(e) => {
                const p = CANVAS_PRESETS.find((x) => x.label === e.target.value);
                if (p) { setCanvas(p.size); markDirty(); }
              }}>
                {canvasLabel === "사용자 지정" && <option>사용자 지정</option>}
                {CANVAS_PRESETS.map((p) => <option key={p.label}>{p.label}</option>)}
              </select>
            </label>
            <label>배율
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                {[0.5, 0.75, 1, 1.25].map((z) => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
              </select>
            </label>
            <button type="button" aria-pressed={dark} onClick={() => { setDark((v) => !v); markDirty(); }} title="캔버스 배경 밝기">{dark ? <Moon size={14} /> : <Sun size={14} />}{dark ? "어두운 배경" : "밝은 배경"}</button>
            <button type="button" disabled={selected.length < 2} onClick={group}><Group size={14} />그룹 (Ctrl+G)</button>
            <button type="button" disabled={singleSelected?.type !== "Group"} onClick={ungroup}><Ungroup size={14} />그룹 해제</button>
            {tool && <span className="uc-tool-hint">캔버스에서 드래그해 “{tool}” 만들기 · Esc로 취소</span>}
          </div>
          <div className="uc-scroll" ref={scrollRef} style={{ position: "relative" }}>
            <div style={{ width: canvas.width * zoom, height: canvas.height * zoom }}>
              <div
                ref={stageRef}
                className={`uc-stage ${dark ? "dark" : ""} ${tool ? "drawing" : ""}`}
                style={{ width: canvas.width, height: canvas.height, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
                onMouseDown={onStageDown}
                onContextMenu={onContext}
                onDoubleClick={onDouble}
              >
                {topLevel.map((c) => {
                  const isSel = selected.includes(c.id);
                  const editing = editingId === c.id;
                  return (
                    <div
                      key={c.id}
                      data-cid={c.id}
                      className={`uc-item ${isSel ? "sel" : ""} ${c.isLocked ? "locked" : ""}`}
                      style={{
                        left: c.position.x, top: c.position.y, width: c.size.width, height: c.size.height,
                        pointerEvents: c.isLocked && c.type === "Container" && tool ? "none" : undefined,
                      }}
                    >
                      <ComponentView
                        component={c}
                        all={components}
                        selectedIds={selected}
                        editing={editing}
                        textRef={editing ? (el) => { textEl.current = el; } : undefined}
                        onTextBlur={(id, text) => { patch(id, (x) => ({ ...x, props: { ...x.props, text } })); setEditingId(null); }}
                        onProps={(id, props) => patch(id, (x) => ({ ...x, props: { ...x.props, ...props } }))}
                      />
                      {isSel && !c.isLocked && selected.length === 1 && (
                        <>
                          {c.description && <span className="uc-desc" title={c.description}>i</span>}
                          <span className="uc-handle" data-resize={c.id} />
                        </>
                      )}
                    </div>
                  );
                })}
                {components.length === 0 && !draw && (
                  <div className="uc-empty-hint"><b>여기가 작업판입니다</b>왼쪽에서 컴포넌트(예: 버튼)를 고른 뒤<br />이 판 위에서 마우스를 끌어 보세요.<br /><span>또는 위쪽 [이미지로 만들기]로 화면 캡처에서 자동 생성</span></div>
                )}
                {draw?.mode === "draw" && (
                  <div className="uc-draw" style={{ left: Math.min(draw.sx, draw.ex), top: Math.min(draw.sy, draw.ey), width: Math.abs(draw.sx - draw.ex), height: Math.abs(draw.sy - draw.ey) }} />
                )}
                {draw?.mode === "marquee" && (
                  <div className="uc-marquee" style={{ left: Math.min(draw.sx, draw.ex), top: Math.min(draw.sy, draw.ey), width: Math.abs(draw.sx - draw.ex), height: Math.abs(draw.sy - draw.ey) }} />
                )}
              </div>
            </div>
            {menu && byId.get(menu.id) && (
              <ContextMenu
                x={menu.x} y={menu.y} component={byId.get(menu.id)!}
                canGroup={selected.length > 1} canUngroup={byId.get(menu.id)!.type === "Group"}
                onMove={(d) => moveLayerOf(menu.id, d)} onDuplicate={() => duplicate(menu.id)} onDelete={() => removeIds(selected.length > 1 ? selected : [menu.id])}
                onGroup={group} onUngroup={ungroup} onToggleLock={() => toggleLock(menu.id)} onClose={() => setMenu(null)}
              />
            )}
          </div>
        </main>

        <PropertiesPanel
          component={selected.length === 1 ? selectedComp : selected.length > 1 ? null : null}
          spec={spec}
          onSpec={(s) => { setSpec(s); markDirty(); }}
          onAiFill={aiFill}
          aiBusy={aiBusy}
          onProps={(id, props) => patch(id, (c) => ({ ...c, props: { ...c.props, ...props } }))}
          onStyles={(id, styles) => patch(id, (c) => ({ ...c, styles: { ...c.styles, ...styles } }))}
          onMeta={(id, meta) => patch(id, (c) => ({ ...c, ...meta }))}
          onSize={(id, size) => patch(id, (c) => ({ ...c, size }))}
          onPosition={(id, position) => patch(id, (c) => ({ ...c, position }))}
          onPreset={applyPresetByName}
          onDuplicate={() => selectedComp && duplicate(selectedComp.id)}
          onDelete={() => selectedComp && removeIds([selectedComp.id])}
          onToggleLock={() => selectedComp && toggleLock(selectedComp.id)}
        />
      </div>

      {(imageBusy || aiBusy) && (
        <div className="uc-overlay" role="status"><div className="uc-modal small"><p>{imageBusy ? "AI가 이미지를 분석하고 있습니다…" : "AI가 명세를 작성하고 있습니다…"}</p><small>보통 10~30초 걸립니다. 잠시만 기다려 주세요.</small></div></div>
      )}

      {pendingAi && (
        <div className="uc-overlay">
          <div className="uc-modal" role="dialog" aria-modal="true" aria-label="AI 결과 확인">
            <h2>AI가 만든 결과를 적용할까요?</h2>
            <p>컴포넌트 <strong>{pendingAi.components.length}개</strong>와 디자인 명세를 만들었습니다.</p>
            <dl className="uc-spec-preview">
              <dt>앱 이름</dt><dd>{pendingAi.spec.appName}</dd>
              <dt>화면 설명</dt><dd>{pendingAi.spec.screenDescription}</dd>
            </dl>
            {components.length > 0 && <p className="uc-warn">적용하면 현재 캔버스의 내용이 바뀝니다. 적용 후 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.</p>}
            <div className="actions">
              <button type="button" className="primary" onClick={acceptAi}>적용</button>
              <button type="button" onClick={() => setPendingAi(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {needKey && (
        <div className="uc-overlay">
          <div className="uc-modal" role="dialog" aria-modal="true" aria-label="API 키 등록 필요">
            <h2>Gemini API 키 등록이 필요합니다</h2>
            <p>AI 기능은 회원 본인의 Google Gemini API 키로 동작합니다. [API키등록·플랫폼연동]에서 본인 키를 등록한 뒤 다시 시도해 주세요.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={async () => { if (await saveNow()) window.location.assign("/settings"); }}>키 등록하러 가기</button>
              <button type="button" onClick={() => setNeedKey(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {help && (
        <div className="uc-overlay" onClick={() => setHelp(false)}>
          <div className="uc-modal wide" role="dialog" aria-modal="true" aria-label="도움말" onClick={(e) => e.stopPropagation()}>
            <div className="uc-modal-head"><h2>사용법</h2><button type="button" className="uc-icon-btn" aria-label="닫기" onClick={() => setHelp(false)}><X size={16} /></button></div>
            <ul className="uc-help">
              <li><b>만들기:</b> 좌측 [컴포넌트]에서 하나를 고른 뒤 캔버스에서 드래그합니다.</li>
              <li><b>선택·이동:</b> 클릭, Shift+클릭(여러 개), 빈 곳 드래그(범위 선택). 방향키 1px, Shift+방향키 10px.</li>
              <li><b>크기:</b> 선택한 컴포넌트 오른쪽 아래 파란 점을 드래그하거나 우측 [속성]에서 숫자로 입력합니다.</li>
              <li><b>글자 수정:</b> 텍스트 컴포넌트를 더블클릭합니다.</li>
              <li><b>그룹:</b> 2개 이상 선택 후 Ctrl+G, 해제는 Ctrl+Shift+G. 컨테이너는 우클릭 메뉴에서 잠글 수 있습니다.</li>
              <li><b>되돌리기:</b> Ctrl+Z / Ctrl+Shift+Z, 복제 Ctrl+D, 삭제 Delete.</li>
              <li><b>AI:</b> [이미지로 만들기]는 UI 스크린샷을 분석해 컴포넌트와 명세를 만듭니다. [명세] 탭의 [AI로 내용 채우기]는 현재 캔버스를 보고 명세를 작성합니다. 본인 Gemini 키가 필요합니다.</li>
              <li><b>저장:</b> 변경하면 자동으로 저장됩니다. JSON·PNG로 내보낼 수도 있습니다.</li>
            </ul>
            <div className="actions"><a className="button primary" href="/guide" target="_blank" rel="noopener">그림·단계별 상세 매뉴얼 열기</a></div>
          </div>
        </div>
      )}

      {toast && <div className={`uc-toast ${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  );
}
