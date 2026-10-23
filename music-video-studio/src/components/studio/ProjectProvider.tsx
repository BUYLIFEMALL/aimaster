"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { defaultProject, sanitizeProject } from "@/lib/music/project";
import type { MusicProject, SceneMedia } from "@/lib/music/types";

const STORAGE_KEY = "music_video_studio_project_v1";

export interface RefImage {
  id: string;
  /** data:image/jpeg;base64,... (긴 변 1024px 이하로 줄인 것) */
  dataUrl: string;
}

interface StudioContextValue {
  project: MusicProject;
  update: (fn: (p: MusicProject) => MusicProject) => void;
  media: Record<string, SceneMedia>;
  setMedia: (sceneId: string, patch: Partial<SceneMedia>) => void;
  clearMedia: () => void;
  references: RefImage[];
  addReferences: (files: File[]) => Promise<void>;
  removeReference: (id: string) => void;
  exportJson: () => void;
  importJson: (file: File) => Promise<string | null>;
  resetProject: () => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("ProjectProvider가 필요합니다.");
  return ctx;
}

/** 이미지 파일을 긴 변 1024px 이하 JPEG data URL로 줄인다(서버 전송 용량 절약). */
async function fileToJpegDataUrl(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<MusicProject>(defaultProject);
  const [media, setMediaState] = useState<Record<string, SceneMedia>>({});
  const [references, setReferences] = useState<RefImage[]>([]);
  const loaded = useRef(false);

  // 브라우저에 저장된 텍스트 프로젝트를 불러온다(이미지·영상 결과는 저장하지 않는다).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setProject(sanitizeProject(JSON.parse(raw)));
    } catch {
      /* 저장소를 못 쓰면 기본값 */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [project]);

  const update = useCallback((fn: (p: MusicProject) => MusicProject) => setProject((p) => fn(p)), []);
  const setMedia = useCallback((sceneId: string, patch: Partial<SceneMedia>) => setMediaState((m) => ({ ...m, [sceneId]: { ...m[sceneId], ...patch } })), []);

  const clearMedia = useCallback(() => {
    setMediaState((m) => {
      Object.values(m).forEach((v) => v.videoUrl && URL.revokeObjectURL(v.videoUrl));
      return {};
    });
  }, []);

  const addReferences = useCallback(async (files: File[]) => {
    const room = Math.max(0, 3 - references.length);
    const added: RefImage[] = [];
    for (const file of files.filter((f) => f.type.startsWith("image/")).slice(0, room)) {
      try {
        added.push({ id: crypto.randomUUID(), dataUrl: await fileToJpegDataUrl(file) });
      } catch {
        /* 못 읽는 파일은 건너뛴다 */
      }
    }
    if (added.length) setReferences((r) => [...r, ...added].slice(0, 3));
  }, [references.length]);

  const removeReference = useCallback((id: string) => setReferences((r) => r.filter((x) => x.id !== id)), []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "music-video").replace(/[\\/:*?"<>|]/g, "_")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [project]);

  const importJson = useCallback(async (file: File): Promise<string | null> => {
    try {
      const data = JSON.parse(await file.text());
      setProject(sanitizeProject(data));
      clearMedia();
      return null;
    } catch {
      return "프로젝트 파일을 읽지 못했습니다. 이 프로그램에서 내보낸 JSON 파일인지 확인해주세요.";
    }
  }, [clearMedia]);

  const resetProject = useCallback(() => {
    setProject(defaultProject());
    clearMedia();
    setReferences([]);
  }, [clearMedia]);

  const value = useMemo<StudioContextValue>(
    () => ({ project, update, media, setMedia, clearMedia, references, addReferences, removeReference, exportJson, importJson, resetProject }),
    [project, update, media, setMedia, clearMedia, references, addReferences, removeReference, exportJson, importJson, resetProject]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
