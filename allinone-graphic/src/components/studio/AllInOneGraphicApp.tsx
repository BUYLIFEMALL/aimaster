"use client";

import React, { useState, useRef, useEffect } from "react";
import { IMAGE_READ_FAIL_MESSAGE, splitReadableImages } from "@/lib/imageFileCheck";
import {
  Search,
  Wand2,
  Sparkles,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Crown,
  Paintbrush,
  Eraser,
  RotateCcw,
  Loader2,
  Check,
  Smartphone,
  Layout,
  Box,
  AlertTriangle,
  LayoutDashboard,
  Share2,
  Sword,
  Grid,
  UserPlus,
  Hammer,
  Map,
  LayoutTemplate,
  Factory,
  Wrench,
  Activity,
  Bot,
  ShieldAlert,
  Cpu,
  Layers,
  User,
  Monitor,
  Image as ImageIcon,
  Smile,
  PenTool,
  Brush,
  Ghost,
  MessageCircle,
  Book,
  Tablet,
  Bookmark,
  Feather,
  Camera,
  Video,
  Film,
  ZoomIn,
  Mic,
  FileBarChart,
  BarChart,
  Palette,
  Rocket,
  Building,
  Megaphone,
  Ticket,
  Mail,
  TrendingUp,
  Circle,
  CreditCard,
  PiggyBank,
  Users,
  FileText,
  Award,
  MonitorPlay,
  Gift,
  Scale,
  Flag,
  BadgeCheck,
  ShoppingBag,
  Truck,
  Heart,
  Coffee,
  UtensilsCrossed,
  GlassWater,
  Sparkle,
  Eye,
  Scissors,
  CheckSquare,
  ShieldCheck,
  GraduationCap,
  Calculator,
  Compass,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  Code,
  FileCode,
  FolderGit2,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import ApiKeyModal from "@/components/settings/ApiKeyModal";
import GuideModal from "@/components/guide/GuideModal";
import { GRAPHIC_TEMPLATES, GraphicTemplate } from "@/lib/templates";
import { STYLE_PRESETS, ASPECT_RATIOS, RESOLUTIONS, LANGUAGES } from "@/lib/constants";

interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: string;
  templateTitle: string;
}

const TEMPLATE_ICON_MAP: Record<string, React.ElementType> = {
  Smartphone,
  Layout,
  Box,
  AlertTriangle,
  LayoutDashboard,
  Share2,
  Sword,
  Grid,
  UserPlus,
  Hammer,
  Map,
  LayoutTemplate,
  Factory,
  Wrench,
  Activity,
  Bot,
  ShieldAlert,
  Cpu,
  Youtube: Video,
  Layers,
  User,
  Monitor,
  Image: ImageIcon,
  Smile,
  PenTool,
  Brush,
  Ghost,
  MessageCircle,
  Book,
  Tablet,
  Bookmark,
  Feather,
  Camera,
  Video,
  Film,
  ZoomIn,
  Mic,
  FileBarChart,
  BarChart,
  Palette,
  Rocket,
  Building,
  Megaphone,
  Instagram: Camera,
  Ticket,
  Mail,
  TrendingUp,
  Circle,
  CreditCard,
  PiggyBank,
  Users,
  FileText,
  Award,
  MonitorPlay,
  Gift,
  Scale,
  Flag,
  BadgeCheck,
  ShoppingBag,
  Truck,
  Heart,
  Coffee,
  UtensilsCrossed,
  GlassWater,
  Sparkle,
  Eye,
  Scissors,
  CheckSquare,
  ShieldCheck,
  GraduationCap,
  Calculator,
  Compass,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  Code,
  FileCode,
  FolderGit2,
};

