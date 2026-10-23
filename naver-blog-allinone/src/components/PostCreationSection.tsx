"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckSquare, Loader2, Palette, RotateCcw, Save, Settings2, Sparkles, Square } from "lucide-react";
import { AppSettings } from "@/lib/storage";
import { COLOR_THEMES } from "@/lib/blog/article";
import { missingKeyMessage, resolveImageEngine, resolveTextEngine } from "@/lib/blog/models";
import { BLOG_PERSONAS, type BlogPersona } from "@/lib/blog/personas";
import { runBlogPipeline } from "@/lib/blog/pipeline";
import { clearGenPrefs, loadGenPrefs, prefsSavedAt, saveGenPrefs } from "@/lib/blog/prefs";
import { type WritingStyle, type WritingTone } from "@/lib/blog/styles";
import { IMAGE_RATIOS, type ImageRatio, type SavedPost } from "@/lib/blog/types";
import { GenerationPanel } from "@/components/blog/GenerationPanel";
import { HumanStylePanel } from "@/components/blog/HumanStylePanel";
import { buildCustomPersona, requestExperienceQuestions } from "@/lib/blog/humanVoice";
import { ModelSettingsCard } from "@/components/blog/ModelSettingsCard";
import { CategorySelect } from "@/components/blog/CategorySelect";
import { NaverCategoryPicker } from "@/components/blog/NaverCategoryPicker";
import { loadLastNaverCategory, saveLastNaverCategory, type NaverCategory } from "@/lib/blog/naverCategory";
import { PostWorkspaceView } from "@/components/blog/PostWorkspaceView";
import { useBlogWorkspace } from "@/components/blog/useBlogWorkspace";

interface PostCreationSectionProps {
  topic: string;
  setTopic: (topic: string) => void;
  extraPromptHint?: string;
  settings: AppSettings;
  onOpenSettings: () => void;
  /** 모델 선택을 저장하면 앱 전체 설정도 갱신한다 */
  onSettingsChange: (next: AppSettings) => void;
  /** 보관함에서 불러온 글(한 번만 읽고 비운다) */
  loaded: SavedPost | null;
  onLoadedConsumed: () => void;
  onOpenLibrary: () => void;
}

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

