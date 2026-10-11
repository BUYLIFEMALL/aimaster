"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckSquare, Loader2, Palette, Settings2, Sparkles, Square } from "lucide-react";
import { AppSettings } from "@/lib/storage";
import { COLOR_THEMES, findTheme } from "@/lib/blog/article";
import { base64ToUploadUrl, fileToUploadUrl, overlayThumbnailTitle } from "@/lib/blog/canvas";
import { generateGeminiImage } from "@/lib/blog/gemini";
import { IMAGE_ENGINES, isImageEngine } from "@/lib/blog/imagePlan";
import { runBlogPipeline } from "@/lib/blog/pipeline";
import { savePost, uploadImage } from "@/lib/blog/postsApi";
import { renderHtml, renderMarkdown, renderPlainText } from "@/lib/blog/article";
import { WRITING_STYLES, WRITING_TONES, type WritingStyle, type WritingTone } from "@/lib/blog/styles";
import { IMAGE_RATIOS, type BlogPost, type ImageRatio, type SavedPost } from "@/lib/blog/types";
import { PostImagesPanel } from "@/components/blog/PostImagesPanel";
import { PostResultView, type SaveState } from "@/components/blog/PostResultView";

interface PostCreationSectionProps {
  topic: string;
  setTopic: (topic: string) => void;
  extraPromptHint?: string;
  settings: AppSettings;
  onOpenSettings: () => void;
  /** 보관함에서 불러온 글(한 번만 읽고 비운다) */
  loaded: SavedPost | null;
  onLoadedConsumed: () => void;
  onOpenLibrary: () => void;
}

const LENGTHS = [1000, 1500, 2000, 3000, 4000];

