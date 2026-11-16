"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  COMPOSITE_PRESETS,
  DEFAULT_COMPOSITE,
  normalizeComposite,
  resolveSize,
  subAreaPercent,
  type CompositeSettings,
} from "@/lib/batch/composite";
import {
  canvasToBlob,
  readBitmap,
  renderComposite,
} from "@/lib/batch/compositeRender";
import {
  buildJobs,
  compositeNames,
  manifestCsv,
  parseTable,
  rowsFromFileNames,
  type ProductJobDraft,
  type TableRow,
} from "@/lib/batch/productJobs";
import { runQueue } from "@/lib/batch/runQueue";
import { ANCHORS, ANCHOR_LABELS, type Anchor } from "@/lib/batch/layout";
import {
  PRODUCT_MSG_READY,
  PRODUCT_MSG_RESULT,
  PRODUCT_PHOTO_MAX_BYTES,
  PRODUCT_RESULT_MAX_BYTES,
  productSenderOrigin,
  readProductJob,
  readProductSaved,
} from "@/lib/productPhotoHandoff";
import { settingsVersion } from "@/lib/batch/composite";

const STORAGE_SETTINGS_KEY = "bnc-product-batch-settings-v1";

interface RenderResultItem {
  key: string;
  code: string;
  option: string;
  label: string;
  productId: string | null;
  main: string;
  subs: string[];
  resultName: string;
  blob?: Blob;
  thumbUrl?: string;
  status: "done" | "failed";
  error?: string;
  returned?: string;
  /** 실제 저장 크기(예: 1000x1000) — 「메인 원본 크기」면 상품마다 다름 */
  size?: string;
}

