"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { defaultProject } from "@/lib/cardnews/defaults";
import type { ProjectData } from "@/lib/cardnews/types";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
export type KeyState = Record<"gemini" | "openai" | "anthropic", boolean> | null;

interface Ctx {
  project: ProjectData;
  projectId: string | null;
  status: SaveStatus;
  saveError: string | null;
  hydrated: boolean;
  /** 등록된 AI 키(null이면 아직 확인 중) */
  keys: KeyState;
  update: (fn: (p: ProjectData) => ProjectData) => void;
  newProject: () => void;
  openProject: (id: string) => Promise<boolean>;
  saveNow: () => Promise<void>;
}

const StudioContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "cns_current_project";

function readStoredId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function storeId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장소를 쓸 수 없어도 동작에는 영향 없음 */
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectData>(defaultProject);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [keys, setKeys] = useState<KeyState>(null);

  const projectRef = useRef(project);
  projectRef.current = project;
  const idRef = useRef<string | null>(null);
  const editVersion = useRef(0);
  const savingRef = useRef(false);

  const openProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.data) return false;
      idRef.current = id;
      setProjectId(id);
      storeId(id);
      setProject({ ...defaultProject(), ...data.data });
      setStatus("saved");
      setSaveError(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  // 새로고침해도 작업 중이던 프로젝트로 돌아온다.
  useEffect(() => {
    const id = readStoredId();
    if (!id) {
      setHydrated(true);
      return;
    }
    openProject(id).then((ok) => {
      if (!ok) storeId(null);
      setHydrated(true);
    });
  }, [openProject]);

  // 등록된 키 확인(문구 AI 선택·배경 이미지 안내에 쓴다)
  useEffect(() => {
    let alive = true;
    fetch("/api/settings/api-keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const k = d?.keys ?? {};
        setKeys({ gemini: !!k.gemini?.registered, openai: !!k.openai?.registered, anthropic: !!k.anthropic?.registered });
      })
      .catch(() => alive && setKeys({ gemini: false, openai: false, anthropic: false }));
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async () => {
    if (savingRef.current) return;
    const p = projectRef.current;
    if (!p.plan.topic.trim() && p.pages.length === 0) return; // 아직 아무것도 입력하지 않은 빈 프로젝트는 저장하지 않는다
    savingRef.current = true;
    const startedAt = editVersion.current;
    setStatus("saving");
    try {
      const init = { headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) };
      const res = idRef.current
        ? await fetch(`/api/projects/${idRef.current}`, { method: "PUT", ...init })
        : await fetch("/api/projects", { method: "POST", ...init });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      if (!idRef.current) {
        idRef.current = data.id;
        setProjectId(data.id);
        storeId(data.id);
      }
      setSaveError(null);
      setStatus(editVersion.current === startedAt ? "saved" : "dirty");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장하지 못했습니다.");
      setStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, []);

  // 변경이 멈추고 1.5초 뒤 자동 저장
  useEffect(() => {
    if (status !== "dirty") return;
    const t = setTimeout(() => void save(), 1500);
    return () => clearTimeout(t);
  }, [status, project, save]);

  const update = useCallback((fn: (p: ProjectData) => ProjectData) => {
    editVersion.current += 1;
    setProject((p) => fn(p));
    setStatus("dirty");
  }, []);

  const newProject = useCallback(() => {
    idRef.current = null;
    setProjectId(null);
    storeId(null);
    editVersion.current = 0;
    setProject(defaultProject());
    setStatus("idle");
    setSaveError(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ project, projectId, status, saveError, hydrated, keys, update, newProject, openProject, saveNow: save }),
    [project, projectId, status, saveError, hydrated, keys, update, newProject, openProject, save]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): Ctx {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("ProjectProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
