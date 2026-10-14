"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sidebar } from "./Sidebar";
import { Modal } from "./Modal";
import { Settings } from "./Settings";
import { Guide } from "./Guide";
import { Analysis } from "./Analysis";
import { SCREENS, type Screen } from "@/lib/navigation";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import {
  LANGUAGES,
  DOMAINS,
  MODELS,
  emptyState,
  stateSchema,
  translatedSchema,
  reviewSchema,
  textResultSchema,
  modelSchema,
  languageSchema,
  glossaryEntrySchema,
  unicodeLength,
  MAX_TRANSLATION,
  type StudioState,
  type AiResult,
  type AiRequest,
  type SourceBlock,
  type GlossaryEntry,
  type Analysis as AnalysisType,
} from "@/lib/translation/model";
import {
  splitDocument,
  groupBlocks,
  combineBlocks,
  fingerprint,
  sourceBasis,
  glossaryForChunk,
  documentChecks,
  glossaryCsv,
  safeFilename,
} from "@/lib/translation/document";
import { importDocument } from "@/lib/translation/import";
import { makeBackup, parseBackup } from "@/lib/translation/backup";

type Project = {
  id: string;
  title: string;
  revision: number;
  updated_at: string;
  expires_at: string;
};
type Glossary = {
  id: string;
  name: string;
  revision: number;
  entries: GlossaryEntry[];
};
type Pending =
  | { type: "new" }
  | { type: "load"; id: string }
  | { type: "remove"; project: Project }
  | { type: "import"; backup: ReturnType<typeof parseBackup> };
