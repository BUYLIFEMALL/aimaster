"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_AI_MODELS, PROVIDER_SHORT_LABELS, type AIModelProvider } from "@/lib/ai/models";
import { getProjectAction, saveProjectAction } from "@/lib/actions/projects";
import type { ModelConfig, ProjectData } from "@/types/svs";

export const EMPTY_PROJECT: ProjectData = {
  search: { query: "", dateFrom: "", dateTo: "", order: "viewCount" },
  filters: { maxDuration: "180", minViews: "", maxSubs: "" },
  videos: [],
  selectedIds: [],
  analysis: null,
  ideas: [],
  selectedIdea: null,
  topicFeedback: "",
  scriptConfig: { durationSec: 60, tone: "몰입감 있고 긴박한 (Urgent & Suspenseful)", target: "" },
  scenes: [],
  promptsResult: null,
};

const SESSION_KEY = "svs_state_v1";
const MODEL_KEY = "svs_model_v2"; // v2: 최초 기본값을 GPT-4.1로 바꾸면서 이전 선택값 초기화

type SaveState = "idle" | "saving" | "saved" | "error";

interface StudioContextValue {
  hydrated: boolean;
  data: ProjectData;
  update: (patch: Partial<ProjectData> | ((d: ProjectData) => Partial<ProjectData>)) => void;
  projectId: string | null;
  title: string;
  setTitle: (t: string) => void;
  model: ModelConfig;
  setModel: (m: ModelConfig) => void;
  saveState: SaveState;
  saveError: string | null;
  saveProject: () => Promise<boolean>;
  loadProject: (id: string) => Promise<ProjectData | null>;
  newProject: () => void;
  requireKey: (provider: string | undefined) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("StudioProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

const KEY_LABELS: Record<string, string> = {
  youtube_api_key: "YouTube Data API",
  ...PROVIDER_SHORT_LABELS,
};

export function StudioProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<ProjectData>(EMPTY_PROJECT);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitleState] = useState("");
  const [model, setModelState] = useState<ModelConfig>({
    provider: "openai",
    model: DEFAULT_AI_MODELS.openai,
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [keyModal, setKeyModal] = useState<string | null>(null);

  const dataRef = useRef<ProjectData>(EMPTY_PROJECT);
  const idRef = useRef<string | null>(null);
  const titleRef = useRef("");

  // 처음 열 때 이 브라우저 탭의 작업 내용과 선택한 모델을 복원합니다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { data?: ProjectData; projectId?: string | null; title?: string };
        if (saved.data) {
          dataRef.current = { ...EMPTY_PROJECT, ...saved.data };
          setData(dataRef.current);
        }
        idRef.current = saved.projectId ?? null;
        setProjectId(idRef.current);
        titleRef.current = saved.title ?? "";
        setTitleState(titleRef.current);
      }
      const savedModel = localStorage.getItem(MODEL_KEY);
      if (savedModel) {
        const parsed = JSON.parse(savedModel) as ModelConfig;
        if (parsed?.provider && parsed?.model) setModelState(parsed);
      }
    } catch {
      // 저장소를 쓸 수 없는 환경에서는 빈 상태로 시작합니다.
    }
    setHydrated(true);
  }, []);

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ data: dataRef.current, projectId: idRef.current, title: titleRef.current }),
      );
    } catch {
      // 용량 초과 등은 무시 (DB 저장이 본 저장소)
    }
  }, []);

  const update = useCallback<StudioContextValue["update"]>(
    (patch) => {
      const next = typeof patch === "function" ? patch(dataRef.current) : patch;
      dataRef.current = { ...dataRef.current, ...next };
      setData(dataRef.current);
      persist();
    },
    [persist],
  );

  const setTitle = useCallback(
    (t: string) => {
      titleRef.current = t;
      setTitleState(t);
      persist();
    },
    [persist],
  );

  const setModel = useCallback((m: ModelConfig) => {
    setModelState(m);
    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify(m));
    } catch {
      // ignore
    }
  }, []);

  const saveProject = useCallback(async () => {
    const d = dataRef.current;
    const fallbackTitle = d.selectedIdea?.title || d.search.query || "";
    if (!titleRef.current && fallbackTitle) {
      titleRef.current = fallbackTitle;
      setTitleState(fallbackTitle);
    }
    setSaveState("saving");
    setSaveError(null);
    const res = await saveProjectAction({
      id: idRef.current,
      title: titleRef.current,
      keyword: d.search.query,
      data: d,
    });
    if (res.success && res.data) {
      idRef.current = res.data.id;
      setProjectId(res.data.id);
      persist();
      setSaveState("saved");
      return true;
    }
    setSaveState("error");
    setSaveError(res.error ?? "저장하지 못했습니다.");
    return false;
  }, [persist]);

  const loadProject = useCallback(
    async (id: string) => {
      const res = await getProjectAction(id);
      if (!res.success || !res.data) return null;
      dataRef.current = { ...EMPTY_PROJECT, ...res.data.data };
      setData(dataRef.current);
      idRef.current = res.data.id;
      setProjectId(res.data.id);
      titleRef.current = res.data.title;
      setTitleState(res.data.title);
      setSaveState("saved");
      persist();
      return dataRef.current;
    },
    [persist],
  );

  const newProject = useCallback(() => {
    dataRef.current = EMPTY_PROJECT;
    setData(EMPTY_PROJECT);
    idRef.current = null;
    setProjectId(null);
    titleRef.current = "";
    setTitleState("");
    setSaveState("idle");
    setSaveError(null);
    persist();
  }, [persist]);

  const requireKey = useCallback((provider: string | undefined) => {
    setKeyModal(provider ?? "ai");
  }, []);

  const value = useMemo<StudioContextValue>(
    () => ({
      hydrated,
      data,
      update,
      projectId,
      title,
      setTitle,
      model,
      setModel,
      saveState,
      saveError,
      saveProject,
      loadProject,
      newProject,
      requireKey,
    }),
    [hydrated, data, update, projectId, title, setTitle, model, setModel, saveState, saveError, saveProject, loadProject, newProject, requireKey],
  );

  return (
    <StudioContext.Provider value={value}>
      {children}
      {keyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 text-center shadow-2xl md:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">🔑</div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-neutral-900">
                {KEY_LABELS[keyModal] ?? "API"} 키 등록이 필요합니다
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500">
                이 기능은 회원님 본인의 {KEY_LABELS[keyModal] ?? "API"} 키로 동작합니다. 엔진은 무료로 제공되고,
                사용량은 본인 키 계정에서 차감됩니다.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href="/settings"
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
              >
                API키 등록하러 가기
              </a>
              <button
                type="button"
                onClick={() => setKeyModal(null)}
                className="w-full cursor-pointer rounded-xl py-2.5 text-xs text-neutral-500 hover:text-neutral-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </StudioContext.Provider>
  );
}

export type { AIModelProvider };