export function ProductBatchBoard() {
  // 4단계 파이프라인 스텝 (1: 작업표/짝짓기, 2: 합성규칙/미리보기, 3: 일괄실행/중단, 4: 결과/반환)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // 테이블 파싱 및 파일
  const [tableText, setTableText] = useState<string>("");
  const [tableRows, setTableRows] = useState<TableRow[]>([]);
  const [filesMap, setFilesMap] = useState<Map<string, File>>(new Map());
  const [commonSubFile, setCommonSubFile] = useState<File | null>(null);
  const [subMode, setSubMode] = useState<"common" | "individual">("common");

  // 짝짓기 결과
  const [jobs, setJobs] = useState<ProductJobDraft[]>([]);
  const [orphans, setOrphans] = useState<string[]>([]);
  const [tableErrors, setTableErrors] = useState<string[]>([]);
  const [filterProblemsOnly, setFilterProblemsOnly] = useState<boolean>(false);
  const [isLinkedMode, setIsLinkedMode] = useState<boolean>(false);

  // 합성 설정
  const [settings, setSettings] = useState<CompositeSettings>(DEFAULT_COMPOSITE);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  // 실행 및 프로그레스 상태
  const [running, setRunning] = useState<boolean>(false);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [currentRunningKey, setCurrentRunningKey] = useState<string | null>(null);
  const [results, setResults] = useState<RenderResultItem[]>([]);
  const [streamRecent, setStreamRecent] = useState<RenderResultItem[]>([]);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const linkedJobId = useRef<string | null>(null);
  const senderOriginRef = useRef<string | null>(null);
  const senderLabelRef = useRef<string>("상세페이지");

  // 성능 메트릭스
  const [startTime, setStartTime] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // 알림 메시지
  const [notice, setNotice] = useState<string | null>(null);
  /** 미리보기 상품의 실제 저장 크기·서브 면적(%) */
  const [previewInfo, setPreviewInfo] = useState<{ width: number; height: number; area: number } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "done">("idle");

  // 1. 설정 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) setSettings(normalizeComposite(JSON.parse(saved)));
    } catch {
      // ignore
    }
  }, []);

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
        if ("error" in got) {
          setNotice(`${label}에서 받은 자료에 문제가 있습니다: ${got.error}`);
          return;
        }
        const map = new Map<string, File>();
        const list: ProductJobDraft[] = got.products.map((p) => {
          const photos = p.photos.map((ph, i) => {
            const ref = `${p.productId}#${i}`;
            map.set(ref, new File([ph.file], ph.ref.split("/").pop() || `${ph.role}.jpg`, { type: ph.file.type }));
            return { role: ph.role, ref };
          });
          return {
            key: p.productId,
            productId: p.productId,
            code: p.label,
            option: "",
            label: p.label,
            photos,
            baseRevision: p.baseRevision,
            problems: [],
            status: "ready" as const,
          };
        });
        linkedJobId.current = got.jobId;
        setIsLinkedMode(true);
        setFilesMap(map);
        setJobs(list);
        setStep(2); // 상품을 받았으므로 2단계(합성 규칙 & 미리보기)로 직행
        setNotice(`📥 ${label}에서 상품 ${list.length}개를 받았습니다. 합성 규칙을 확인하고 [일괄 실행]을 진행하세요.`);
        return;
      }
      const saved = linkedJobId.current ? readProductSaved(e.origin, e.data, linkedJobId.current, origin) : null;
      if (saved) {
        setResults((xs) =>
          xs.map((r) =>
            r.productId === saved.productId
              ? { ...r, returned: saved.ok ? "saved" : saved.error || "저장 실패" }
              : r
          )
        );
      }
    };
    window.addEventListener("message", onMessage);
    window.opener.postMessage({ type: PRODUCT_MSG_READY }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const updateSettings = (patch: Partial<CompositeSettings>) => {
    setSettings((prev) => {
      const next = normalizeComposite({ ...prev, ...patch });
      try {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 2. 파일 추가 핸들러
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    // 2026-11-16: 사진 한 장 25MB까지(전달로 받는 사진·예전 합성 화면과 같은 기준) — 넘는 파일은 빼고 알림
    const list = images.filter((f) => f.size <= PRODUCT_PHOTO_MAX_BYTES);
    const skipped = images.length - list.length;
    if (!list.length) {
      if (skipped) setNotice(`⚠️ 25MB를 넘는 사진 ${skipped}개는 넣지 않았습니다. 크기를 줄여 다시 넣어 주세요.`);
      return;
    }

    setFilesMap((prev) => {
      const next = new Map(prev);
      for (const f of list) {
        next.set(f.name, f);
      }
      return next;
    });
    setNotice(
      `📥 ${list.length}개의 사진 파일을 추가했습니다.` +
        (skipped ? ` (25MB를 넘는 ${skipped}개는 넣지 않았습니다)` : ""),
    );
  }, []);

  // 3. 작업표 텍스트 또는 파일 변경 시 짝짓기 재계산 (연결 모드에서는 건너뜀 - F09 방어)
  useEffect(() => {
    if (isLinkedMode || linkedJobId.current) return;

    let parsedRows = tableRows;
    if (tableText.trim()) {
      const { rows, errors } = parseTable(tableText);
      parsedRows = rows;
      setTableRows(rows);
      setTableErrors(errors);
    } else if (filesMap.size > 0 && !tableRows.length) {
      // 작업표 텍스트가 없으면 파일명 규칙에서 추출 시도
      const autoRows = rowsFromFileNames(Array.from(filesMap.keys()));
      if (autoRows.length) {
        parsedRows = autoRows;
        setTableRows(autoRows);
      }
    }

    if (parsedRows.length > 0) {
      const fileNames = Array.from(filesMap.keys());
      const commonName = subMode === "common" && commonSubFile ? commonSubFile.name : undefined;
      const { jobs: builtJobs, orphans: orphanList } = buildJobs(parsedRows, fileNames, commonName);
      setJobs(builtJobs);
      setOrphans(orphanList);
    } else {
      setJobs([]);
      setOrphans(Array.from(filesMap.keys()));
    }
  }, [tableText, filesMap, commonSubFile, subMode, isLinkedMode]);

  // 클립보드 붙여넣기 감지
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // 텍스트에리어 안에 포커스된 경우 기본 동작 허용
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") return;

      const text = e.clipboardData?.getData("text/plain");
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);

      if (text && (text.includes("\t") || text.includes(","))) {
        e.preventDefault();
        setTableText(text);
        setNotice("📋 클립보드 표 데이터를 붙여넣었습니다.");
      } else if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // 4. 미리보기 실시간 렌더링
  const validJobs = jobs.filter((j) => j.status === "ready");
  const targetJob = validJobs[previewIndex] || validJobs[0] || null;

  useEffect(() => {
    const box = previewCanvasRef.current;
    if (!box) return;
    if (!targetJob) {
      box.replaceChildren();
      return;
    }

    let alive = true;
    const currentBox = box;
    async function draw() {
      if (!targetJob || !currentBox) return;
      const mainRef = targetJob.photos.find((p) => p.role === "main")?.ref;
      const subRefs = targetJob.photos.filter((p) => p.role === "sub").map((p) => p.ref);

      const mainFile = mainRef ? filesMap.get(mainRef) : null;
      if (!mainFile) return;

      try {
        const mainBm = await readBitmap(mainFile);
        const subBms: ImageBitmap[] = [];
        for (const sr of subRefs) {
          const sf = filesMap.get(sr) || (sr === commonSubFile?.name ? commonSubFile : null);
          if (sf) subBms.push(await readBitmap(sf));
        }

        if (!alive || !currentBox) {
          mainBm.close();
          subBms.forEach((b) => b.close());
          return;
        }

        // 뷰파인더용 캔버스 (스케일 0.5로 가볍게 렌더링)
        const size = resolveSize(settings, mainBm.width, mainBm.height);
        const aspects = subBms.map((b) => b.width / Math.max(1, b.height));
        setPreviewInfo({ ...size, area: subAreaPercent(aspects, { ...settings, ...size }) });
        const canvas = renderComposite(mainBm, subBms, settings, 0.5);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.objectFit = "contain";
        canvas.style.display = "block";
        currentBox.replaceChildren(canvas);

        mainBm.close();
        subBms.forEach((b) => b.close());
      } catch (err) {
        console.error("Preview render failed", err);
      }
    }

    void draw();
    return () => {
      alive = false;
    };
  }, [targetJob, settings, filesMap, commonSubFile]);

  // 5. 일괄 실행 (Run Queue)
  const startBatchExecution = async () => {
    if (!validJobs.length) {
      setNotice("합성 가능한 정상 항목이 없습니다. 작업표와 사진을 확인해 주세요.");
      return;
    }

    setStep(3);
    setRunning(true);
    setProgressCount(0);
    setResults([]);
    setStreamRecent([]);
    const startTs = Date.now();
    setStartTime(startTs);

    const ac = new AbortController();
    abortCtrlRef.current = ac;

    const names = compositeNames(
      validJobs.map((j) => ({ code: j.code, option: j.option })),
      { prefix: settings.prefix, template: settings.template, ext: settings.format }
    );

    interface BatchQueueItem {
      key: string;
      status: "ready" | "running" | "done" | "failed" | "skipped";
      job: ProductJobDraft;
      resultName: string;
    }

    const runItems: BatchQueueItem[] = validJobs.map((j, idx) => ({
      key: j.key,
      status: "ready" as const,
      job: j,
      resultName: names[idx],
    }));

    const finalResults: RenderResultItem[] = [];

    await runQueue<BatchQueueItem>(
      runItems,
      async (item: BatchQueueItem) => {
        setCurrentRunningKey(item.key);
        const { job, resultName } = item;
        const mainRef = job.photos.find((p: { role: string; ref: string }) => p.role === "main")?.ref;
        const subRefs = job.photos.filter((p: { role: string; ref: string }) => p.role === "sub").map((p: { role: string; ref: string }) => p.ref);

        const mainFile = mainRef ? filesMap.get(mainRef) : null;
        if (!mainFile) throw new Error(`메인 사진 [${mainRef}]을 찾을 수 없습니다.`);

        const mainBm = await readBitmap(mainFile);
        const subBms: ImageBitmap[] = [];
        for (const sr of subRefs) {
          const sf = filesMap.get(sr) || (sr === commonSubFile?.name ? commonSubFile : null);
          if (sf) subBms.push(await readBitmap(sf));
        }

        const canvas = renderComposite(mainBm, subBms, settings, 1);
        const blob = await canvasToBlob(canvas, settings);
        const size = `${canvas.width}x${canvas.height}`;
        mainBm.close();
        subBms.forEach((b) => b.close());

        const thumbUrl = URL.createObjectURL(blob);
        const resItem: RenderResultItem = {
          key: job.key,
          code: job.code,
          option: job.option,
          label: job.label,
          productId: job.productId,
          main: mainRef || "",
          subs: subRefs,
          resultName,
          blob,
          thumbUrl,
          status: "done",
          returned: "",
          size,
        };

        // 부모 창(상세페이지 또는 쇼핑몰) 연결 시 개별 결과 즉시 전송 (P2 / M1)
        if (linkedJobId.current && job.productId && senderOriginRef.current && window.opener && !window.opener.closed) {
          if (blob.size <= PRODUCT_RESULT_MAX_BYTES) {
            window.opener.postMessage(
              {
                type: PRODUCT_MSG_RESULT,
                jobId: linkedJobId.current,
                productId: job.productId,
                file: blob,
                settingsVersion: settingsVersion(settings),
              },
              senderOriginRef.current
            );
            resItem.returned = "sending";
          } else {
            resItem.returned = "10MB 초과로 반환 실패";
          }
        }

        finalResults.push(resItem);
        setStreamRecent((prev) => [resItem, ...prev.slice(0, 5)]);
      },
      {
        signal: ac.signal,
        onUpdate: (u) => {
          if (u.status === "done" || u.status === "failed") {
            setProgressCount((c) => {
              const next = c + 1;
              const elapsed = Math.max(0.1, (Date.now() - startTs) / 1000);
              setElapsedSec(Math.round(elapsed));
              setFps(Number((next / elapsed).toFixed(1)));
              return next;
            });
          }
          if (u.status === "failed") {
            const item = runItems.find((x) => x.key === u.key);
            if (item) {
              finalResults.push({
                key: item.job.key,
                code: item.job.code,
                option: item.job.option,
                label: item.job.label,
                productId: item.job.productId,
                main: item.job.photos.find((p) => p.role === "main")?.ref || "",
                subs: item.job.photos.filter((p) => p.role === "sub").map((p) => p.ref),
                resultName: item.resultName,
                status: "failed",
                error: u.error,
              });
            }
          }
        },
      }
    );

    setRunning(false);
    setCurrentRunningKey(null);
    setResults((prev) =>
      finalResults.map((fr) => {
        const old = prev.find((p) => p.productId && p.productId === fr.productId);
        return old && old.returned === "saved" ? { ...fr, returned: "saved" } : fr;
      })
    );
    setStep(4);
  };

  // 미리보기 상품 한 장을 원래 크기 PNG로 클립보드에 복사(M1) — 다른 프로그램에 바로 붙여넣기
  const copyPreviewToClipboard = async () => {
    if (!targetJob) return;
    const mainRef = targetJob.photos.find((p) => p.role === "main")?.ref;
    const mainFile = mainRef ? filesMap.get(mainRef) : null;
    if (!mainFile) return;
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setNotice("이 브라우저는 그림 복사를 지원하지 않습니다. 실행 뒤 저장(ZIP)으로 받아 주세요.");
      return;
    }
    setCopyState("copying");
    try {
      const mainBm = await readBitmap(mainFile);
      const subBms: ImageBitmap[] = [];
      for (const sr of targetJob.photos.filter((p) => p.role === "sub").map((p) => p.ref)) {
        const sf = filesMap.get(sr) || (sr === commonSubFile?.name ? commonSubFile : null);
        if (sf) subBms.push(await readBitmap(sf));
      }
      const canvas = renderComposite(mainBm, subBms, settings, 1);
      mainBm.close();
      subBms.forEach((b) => b.close());
      // 클립보드는 PNG만 받으므로 저장 형식과 상관없이 PNG로 복사
      const png = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("그림을 만들지 못했습니다."))), "image/png")
      );
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setCopyState("done");
      setNotice(`📋 ${targetJob.code} 합성 결과(${canvas.width}×${canvas.height} PNG)를 복사했습니다. 다른 프로그램에 붙여 넣으세요.`);
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
      setNotice("브라우저가 클립보드 복사를 막았습니다. 창을 한 번 누른 뒤 다시 시도하거나, 실행 뒤 저장(ZIP)으로 받아 주세요.");
    }
  };

  // 긴급 중단
  const stopExecution = () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      setNotice("⏸️ 사용자의 요청으로 일괄 합성을 즉시 중단했습니다. 현재까지 완료된 결과는 보존됩니다.");
    }
  };

  // ZIP 다운로드
  const downloadZip = async () => {
    const successList = results.filter((r) => r.status === "done" && r.blob);
    if (!successList.length) return;

    const zip = new JSZip();
    for (const item of successList) {
      if (item.blob) {
        zip.file(item.resultName, item.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = `AIMaster_상품대표사진_합성_${successList.length}장.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  // CSV 내보내기
  const exportCsv = () => {
    const rowsForCsv = results.map((r) => ({
      code: r.code,
      option: r.option,
      label: r.label,
      productId: r.productId,
      main: r.main,
      subs: r.subs,
      result: r.resultName,
      status: r.status,
      error: r.error || "",
      returned: "",
      size: r.size || "",
    }));
    const csvContent = manifestCsv(rowsForCsv, settingsVersion(settings), new Date().toISOString());
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `AIMaster_상품합성_결과매핑표_${results.length}건.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  // P2 원래 상품으로 반환 핸들러
  const handleReturnToProduct = () => {
    const successList = results.filter((r) => r.status === "done" && r.blob);
    if (!successList.length) {
      setNotice("반환할 성공 결과물이 없습니다.");
      return;
    }

    const targetOrigin = senderOriginRef.current;
    const targetLabel = senderLabelRef.current;

    // 부모 창(상세페이지 또는 쇼핑몰)에 postMessage로 개별 전송 — 이미 저장된 상품은 다시 보내지 않는다(중복 저장 방지)
    const jobId = linkedJobId.current;
    if (window.opener && !window.opener.closed && targetOrigin && jobId) {
      const sentIds = new Set<string>();
      for (const r of successList) {
        if (r.productId && r.blob && r.returned !== "saved" && r.blob.size <= PRODUCT_RESULT_MAX_BYTES) {
          window.opener.postMessage(
            {
              type: PRODUCT_MSG_RESULT,
              jobId,
              productId: r.productId,
              file: r.blob,
              settingsVersion: settingsVersion(settings),
            },
            targetOrigin
          );
          sentIds.add(r.productId);
        }
      }
      setResults((xs) => xs.map((r) => (r.productId && sentIds.has(r.productId) ? { ...r, returned: "sending" } : r)));
      setNotice(
        sentIds.size
          ? `📤 ${targetLabel}으로 ${sentIds.size}건을 보냈습니다. 저장 결과는 표의 「반환」 칸에 표시됩니다.`
          : `이미 ${targetLabel}에 모두 저장되어 다시 보낼 결과가 없습니다.`
      );
    } else {
      setNotice(
        `✅ ${successList.length}건의 대표사진 반환 준비 완료. [ZIP 일괄 다운로드] 또는 [CSV 내보내기]를 통해 원클릭 동기화하세요.`
      );
    }
  };

  // 문제 항목 필터링
  const displayedJobs = filterProblemsOnly ? jobs.filter((j) => j.status !== "ready") : jobs;

  return (
    <div className="fe-wrap" style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* 4단계 파이프라인 배너 */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap", // 2026-11-16 ECOM-08: 좁은 화면에서 알약이 한 글자씩 세로로 쪼개지지 않게 줄바꿈
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          marginBottom: 20,
          background: "#FFFFFF",
          border: "2px solid #1C1917",
          borderRadius: 14,
          boxShadow: "0 4px 0 #1C1917",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {[
            { num: 1, label: "자료 입력 & 짝 확인" },
            { num: 2, label: "합성 규칙 & 미리보기" },
            { num: 3, label: "일괄 실행 & 중단" },
            { num: 4, label: "결과 & 상품 반환" },
          ].map((sItem) => (
            <div key={sItem.num} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setStep(sItem.num as 1 | 2 | 3 | 4)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: step === sItem.num ? "#FACC15" : step > sItem.num ? "#ECFDF5" : "#F4F4F5",
                  color: step === sItem.num ? "#1C1917" : step > sItem.num ? "#065F46" : "#71717A",
                  border: "1.5px solid #1C1917",
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: step === sItem.num ? "#1C1917" : step > sItem.num ? "#10B981" : "#D4D4D8",
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  {step > sItem.num ? "✓" : sItem.num}
                </span>
                {sItem.label}
              </button>
              {sItem.num < 4 && <span style={{ color: "#A8A29E", fontSize: 13, fontWeight: "bold" }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="fe-badge" style={{ whiteSpace: "nowrap" }}>0원 로컬 브라우저 연산</span>
          <span className="fe-badge leaf" style={{ whiteSpace: "nowrap" }}>EXIF 정보 자동 제거</span>
        </div>
      </div>

      {notice && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
            background: "#FEFCE8",
            border: "1.5px solid #FACC15",
            borderRadius: 10,
            padding: "10px 16px",
            color: "#854D0E",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      )}

      {/* ================= STEP 1: 자료 입력 & 짝 확인 ================= */}
      {step === 1 && (
        <div>
          {/* 툴바 & 모드 선택 */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              marginBottom: 16,
              background: "#FFF",
              border: "1.5px solid #1C1917",
              borderRadius: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label className="btn-3d btn-3d-pop" style={{ padding: "8px 16px", fontSize: 13 }}>
                <ImagePlus size={15} />
                사진 대량 추가 (파일/폴더)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              <button
                type="button"
                className="btn-3d"
                style={{
                  background: "#FFF",
                  color: "#1C1917",
                  border: "1.5px solid #1C1917",
                  boxShadow: "0 2px 0 #1C1917",
                  padding: "8px 14px",
                  fontSize: 13,
                }}
                onClick={() => {
                  const demo =
                    "상품코드\t옵션\t상품명\t메인사진\t서브사진\nPROD-1001\t화이트 Free\t데일리 린넨 셔츠\t1001_main.jpg\t1001_sub1.jpg\nPROD-1002\t블랙 M\t슬림 텐셀 슬랙스\t1002_main.jpg\t1002_sub1.jpg\nPROD-1003\t네이비 L\t크루넥 니트\t1003_main.jpg\t\nPROD-1004\t블루 XL\t스트라이프 셔츠\t\t1004_sub1.jpg";
                  setTableText(demo);
                  setNotice("샘플 표 데이터를 채웠습니다.");
                }}
              >
                <FileSpreadsheet size={15} />
                샘플 표 불러오기
              </button>

              <span style={{ fontSize: 13, fontWeight: 800, color: "#78716C", marginLeft: 6 }}>
                사진 파일 {filesMap.size}개 등록됨 · 작업 행 {jobs.length}건
              </span>
              {/* 2026-11-16: 실제 제한 그대로 안내(입력 25MB·돌려보내기 10MB, 결과는 움직이지 않는 사진) */}
              <span style={{ width: "100%", fontSize: 12, fontWeight: 700, color: "#78716C" }}>
                JPG·PNG·WEBP 사진 한 장 25MB까지 · 결과는 움직이지 않는 {settings.format === "png" ? "PNG" : "JPG"} 한 장 ·
                상세페이지·쇼핑몰로 돌려보내는 결과는 10MB까지(넘으면 「반환 실패」, ZIP으로 받기)
              </span>
            </div>

            {/* 서브 모드 선택 라디오 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "#FAF8F5",
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #E5DFD7",
                fontSize: 13,
              }}
            >
              <b style={{ color: "#44403C" }}>서브 이미지 적용 방식:</b>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontWeight: 700 }}>
                <input
                  type="radio"
                  name="subMode"
                  checked={subMode === "common"}
                  onChange={() => setSubMode("common")}
                />
                [옵션 A] 공용 서브 1개 적용
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontWeight: 700 }}>
                <input
                  type="radio"
                  name="subMode"
                  checked={subMode === "individual"}
                  onChange={() => setSubMode("individual")}
                />
                [옵션 B] 상품별 개별 서브 매칭
              </label>
            </div>
          </div>

          {/* 공용 서브 선택 영역 (공용 서브 모드일 때만) */}
          {subMode === "common" && (
            <div
              className="card"
              style={{
                padding: "14px 20px",
                marginBottom: 16,
                background: "#FEF3C7",
                border: "1.5px solid #F59E0B",
                borderRadius: 12,
                display: "flex",
                flexWrap: "wrap", // ECOM-08: 좁은 화면에서 선택 버튼이 세로로 쪼개지지 않게
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 240px", minWidth: 0 }}>
                <span style={{ fontSize: 24 }}>🔖</span>
                <div>
                  <b style={{ fontSize: 14, color: "#92400E" }}>전체 상품에 합성할 [공용 서브 이미지]</b>
                  <p style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>
                    당일 발송 뱃지, 브랜드 로고, 혜택 스탬프 등 1장의 투명 이미지를 모든 상품 메인에 일괄 합성합니다.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                {commonSubFile ? (
                  // ECOM-09: 띄어쓰기 없는 긴 파일 이름이 문서 폭을 넓히지 않게 어디서든 줄바꿈
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1C1917", minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" }}>
                    선택됨: <b>{commonSubFile.name}</b>
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "#92400E" }}>공용 서브가 아직 선택되지 않았습니다</span>
                )}
                <label className="btn-3d" style={{ background: "#FFF", padding: "6px 14px", fontSize: 12, border: "1.5px solid #1C1917", whiteSpace: "nowrap" }}>
                  {commonSubFile ? "공용 서브 교체" : "+ 공용 서브 선택"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > PRODUCT_PHOTO_MAX_BYTES) setNotice("⚠️ 25MB를 넘는 사진은 공용 서브로 쓸 수 없습니다.");
                      else if (f) setCommonSubFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 엑셀/클립보드 입력 텍스트에리어 (접이식) */}
          <details
            style={{
              marginBottom: 16,
              background: "#FFF",
              border: "1.5px solid #1C1917",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#1C1917" }}>
              📝 엑셀 셀 복사/붙여넣기 창 열기 (Ctrl+C 한 표 데이터를 여기에 Ctrl+V)
            </summary>
            <div style={{ marginTop: 12 }}>
              <textarea
                value={tableText}
                onChange={(e) => setTableText(e.target.value)}
                placeholder="엑셀에서 [상품코드, 옵션, 상품명, 대표사진파일명, 서브사진파일명] 열을 복사하여 붙여넣으세요..."
                rows={5}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: 12,
                  padding: 10,
                  border: "1px solid #D4D4D8",
                  borderRadius: 8,
                }}
              />
              <p style={{ fontSize: 11, color: "#71717A", marginTop: 4 }}>
                * 탭 구분(TSV) 또는 쉼표 구분(CSV)을 자동으로 인식합니다. 머리줄에 「상품코드, 대표사진, 서브사진」이 있으면 자동으로 열을 매칭합니다.
              </p>
            </div>
          </details>

          {/* 유효성 검사 상태 요약 바 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              background: "#FFFBEB",
              border: "1.5px solid #FDE68A",
              borderRadius: 10,
              padding: "10px 16px",
              marginBottom: 14,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span style={{ color: "#059669" }}>🟢 합성 가능: {validJobs.length}건</span>
              <span style={{ color: "#D97706" }}>
                🟠 오류/누락: {jobs.length - validJobs.length}건
              </span>
              <span style={{ color: "#71717A" }}>📁 작업표에 매칭 안 된 남는 파일: {orphans.length}개</span>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#1C1917" }}>
              <input
                type="checkbox"
                checked={filterProblemsOnly}
                onChange={(e) => setFilterProblemsOnly(e.target.checked)}
              />
              오류/문제 항목만 필터링 보기
            </label>
          </div>

          {/* 상품코드 작업표 데이터 그리드 */}
          <div
            className="card"
            style={{
              background: "#FFF",
              border: "2px solid #1C1917",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              {/* ECOM-08: 좁은 화면에서는 칸을 눌러 글자를 세로로 쪼개지 말고 이 상자 안에서 가로로 스크롤 */}
              <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#FEF3C7", borderBottom: "2px solid #1C1917", whiteSpace: "nowrap" }}>
                    <th style={{ padding: "12px 14px", width: 90 }}>상태</th>
                    <th style={{ padding: "12px 14px", width: 140 }}>상품코드 (SKU)</th>
                    <th style={{ padding: "12px 14px", width: 220 }}>상품명</th>
                    <th style={{ padding: "12px 14px", width: 150 }}>메인 이미지</th>
                    <th style={{ padding: "12px 14px", width: 150 }}>서브 이미지</th>
                    <th style={{ padding: "12px 14px", width: 120 }}>옵션</th>
                    <th style={{ padding: "12px 14px" }}>검증 결과 / 사유</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#A8A29E" }}>
                        작업할 상품 데이터가 없습니다. 상단에서 <b>[사진 대량 추가]</b>를 누르거나 <b>[샘플 표 불러오기]</b>를 해보세요.
                      </td>
                    </tr>
                  ) : (
                    displayedJobs.map((j) => {
                      const mainPhoto = j.photos.find((p) => p.role === "main");
                      const subPhotos = j.photos.filter((p) => p.role === "sub");
                      const isOk = j.status === "ready";

                      return (
                        <tr
                          key={j.key}
                          style={{
                            borderBottom: "1px solid #F4E8D4",
                            background: isOk ? "#FFF" : "#FFF5F5",
                          }}
                        >
                          <td style={{ padding: "10px 14px" }}>
                            {isOk ? (
                              <span
                                style={{
                                  background: "#D1FAE5",
                                  color: "#065F46",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                정상
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: "#FEE2E2",
                                  color: "#991B1B",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                오류
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <code
                              style={{
                                background: "#F3F4F6",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: "bold",
                              }}
                            >
                              {j.code}
                            </code>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>{j.label || "(이름 없음)"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {mainPhoto ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, color: "#065F46" }}>✓ {mainPhoto.ref}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "#DC2626", fontWeight: "bold" }}>
                                ✕ 메인 사진 없음
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {subPhotos.length > 0 ? (
                              <span style={{ fontSize: 11, color: "#0284C7" }}>
                                {subPhotos.map((s) => s.ref).join(", ")}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: "#A8A29E" }}>- (서브 없음)</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#78716C" }}>{j.option || "-"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12 }}>
                            {isOk ? (
                              <span style={{ color: "#059669" }}>합성 준비 완료</span>
                            ) : (
                              <span style={{ color: "#DC2626", fontWeight: 700 }}>
                                {j.problems.join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 1단계 하단 액션 바 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#FFF",
              padding: "16px 24px",
              borderRadius: 14,
              border: "2px solid #1C1917",
              boxShadow: "0 4px 0 #1C1917",
            }}
          >
            <div>
              <b style={{ fontSize: 14, color: "#1C1917" }}>
                합성 준비된 품목: <span style={{ color: "#D97706" }}>{validJobs.length}건</span>
              </b>
              <span style={{ fontSize: 12, color: "#78716C", marginLeft: 8 }}>
                (오류 항목은 다음 단계에서 자동 제외됩니다)
              </span>
            </div>
            <button
              type="button"
              className="btn-3d btn-3d-pop"
              disabled={validJobs.length === 0}
              onClick={() => setStep(2)}
              style={{ padding: "10px 24px", fontSize: 14, fontWeight: 900 }}
            >
              다음: 2단계 합성 규칙 & 미리보기 확인 →
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: 합성 규칙 & 미리보기 ================= */}
      {step === 2 && (
        <div className="pb-split">
          {/* 좌측: 1000x1000 라이브 캔버스 뷰파인더 */}
          <div
            className="card"
            style={{
              background: "#FFF",
              padding: 24,
              borderRadius: 14,
              border: "2px solid #1C1917",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <b>👀 1:1 라이브 캔버스 합성 미리보기</b>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#78716C" }}>
                {previewInfo ? `${previewInfo.width} × ${previewInfo.height}` : `${settings.width} × ${settings.height}`} px
                {settings.sizeMode === "original" ? " (메인 원본 크기)" : ""}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: settings.background,
                border: "2px solid #1C1917",
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div ref={previewCanvasRef} style={{ width: "100%", height: "100%" }} />
              {!targetJob && (
                <div
                  role="status"
                  style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "#FAF8F5" }}
                >
                  <span style={{ fontSize: 28 }} aria-hidden="true">🖼️</span>
                  <b style={{ fontSize: 14, marginTop: 6 }}>미리 볼 상품이 없습니다</b>
                  <span style={{ fontSize: 12, color: "#78716C", marginTop: 4 }}>1단계에서 「합성 가능」 상품이 1건 이상 있어야 합니다.</span>
                </div>
              )}
            </div>

            {/* 서브 면적 표시(M1) — 참고 기준을 넘으면 안내만, 저장은 막지 않음 */}
            {previewInfo && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  background: previewInfo.area > settings.subAreaWarn ? "#FEF9C3" : "#F5F5F4",
                  border: `1px solid ${previewInfo.area > settings.subAreaWarn ? "#EAB308" : "#E7E5E4"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {previewInfo.area > settings.subAreaWarn ? "⚠️ " : "📏 "}서브 면적 {previewInfo.area}%
                  {previewInfo.area > settings.subAreaWarn
                    ? ` — 서브 사진이 커서 대표이미지가 복잡해 보일 수 있습니다(참고 기준 ${settings.subAreaWarn}%)`
                    : ` (참고 기준 ${settings.subAreaWarn}% 이하)`}
                </span>
                <button
                  type="button"
                  className="btn-3d"
                  disabled={copyState === "copying"}
                  onClick={() => void copyPreviewToClipboard()}
                  style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #1C1917", background: "#FFF" }}
                >
                  {copyState === "done" ? "✅ 복사됨" : copyState === "copying" ? "복사 중…" : "📋 결과 복사"}
                </button>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                대상 상품: <b>{targetJob?.code}</b> ({targetJob?.label || "상품"})
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn-3d"
                  style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #1C1917", background: "#FFF" }}
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                >
                  ‹ 이전
                </button>
                <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {previewIndex + 1} / {validJobs.length}
                </span>
                <button
                  type="button"
                  className="btn-3d"
                  style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #1C1917", background: "#FFF" }}
                  disabled={previewIndex >= validJobs.length - 1}
                  onClick={() => setPreviewIndex((i) => Math.min(validJobs.length - 1, i + 1))}
                >
                  다음 ›
                </button>
              </div>
            </div>
          </div>

          {/* 우측: 파라미터 조절 데크 */}
          <div
            className="card"
            style={{
              background: "#FFF",
              padding: 24,
              borderRadius: 14,
              border: "2px solid #1C1917",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16 }}>⚙️ 합성 규칙 파라미터</h3>

              {/* 규격 프리셋 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  📐 출력 캔버스 규격
                </label>
                {/* ECOM-08: 320px 폭에서 「메인 원본 크기」가 넘치거나 세로로 쪼개지지 않게 줄바꿈 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {COMPOSITE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={settings.sizeMode === "fixed" && settings.width === p.width}
                      onClick={() => updateSettings({ width: p.width, height: p.height, sizeMode: "fixed" })}
                      style={{
                        flex: "1 1 auto", whiteSpace: "nowrap",
                        padding: "6px 8px",
                        fontSize: 12,
                        fontWeight: 800,
                        border: "1.5px solid #1C1917",
                        borderRadius: 6,
                        background: settings.sizeMode === "fixed" && settings.width === p.width ? "#FACC15" : "#FFF",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    title="상품마다 메인 사진 원래 크기로 저장(200~3000px로 제한)"
                    aria-pressed={settings.sizeMode === "original"}
                    onClick={() => updateSettings({ sizeMode: "original" })}
                    style={{
                      flex: "1 1 auto", whiteSpace: "nowrap",
                      padding: "6px 8px",
                      fontSize: 12,
                      fontWeight: 800,
                      border: "1.5px solid #1C1917",
                      borderRadius: 6,
                      background: settings.sizeMode === "original" ? "#FACC15" : "#FFF",
                      cursor: "pointer",
                    }}
                  >
                    메인 원본 크기
                  </button>
                </div>
              </div>

              {/* 9-앵커 위치 선택기 */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  📍 서브 이미지 앵커 위치
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                  {ANCHORS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={settings.subAnchor === a}
                      onClick={() => updateSettings({ subAnchor: a })}
                      style={{
                        padding: "6px 4px",
                        fontSize: 11,
                        fontWeight: 700,
                        border: "1px solid #1C1917",
                        borderRadius: 6,
                        background: settings.subAnchor === a ? "#FACC15" : "#FAF8F5",
                        cursor: "pointer",
                      }}
                    >
                      {ANCHOR_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 서브 크기 비율 슬라이더 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  <span>📐 서브 크기 비율</span>
                  <span>{settings.subRatio}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  aria-label="서브 크기 비율(%)"
                  value={settings.subRatio}
                  onChange={(e) => updateSettings({ subRatio: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "#EAB308", cursor: "pointer" }}
                />
              </div>

              {/* 여백 슬라이더 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  <span>🔲 테두리 마진 & 라운드</span>
                  <span>마진 {settings.subMargin}px / 모서리 {settings.subRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  aria-label="서브 테두리 마진(px)"
                  value={settings.subMargin}
                  onChange={(e) => updateSettings({ subMargin: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "#EAB308", cursor: "pointer" }}
                />
              </div>

              {/* 서브 틀 모양·모서리(M1) */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>⭕ 서브 틀 모양</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  {([["rounded", "둥근 사각"], ["circle", "원형"]] as const).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateSettings({ subShape: v })}
                      style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontWeight: 800, border: "1.5px solid #1C1917", borderRadius: 6, background: settings.subShape === v ? "#FACC15" : "#FFF", cursor: "pointer" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {settings.subShape === "rounded" && (
                  <input
                    type="range"
                    min={0}
                    max={30}
                    aria-label="모서리 둥글기"
                    value={settings.subRadius}
                    onChange={(e) => updateSettings({ subRadius: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "#EAB308", cursor: "pointer" }}
                  />
                )}
              </div>

              {/* 테두리 굵기·색, 틀 배경(M1) */}
              <div style={{ marginBottom: 14, fontSize: 12, fontWeight: 700 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, marginBottom: 4 }}>
                  <span>🖍️ 테두리</span>
                  <span>{settings.subOutline ? `${settings.subOutlineWidth}px` : "끔"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    aria-label="테두리 굵기"
                    disabled={!settings.subOutline}
                    value={settings.subOutlineWidth}
                    onChange={(e) => updateSettings({ subOutlineWidth: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "#EAB308", cursor: "pointer" }}
                  />
                  <input
                    type="color"
                    aria-label="테두리 색"
                    disabled={!settings.subOutline}
                    value={settings.subOutlineColor}
                    onChange={(e) => updateSettings({ subOutlineColor: e.target.value })}
                    style={{ width: 34, height: 26, border: "1px solid #D4D4D8", borderRadius: 4, padding: 0, cursor: "pointer" }}
                  />
                </div>
                <div style={{ fontWeight: 800, margin: "10px 0 4px" }}>🎨 틀 배경 (사진이 틀보다 작을 때 빈 곳)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {([["#ffffff", "흰색"], ["transparent", "투명"]] as const).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateSettings({ subFrameBg: v })}
                      style={{ flex: 1, padding: "5px 8px", fontSize: 12, fontWeight: 800, border: "1.5px solid #1C1917", borderRadius: 6, background: settings.subFrameBg === v ? "#FACC15" : "#FFF", cursor: "pointer" }}
                    >
                      {label}
                    </button>
                  ))}
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <input
                      type="color"
                      aria-label="틀 배경 직접 선택"
                      value={settings.subFrameBg === "transparent" ? "#ffffff" : settings.subFrameBg}
                      onChange={(e) => updateSettings({ subFrameBg: e.target.value })}
                      style={{ width: 34, height: 26, border: "1px solid #D4D4D8", borderRadius: 4, padding: 0 }}
                    />
                    직접
                  </label>
                </div>
              </div>

              {/* 틀 안 사진 확대·위치(M1, 전체 공통) */}
              <div style={{ marginBottom: 14, fontSize: 12, fontWeight: 700 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, marginBottom: 4 }}>
                  <span>🔍 틀 안 사진 확대·위치</span>
                  <span>
                    {settings.subZoom}%
                    {(settings.subZoom !== 100 || settings.subFocusX !== 50 || settings.subFocusY !== 50) && (
                      <button
                        type="button"
                        onClick={() => updateSettings({ subZoom: 100, subFocusX: 50, subFocusY: 50 })}
                        style={{ marginLeft: 6, fontSize: 11, border: "1px solid #D4D4D8", borderRadius: 4, background: "#FFF", cursor: "pointer" }}
                      >
                        처음대로
                      </button>
                    )}
                  </span>
                </div>
                {(
                  [
                    ["subZoom", "확대", 100, 200],
                    ["subFocusX", "가로 위치(왼↔오)", 0, 100],
                    ["subFocusY", "세로 위치(위↔아래)", 0, 100],
                  ] as const
                ).map(([k, label, lo, hi]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ width: 110, color: "#57534E" }}>{label}</span>
                    <input
                      type="range"
                      min={lo}
                      max={hi}
                      value={settings[k]}
                      onChange={(e) => updateSettings({ [k]: Number(e.target.value) } as Partial<CompositeSettings>)}
                      style={{ flex: 1, accentColor: "#EAB308", cursor: "pointer" }}
                    />
                  </label>
                ))}
              </div>

              {/* 서브 면적 참고 기준(M1) — 공식 규정이 아님 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  <span>📏 서브 면적 안내 기준(참고)</span>
                  <span>{settings.subAreaWarn}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  aria-label="서브 면적 안내 기준"
                  value={settings.subAreaWarn}
                  onChange={(e) => updateSettings({ subAreaWarn: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "#EAB308", cursor: "pointer" }}
                />
                <p style={{ fontSize: 11, color: "#78716C", marginTop: 2 }}>
                  마켓 공식 규정이 아니라 보기 좋은 대표이미지를 위한 참고 기준입니다. 넘어도 저장은 그대로 됩니다.
                </p>
              </div>

              {/* 외곽선 및 그림자 체크박스 */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.subShadow}
                    onChange={(e) => updateSettings({ subShadow: e.target.checked })}
                  />
                  드롭 섀도우(입체 그림자)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.subOutline}
                    onChange={(e) => updateSettings({ subOutline: e.target.checked })}
                  />
                  테두리 켜기
                </label>
              </div>

              {/* 스마트 파일명 템플릿 */}
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="pb-name-template" style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  🏷️ 파일 이름 템플릿
                </label>
                <input
                  id="pb-name-template"
                  type="text"
                  value={settings.template}
                  onChange={(e) => updateSettings({ template: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    border: "1px solid #D4D4D8",
                    borderRadius: 6,
                  }}
                />
                <p style={{ fontSize: 11, color: "#78716C", marginTop: 4 }}>
                  예시: <code>AIM_{targetJob?.code || "SKU"}_main.jpg</code>
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="btn-3d btn-3d-pop"
                onClick={startBatchExecution}
                style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 900 }}
              >
                🚀 이 규칙으로 {validJobs.length}개 상품 일괄 합성 시작!
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px",
                  fontSize: 12,
                  background: "transparent",
                  border: "none",
                  color: "#78716C",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ← 이전: 1단계 작업표로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: 일괄 실행 & 즉시 중단 콘솔 ================= */}
      {step === 3 && (
        <div>
          <div
            className="card"
            style={{
              padding: 24,
              borderRadius: 14,
              border: "2px solid #1C1917",
              background: "#FFF",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: running ? "#EF4444" : "#10B981",
                    boxShadow: running ? "0 0 10px #EF4444" : "none",
                  }}
                />
                <h2 style={{ fontSize: 18, fontWeight: 900 }}>
                  {running
                    ? `${validJobs.length}개 상품 대표사진 일괄 합성 렌더링 중...`
                    : "일괄 합성이 완료되었습니다."}
                </h2>
              </div>

              {/* 원클릭 즉시 전체 중단 버튼 */}
              {running && (
                <button
                  type="button"
                  onClick={stopExecution}
                  style={{
                    background: "#DC2626",
                    color: "#FFF",
                    border: "2px solid #991B1B",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: "0 3px 0 #7F1D1D",
                  }}
                >
                  ⏸️ 전체 일괄 즉시 중단
                </button>
              )}
            </div>

            {/* 프로그레스 바 */}
            <div
              style={{
                width: "100%",
                height: 14,
                background: "#E4E4E7",
                borderRadius: 7,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${validJobs.length ? Math.round((progressCount / validJobs.length) * 100) : 0}%`,
                  background: "linear-gradient(90deg, #FACC15, #10B981)",
                  borderRadius: 7,
                  transition: "width 0.2s",
                }}
              />
            </div>

            {/* 4대 메트릭 요약 그리드 */}
            <div className="pb-g4">
              <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>진행률</span>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#2563EB", marginTop: 4 }}>
                  {validJobs.length ? ((progressCount / validJobs.length) * 100).toFixed(1) : 0}%
                </p>
                <small style={{ fontSize: 11, color: "#9CA3AF" }}>
                  {progressCount} / {validJobs.length} 완료
                </small>
              </div>

              <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>처리 속도</span>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#1C1917", marginTop: 4 }}>
                  {fps} FPS
                </p>
                <small style={{ fontSize: 11, color: "#9CA3AF" }}>초당 렌더 프레임수</small>
              </div>

              <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>경과 시간</span>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#1C1917", marginTop: 4 }}>
                  {elapsedSec}초 소요
                </p>
                <small style={{ fontSize: 11, color: "#9CA3AF" }}>고속 브라우저 렌더</small>
              </div>

              <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>브라우저 메모리 부하</span>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#10B981", marginTop: 4 }}>안전</p>
                <small style={{ fontSize: 11, color: "#9CA3AF" }}>Canvas 힙 안정</small>
              </div>
            </div>
          </div>

          {/* 최근 생성된 스트림 피드 */}
          <div
            className="card"
            style={{
              padding: 20,
              borderRadius: 14,
              border: "1.5px solid #1C1917",
              background: "#FFF",
            }}
          >
            <b style={{ fontSize: 14, display: "block", marginBottom: 12 }}>
              ⚡ 실시간 생성 피드 (최근 완료된 항목)
            </b>
            <div className="pb-g6">
              {streamRecent.map((item) => (
                <div
                  key={item.key}
                  style={{
                    background: "#FAFAFA",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: 8,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 6,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundImage: item.thumbUrl ? `url(${item.thumbUrl})` : "none",
                      backgroundColor: "#E5E7EB",
                      marginBottom: 6,
                    }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}>
                    {item.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: 결과 리포트 & 원래 상품 반환 ================= */}
      {step === 4 && (
        <div>
          {/* 상단 축하 히어로 박스 */}
          <div
            className="card"
            style={{
              background: "#FEFCE8",
              border: "2px solid #FACC15",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexWrap: "wrap", // ECOM-08: 좁은 화면에서 제목이 한 글자씩 세로로 쪼개지지 않게(버튼은 아래 줄로)
              gap: 16,
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              boxShadow: "0 4px 12px rgba(250, 204, 21, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 260px", minWidth: 0 }}>
              <span style={{ fontSize: 44 }}>🎉</span>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1C1917" }}>
                  상품 대표사진 일괄 합성이 완료되었습니다!
                </h2>
                <p style={{ fontSize: 13, color: "#854D0E", marginTop: 4 }}>
                  총 {results.length}개 상품 중{" "}
                  <b>{results.filter((r) => r.status === "done").length}개 성공</b>,{" "}
                  <b>{results.filter((r) => r.status === "failed").length}개 실패</b> (총 소요 시간: {elapsedSec}초)
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                className="btn-3d btn-3d-pop"
                onClick={downloadZip}
                style={{ padding: "12px 20px", fontSize: 14, fontWeight: 900 }}
              >
                <Download size={16} />
                ZIP 일괄 다운로드 ({results.filter((r) => r.status === "done").length}장)
              </button>
              <button
                type="button"
                className="btn-3d"
                onClick={exportCsv}
                style={{
                  background: "#FFF",
                  color: "#1C1917",
                  border: "1.5px solid #1C1917",
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                <FileSpreadsheet size={16} />
                매핑 결과 CSV 내보내기
              </button>
            </div>
          </div>

          {/* 원래 상품으로 반환 (P2 핵심 연계) 카드 */}
          <div
            className="card"
            style={{
              background: "#FFF",
              border: "2px solid #1C1917",
              borderRadius: 14,
              padding: 24,
              marginBottom: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  background: "#4F46E5",
                  color: "#FFF",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                ⭐ P2 핵심 연계
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginTop: 6 }}>
                원래 상품으로 가공된 대표사진 즉시 반환 / 전송
              </h3>
              <p style={{ fontSize: 12, color: "#78716C", marginTop: 2 }}>
                파일을 내려받아 일일이 다시 올릴 필요 없이, AIMaster 내부 상품 저장소 및 등록기로 한 번에 전송합니다.
              </p>
            </div>

            <div className="pb-g3">
              <div
                style={{
                  background: "#F9FAFB",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b style={{ fontSize: 14 }}>🛒 상세페이지 (shop-detail-page)</b>
                  <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    원래 상품의 대표사진 칸으로 자동 덮어쓰기 반환합니다.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-3d"
                  onClick={handleReturnToProduct}
                  style={{
                    marginTop: 14,
                    background: "#2563EB",
                    color: "#FFF",
                    border: "1.5px solid #1D4ED8",
                    padding: "9px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  상세페이지 상품에 반영하기 →
                </button>
              </div>

              <div
                style={{
                  background: "#F9FAFB",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b style={{ fontSize: 14 }}>🏪 마켓 등록기 (스마트스토어/11번가/쿠팡)</b>
                  <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    가공된 1000×1000 컷을 등록 대기열 대표사진으로 즉시 전송합니다.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-3d"
                  onClick={handleReturnToProduct}
                  style={{
                    marginTop: 14,
                    background: "#FFF",
                    color: "#1C1917",
                    border: "1.5px solid #1C1917",
                    padding: "9px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  마켓 등록 대기열로 보내기 →
                </button>
              </div>

              <div
                style={{
                  background: "#F9FAFB",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b style={{ fontSize: 14 }}>🏬 쇼핑몰 빌더 (mall-builder)</b>
                  <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    입점몰/분양몰 내 상품 카탈로그 대표 이미지로 동기화합니다.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-3d"
                  onClick={handleReturnToProduct}
                  style={{
                    marginTop: 14,
                    background: "#FFF",
                    color: "#1C1917",
                    border: "1.5px solid #1C1917",
                    padding: "9px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  쇼핑몰 빌더로 전송하기 →
                </button>
              </div>
            </div>
          </div>

          {/* 가공 완료 상품 대표사진 그리드 */}
          <div
            className="card"
            style={{
              background: "#FFF",
              border: "1.5px solid #1C1917",
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <b style={{ fontSize: 15, color: "#1C1917" }}>
                🖼️ 완성된 대표사진 목록 ({results.filter((r) => r.status === "done").length}장)
              </b>
              <span style={{ fontSize: 12, color: "#78716C" }}>
                상세페이지/쇼핑몰 반영 결과는 각 항목의 [반환] 배지에 표시됩니다.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              {results
                .filter((r) => r.status === "done")
                .map((r) => (
                  <div
                    key={r.key}
                    style={{
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 10,
                      padding: 10,
                      background: "#FAFAFA",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 8,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundImage: r.thumbUrl ? `url(${r.thumbUrl})` : "none",
                        backgroundColor: "#E5E7EB",
                        border: "1px solid #D1D5DB",
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ width: "100%", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.code}
                      </span>
                      {r.returned === "saved" && (
                        <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                          반환 완료 ✓
                        </span>
                      )}
                      {r.returned === "sending" && (
                        <span style={{ background: "#FEF9C3", color: "#A16207", fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                          전송 중...
                        </span>
                      )}
                      {r.returned && r.returned !== "saved" && r.returned !== "sending" && (
                        <span style={{ background: "#FEE2E2", color: "#B91C1C", fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }} title={r.returned}>
                          반환 실패
                        </span>
                      )}
                      {!r.returned && (
                        <span style={{ background: "#F3F4F6", color: "#6B7280", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                          로컬 준비
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 실패 항목 처리 데스크 (실패가 있을 때만) */}
          {results.some((r) => r.status === "failed") && (
            <div
              className="card"
              style={{
                background: "#FFF5F5",
                border: "1.5px solid #FED7D7",
                borderRadius: 12,
                padding: 18,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <b style={{ color: "#E53E3E", fontSize: 14 }}>
                  ⚠️ 실패 항목 {results.filter((r) => r.status === "failed").length}건 원인 안내
                </b>
                <button
                  type="button"
                  className="btn-3d"
                  style={{
                    background: "#E53E3E",
                    color: "#FFF",
                    border: "none",
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                  onClick={() => {
                    setNotice("실패 항목에 대한 정정 후 재시도를 준비합니다.");
                    setStep(1);
                    setFilterProblemsOnly(true);
                  }}
                >
                  🔄 실패 항목만 바로 재시도
                </button>
              </div>
              <ul style={{ listStyle: "none", fontSize: 12 }}>
                {results
                  .filter((r) => r.status === "failed")
                  .map((r) => (
                    <li
                      key={r.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "6px 0",
                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <code style={{ fontWeight: "bold" }}>{r.code}</code>
                      <span>{r.label}</span>
                      <span style={{ color: "#E53E3E", marginLeft: "auto" }}>원인: {r.error}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* 하단 다시 하기 버튼 */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              type="button"
              className="btn-3d"
              onClick={() => {
                setStep(1);
                setResults([]);
              }}
              style={{
                background: "#FFF",
                border: "1.5px solid #1C1917",
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              🔄 새 상품 묶음 일괄 합성 시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