type Run = {
  signature: string;
  kind: AiRequest["kind"];
  groups: SourceBlock[][];
  results: (AiResult | null)[];
  original: StudioState;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("서버에 연결하지 못했습니다. 현재 작업은 유지됩니다.");
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("서버 응답을 읽지 못했습니다. 현재 작업은 유지됩니다.");
  }
  if (!response.ok) {
    const error = new Error(
      body.error ?? "요청을 처리하지 못했습니다.",
    ) as Error & { needKey?: boolean };
    error.needKey = Boolean(body.needKey);
    throw error;
  }
  return body as T;
}
const post = (body: unknown, signal?: AbortSignal): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal,
});
function download(
  text: string,
  name: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function reviewGroups(doc: StudioState) {
  const groups: SourceBlock[][] = [];
  let current: SourceBlock[] = [],
    sourceSize = 0,
    targetSize = 0;
  for (const block of doc.aligned) {
    if (!block.translated.trim())
      throw new Error("빈 번역 문단을 채운 뒤 재검수해주세요.");
    const s = unicodeLength(block.text),
      t = unicodeLength(block.translated);
    if (
      current.length &&
      (sourceSize + s > 4000 || targetSize + t > 16000 || current.length >= 100)
    ) {
      groups.push(current);
      current = [];
      sourceSize = 0;
      targetSize = 0;
    }
    current.push({
      id: block.id,
      text: block.translated,
      separator: block.separator,
    });
    sourceSize += s;
    targetSize += t;
  }
  if (current.length) groups.push(current);
  if (groups.length > 15)
    throw new Error("검수할 문단이 많습니다. 문서를 나누어주세요.");
  return groups;
}

export function Workspace({
  email,
  screen,
  navigate,
}: {
  email: string;
  screen: Screen;
  navigate: (screen: Screen) => void;
}) {
  const [doc, setDoc] = useState<StudioState>(emptyState),
    [title, setTitle] = useState("새 번역 작업"),
    [selectedProject, setSelectedProject] = useState<{
      id: string;
      revision: number;
    } | null>(null);
  const [savedSignature, setSavedSignature] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [currentSourceHash, setCurrentSourceHash] = useState(""),
    [currentReviewHash, setCurrentReviewHash] = useState(""),
    [keyDialog, setKeyDialog] = useState(false),
    [pending, setPending] = useState<Pending | null>(null);
  const [editing, setEditing] = useState(false),
    [mobileTab, setMobileTab] = useState("source"),
    [progress, setProgress] = useState({ done: 0, total: 0 }),
    [resumable, setResumable] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]),
    [historyLoading, setHistoryLoading] = useState(false),
    [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [glossaryId, setGlossaryId] = useState(""),
    [glossaryRevision, setGlossaryRevision] = useState(0),
    [glossaryName, setGlossaryName] = useState("나의 용어집"),
    [glossaryDraft, setGlossaryDraft] = useState<GlossaryEntry[]>([]),
    [termDraft, setTermDraft] = useState<GlossaryEntry>({
      sourceTerm: "",
      targetTerm: "",
      note: "",
    });
  const [selectedTerm, setSelectedTerm] = useState<{
      sourceTerm: string;
      targetTerm: string;
      explanation: string;
    } | null>(null),
    [reverseOpen, setReverseOpen] = useState(false);
  const [saveConsent, setSaveConsent] = useState(false),
    [copyStatus, setCopyStatus] = useState("");
  const runRef = useRef<Run | null>(null),
    controller = useRef<AbortController | null>(null),
    generation = useRef(0),
    running = useRef(false),
    fileRef = useRef<HTMLInputElement>(null),
    backupRef = useRef<HTMLInputElement>(null);
  const signature = JSON.stringify([title, doc]),
    dirty =
      Boolean(doc.sourceText || doc.translationText) &&
      signature !== savedSignature;
  const sourceSignature = sourceBasis(doc),
    reviewSignature = JSON.stringify([sourceSignature, doc.translationText]);
  useEffect(() => {
    let active = true;
    void Promise.all([
      fingerprint(sourceSignature),
      fingerprint(reviewSignature),
    ]).then(([s, r]) => {
      if (active) {
        setCurrentSourceHash(s);
        setCurrentReviewHash(r);
      }
    });
    return () => {
      active = false;
    };
  }, [sourceSignature, reviewSignature]);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const translationStale =
    Boolean(doc.translationText) && doc.translationBasis !== currentSourceHash;
  const analysisStale = doc.analysisBasis !== currentReviewHash;
  const reverseStale = doc.reverseBasis !== currentReviewHash;
  const prepared = useMemo(() => {
    try {
      return {
        groups: doc.sourceText.trim()
          ? groupBlocks(splitDocument(doc.sourceText))
          : [],
        error: "",
      };
    } catch (e) {
      return {
        groups: [],
        error: e instanceof Error ? e.message : "문서를 나누어주세요.",
      };
    }
  }, [doc.sourceText]);
  const checks = useMemo(
    () =>
      doc.translationText
        ? documentChecks(doc.sourceText, doc.translationText)
        : { missingUrls: [], changedNumbers: [] },
    [doc.sourceText, doc.translationText],
  );
  const allTerms = useMemo(
    () =>
      [
        ...new Map(
          doc.analyses
            .flatMap((r) => [...r.context, ...r.terminology])
            .filter((t) => t.targetTerm)
            .map((t) => [t.targetTerm, t]),
        ).values(),
      ].sort((a, b) => b.targetTerm.length - a.targetTerm.length),
    [doc.analyses],
  );
  useEffect(() => {
    const job = runRef.current;
    if (!job || busy) return;
    const latest = JSON.stringify([
      job.kind, doc.sourceText, doc.translationText,
      doc.options, doc.glossary, doc.aligned,
    ]);
    if (job.signature !== latest) {
      runRef.current = null;
      setResumable(false);
    }
  }, [sourceSignature, doc.translationText, doc.aligned, busy, doc.options, doc.glossary, doc.sourceText]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await api<{ projects: Project[] }>("/api/projects");
      setProjects(result.projects);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "보관함을 불러오지 못했습니다.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);
  const loadGlossaries = useCallback(async () => {
    try {
      const result = await api<{ glossaries: Glossary[] }>("/api/glossaries");
      setGlossaries(result.glossaries);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "용어집을 불러오지 못했습니다.",
      );
    }
  }, []);
  useEffect(() => {
    if (screen === "history") void loadHistory();
    if (screen === "glossary") void loadGlossaries();
  }, [screen, loadHistory, loadGlossaries]);
  const reset = () => {
    setDoc(emptyState());
    setTitle("새 번역 작업");
    setSelectedProject(null);
    setSavedSignature("");
    setSaveConsent(false);
    setError("");
    setNotice("");
    setProgress({ done: 0, total: 0 });
    runRef.current = null;
    setResumable(false);
    navigate("translator");
  };
  function cancel() {
    running.current = false;
    generation.current++;
    controller.current?.abort();
    setBusy("");
    setNotice(
      "작업을 중단했습니다. 이미 처리한 구간은 이어서 실행할 수 있습니다. 시작한 AI 요청의 사용량은 발생할 수 있습니다.",
    );
    setResumable(Boolean(runRef.current));
  }
  function addTerm(entry: GlossaryEntry) {
    if (glossaryDraft.length >= 200) {
      setError("용어집은 200개까지 등록할 수 있습니다.");
      return;
    }
    if (
      !glossaryDraft.some(
        (e) =>
          e.sourceTerm === entry.sourceTerm &&
          e.targetTerm === entry.targetTerm,
      )
    )
      setGlossaryDraft((old) => [...old, glossaryEntrySchema.parse(entry)]);
    setNotice(
      "용어집 편집에 추가했습니다. 용어집 화면에서 검토한 뒤 현재 번역에 적용해주세요.",
    );
  }

  async function run(kind: AiRequest["kind"], resume = false) {
    if (busy || running.current) return;
    running.current = true;
    setError("");
    setNotice("");
    const runId = ++generation.current,
      captured = stateSchema.parse(doc),
      inputSignature = JSON.stringify([
        kind,
        captured.sourceText,
        captured.translationText,
        captured.options,
        captured.glossary,
        captured.aligned,
      ]);
    try {
      let job = resume ? runRef.current : null;
      if (resume && (!job || job.signature !== inputSignature))
        throw new Error(
          "입력이나 설정이 바뀌었습니다. 새 번역으로 실행해주세요.",
        );
      if (!job) {
        const groups =
          kind === "reverse"
            ? groupBlocks(
                splitDocument(captured.translationText, MAX_TRANSLATION),
                12000,
              )
            : kind === "review"
              ? reviewGroups(captured)
              : groupBlocks(splitDocument(captured.sourceText));
        if (!groups.length)
          throw new Error(
            kind === "review"
              ? "문단 대응 정보가 없습니다. 먼저 번역을 실행해주세요."
              : "처리할 문서를 입력해주세요.",
          );
        job = {
          signature: inputSignature,
          kind,
          groups,
          results: groups.map(() => null),
          original: captured,
        };
        runRef.current = job;
      }
      if (
        kind === "reverse" &&
        captured.options.sourceLanguage === "auto" &&
        !captured.detectedLanguage
      )
        throw new Error("역번역할 원문 언어를 선택하거나 먼저 번역해주세요.");
      setBusy(
        kind === "translate"
          ? "번역 및 검수"
          : kind === "review"
            ? "현재 수정본 검수"
            : kind === "reverse"
              ? "역번역"
              : "문서 정리",
      );
      controller.current = new AbortController();
      setProgress({
        done: job.results.filter(Boolean).length,
        total: job.groups.length,
      });
      setResumable(false);
      for (let i = 0; i < job.groups.length; i++) {
        if (job.results[i]) continue;
        if (generation.current !== runId) return;
        const group = job.groups[i],
          preceding = job.groups
            .slice(Math.max(0, i - 1), i)
            .flat()
            .map((b) => b.text)
            .join("\n")
            .slice(-600);
        const previousTerms = job.results
          .flatMap((r) => r?.analysis?.terminology ?? [])
          .slice(-50)
          .map((t) => ({
            sourceTerm: t.sourceTerm.slice(0, 80),
            targetTerm: t.targetTerm.slice(0, 160),
            note: t.explanation.slice(0, 200),
          }));
        const approved = glossaryForChunk(
            group.map((b) => b.text).join("\n"),
            captured.glossary,
          ),
          glossary = [
            ...approved,
            ...previousTerms.filter(
              (t) => !approved.some((a) => a.sourceTerm === t.sourceTerm),
            ),
          ].slice(0, 100);
        const detected = job.results.find(
          (r) => r?.sourceLanguage,
        )?.sourceLanguage;
        const options = {
          ...captured.options,
          sourceLanguage:
            kind === "reverse"
              ? captured.options.sourceLanguage === "auto"
                ? captured.detectedLanguage
                : captured.options.sourceLanguage
              : captured.options.sourceLanguage === "auto" && detected
                ? detected
                : captured.options.sourceLanguage,
        };
        const request = {
          operationId: crypto.randomUUID(),
          kind,
          options,
          blocks: group.map(({ id, text }) => ({ id, text })),
          sourceBlocks:
            kind === "review"
              ? group.map((b) => ({
                  id: b.id,
                  text: captured.aligned.find((a) => a.id === b.id)!.text,
                }))
              : [],
          glossary,
          context: preceding,
        };
        const raw = await api<AiResult>(
          "/api/ai",
          post(request, controller.current.signal),
        );
        const { model, generatedAt, ...payload } = raw;
        const parsed = (
          kind === "translate"
            ? translatedSchema
            : kind === "review"
              ? reviewSchema
              : textResultSchema
        ).safeParse(payload);
        if (
          !parsed.success ||
          model !== captured.options.model ||
          !generatedAt ||
          !Number.isFinite(Date.parse(generatedAt))
        )
          throw new Error(
            "AI 응답 형식이 올바르지 않습니다. 이전 결과는 유지됩니다.",
          );
        const result = { ...parsed.data, model, generatedAt } as AiResult;
        if (generation.current !== runId) return;
        if (
          kind !== "review" &&
          (!Array.isArray(result.blocks) ||
            result.blocks.length !== group.length ||
            result.blocks.some(
              (b, n) => b.id !== group[n].id || typeof b.text !== "string",
            ))
        )
          throw new Error(
            "AI 응답의 문단이 일치하지 않습니다. 이전 결과는 유지됩니다.",
          );
        if ((kind === "translate" || kind === "review") && !result.analysis)
          throw new Error(
            "AI 검수 결과를 읽지 못했습니다. 이전 결과는 유지됩니다.",
          );
        job.results[i] = result;
        setProgress({
          done: job.results.filter(Boolean).length,
          total: job.groups.length,
        });
      }
      if (generation.current !== runId) return;
      const results = job.results as AiResult[],
        sourceHash = await fingerprint(sourceBasis(captured)),
        generatedAt = results[results.length - 1].generatedAt;
      if (generation.current !== runId) return;
      if (kind === "translate") {
        const source = job.groups.flat(),
          translated = results.flatMap((r) => r.blocks ?? []),
          text = combineBlocks(source, translated),
          nextReview = await fingerprint(
            JSON.stringify([sourceBasis(captured), text]),
          );
        const next = stateSchema.parse({
          ...captured,
          translationText: text,
          aligned: source.map((b) => ({
            ...b,
            translated: translated.find((t) => t.id === b.id)!.text,
          })),
          translationBasis: sourceHash,
          analyses: results.map((r) => r.analysis),
          analysisBasis: nextReview,
          detectedLanguage: results[0].sourceLanguage,
          detectedDomain: results[0].detectedDomain,
          generatedAt,
        });
        if (generation.current !== runId) return;
        setDoc(next);
        setEditing(false);
        setMobileTab("translation");
      } else if (kind === "review") {
        const basis = await fingerprint(
          JSON.stringify([sourceBasis(captured), captured.translationText]),
        );
        if (generation.current !== runId) return;
        setDoc(
          stateSchema.parse({
            ...captured,
            analyses: results.map((r) => r.analysis),
            analysisBasis: basis,
            generatedAt,
          }),
        );
      } else if (kind === "reverse") {
        const basis = await fingerprint(
          JSON.stringify([sourceBasis(captured), captured.translationText]),
        );
        if (generation.current !== runId) return;
        setDoc(
          stateSchema.parse({
            ...captured,
            reverseText: combineBlocks(
              job.groups.flat(),
              results.flatMap((r) => r.blocks ?? []),
            ),
            reverseBasis: basis,
          }),
        );
        setReverseOpen(true);
      } else {
        const text = combineBlocks(
          job.groups.flat(),
          results.flatMap((r) => r.blocks ?? []),
        );
        setDoc(stateSchema.parse({ ...captured, sourceText: text }));
      }
      runRef.current = null;
      setResumable(false);
      setNotice(
        kind === "translate"
          ? "번역과 검수가 완료됐습니다. 내용을 확인하고 필요하면 프로젝트를 저장해주세요."
          : kind === "review"
            ? "현재 수정본을 기준으로 검수했습니다."
            : kind === "reverse"
              ? "역번역을 완료했습니다. 원문과 직접 비교해주세요."
              : "문서 정리를 완료했습니다. 변경된 원문을 확인해주세요.",
      );
    } catch (e) {
      if (generation.current !== runId) return;
      if ((e as Error & { needKey?: boolean }).needKey) setKeyDialog(true);
      setError(e instanceof Error ? e.message : "작업을 완료하지 못했습니다.");
      setResumable(Boolean(runRef.current));
    } finally {
      if (generation.current === runId) {
        running.current = false;
        setBusy("");
        controller.current = null;
      }
    }
  }

  async function readFile(file?: File) {
    if (!file || busy) return;
    setBusy("문서 읽기");
    setError("");
    try {
      const text = await importDocument(file, setBusy);
      setDoc((old) => ({
        ...old,
        sourceText: text,
        filename: file.name.slice(0, 180),
      }));
      setTitle(safeFilename(file.name).slice(0, 120));
      setNotice(
        "원문을 불러왔습니다. 언어와 예상 호출 수를 확인한 뒤 번역을 실행해주세요.",
      );
      setMobileTab("source");
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function exportFile(
    which: "source" | "translation",
    format: "txt" | "md" | "docx",
  ) {
    setError("");
    try {
      const text = which === "source" ? doc.sourceText : doc.translationText;
      if (!text) throw new Error("저장할 내용이 없습니다.");
      const name = `${safeFilename(doc.filename || title)}_${which === "source" ? "원문" : doc.options.targetLanguage}`;
      if (format === "docx") {
        const { markdownDocx, downloadBlob } =
          await import("@/lib/translation/export");
        downloadBlob(await markdownDocx(text), name + ".docx");
      } else download(text, `${name}.${format}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 저장하지 못했습니다.");
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("복사했습니다.");
    } catch {
      setError("복사를 허용하지 않는 브라우저입니다. 다운로드로 저장해주세요.");
    }
  }
  function exportBackup() {
    download(
      JSON.stringify(makeBackup(title, doc), null, 2),
      `${safeFilename(title)}_백업.json`,
      "application/json;charset=utf-8",
    );
  }
  async function importBackup(file?: File) {
    if (!file || busy) return;
    setError("");
    try {
      if (file.size > 4 * 1024 * 1024)
        throw new Error("JSON 백업은 4MB까지 불러올 수 있습니다.");
      setPending({ type: "import", backup: parseBackup(await file.text()) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "백업을 읽지 못했습니다.");
    } finally {
      if (backupRef.current) backupRef.current.value = "";
    }
  }
  async function saveProject() {
    if (busy) return;
    if (!saveConsent) {
      setError("원문·번역문·검수 결과의 30일 보관을 선택해주세요.");
      return;
    }
    setBusy("프로젝트 저장");
    setError("");
    const captured = stateSchema.parse(doc),
      capturedTitle = title;
    try {
      const result = await api<{ id: string; revision: number }>(
        "/api/projects",
        post({
          id: selectedProject?.id ?? crypto.randomUUID(),
          revision: selectedProject?.revision ?? 0,
          title: capturedTitle,
          payload: captured,
        }),
      );
      setSelectedProject(result);
      setSavedSignature(JSON.stringify([capturedTitle, captured]));
      setNotice("프로젝트를 저장했습니다. 보관함에서 다시 열 수 있습니다.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "프로젝트를 저장하지 못했습니다.",
      );
    } finally {
      setBusy("");
    }
  }
  async function loadProject(id: string) {
    setBusy("프로젝트 불러오기");
    setError("");
    try {
      const result = await api<{ project: Project & { payload: StudioState } }>(
        `/api/projects?id=${encodeURIComponent(id)}`,
      );
      const loaded = stateSchema.parse(result.project.payload);
      setDoc(loaded);
      setTitle(result.project.title);
      setSelectedProject({ id, revision: result.project.revision });
      setSavedSignature(JSON.stringify([result.project.title, loaded]));
      setSaveConsent(true);
      runRef.current = null;
      setResumable(false);
      navigate("translator");
      setNotice("저장한 프로젝트를 불러왔습니다.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "프로젝트를 불러오지 못했습니다.",
      );
    } finally {
      setBusy("");
    }
  }
  async function confirmPending() {
    const item = pending;
    setPending(null);
    if (!item) return;
    if (item.type === "new") reset();
    else if (item.type === "load") await loadProject(item.id);
    else if (item.type === "import") {
      setDoc(item.backup.document);
      setTitle(item.backup.title || "불러온 번역");
      setSelectedProject(null);
      setSavedSignature("");
      setSaveConsent(false);
      runRef.current = null;
      setResumable(false);
      navigate("translator");
      setNotice(
        "백업을 새 작업으로 불러왔습니다. 보관함에는 아직 저장하지 않았습니다.",
      );
    } else {
      setBusy("프로젝트 삭제");
      try {
        await api(
          "/api/projects/remove",
          post({ id: item.project.id, revision: item.project.revision }),
        );
        if (selectedProject?.id === item.project.id) {
          setSelectedProject(null);
          setSavedSignature("");
        }
        await loadHistory();
        setNotice("선택한 본인 프로젝트를 삭제했습니다.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      } finally {
        setBusy("");
      }
    }
  }
  async function saveGlossary() {
    if (busy) return;
    setBusy("용어집 저장");
    setError("");
    try {
      const result = await api<{ id: string; revision: number }>(
        "/api/glossaries",
        post({
          id: glossaryId || crypto.randomUUID(),
          revision: glossaryRevision,
          name: glossaryName,
          entries: glossaryDraft,
        }),
      );
      setGlossaryId(result.id);
      setGlossaryRevision(result.revision);
      await loadGlossaries();
      setNotice("본인 용어집을 저장했습니다.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "용어집을 저장하지 못했습니다.",
      );
    } finally {
      setBusy("");
    }
  }
  function editAligned(id: string, value: string) {
    const aligned = doc.aligned.map((b) =>
        b.id === id ? { ...b, translated: value } : b,
      ),
      text = aligned.map((b) => b.translated + b.separator).join("");
    if (unicodeLength(value) > 12000 || unicodeLength(text) > MAX_TRANSLATION) {
      setError(
        "한 문단은 12,000자, 번역문 전체는 60,000자까지 수정할 수 있습니다.",
      );
      return;
    }
    setDoc((old) => ({ ...old, aligned, translationText: text }));
  }

  function highlighted(children: ReactNode): ReactNode {
    if (typeof children !== "string" || analysisStale || !allTerms.length)
      return children;
    const escaped = allTerms.map((t) =>
        t.targetTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
      re = new RegExp(`(${escaped.join("|")})`, "giu");
    return children.split(re).map((part, i) => {
      const term = allTerms.find(
        (t) => t.targetTerm.toLocaleLowerCase() === part.toLocaleLowerCase(),
      );
      return term ? (
        <button
          className="inline-term"
          key={i}
          onClick={() => setSelectedTerm(term)}
          title="용어 설명 보기"
        >
          {part}
        </button>
      ) : (
        part
      );
    });
  }
  const markdown = (text: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        img: () => null,
        p: ({ children }) => (
          <p>
            {Array.isArray(children)
              ? children.map((c, i) => <span key={i}>{highlighted(c)}</span>)
              : highlighted(children)}
          </p>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
  const tools = (which: "source" | "translation") => (
    <div className="panel-tools">
      <button
        disabled={!doc[which === "source" ? "sourceText" : "translationText"]}
        onClick={() =>
          copy(doc[which === "source" ? "sourceText" : "translationText"])
        }
        aria-label={which === "source" ? "원문 복사" : "번역문 복사"}
      >
        복사
      </button>
      <details>
        <summary>{which === "source" ? "원문 저장" : "번역문 저장"}</summary>
        <div>
          {(["txt", "md", "docx"] as const).map((format) => (
            <button key={format} onClick={() => exportFile(which, format)}>
              {format.toUpperCase()} 다운로드
            </button>
          ))}
        </div>
      </details>
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar
        email={email}
        screen={screen}
        navigate={navigate}
        busy={Boolean(busy)}
      />
      <main className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">DOCUMENT TRANSLATOR · {APP_VERSION}</p>
            <h1>{SCREENS.find((s) => s.id === screen)?.label}</h1>
            <p>
              {screen === "translator"
                ? "원문과 번역문을 비교하며 한 문단씩 완성하세요."
                : "회원님의 문서를 본인 계정으로 번역하고 검토합니다."}
            </p>
          </div>
          <button
            disabled={Boolean(busy)}
            onClick={() => (dirty ? setPending({ type: "new" }) : reset())}
          >
            ＋ 새 번역
          </button>
        </header>
        {error && (
          <div className="banner error" role="alert">
            {error}
            <button aria-label="오류 안내 닫기" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="banner info" role="status">
            {notice}
          </div>
        )}
        {copyStatus && (
          <p role="status" className="muted">
            {copyStatus}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx"
          hidden
          onChange={(e) => readFile(e.target.files?.[0])}
        />
        <input
          ref={backupRef}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => importBackup(e.target.files?.[0])}
        />
        {screen === "dashboard" && (
          <>
            <section className="hero card">
              <p className="eyebrow">언어를 넘어, 뜻을 그대로</p>
              <h2>
                문서를 번역하고
                <br />
                꼼꼼하게 검토하세요.
              </h2>
              <p>
                텍스트·PDF·Word 문서에서 원문을 불러오고, 문맥·전문 용어·문체를
                함께 확인합니다.
              </p>
              <button
                className="primary"
                onClick={() => navigate("translator")}
              >
                {doc.sourceText ? "현재 번역 이어서 보기" : "문서번역 시작하기"}{" "}
                →
              </button>
              <span className="hero-symbol" aria-hidden>
                文<span>A</span>
              </span>
            </section>
            <div className="metric-grid">
              <section className="card">
                <small>현재 원문</small>
                <strong>
                  {unicodeLength(doc.sourceText).toLocaleString()}
                  <span>자</span>
                </strong>
              </section>
              <section className="card">
                <small>대상 언어</small>
                <strong>
                  {
                    LANGUAGES.find((l) => l.id === doc.options.targetLanguage)
                      ?.name
                  }
                </strong>
              </section>
              <section className="card">
                <small>적용 용어</small>
                <strong>
                  {doc.glossary.length}
                  <span>개</span>
                </strong>
              </section>
            </div>
            <div className="guide-grid">
              <section className="card">
                <h2>문서 준비</h2>
                <p>
                  TXT·텍스트 PDF·DOCX를 기기에서 읽습니다. 파일을 고르는
                  것만으로 AI를 호출하지 않습니다.
                </p>
                <button
                  onClick={() => {
                    navigate("translator");
                    fileRef.current?.click();
                  }}
                >
                  파일 불러오기
                </button>
              </section>
              <section className="card">
                <h2>회원님의 번역 기준</h2>
                <p>
                  같은 용어를 일관되게 번역하도록 용어집을 만들어 적용하세요.
                </p>
                <button onClick={() => navigate("glossary")}>
                  용어집 관리
                </button>
              </section>
            </div>
          </>
        )}
        {screen === "translator" && (
          <>
            <section className="card toolbar">
              <div className="field-grid">
                <label>
                  원문 언어
                  <select
                    disabled={Boolean(busy)}
                    value={doc.options.sourceLanguage}
                    onChange={(e) =>
                      setDoc((old) => ({
                        ...old,
                        options: {
                          ...old.options,
                          sourceLanguage:
                            e.target.value === "auto"
                              ? "auto"
                              : languageSchema.parse(e.target.value),
                        },
                      }))
                    }
                  >
                    <option value="auto">자동 감지</option>
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  번역할 언어
                  <select
                    disabled={Boolean(busy)}
                    value={doc.options.targetLanguage}
                    onChange={(e) =>
                      setDoc((old) => ({
                        ...old,
                        options: {
                          ...old.options,
                          targetLanguage: languageSchema.parse(e.target.value),
                        },
                      }))
                    }
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  전문 분야
                  <select
                    disabled={Boolean(busy)}
                    value={doc.options.domain}
                    onChange={(e) =>
                      setDoc((old) => ({
                        ...old,
                        options: {
                          ...old.options,
                          domain: e.target
                            .value as StudioState["options"]["domain"],
                        },
                      }))
                    }
                  >
                    {DOMAINS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Gemini 모델
                  <select
                    disabled={Boolean(busy)}
                    value={doc.options.model}
                    onChange={(e) =>
                      setDoc((old) => ({
                        ...old,
                        options: {
                          ...old.options,
                          model: modelSchema.parse(e.target.value),
                        },
                      }))
                    }
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="action-row">
                <button
                  disabled={Boolean(busy)}
                  onClick={() => fileRef.current?.click()}
                >
                  파일 불러오기
                </button>
                <button
                  disabled={
                    Boolean(busy) ||
                    !doc.sourceText.trim() ||
                    Boolean(prepared.error)
                  }
                  onClick={() => run("structure")}
                >
                  AI 문서 정리
                </button>
                <span className="call-hint">
                  {prepared.error ||
                    (prepared.groups.length
                      ? `번역 시 최대 ${prepared.groups.length}회 요청 · 본인 키 사용`
                      : "원문을 준비해주세요")}
                </span>
                {busy && controller.current ? (
                  <button className="danger" onClick={cancel}>
                    AI 작업 중단
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={
                      Boolean(busy) ||
                      !prepared.groups.length ||
                      Boolean(prepared.error)
                    }
                    onClick={() => run("translate")}
                  >
                    ✦ 번역 및 검수
                  </button>
                )}
              </div>
              <p className="muted">
                원문과 번역문이 회원님 본인의 Gemini 계정으로 전달됩니다. 원본
                파일은 서버에 보관하지 않습니다.
              </p>
            </section>
            {busy && (
              <div className="progress-banner" role="status">
                <span className="spinner" />
                {busy}…{" "}
                {progress.total > 0 &&
                  controller.current &&
                  `${progress.done}/${progress.total}구간 완료`}
              </div>
            )}
            {resumable && runRef.current && (
              <div className="banner caution">
                완료한 구간은 유지됩니다. 실패했거나 중단한 구간부터 실행할 수
                있습니다.
                <button
                  disabled={Boolean(busy)}
                  onClick={() => run(runRef.current!.kind, true)}
                >
                  이어서 실행
                </button>
              </div>
            )}
            {translationStale && (
              <div className="banner caution">
                <strong>재번역 필요</strong> · 이전 원문 또는 설정으로 만든
                번역문입니다. 수정본은 유지되며, 새 번역을 실행해야 현재 설정이
                반영됩니다.
              </div>
            )}
            <div className="mobile-tabs" role="tablist" aria-label="문서 화면">
              {[
                { id: "source", name: "원문" },
                { id: "translation", name: "번역문" },
                { id: "analysis", name: "검수" },
              ].map((t) => (
                <button
                  role="tab"
                  aria-selected={mobileTab === t.id}
                  onClick={() => setMobileTab(t.id)}
                  key={t.id}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className={`workspace-grid mobile-${mobileTab}`}>
              <section className="card document-panel source-panel">
                <header className="panel-header">
                  <h2>원문</h2>
                  {tools("source")}
                </header>
                <div className="translation-meta">
                  <span>{doc.filename || "직접 입력"}</span>
                  <span>
                    {unicodeLength(doc.sourceText).toLocaleString()} / 20,000자
                  </span>
                </div>
                <textarea
                  aria-label="원문"
                  placeholder="번역할 텍스트를 입력하거나 문서를 불러오세요."
                  value={doc.sourceText}
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    if (unicodeLength(e.target.value) <= 20000)
                      setDoc((old) => ({
                        ...old,
                        sourceText: e.target.value,
                        filename: "",
                      }));
                    else setError("원문은 20,000자까지 입력할 수 있습니다.");
                  }}
                />
              </section>
              <section className="card document-panel translation-panel">
                <header className="panel-header">
                  <h2>번역문</h2>
                  {tools("translation")}
                </header>
                <div className="translation-meta">
                  <span>
                    {doc.detectedLanguage
                      ? `${LANGUAGES.find((l) => l.id === doc.detectedLanguage)?.name} 감지 · ${doc.detectedDomain}`
                      : "번역 후 감지 정보 표시"}
                  </span>
                  <button
                    className="small"
                    disabled={
                      !doc.aligned.length || Boolean(busy) || translationStale
                    }
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? "보기 모드" : "문단별 수정"}
                  </button>
                </div>
                <div className="translation-content">
                  {doc.aligned.length ? (
                    doc.aligned.map((b, i) => (
                      <article className="aligned-paragraph" key={b.id}>
                        <small>{i + 1}문단</small>
                        {editing && !translationStale ? (
                          <textarea
                            aria-label={`번역문 ${b.id}`}
                            value={b.translated}
                            disabled={Boolean(busy)}
                            onChange={(e) => editAligned(b.id, e.target.value)}
                          />
                        ) : (
                          markdown(b.translated)
                        )}
                      </article>
                    ))
                  ) : doc.translationText ? (
                    markdown(doc.translationText)
                  ) : (
                    <div className="empty-state">
                      <span>文 → A</span>
                      <p>번역문이 여기에 표시됩니다.</p>
                      <small>
                        원문을 준비한 뒤 ‘번역 및 검수’를 실행하세요.
                      </small>
                    </div>
                  )}
                </div>
              </section>
              <Analysis
                results={doc.analyses}
                stale={analysisStale}
                addTerm={addTerm}
              />
            </div>
            <section className="card review-bar">
              <div>
                <strong>현재 수정본 확인</strong>
                <p className="muted">
                  AI 참고 평가와 직접 비교를 함께 사용하세요.
                </p>
              </div>
              <button
                disabled={
                  Boolean(busy) || !doc.aligned.length || translationStale
                }
                onClick={() => run("review")}
              >
                현재 수정본 재검수
              </button>
              <button
                disabled={
                  Boolean(busy) ||
                  !doc.translationText ||
                  translationStale ||
                  (!doc.detectedLanguage &&
                    doc.options.sourceLanguage === "auto")
                }
                onClick={() => run("reverse")}
              >
                역번역 실행
              </button>
              {doc.reverseText && (
                <button onClick={() => setReverseOpen(true)}>
                  역번역 보기{reverseStale ? " · 재확인 필요" : ""}
                </button>
              )}
            </section>
            {(checks.missingUrls.length > 0 ||
              checks.changedNumbers.length > 0) && (
              <section className="card checks">
                <h2>숫자·URL 직접 확인</h2>
                <p className="muted">
                  표현이나 표기 방식이 달라질 수 있습니다. 아래 항목을 원문과
                  대조해주세요.
                </p>
                {checks.changedNumbers.length > 0 && (
                  <p>표기가 달라진 숫자: {checks.changedNumbers.join(", ")}</p>
                )}
                {checks.missingUrls.map((url) => (
                  <p key={url}>
                    확인할 URL: <code>{url}</code>
                  </p>
                ))}
              </section>
            )}
            <section className="card save-panel">
              <div className="field-grid">
                <label>
                  프로젝트 이름
                  <input
                    value={title}
                    disabled={Boolean(busy)}
                    maxLength={120}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <div>
                  <span
                    className={`status ${!dirty && selectedProject ? "success" : ""}`}
                  >
                    {!dirty && selectedProject ? "저장됨" : "미저장 변경 있음"}
                  </span>
                  <p className="muted">
                    보관함에 선택 저장한 작업은30일·최대100건 보관합니다.
                  </p>
                </div>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={saveConsent}
                  disabled={Boolean(busy)}
                  onChange={(e) => setSaveConsent(e.target.checked)}
                />
                원문·번역문·검수 결과를 내 보관함에30일 보관합니다.
              </label>
              <div className="action-row">
                <button
                  className="primary"
                  disabled={
                    Boolean(busy) ||
                    !title.trim() ||
                    !doc.sourceText.trim() ||
                    !saveConsent
                  }
                  onClick={saveProject}
                >
                  프로젝트 저장
                </button>
                {selectedProject && (
                  <button
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setSelectedProject(null);
                      setSavedSignature("");
                      setNotice(
                        "새 프로젝트로 저장할 수 있습니다. 기존 보관 기록은 유지됩니다.",
                      );
                    }}
                  >
                    새 프로젝트로 저장하기
                  </button>
                )}
                <button
                  disabled={!doc.sourceText && !doc.translationText}
                  onClick={exportBackup}
                >
                  JSON 백업 다운로드
                </button>
                <button
                  disabled={Boolean(busy)}
                  onClick={() => backupRef.current?.click()}
                >
                  JSON 백업 불러오기
                </button>
              </div>
              <p className="muted">
                저장하지 않은 작업은 새로고침하면 사라질 수 있습니다. 이동 전
                저장하거나 백업을 다운로드하세요.
              </p>
            </section>
          </>
        )}
        {screen === "history" && (
          <section className="card">
            <header className="panel-header">
              <h2>
                저장한 번역 프로젝트 <small>{projects.length}/100</small>
              </h2>
              <button
                disabled={historyLoading || Boolean(busy)}
                onClick={loadHistory}
              >
                목록 새로고침
              </button>
            </header>
            <p className="muted">
              회원님이 저장한 작업만 표시하며, 생성일부터30일 동안 다시 열 수
              있습니다.
            </p>
            {historyLoading ? (
              <p role="status">보관함을 불러오는 중…</p>
            ) : !projects.length ? (
              <div className="empty-state">
                <p>저장한 프로젝트가 없습니다.</p>
                <button onClick={() => navigate("translator")}>
                  문서번역으로 이동
                </button>
              </div>
            ) : (
              <div className="records-table">
                {projects.map((p) => (
                  <article key={p.id}>
                    <div>
                      <strong>{p.title}</strong>
                      <small>
                        수정 {new Date(p.updated_at).toLocaleString("ko-KR")} ·
                        보관 만료{" "}
                        {new Date(p.expires_at).toLocaleDateString("ko-KR")}
                      </small>
                    </div>
                    <button
                      disabled={Boolean(busy)}
                      onClick={() =>
                        dirty
                          ? setPending({ type: "load", id: p.id })
                          : loadProject(p.id)
                      }
                    >
                      불러오기
                    </button>
                    <button
                      className="danger"
                      disabled={Boolean(busy)}
                      onClick={() => setPending({ type: "remove", project: p })}
                    >
                      삭제
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {screen === "glossary" && (
          <section className="card glossary">
            <h2>내 용어집</h2>
            <p>
              원문 용어와 번역 표현을 직접 승인해, 같은 용어를 일관되게
              번역하도록 적용하세요.
            </p>
            <div className="field-grid">
              <label>
                저장한 용어집
                <select
                  disabled={Boolean(busy)}
                  value={glossaryId}
                  onChange={(e) => {
                    const g = glossaries.find((g) => g.id === e.target.value);
                    setGlossaryId(g?.id ?? "");
                    setGlossaryRevision(g?.revision ?? 0);
                    setGlossaryName(g?.name ?? "나의 용어집");
                    if (g) setGlossaryDraft(g.entries);
                  }}
                >
                  <option value="">새 용어집</option>
                  {glossaries.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                용어집 이름
                <input
                  value={glossaryName}
                  maxLength={80}
                  disabled={Boolean(busy)}
                  onChange={(e) => setGlossaryName(e.target.value)}
                />
              </label>
            </div>
            <form
              className="term-entry"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const value = glossaryEntrySchema.parse(termDraft);
                  addTerm(value);
                  setTermDraft({ sourceTerm: "", targetTerm: "", note: "" });
                } catch {
                  setError("원문 용어와 번역 용어의 길이를 확인해주세요.");
                }
              }}
            >
              <label>
                원문 용어
                <input
                  required
                  maxLength={80}
                  value={termDraft.sourceTerm}
                  disabled={Boolean(busy)}
                  onChange={(e) =>
                    setTermDraft({ ...termDraft, sourceTerm: e.target.value })
                  }
                />
              </label>
              <label>
                번역 용어
                <input
                  required
                  maxLength={160}
                  value={termDraft.targetTerm}
                  disabled={Boolean(busy)}
                  onChange={(e) =>
                    setTermDraft({ ...termDraft, targetTerm: e.target.value })
                  }
                />
              </label>
              <label>
                설명
                <input
                  maxLength={200}
                  value={termDraft.note}
                  disabled={Boolean(busy)}
                  onChange={(e) =>
                    setTermDraft({ ...termDraft, note: e.target.value })
                  }
                />
              </label>
              <button disabled={Boolean(busy)}>＋ 용어 추가</button>
            </form>
            <p className="muted">
              {glossaryDraft.length}/200개 · 현재 번역에 {doc.glossary.length}개
              적용 중
            </p>
            <div className="records-table">
              {glossaryDraft.map((term, i) => (
                <article key={`${term.sourceTerm}-${i}`}>
                  <div>
                    <strong>
                      {term.sourceTerm} → {term.targetTerm}
                    </strong>
                    <small>{term.note}</small>
                  </div>
                  <button
                    disabled={Boolean(busy)}
                    aria-label={`${term.sourceTerm} 용어 삭제`}
                    onClick={() =>
                      setGlossaryDraft((old) => old.filter((_, n) => n !== i))
                    }
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
            <div className="action-row">
              <button
                className="primary"
                disabled={Boolean(busy)}
                onClick={() => {
                  setDoc((old) => ({ ...old, glossary: glossaryDraft }));
                  setNotice(
                    "용어집을 현재 번역에 적용했습니다. 다음 번역부터 반영됩니다.",
                  );
                }}
              >
                현재 번역에 적용
              </button>
              <button
                disabled={Boolean(busy) || !glossaryName.trim()}
                onClick={saveGlossary}
              >
                용어집 저장
              </button>
              <button
                disabled={!glossaryDraft.length}
                onClick={() =>
                  download(
                    glossaryCsv(glossaryDraft),
                    `${safeFilename(glossaryName)}.csv`,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                CSV 다운로드
              </button>
              <button
                disabled={!glossaryDraft.length}
                onClick={() =>
                  download(
                    glossaryDraft
                      .map(
                        (t) => `${t.sourceTerm} → ${t.targetTerm}\n${t.note}`,
                      )
                      .join("\n\n"),
                    `${safeFilename(glossaryName)}.txt`,
                  )
                }
              >
                TXT 다운로드
              </button>
            </div>
          </section>
        )}
        {screen === "settings" && (
          <Settings
            options={doc.options}
            change={(options) => setDoc((old) => ({ ...old, options }))}
            busy={Boolean(busy)}
          />
        )}{" "}
        {screen === "guide" && <Guide />}
        <Modal
          open={keyDialog}
          title="본인 Gemini 키를 등록해주세요"
          close={() => setKeyDialog(false)}
        >
          <p>회원님 본인의 Gemini 키가 있어야 번역을 실행할 수 있습니다.</p>
          <a
            className="button primary"
            href={`${MAIN_SITE}/api-settings`}
            target="_blank"
            rel="noopener noreferrer"
          >
            본인 키 등록 화면 열기
          </a>
          <button onClick={() => setKeyDialog(false)}>닫기</button>
        </Modal>
        <Modal
          open={Boolean(pending)}
          title={
            pending?.type === "remove"
              ? "프로젝트 삭제"
              : pending?.type === "import"
                ? "JSON 백업 미리보기"
                : "현재 작업 확인"
          }
          close={() => setPending(null)}
        >
          {pending?.type === "remove" ? (
            <p>
              ‘{pending.project.title}’을 보관함에서 삭제합니다. 삭제 전에
              필요한 백업을 다운로드하세요.
            </p>
          ) : pending?.type === "import" ? (
            <>
              <p>
                <strong>{pending.backup.title || "불러온 작업"}</strong>
              </p>
              <p>
                원문{" "}
                {unicodeLength(
                  pending.backup.document.sourceText,
                ).toLocaleString()}
                자 · 번역문{" "}
                {unicodeLength(
                  pending.backup.document.translationText,
                ).toLocaleString()}
                자 · 생성{" "}
                {new Date(pending.backup.exportedAt).toLocaleString("ko-KR")}
              </p>
              <p>새 작업으로 불러오며 보관함에 자동 저장하지 않습니다.</p>
              {dirty && (
                <p className="caution">
                  현재 미저장 작업이 있습니다. 필요한 내용은 저장·백업한 뒤
                  불러오세요.
                </p>
              )}
            </>
          ) : (
            <p>
              현재 미저장 작업을 바꿉니다. 필요한 내용은 저장하거나 JSON 백업을
              다운로드한 뒤 진행하세요.
            </p>
          )}
          <div className="action-row">
            <button onClick={() => setPending(null)}>취소</button>
            {pending?.type !== "remove" && dirty && (
              <button onClick={exportBackup}>현재 작업 백업</button>
            )}
            <button
              className={pending?.type === "remove" ? "danger" : "primary"}
              onClick={confirmPending}
            >
              {pending?.type === "remove"
                ? "선택한 프로젝트 삭제"
                : pending?.type === "import"
                  ? "새 작업으로 불러오기"
                  : "계속 진행"}
            </button>
          </div>
        </Modal>
        <Modal
          open={Boolean(selectedTerm)}
          title="용어 설명"
          close={() => setSelectedTerm(null)}
        >
          <p>
            <strong>
              {selectedTerm?.sourceTerm} → {selectedTerm?.targetTerm}
            </strong>
          </p>
          <p>{selectedTerm?.explanation}</p>
        </Modal>
        <Modal
          open={reverseOpen}
          title="원문·번역문·역번역 비교"
          close={() => setReverseOpen(false)}
        >
          {reverseStale && (
            <p className="banner caution">
              현재 수정본과 다른 시점의 역번역입니다. 다시 실행해 확인해주세요.
            </p>
          )}
          <div className="reverse-grid">
            <section>
              <h3>원문</h3>
              <pre>{doc.sourceText}</pre>
            </section>
            <section>
              <h3>현재 번역문</h3>
              <pre>{doc.translationText}</pre>
            </section>
            <section>
              <h3>역번역</h3>
              <pre>{doc.reverseText}</pre>
            </section>
          </div>
          <p className="muted">
            의미를 직접 비교하는 참고 자료입니다. 유사한 역번역이 정확한 번역을
            보장하지 않습니다.
          </p>
        </Modal>
      </main>
    </div>
  );
}
export function Studio({ email }: { email: string }) {
  const pathname = usePathname(),
    router = useRouter();
  const candidate = pathname.split("/")[1];
  const screen = SCREENS.some((s) => s.id === candidate)
    ? (candidate as Screen)
    : "dashboard";
  return (
    <Workspace
      email={email}
      screen={screen}
      navigate={(s) => router.push(`/${s}`)}
    />
  );
}