function Check({ on }: { on: boolean }) {
  return on ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${active ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}

export function PostCreationSection({ topic, setTopic, extraPromptHint, settings, onOpenSettings, loaded, onLoadedConsumed, onOpenLibrary }: PostCreationSectionProps) {
  // ── 생성 옵션 ──
  const [themeId, setThemeId] = useState("blue-gray");
  const [extraRequest, setExtraRequest] = useState("");
  const [withThumbnail, setWithThumbnail] = useState(true);
  const [bodyImages, setBodyImages] = useState(2);
  const [autoImages, setAutoImages] = useState(true);
  const [thumbnailText, setThumbnailText] = useState(false);
  const [ratio, setRatio] = useState<ImageRatio>("16:9");
  const [interactive, setInteractive] = useState(false);
  const [tone, setTone] = useState<WritingTone>("해요체");
  const [style, setStyle] = useState<WritingStyle>("default");
  const [targetLength, setTargetLength] = useState(2000);

  // ── 결과·진행 상태 ──
  const [post, setPost] = useState<BlogPost | null>(null);
  const postRef = useRef<BlogPost | null>(null);
  const postIdRef = useRef<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stepMsg, setStepMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busyCaption, setBusyCaption] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);

  // ── 자동 저장 ──
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const queued = useRef(false);

  const hasKey = Boolean(settings.geminiApiKey);
  const engine = isImageEngine(settings.imageModel) ? settings.imageModel : "nano-banana-2";
  const locked = generating;

  const flushSave = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current) {
      queued.current = true;
      return;
    }
    const current = postRef.current;
    if (!current) return;
    saving.current = true;
    setSaveState("saving");
    try {
      const saved = await savePost(current, postIdRef.current);
      postIdRef.current = saved.id;
      setSaveState("saved");
      setSaveError("");
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      saving.current = false;
      if (queued.current) {
        queued.current = false;
        void flushSave();
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushSave(), 1500);
  }, [flushSave]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** 모든 수정은 여기를 거쳐 화면·자동 저장에 반영한다(비동기 이미지 작업이 서로 덮어쓰지 않게 최신 값 기준으로 갱신). */
  const update = useCallback((fn: (p: BlogPost) => BlogPost) => {
    const base = postRef.current;
    if (!base) return;
    const next = fn(base);
    postRef.current = next;
    setPost(next);
    scheduleSave();
  }, [scheduleSave]);

  const replace = useCallback((next: BlogPost) => update(() => next), [update]);

  // 보관함에서 불러온 글 적용
  useEffect(() => {
    if (!loaded) return;
    const { id, createdAt: _c, updatedAt: _u, ...rest } = loaded;
    void _c; void _u;
    postRef.current = rest;
    postIdRef.current = id;
    setPost(rest);
    setSaveState("saved");
    setSaveError("");
    setErrorMsg("");
    setThemeId(rest.settings.themeId);
    setTone(rest.settings.tone);
    setStyle(rest.settings.style);
    setTargetLength(rest.settings.targetLength);
    setRatio(rest.settings.ratio);
    setThumbnailText(rest.settings.withThumbnailText);
    setTopic(rest.settings.topic || rest.title);
    onLoadedConsumed();
    setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 150);
  }, [loaded, onLoadedConsumed, setTopic]);

  // ── 크롬 확장 전달 ──
  const syncToExtension = useCallback(() => {
    const p = postRef.current;
    if (!p || typeof window === "undefined") return;
    const cover = p.images.find((s) => s.type === "thumbnail" && s.url);
    window.postMessage(
      {
        type: "ALLINONE_SYNC_DRAFT",
        draft: {
          title: p.title,
          contentHtml: renderHtml(p.article, p.images, p.settings.themeId),
          markdown: renderMarkdown(p.article, p.images, p.title),
          plainText: renderPlainText(p.article),
          tags: p.tags,
          summary: p.summary,
          thumbnailUrl: cover?.url,
        },
      },
      "*"
    );
  }, []);

  // ── 이미지 생성 ──
  const makeImage = useCallback(async (caption: string) => {
    const p = postRef.current;
    const slot = p?.images.find((s) => s.caption === caption);
    if (!p || !slot) return;
    setBusyCaption(caption);
    try {
      const gen = await generateGeminiImage(settings.geminiApiKey, engine, slot.prompt, p.settings.ratio);
      let dataUrl = await base64ToUploadUrl(gen.base64, gen.mime);
      if (slot.type === "thumbnail" && p.settings.withThumbnailText) dataUrl = await overlayThumbnailTitle(dataUrl, p.title, findTheme(p.settings.themeId).color);
      const url = await uploadImage(dataUrl);
      update((cur) => ({ ...cur, images: cur.images.map((s) => (s.caption === caption ? { ...s, url } : s)) }));
    } finally {
      setBusyCaption(null);
    }
  }, [engine, settings.geminiApiKey, update]);

  const generateOne = async (index: number) => {
    const slot = postRef.current?.images[index];
    if (!slot) return;
    setErrorMsg("");
    try {
      await makeImage(slot.caption);
      syncToExtension();
    } catch (e) {
      setErrorMsg(`${slot.caption}: ${e instanceof Error ? e.message : "이미지 생성에 실패했습니다."}`);
    }
  };

  const generateAll = useCallback(async () => {
    const todo = (postRef.current?.images ?? []).filter((s) => !s.url).map((s) => s.caption);
    if (!todo.length) return;
    setErrorMsg("");
    setImageProgress({ done: 0, total: todo.length });
    const failures: string[] = [];
    for (let i = 0; i < todo.length; i++) {
      try {
        await makeImage(todo[i]);
      } catch (e) {
        failures.push(`${todo[i]}: ${e instanceof Error ? e.message : "실패"}`);
      }
      setImageProgress({ done: i + 1, total: todo.length });
    }
    setImageProgress(null);
    if (failures.length) setErrorMsg(`이미지 ${failures.length}장 생성에 실패했습니다. 성공한 이미지는 저장했으니 실패한 컷만 다시 생성해주세요. ${failures.join(" / ")}`);
    syncToExtension();
  }, [makeImage, syncToExtension]);

  const uploadOwn = async (index: number, file: File) => {
    const slot = postRef.current?.images[index];
    if (!slot) return;
    setErrorMsg("");
    setBusyCaption(slot.caption);
    try {
      const url = await uploadImage(await fileToUploadUrl(file));
      update((cur) => ({ ...cur, images: cur.images.map((s) => (s.caption === slot.caption ? { ...s, url } : s)) }));
      syncToExtension();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "이미지를 올리지 못했습니다.");
    } finally {
      setBusyCaption(null);
    }
  };

  const needKey = () => {
    setErrorMsg("Google Gemini API 키가 필요합니다. [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.");
    onOpenSettings();
  };

  // ── 글 생성 ──
  const handleGeneratePost = async () => {
    if (!hasKey) return needKey();
    if (!topic.trim()) {
      setErrorMsg("블로그 주제를 입력하거나 상단에서 주제를 선택해주세요.");
      return;
    }
    setGenerating(true);
    setErrorMsg("");
    setStepMsg("시작하는 중…");
    postIdRef.current = null;
    try {
      const result = await runBlogPipeline({
        apiKey: settings.geminiApiKey,
        textModel: settings.textModel,
        topic,
        hint: extraPromptHint,
        extraRequest,
        tone,
        style,
        targetLength,
        imageCount: (withThumbnail ? 1 : 0) + bodyImages,
        withThumbnail,
        ratio,
        themeId,
        withInteractive: interactive,
        withThumbnailText: thumbnailText,
        onStep: setStepMsg,
      });
      postRef.current = result;
      setPost(result);
      setStepMsg("");
      await flushSave();
      syncToExtension();
      setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 150);
      if (autoImages && result.images.length) {
        setGenerating(false);
        await generateAll();
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "포스트 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
      setStepMsg("");
    }
  };

  const busyIndex = useMemo(() => (post && busyCaption ? post.images.findIndex((s) => s.caption === busyCaption) : -1), [post, busyCaption]);
  const totalImages = (withThumbnail ? 1 : 0) + bodyImages;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Sparkles className="w-4 h-4" /></div>
          <h3 className="text-sm font-bold text-slate-900">포스트 생성하기</h3>
          <span className="text-[11px] text-slate-400">기획 → 본문 → 윤문 → 검수 → 이미지까지 한 번에</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 왼쪽: 입력 */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">블로그 주제</label>
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 2026년 최고의 AI 생산성 도구 5가지" className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-indigo-600" />컬러 테마</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COLOR_THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setThemeId(t.id)} className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${themeId === t.id ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"}`}>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-3.5 h-3.5 rounded-full shadow-2xs" style={{ backgroundColor: t.color }} />
                      <span className="w-2.5 h-2.5 rounded-full shadow-2xs opacity-80" style={{ backgroundColor: t.subColor }} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-900 leading-tight">{t.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">기사에 반영할 추가 요청사항</label>
              <textarea rows={3} value={extraRequest} onChange={(e) => setExtraRequest(e.target.value)} placeholder="예: 글 마지막에 이웃 소통 질문과 행동 촉구 문구를 추가해주세요." className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">말끝(톤)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {WRITING_TONES.map((t) => <Chip key={t.value} active={tone === t.value} onClick={() => setTone(t.value)}>{t.value}</Chip>)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{WRITING_TONES.find((t) => t.value === tone)?.description}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">문체</label>
                <select value={style} onChange={(e) => setStyle(e.target.value as WritingStyle)} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {WRITING_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 오른쪽: 고급 옵션 */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Settings2 className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-800">고급 옵션</h4>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">목표 글자수 (공백 포함)</label>
              <div className="grid grid-cols-5 gap-1.5">
                {LENGTHS.map((n) => <Chip key={n} active={targetLength === n} onClick={() => setTargetLength(n)}>{n.toLocaleString()}</Chip>)}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <label onClick={() => setWithThumbnail(!withThumbnail)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                <Check on={withThumbnail} />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>대표 이미지 생성</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-md">{IMAGE_ENGINES[engine].label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">주제에 맞는 AI 이미지를 실제로 생성해 맨 위에 넣습니다.</p>
                </div>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">본문 이미지 수</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4].map((n) => <Chip key={n} active={bodyImages === n} onClick={() => setBodyImages(n)}>{n === 0 ? "없음" : `${n}장`}</Chip>)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">총 {totalImages}컷 · AI가 글 내용에 맞는 장면을 직접 기획합니다.</p>
              </div>

              <label onClick={() => setAutoImages(!autoImages)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                <Check on={autoImages} />
                <div>
                  <div className="font-bold text-slate-800">글 완성 후 이미지 자동 생성</div>
                  <p className="text-[11px] text-slate-500">끄면 글만 먼저 만들고, 이미지는 컷마다 직접 생성합니다.</p>
                </div>
              </label>

              <label onClick={() => setThumbnailText(!thumbnailText)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                <Check on={thumbnailText} />
                <div>
                  <div className="font-bold text-slate-800">썸네일에 제목 글자 넣기</div>
                  <p className="text-[11px] text-slate-500">대표 이미지 아래쪽에 제목을 또렷하게 합성합니다(글자는 AI가 아니라 직접 그립니다).</p>
                </div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">이미지 비율</label>
              <div className="grid grid-cols-4 gap-1.5">
                {IMAGE_RATIOS.map((r) => <Chip key={r.value} active={ratio === r.value} onClick={() => setRatio(r.value)}>{r.value}</Chip>)}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label onClick={() => setInteractive(!interactive)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                <Check on={interactive} />
                <div>
                  <div className="font-bold text-slate-800">인터랙티브 요소 추가</div>
                  <p className="text-[11px] text-slate-500">독자가 직접 체크하거나 따져 볼 수 있는 목록·자가진단을 넣습니다.</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="button" onClick={() => void handleGeneratePost()} disabled={generating || imageProgress !== null} className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2">
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>{stepMsg || "생성 중…"}</span></>
          ) : imageProgress ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>이미지 생성 중 {imageProgress.done}/{imageProgress.total}</span></>
          ) : (
            <><Sparkles className="w-5 h-5" /><span>블로그 포스트 생성하기</span></>
          )}
        </button>
        <p className="text-[11px] text-slate-500 -mt-3">
          생성 1회에 Gemini 호출 4건(기획·작성·윤문·검수)과 이미지 호출이 발생하며 요금은 회원님 Gemini 계정에 청구됩니다. 결과는 [내 보관함]에 자동 저장됩니다.
        </p>
      </div>

      {post ? (
        <PostResultView
          post={post}
          saveState={saveState}
          saveError={saveError}
          locked={locked || imageProgress !== null}
          onChange={replace}
          onSaveNow={() => void flushSave()}
          onSyncToExtension={syncToExtension}
          onOpenLibrary={onOpenLibrary}
          imagesPanel={
            <PostImagesPanel
              post={post}
              locked={locked}
              busyIndex={busyIndex >= 0 ? busyIndex : null}
              progress={imageProgress}
              hasKey={hasKey}
              onChange={replace}
              onGenerate={(i) => void generateOne(i)}
              onGenerateAll={() => void generateAll()}
              onUpload={(i, f) => void uploadOwn(i, f)}
              onNeedKey={needKey}
            />
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center"><Sparkles className="w-6 h-6" /></div>
          <h4 className="text-sm font-bold text-slate-800">생성된 콘텐츠가 여기에 표시됩니다.</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">위에서 주제를 입력하거나 추천받은 주제를 선택한 뒤, 말끝·문체·이미지 옵션을 정하고 [블로그 포스트 생성하기]를 눌러주세요. 이전에 만든 글은 [내 보관함]에서 열 수 있습니다.</p>
          <button type="button" onClick={onOpenLibrary} className="text-xs font-bold text-indigo-600 hover:underline">내 보관함 열기 →</button>
        </div>
      )}
    </div>
  );
}