export function PostCreationSection({ topic, setTopic, extraPromptHint, settings, onOpenSettings, onSettingsChange, loaded, onLoadedConsumed, onOpenLibrary }: PostCreationSectionProps) {
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
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [naverCategory, setNaverCategory] = useState<NaverCategory | null>(null);
  // 마지막으로 쓴 네이버 카테고리를 기본값으로 자동 선택
  useEffect(() => {
    setNaverCategory(loadLastNaverCategory(window.localStorage));
  }, []);
  const [keywords, setKeywords] = useState("");
  const [purpose, setPurpose] = useState("");
  // 사람이 쓴 글처럼 쓰기: 작성자 소개·인간화·실제 경험
  const [customPersonaText, setCustomPersonaText] = useState("");
  const [humanStyle, setHumanStyle] = useState(true);
  const [experience, setExperience] = useState("");
  const [experienceHints, setExperienceHints] = useState<string[]>([]);
  const [hintsLoading, setHintsLoading] = useState(false);

  // ── 설정값 저장(이 브라우저에 기본값으로 저장) ──
  const [prefsNotice, setPrefsNotice] = useState("");
  const [prefsAt, setPrefsAt] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadGenPrefs(window.localStorage);
    setPrefsAt(prefsSavedAt(window.localStorage));
    if (!saved) return;
    if (saved.themeId) setThemeId(saved.themeId);
    if (saved.withThumbnail !== undefined) setWithThumbnail(saved.withThumbnail);
    if (saved.bodyImages !== undefined) setBodyImages(saved.bodyImages);
    if (saved.autoImages !== undefined) setAutoImages(saved.autoImages);
    if (saved.thumbnailText !== undefined) setThumbnailText(saved.thumbnailText);
    if (saved.ratio) setRatio(saved.ratio);
    if (saved.interactive !== undefined) setInteractive(saved.interactive);
    if (saved.tone) setTone(saved.tone);
    if (saved.style) setStyle(saved.style);
    if (saved.targetLength) setTargetLength(saved.targetLength);
    if (saved.personaId !== undefined) setPersonaId(saved.personaId);
    if (saved.humanStyle !== undefined) setHumanStyle(saved.humanStyle);
  }, []);

  const savePrefs = () => {
    const ok = saveGenPrefs(window.localStorage, { themeId, withThumbnail, bodyImages, autoImages, thumbnailText, ratio, interactive, tone, style, targetLength, personaId, humanStyle });
    setPrefsAt(ok ? prefsSavedAt(window.localStorage) : prefsAt);
    setPrefsNotice(ok ? "현재 설정값을 이 브라우저에 기본값으로 저장했습니다. 다음 접속부터 자동으로 적용됩니다." : "저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.");
  };

  const resetPrefs = () => {
    clearGenPrefs(window.localStorage);
    setPrefsAt(null);
    setThemeId("blue-gray");
    setWithThumbnail(true);
    setBodyImages(2);
    setAutoImages(true);
    setThumbnailText(false);
    setRatio("16:9");
    setInteractive(false);
    setTone("해요체");
    setStyle("default");
    setTargetLength(2000);
    setPersonaId(null);
    setHumanStyle(true);
    setPrefsNotice("저장된 기본값을 지우고 처음 설정으로 되돌렸습니다.");
  };

  // ── 결과·저장·이미지 작업(세 탭 공통 작업공간) ──
  const needKey = () => {
    ws.setErrorMsg(missingKeyMessage("image", settings) ?? "API 키가 필요합니다. [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.");
    onOpenSettings();
  };
  const ws = useBlogWorkspace(settings, needKey);
  const [generating, setGenerating] = useState(false);
  const [stepMsg, setStepMsg] = useState("");

  const imageEngine = resolveImageEngine(settings);

  // 다른 탭에서 주제를 고르며 넘어온 기획 배경은 발행 목적 칸에 채운다(수정 가능)
  useEffect(() => {
    if (extraPromptHint?.trim()) setPurpose(extraPromptHint.trim().slice(0, 300));
  }, [extraPromptHint]);

  const loadPersona = (p: BlogPersona) => {
    setPersonaId(p.id);
    setTopic(p.defaultTopic);
    setKeywords(p.defaultKeywords);
    setPurpose(p.defaultPurpose);
    setTone(p.preferredTone);
  };

  // 보관함에서 불러온 글 적용
  useEffect(() => {
    if (!loaded) return;
    const rest = ws.loadSaved(loaded);
    setThemeId(rest.settings.themeId);
    setTone(rest.settings.tone);
    setStyle(rest.settings.style);
    setTargetLength(rest.settings.targetLength);
    setRatio(rest.settings.ratio);
    setThumbnailText(rest.settings.withThumbnailText);
    setPersonaId(BLOG_PERSONAS.find((p) => p.name === rest.settings.personaId)?.id ?? null);
    setCategoryId(rest.settings.categoryId ?? null);
    setNaverCategory(rest.settings.naverCategory ?? null);
    setKeywords(rest.settings.keywords ?? "");
    setPurpose(rest.settings.purpose ?? "");
    setTopic(rest.settings.topic || rest.title);
    onLoadedConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // 주제를 보고 "떠올릴 질문"만 제안한다(경험 내용은 만들지 않는다).
  const handleExperienceHints = async () => {
    const textMissing = missingKeyMessage("text", settings);
    if (textMissing) {
      ws.setErrorMsg(textMissing);
      onOpenSettings();
      return;
    }
    if (!topic.trim()) {
      ws.setErrorMsg("경험 질문을 받을 주제를 먼저 입력하거나 선택해주세요.");
      return;
    }
    setHintsLoading(true);
    ws.setErrorMsg("");
    try {
      const eng = resolveTextEngine(settings);
      setExperienceHints(
        await requestExperienceQuestions({
          engine: { provider: eng.provider, model: eng.model, apiKey: eng.apiKey },
          context: `글 주제: ${topic}${keywords.trim() ? `\n검색 키워드: ${keywords}` : ""}${purpose.trim() ? `\n독자·목적: ${purpose}` : ""}`,
          audience: "이 주제로 글을 쓰는 사람이 자기 실제 경험·사례를 떠올릴 수 있는",
        }),
      );
    } catch (e) {
      ws.setErrorMsg(`경험 질문을 만들지 못했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setHintsLoading(false);
    }
  };

  // ── 글 생성 ──
  const handleGeneratePost = async (persona?: BlogPersona) => {
    const textMissing = missingKeyMessage("text", settings);
    if (textMissing) {
      ws.setErrorMsg(textMissing);
      onOpenSettings();
      return;
    }
    if (autoImages && (withThumbnail || bodyImages > 0)) {
      const imageMissing = missingKeyMessage("image", settings);
      if (imageMissing) {
        ws.setErrorMsg(`${imageMissing} (이미지 없이 글만 만들려면 [글 완성 후 이미지 자동 생성]을 끄세요.)`);
        onOpenSettings();
        return;
      }
    }
    if (!(persona ? persona.defaultTopic : topic).trim()) {
      ws.setErrorMsg("블로그 주제를 입력하거나 상단에서 주제를 선택해주세요.");
      return;
    }
    setGenerating(true);
    ws.setErrorMsg("");
    setStepMsg("시작하는 중…");
    try {
      const chosen = persona ?? BLOG_PERSONAS.find((p) => p.id === personaId) ?? null;
      const eng = resolveTextEngine(settings);
      const result = await runBlogPipeline({
        engine: { provider: eng.provider, model: eng.model, apiKey: eng.apiKey },
        topic: persona ? persona.defaultTopic : topic,
        hint: extraPromptHint,
        extraRequest,
        keywords: persona ? persona.defaultKeywords : keywords,
        purpose: persona ? persona.defaultPurpose : purpose,
        persona: buildCustomPersona(chosen ? { name: chosen.name, badge: chosen.badge, tonePrompt: chosen.tonePrompt } : null, customPersonaText),
        humanStyle,
        experience,
        tone: persona ? persona.preferredTone : tone,
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
      await ws.startFresh({ ...result, settings: { ...result.settings, ...(categoryId ? { categoryId } : {}), ...(naverCategory ? { naverCategory } : {}) } });
      if (autoImages && result.images.length) {
        setGenerating(false);
        await ws.generateAll();
      }
    } catch (e) {
      ws.setErrorMsg(e instanceof Error ? e.message : "포스트 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
      setStepMsg("");
    }
  };

  const totalImages = (withThumbnail ? 1 : 0) + bodyImages;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Sparkles className="w-4 h-4" /></div>
          <h3 className="text-sm font-bold text-slate-900">포스트 생성하기</h3>
          <span className="text-[11px] text-slate-400">기획 → 본문 → 윤문 → 검수 → 이미지까지 한 번에</span>
        </div>

        <CategorySelect value={categoryId} onChange={setCategoryId} />
        <NaverCategoryPicker value={naverCategory} onChange={(c) => { setNaverCategory(c); saveLastNaverCategory(window.localStorage, c); }} disabled={generating} />

        <GenerationPanel
          values={{ personaId, targetLength, keywords, purpose, tone, style }}
          onChange={(patch) => {
            if ("personaId" in patch) setPersonaId(patch.personaId ?? null);
            if (patch.targetLength !== undefined) setTargetLength(patch.targetLength);
            if (patch.keywords !== undefined) setKeywords(patch.keywords);
            if (patch.purpose !== undefined) setPurpose(patch.purpose);
            if (patch.tone) setTone(patch.tone);
            if (patch.style) setStyle(patch.style);
          }}
          onLoadPersona={loadPersona}
          onInstant={(p) => {
            loadPersona(p);
            void handleGeneratePost(p);
          }}
          topic={topic}
          setTopic={setTopic}
          extra={
            <HumanStylePanel
              customPersona={customPersonaText}
              setCustomPersona={setCustomPersonaText}
              humanStyle={humanStyle}
              setHumanStyle={setHumanStyle}
              experience={experience}
              setExperience={setExperience}
              hints={experienceHints}
              hintsLoading={hintsLoading}
              onRequestHints={() => void handleExperienceHints()}
              disabled={generating}
            />
          }
          disabled={generating}
        />

        <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/50 p-5 space-y-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-sky-200 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white text-sm">🎨</span>
          <h3 className="text-sm font-extrabold text-sky-950">AI 모델 · 디자인 · 이미지 설정</h3>
          <span className="text-[11px] text-sky-700/80">글·이미지 AI, 컬러 테마, 이미지 옵션을 정하고 [설정값 저장]으로 기본값으로 남길 수 있습니다</span>
        </div>

        <ModelSettingsCard settings={settings} onSettingsChange={onSettingsChange} onOpenSettings={onOpenSettings} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 왼쪽: 컬러 테마 + 추가 요청 */}
          <div className="lg:col-span-7 space-y-5">
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
          </div>

          {/* 오른쪽: 고급 옵션 */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Settings2 className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-800">고급 옵션</h4>
            </div>

            <div className="space-y-3">
              <label onClick={() => setWithThumbnail(!withThumbnail)} className="flex items-start gap-2.5 cursor-pointer text-xs">
                <Check on={withThumbnail} />
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>대표 이미지 생성</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-md">{imageEngine.label}</span>
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-200 pt-4">
          <p className="text-[11px] text-sky-900/80">
            {prefsNotice || (prefsAt ? `저장된 기본값이 있습니다 (${new Date(prefsAt).toLocaleString("ko-KR")}). 페르소나·글자수·말끝·문체·컬러 테마·이미지 옵션이 접속할 때 자동 적용됩니다.` : "아직 저장한 기본값이 없습니다. 자주 쓰는 설정을 저장해 두면 다음부터 바로 적용됩니다.")}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={resetPrefs} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
            <button type="button" onClick={savePrefs} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700">
              <Save className="w-3.5 h-3.5" /> 설정값 저장
            </button>
          </div>
        </div>
        </div>

        {ws.errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{ws.errorMsg}</span>
          </div>
        )}

        <button type="button" onClick={() => void handleGeneratePost()} disabled={generating || ws.imageProgress !== null} className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2">
          {generating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>{stepMsg || "생성 중…"}</span></>
          ) : ws.imageProgress ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>이미지 생성 중 {ws.imageProgress.done}/{ws.imageProgress.total}</span></>
          ) : (
            <><Sparkles className="w-5 h-5" /><span>블로그 포스트 생성하기</span></>
          )}
        </button>
        <p className="text-[11px] text-slate-500 -mt-3">
          생성 1회에 Gemini 호출 4건(기획·작성·윤문·검수)과 이미지 호출이 발생하며 요금은 회원님 Gemini 계정에 청구됩니다. 결과는 [내 보관함]에 자동 저장됩니다.
        </p>
      </div>

      {ws.post ? (
        <PostWorkspaceView ws={ws} locked={generating} onOpenLibrary={onOpenLibrary} />
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