export default function AllInOneGraphicApp({ userEmail }: { userEmail?: string | null }) {
  // 모달 상태
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // 템플릿 필터링 및 선택
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<GraphicTemplate>(GRAPHIC_TEMPLATES[0]);

  // 가변 필드 입력 상태
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [extraPrompt, setExtraPrompt] = useState<string>("");

  // 생성 설정 옵션
  const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [modelTier, setModelTier] = useState<"standard" | "pro">("standard");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [resolution, setResolution] = useState<string>("1K");
  const [selectedStyle, setSelectedStyle] = useState<string>(GRAPHIC_TEMPLATES[0].defaultStyle || "Vector illustration, flat");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["한국어", "영어"]);
  const [maintainSubject, setMaintainSubject] = useState<boolean>(true);

  // AI 입력 도우미 파일/메모 상태
  const [referenceMemo, setReferenceMemo] = useState<string>("");
  const [referenceFiles, setReferenceFiles] = useState<Array<{ name: string; content: string; dataUrl?: string; mimeType?: string }>>([]);
  const [isAiFilling, setIsAiFilling] = useState<boolean>(false);

  // 결과물 및 생성 상태
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refFileError, setRefFileError] = useState<string | null>(null);

  // 매직 에디터 마스크 캔버스 상태
  const [brushSize, setBrushSize] = useState<number>(24);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 템플릿 변경 시 기본값 세팅
  useEffect(() => {
    if (!selectedTemplate) return;
    setSelectedStyle(selectedTemplate.defaultStyle || "Photorealistic, 8k");
    const initialVals: Record<string, string> = {};
    selectedTemplate.fields.forEach((f) => {
      initialVals[f.id] = f.defaultValue || "";
    });
    setFieldValues(initialVals);
    setExtraPrompt("");
  }, [selectedTemplate]);

  // 캔버스 크기 동기화 (편집 모드 시)
  useEffect(() => {
    if (mode === "EDIT" && canvasRef.current && imageContainerRef.current) {
      const container = imageContainerRef.current;
      const canvas = canvasRef.current;
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [mode, currentImage]);

  // 최종 조합 프롬프트 계산
  const getCombinedPrompt = () => {
    let assembled = selectedTemplate.template;
    selectedTemplate.fields.forEach((f) => {
      const val = fieldValues[f.id] || f.placeholder || f.label;
      assembled = assembled.replaceAll(`{{${f.id}}}`, val);
    });

    if (selectedStyle) {
      assembled += `. Style: ${selectedStyle}`;
    }
    if (selectedLanguages.length > 0) {
      assembled += `. Text language preferences: ${selectedLanguages.join(", ")}`;
    }
    if (extraPrompt.trim()) {
      assembled += `. Additional details: ${extraPrompt.trim()}`;
    }
    return assembled;
  };

  // 템플릿 필터링 로직
  const filteredTemplates = GRAPHIC_TEMPLATES.filter((tpl) => {
    const matchCategory = selectedCategory === "ALL" || tpl.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // 레퍼런스 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    // 깨진 사진은 AI 자동 입력에 붙이지 않는다(공용 image-file-check). 글·PDF 파일은 그대로
    const images = picked.filter((f) => f.type.startsWith("image/"));
    const { failed } = await splitReadableImages(images);
    setRefFileError(failed.length ? `${IMAGE_READ_FAIL_MESSAGE} (${failed.map((f) => f.name).join(", ")})` : null);
    const files = picked.filter((f) => !failed.includes(f));

    files.forEach((file) => {
      const reader = new FileReader();
      if (file.type.startsWith("image/")) {
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setReferenceFiles((prev) => [
            ...prev,
            {
              name: file.name,
              content: `[Image file: ${file.name}]`,
              dataUrl: result,
              mimeType: file.type,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setReferenceFiles((prev) => [
            ...prev,
            {
              name: file.name,
              content: text,
            },
          ]);
        };
        reader.readAsText(file);
      }
    });
  };

  // AI 자동 입력 (레퍼런스 파일/메모 분석하여 필드 자동 채움)
  const handleAiAutoFill = async () => {
    const combinedContent = [
      referenceMemo ? `[메모]\n${referenceMemo}` : "",
      ...referenceFiles.map((f) => `[파일: ${f.name}]\n${f.content.slice(0, 3000)}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!combinedContent.trim()) {
      alert("분석할 메모를 작성하거나 기획서 파일(.txt, .md, .json 등)을 첨부해주세요.");
      return;
    }

    setIsAiFilling(true);
    try {
      const res = await fetch("/api/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceContent: combinedContent,
          fields: selectedTemplate.fields,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("Gemini API 키")) {
          setApiKeyModalOpen(true);
        }
        alert(data.error || "필드 자동 입력에 실패했습니다.");
        return;
      }

      if (data.values && Object.keys(data.values).length > 0) {
        setFieldValues((prev) => ({ ...prev, ...data.values }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "네트워크 오류";
      alert("AI 자동 입력 중 오류: " + message);
    } finally {
      setIsAiFilling(false);
    }
  };

  // 프롬프트 클립보드 복사
  const handleCopyPrompt = () => {
    const prompt = getCombinedPrompt();
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // 이미지 생성 실행
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    const prompt = getCombinedPrompt();
    const referenceImages = referenceFiles
      .filter((f) => f.dataUrl && f.mimeType)
      .map((f) => ({
        data: (f.dataUrl || "").replace(/^data:image\/[a-zA-Z]+;base64,/, ""),
        mimeType: f.mimeType || "image/png",
      }));

    try {
      if (mode === "CREATE") {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            options: {
              aspectRatio,
              resolution,
              maintainSubject,
              style: selectedStyle,
            },
            referenceImages,
            modelTier,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error && data.error.includes("Gemini API 키")) {
            setApiKeyModalOpen(true);
          }
          throw new Error(data.error || "이미지 생성 실패");
        }

        setCurrentImage(data.imageUrl);
        const newItem: HistoryItem = {
          id: String(Date.now()),
          imageUrl: data.imageUrl,
          prompt,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          templateTitle: selectedTemplate.title,
        };
        setHistory((prev) => [newItem, ...prev]);
      } else {
        // EDIT 모드 (인페인팅)
        if (!currentImage) {
          throw new Error("편집할 이미지가 없습니다. 먼저 이미지를 생성하거나 업로드해주세요.");
        }

        let maskDataUrl: string | null = null;
        if (canvasRef.current) {
          maskDataUrl = canvasRef.current.toDataURL("image/png");
        }

        const res = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            baseImage: currentImage,
            maskImage: maskDataUrl,
            options: {
              aspectRatio,
              resolution,
              style: selectedStyle,
            },
            modelTier,
            referenceImages,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error && data.error.includes("Gemini API 키")) {
            setApiKeyModalOpen(true);
          }
          throw new Error(data.error || "이미지 편집 실패");
        }

        setCurrentImage(data.imageUrl);
        const newItem: HistoryItem = {
          id: String(Date.now()),
          imageUrl: data.imageUrl,
          prompt: `[수정] ${prompt}`,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          templateTitle: `${selectedTemplate.title} (편집본)`,
        };
        setHistory((prev) => [newItem, ...prev]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "생성 실패";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 마스크 캔버스 그리기 로직
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "EDIT") return;
    setIsDrawing(true);
    drawOnCanvas(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== "EDIT") return;
    drawOnCanvas(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const drawOnCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    if (isErasing) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      // 브라우저 미리보기에서는 반투명 주황색으로 표시하되, Gemini 전송 시 흰색 마스크 처리
      ctx.fillStyle = "rgba(249, 115, 22, 0.65)";
    }
    ctx.fill();
  };

  const handleResetMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement("a");
    a.href = currentImage;
    a.download = `allinone-graphic-${selectedTemplate.id}-${Date.now()}.png`;
    a.click();
  };

  const SelectedIcon = TEMPLATE_ICON_MAP[selectedTemplate.icon] || Sparkles;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* 1. 사이드바 */}
      <Sidebar
        userEmail={userEmail}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onOpenApiKey={() => setApiKeyModalOpen(true)}
        onOpenGuide={() => setGuideModalOpen(true)}
        onOpenMagicEditor={() => setMode("EDIT")}
      />

      {/* 2. 템플릿 탐색 컬럼 (2번째 열) */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-10">
        {/* 상단 AI 매직 에디터 바로가기 배너 */}
        <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <button
            onClick={() => setMode(mode === "EDIT" ? "CREATE" : "EDIT")}
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
              mode === "EDIT"
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-white text-slate-800 border-amber-200/80 hover:bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  mode === "EDIT" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"
                }`}
              >
                <Wand2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">AI 매직 에디터</div>
                <div className={`text-[10px] ${mode === "EDIT" ? "text-amber-100" : "text-slate-500"}`}>
                  브러시로 영역을 선택하고 편집
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                mode === "EDIT" ? "bg-white text-amber-600" : "bg-amber-100 text-amber-700"
              }`}
            >
              {mode === "EDIT" ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* 템플릿 검색창 */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="123종 템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-0.5">
            <span>템플릿 목록</span>
            <span className="font-semibold text-slate-600">{filteredTemplates.length}개</span>
          </div>
        </div>

        {/* 템플릿 카드 스크롤 목록 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {filteredTemplates.map((tpl) => {
            const isSelected = selectedTemplate.id === tpl.id;
            const IconComponent = TEMPLATE_ICON_MAP[tpl.icon] || Sparkles;
            return (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? "bg-amber-50/70 border-amber-300 shadow-xs"
                    : "bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-bold truncate ${isSelected ? "text-amber-900" : "text-slate-800"}`}>
                    {tpl.title}
                  </div>
                  <div className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">{tpl.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 중앙 작업 영역 (입력 및 세부 설정) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-slate-50/50">
        {/* 템플릿 헤더 정보 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <SelectedIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedTemplate.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTemplate.description}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {selectedTemplate.category}
            </span>
          </div>

          {/* 💡 활용 팁 & 레퍼런스 가이드 아코디언 */}
          {selectedTemplate.usage && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span>💡</span> 활용 팁 & 레퍼런스 가이드
              </div>
              <div className="text-amber-800/90 whitespace-pre-line text-[11px] leading-relaxed">
                {selectedTemplate.usage}
              </div>
            </div>
          )}
        </div>

        {/* 핵심 설정 패널 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>⚙️</span> 생성 및 엔진 설정
            </h3>

            {/* 모드 전환 토글 */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setMode("CREATE")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === "CREATE" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                생성 모드
              </button>
              <button
                onClick={() => setMode("EDIT")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === "EDIT" ? "bg-white text-amber-600 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                편집 모드
              </button>
            </div>
          </div>

          {/* AI 모델 엔진 선택 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>AI 모델 선택</span>
              <span className="text-[10px] text-slate-400">나노바나나 엔진</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setModelTier("standard")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  modelTier === "standard"
                    ? "bg-amber-50/70 border-amber-400 shadow-xs text-amber-900"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>⚡ 나노바나나</span>
                  <span className="text-[10px] font-normal text-slate-500">(표준 1K)</span>
                </div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">빠른 생성 속도, 아이디어 스케치</div>
              </button>

              <button
                onClick={() => setModelTier("pro")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  modelTier === "pro"
                    ? "bg-amber-50/70 border-amber-400 shadow-xs text-amber-900"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>✨ 나노바나나2</span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 rounded">Pro</span>
                </div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">초고화질 2K/4K, 인페인팅 최적화</div>
              </button>
            </div>
          </div>

          {/* 옵션 4종 그리드 (비율, 해상도, 화풍, 피사체 유지) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs">
            {/* 비율 */}
            <div>
              <label className="block font-medium text-slate-600 mb-1">화면 비율</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 해상도 */}
            <div>
              <label className="block font-medium text-slate-600 mb-1">해상도 (Pro 전용)</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                disabled={modelTier !== "pro"}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res.value} value={res.value}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 화풍 스타일 */}
            <div>
              <label className="block font-medium text-slate-600 mb-1">화풍 스타일</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {STYLE_PRESETS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 피사체 유지 토글 */}
            <div>
              <label className="block font-medium text-slate-600 mb-1">참조 이미지 유지</label>
              <button
                type="button"
                onClick={() => setMaintainSubject(!maintainSubject)}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-left font-medium transition-colors ${
                  maintainSubject
                    ? "bg-amber-50 text-amber-700 border-amber-300"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {maintainSubject ? "👤 외형/얼굴 일치" : "🎨 스타일만 참고"}
              </button>
            </div>
          </div>

          {/* 이미지 내 텍스트 언어 칩 */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              이미지 내 텍스트 언어 (선택)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((lang) => {
                const isChecked = selectedLanguages.includes(lang.value);
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setSelectedLanguages((prev) => prev.filter((l) => l !== lang.value));
                      } else {
                        setSelectedLanguages((prev) => [...prev, lang.value]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      isChecked
                        ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {lang.label} {isChecked && "✓"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI 입력 도우미 패널 (레퍼런스 파일 & 자동 입력) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Wand2 className="w-4 h-4 text-amber-600" />
              <span>AI 입력 도우미</span>
            </div>

            <button
              onClick={handleAiAutoFill}
              disabled={isAiFilling}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:bg-slate-300"
            >
              {isAiFilling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>문서 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI 자동 입력 ({referenceFiles.length}개 파일)</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={2}
            placeholder="기획서 요약 내용이나 제품 메모를 자유롭게 입력하세요..."
            value={referenceMemo}
            onChange={(e) => setReferenceMemo(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />

          {/* 파일 업로드 바 */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.md,.json,.pdf,image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 border border-dashed border-slate-300 hover:border-amber-500 rounded-lg text-slate-600 hover:text-amber-700 bg-slate-50 hover:bg-amber-50/40 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>레퍼런스 추가 (.md, .txt, .pdf, 이미지)</span>
            </button>

            {referenceFiles.length > 0 && (
              <span className="text-[11px] text-slate-400">
                {referenceFiles.map((f) => f.name).join(", ")}
              </span>
            )}
          </div>
          {refFileError && <p role="alert" className="text-[11px] text-rose-600">{refFileError}</p>}
        </div>

        {/* 템플릿별 동적 가변 필드 입력 폼 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>📝</span> 세부 기획 입력
          </h3>

          <div className="space-y-3">
            {selectedTemplate.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
                {field.options && field.options.length > 0 ? (
                  <select
                    value={fieldValues[field.id] || field.defaultValue || ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  >
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder={field.placeholder || `${field.label} 입력`}
                    value={fieldValues[field.id] || ""}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>
            ))}

            {/* 기타 추가 요청사항 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                기타 / 추가 요청 (선택)
              </label>
              <input
                type="text"
                placeholder="예: 특별한 조명, 배경 분위기, 질감 세부사항"
                value={extraPrompt}
                onChange={(e) => setExtraPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* 하단 액션 버튼 바 */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleCopyPrompt}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              {copiedPrompt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPrompt ? "프롬프트 복사됨!" : "Gemini에서 사용하기 (복사)"}</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === "EDIT" ? "매직 편집 렌더링 중..." : "AI 이미지 렌더링 중..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{mode === "EDIT" ? "매직 에디터 수정 적용" : "이미지 생성하기"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. 우측 결과 뷰어 & 매직 에디터 컬럼 */}
      <div className="w-[480px] bg-white border-l border-slate-200 flex flex-col h-full flex-shrink-0 z-10">
        {/* 결과 뷰어 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              {mode === "EDIT" ? "🎨 AI 매직 인페인팅 캔버스" : "🖼️ 결과 미리보기"}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {mode === "EDIT" ? "브러시로 수정할 영역을 칠해주세요" : "나노바나나 고해상도 렌더링"}
            </p>
          </div>

          {currentImage && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownload}
                className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="다운로드"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 메인 뷰어 캔버스 영역 */}
        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-50/50 overflow-hidden relative">
          {currentImage ? (
            <div
              ref={imageContainerRef}
              className="relative max-w-full max-h-[480px] rounded-xl overflow-hidden shadow-md border border-slate-200"
            >
              {/* 원본/결과 이미지 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt="Generated Output"
                className="max-w-full max-h-[480px] object-contain select-none block"
              />

              {/* 편집 모드일 때 마스크 캔버스 오버레이 */}
              {mode === "EDIT" && (
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="absolute inset-0 cursor-crosshair z-10 touch-none"
                />
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                <SelectedIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600">{selectedTemplate.title}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  옵션을 선택하고 [이미지 생성하기]를 클릭하세요.
                </div>
              </div>
            </div>
          )}

          {/* 편집 모드 브러시 툴바 */}
          {mode === "EDIT" && currentImage && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs px-4 py-2 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3 z-20 animate-fadeIn text-xs">
              <button
                onClick={() => setIsErasing(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  !isErasing ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
                title="브러시"
              >
                <Paintbrush className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsErasing(true)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isErasing ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
                title="지우개"
              >
                <Eraser className="w-4 h-4" />
              </button>

              {/* 브러시 크기 슬라이더 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">크기</span>
                <input
                  type="range"
                  min={6}
                  max={60}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-16 accent-amber-500"
                />
              </div>

              <button
                onClick={handleResetMask}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="마스크 초기화"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 최근 히스토리 서랍 */}
        <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>최근 생성 히스토리</span>
            <span className="text-[10px] text-slate-400">{history.length}개</span>
          </div>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {history.length > 0 ? (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentImage(item.imageUrl)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0 relative group transition-all ${
                    currentImage === item.imageUrl ? "border-amber-500 ring-2 ring-amber-400" : "border-slate-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              <div className="text-[11px] text-slate-400 py-3 text-center w-full">
                아직 생성된 이미지가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모달 창들 */}
      <ApiKeyModal isOpen={apiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} />
      <GuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </div>
  );
}
