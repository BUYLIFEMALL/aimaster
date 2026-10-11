"use client";

import React, { useState } from "react";
import {
  Award,
  Layers,
  Trees,
  TrendingDown,
  FileText,
  Sparkles,
  ArrowRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppSettings } from "@/lib/storage";

interface TopicIdeaSectionProps {
  settings: AppSettings;
  onSelectTopic: (topic: string, promptHint?: string) => void;
  onOpenSettings: () => void;
}

type SubTab = "eeat" | "category" | "evergreen" | "longtail" | "memo";

export function TopicIdeaSection({
  settings,
  onSelectTopic,
  onOpenSettings,
}: TopicIdeaSectionProps) {
  const [activeTab, setActiveTab] = useState<SubTab>("eeat");

  // E-E-A-T Tab state
  const [eeatType, setEeatType] = useState("심층 가이드 및 'How-to'");
  const [eeatCategory, setEeatCategory] = useState("IT/기술");

  // Category Tab state
  const [catCategory, setCatCategory] = useState("재정/투자 (부동산, 주식, 연금, 세금, 대출 등)");
  const [catCustom, setCatCustom] = useState("");

  // Evergreen Tab state
  const [egType, setEgType] = useState("사례 연구(Case Study)");
  const [egCategory, setEgCategory] = useState("재정/투자 (부동산, 주식, 연금, 세금, 대출 등)");

  // Longtail Tab state
  const [ltType, setLtType] = useState("계절/이벤트");

  // Memo Tab state
  const [memoText, setMemoText] = useState("");

  // Common Generation state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recommendedTopics, setRecommendedTopics] = useState<
    { title: string; desc: string; keywords: string[] }[]
  >([]);

  // 1. E-E-A-T 추천 실행
  const handleGenerateEeat = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setRecommendedTopics([]);

    const currentYear = new Date().getFullYear(); // 2026

    const prompt = `당신은 대한민국 네이버 블로그 전문 SEO 컨설턴트입니다.
현재 연도는 반드시 ${currentYear}년입니다.
구글 및 네이버 검색 알고리즘의 E-E-A-T(경험 Experience, 전문성 Expertise, 권위성 Authoritativeness, 신뢰성 Trustworthiness) 원칙을 만족시키는 고품질 블로그 포스트 주제 4가지를 추천해주세요.

- 콘텐츠 유형: ${eeatType}
- 콘텐츠 분야: ${eeatCategory}
- 목표: 실제 경험과 전문 지식이 드러나며 독자의 신뢰를 얻고 ${currentYear}년 네이버 스마트블록/D.I.A+ 상위 노출에 최적화된 주제.

반드시 아래 JSON 형식으로만 응답하세요. 마크다운이나 추가 설명 없이 순수 JSON만 반환하세요:
[
  {
    "title": "클릭률 높은 매력적인 블로그 포스트 제목",
    "desc": "이 글에서 다룰 핵심 E-E-A-T 관점과 스토리텔링 기획 의도 설명 (1~2문장)",
    "keywords": ["핵심키워드1", "연관키워드2", "서브키워드3"]
  }
]`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Gemini API 호출에 실패했습니다.");
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const parsed = JSON.parse(rawText);
      setRecommendedTopics(Array.isArray(parsed) ? parsed : []);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "추천 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2. 카테고리별 추천
  const handleGenerateCategory = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setRecommendedTopics([]);

    const currentYear = new Date().getFullYear();
    const targetCat = catCategory === "기타(사용자입력)" ? catCustom : catCategory;

    const prompt = `당신은 네이버 블로그 트렌드 분석가입니다.
현재 연도는 반드시 ${currentYear}년입니다.
선택한 카테고리 내에서 독자의 흥미를 끌고 소셜 미디어 공유를 유도할 만한 ${currentYear}년 최신 트렌드 및 인기 주제 4가지를 추천해주세요.

- 선택 카테고리: ${targetCat}

반드시 아래 JSON 형식으로만 응답하세요. 순수 JSON만 반환:
[
  {
    "title": "트렌디하고 주목도 높은 포스트 제목",
    "desc": "최신 트렌드 반영 요소 및 독자 공유 포인트 (1~2문장)",
    "keywords": ["트렌드키워드1", "연관키워드2"]
  }
]`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API 호출에 실패했습니다.");
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      setRecommendedTopics(JSON.parse(rawText));
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "추천 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3. 에버그린 추천
  const handleGenerateEvergreen = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setRecommendedTopics([]);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 네이버 블로그 장기 트래픽 설계 전문가입니다.
현재 연도는 ${currentYear}년입니다.
시간이 흘러도 가치가 변하지 않고 수개월, 수년 동안 꾸준히 검색 유입을 만드는 '에버그린 콘텐츠' 주제 4가지를 추천해주세요.

- 콘텐츠 유형: ${egType}
- 콘텐츠 분야: ${egCategory}

반드시 아래 JSON 형식으로만 응답하세요. 순수 JSON만 반환:
[
  {
    "title": "장기 검색 유입을 보장하는 에버그린 포스트 제목",
    "desc": "시간이 지나도 검색되는 영구적 가치와 핵심 구성 (1~2문장)",
    "keywords": ["에버그린키워드1", "핵심키워드2"]
  }
]`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API 호출에 실패했습니다.");
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      setRecommendedTopics(JSON.parse(rawText));
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "추천 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 4. 롱테일 키워드 추천
  const handleGenerateLongtail = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setRecommendedTopics([]);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 네이버 검색 알고리즘 롱테일 키워드 전문가입니다.
현재 연도는 ${currentYear}년입니다.
경쟁은 상대적으로 낮아 상위 노출에 유리하며, 명확한 목적과 구매/행동 전환율이 매우 높은 '롱테일 키워드 포스트' 주제 4가지를 추천해주세요.

- 콘텐츠 분야: ${ltType}

반드시 아래 JSON 형식으로만 응답하세요. 순수 JSON만 반환:
[
  {
    "title": "경쟁 낮은 세부 롱테일 타겟 포스트 제목",
    "desc": "타겟 독자의 구체적인 검색 의도와 전환 포인트 (1~2문장)",
    "keywords": ["세부키워드1", "롱테일키워드2", "지역/상황키워드3"]
  }
]`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API 호출에 실패했습니다.");
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      setRecommendedTopics(JSON.parse(rawText));
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "추천 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 5. 메모/파일 기반 추천
  const handleGenerateMemo = async () => {
    if (!settings.geminiApiKey) {
      setErrorMsg("Google Gemini API 키가 필요합니다. 상단 [설정]에서 본인 키를 등록해주세요.");
      onOpenSettings();
      return;
    }
    if (!memoText.trim()) {
      setErrorMsg("아이디어 메모나 초안 내용을 입력하거나 파일을 업로드해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setRecommendedTopics([]);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 전문 에디터입니다.
현재 연도는 ${currentYear}년입니다.
사용자가 작성한 아래 메모/초안 자료를 정밀 분석하여, 네이버 블로그에서 가장 매력적이고 발전 가능성이 높은 포스트 주제 4가지를 도출해주세요.

[사용자 메모 내용]
${memoText.slice(0, 3000)}

반드시 아래 JSON 형식으로만 응답하세요. 순수 JSON만 반환:
[
  {
    "title": "메모 내용을 발전시킨 매력적인 완성형 제목",
    "desc": "메모의 어떤 핵심 요소를 부각하고 구성할지 설명 (1~2문장)",
    "keywords": ["핵심키워드1", "연관키워드2"]
  }
]`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.textModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API 호출에 실패했습니다.");
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      setRecommendedTopics(JSON.parse(rawText));
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "추천 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMemoText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("eeat")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "eeat"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>E-E-A-T 기반</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("category")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "category"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>카테고리별</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("evergreen")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "evergreen"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Trees className="w-3.5 h-3.5" />
          <span>에버그린 콘텐츠</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("longtail")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "longtail"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>롱테일 키워드 주제</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("memo")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "memo"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>메모/파일 기반</span>
        </button>
      </div>

      {/* Tab 1: E-E-A-T 기반 */}
      {activeTab === "eeat" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            구글 SEO 및 네이버 D.I.A+의 핵심인 <strong>E-E-A-T(경험, 전문성, 권위성, 신뢰성)</strong> 원칙을 만족시키는 주제를 추천받으세요. 사용자의 실제 경험과 전문 지식을 효과적으로 보여주어 블로그의 신뢰도를 높이고 검색 순위 상승을 목표로 합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                콘텐츠 유형 선택
              </label>
              <select
                value={eeatType}
                onChange={(e) => setEeatType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="심층 가이드 및 'How-to'">심층 가이드 및 'How-to'</option>
                <option value="비교 및 분석">비교 및 분석</option>
                <option value="최신 정보 및 트렌드">최신 정보 및 트렌드</option>
                <option value="사례 연구 및 성공 사례">사례 연구 및 성공 사례</option>
                <option value="개인 경험 (후기, 경험담)">개인 경험 (후기, 경험담)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                콘텐츠 분야 선택
              </label>
              <select
                value={eeatCategory}
                onChange={(e) => setEeatCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="IT/기술">IT/기술</option>
                <option value="건강/피트니스">건강/피트니스</option>
                <option value="금융/투자">금융/투자</option>
                <option value="요리/레시피">요리/레시피</option>
                <option value="DIY/공예">DIY/공예</option>
                <option value="학습/교육">학습/교육</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateEeat}
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>E-E-A-T 기반 정밀 주제 분석 및 발굴 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>E-E-A-T 주제 추천받기</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab 2: 카테고리별 */}
      {activeTab === "category" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            선택한 카테고리 내에서 독자의 흥미를 끌고 소셜 미디어 공유를 유도할 만한 최신 트렌드 및 인기 주제를 추천받으세요. 광범위한 독자층을 대상으로 하는 매력적인 콘텐츠 아이디어를 얻을 수 있습니다.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              카테고리 선택
            </label>
            <select
              value={catCategory}
              onChange={(e) => setCatCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="재정/투자 (부동산, 주식, 연금, 세금, 대출 등)">재정/투자 (부동산, 주식, 연금, 세금, 대출 등)</option>
              <option value="IT/기술 (프로그래밍, 앱 사용법, 소프트웨어, 디지털기기 등)">IT/기술 (프로그래밍, 앱 사용법, 소프트웨어, 디지털기기 등)</option>
              <option value="생활/라이프스타일 (인테리어, 요리, 미니멀라이프, 반려동물 등)">생활/라이프스타일 (인테리어, 요리, 미니멀라이프, 반려동물 등)</option>
              <option value="건강/자기계발 (운동, 독서, 습관, 정신건강 등)">건강/자기계발 (운동, 독서, 습관, 정신건강 등)</option>
              <option value="교육/학습 (외국어, 자격증, 온라인강의, 공부법 등)">교육/학습 (외국어, 자격증, 온라인강의, 공부법 등)</option>
              <option value="쇼핑/소비 (온라인쇼핑, 중고거래, 할인혜택, 가성비제품 등)">쇼핑/소비 (온라인쇼핑, 중고거래, 할인혜택, 가성비제품 등)</option>
              <option value="자동차/교통 (자동차보험, 중고차, 대중교통, 주차 등)">자동차/교통 (자동차보험, 중고차, 대중교통, 주차 등)</option>
              <option value="취업/직장 (이직, 연차, 퇴사, 직장생활, 4대보험 등)">취업/직장 (이직, 연차, 퇴사, 직장생활, 4대보험 등)</option>
              <option value="기타(사용자입력)">기타(사용자입력)</option>
            </select>
          </div>

          {catCategory === "기타(사용자입력)" && (
            <input
              type="text"
              value={catCustom}
              onChange={(e) => setCatCustom(e.target.value)}
              placeholder="원하시는 분야나 세부 주제를 입력해주세요 (예: 캠핑, 홈베이킹 등)"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}

          <button
            type="button"
            onClick={handleGenerateCategory}
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>카테고리 트렌드 주제 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>카테고리별 주제 추천받기</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab 3: 에버그린 콘텐츠 */}
      {activeTab === "evergreen" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            시간이 흘러도 가치가 변하지 않아 꾸준한 검색 트래픽을 유도할 수 있는 '에버그린' 주제를 추천받으세요. 'How-to 가이드', '궁극의 가이드' 등 한번 작성해두면 장기적으로 블로그의 자산이 되는 콘텐츠 아이디어를 얻을 수 있습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                콘텐츠 유형 선택 (20가지 유형)
              </label>
              <select
                value={egType}
                onChange={(e) => setEgType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="사례 연구(Case Study)">사례 연구(Case Study)</option>
                <option value="백서(White Paper)">백서(White Paper)</option>
                <option value="통계 및 데이터 정리">통계 및 데이터 정리</option>
                <option value="제품 리뷰 (업데이트 가능)">제품 리뷰 (업데이트 가능)</option>
                <option value="역사적 배경 설명">역사적 배경 설명</option>
                <option value="How-to 가이드">How-to 가이드</option>
                <option value="초보자 가이드">초보자 가이드</option>
                <option value="리스트 콘텐츠 (Top 10, 체크리스트 등)">리스트 콘텐츠 (Top 10, 체크리스트 등)</option>
                <option value="체크리스트">체크리스트</option>
                <option value="용어집(Glossary) & 정의">용어집(Glossary) & 정의</option>
                <option value="베스트 프랙티스 (Best Practices)">베스트 프랙티스 (Best Practices)</option>
                <option value="실패 사례 공유">실패 사례 공유</option>
                <option value="성공 사례 공유">성공 사례 공유</option>
                <option value="스토리텔링 기반 글">스토리텔링 기반 글</option>
                <option value="FAQ(자주 묻는 질문) 정리">FAQ(자주 묻는 질문) 정리</option>
                <option value="튜토리얼 (단계별 안내)">튜토리얼 (단계별 안내)</option>
                <option value="리소스 모음/큐레이션 (추천 툴·사이트 모음)">리소스 모음/큐레이션 (추천 툴·사이트 모음)</option>
                <option value="비교 콘텐츠 (제품·서비스 비교)">비교 콘텐츠 (제품·서비스 비교)</option>
                <option value="전문가 인터뷰">전문가 인터뷰</option>
                <option value="종합 가이드(Ultimate Guide)">종합 가이드(Ultimate Guide)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                콘텐츠 분야 선택
              </label>
              <select
                value={egCategory}
                onChange={(e) => setEgCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="재정/투자 (부동산, 주식, 연금, 세금, 대출 등)">재정/투자 (부동산, 주식, 연금, 세금, 대출 등)</option>
                <option value="IT/기술 (프로그래밍, 앱 사용법, 소프트웨어, 디지털기기 등)">IT/기술 (프로그래밍, 앱 사용법, 소프트웨어, 디지털기기 등)</option>
                <option value="생활/라이프스타일 (인테리어, 요리, 미니멀라이프, 반려동물 등)">생활/라이프스타일 (인테리어, 요리, 미니멀라이프, 반려동물 등)</option>
                <option value="건강/자기계발 (운동, 독서, 습관, 정신건강 등)">건강/자기계발 (운동, 독서, 습관, 정신건강 등)</option>
                <option value="교육/학습 (외국어, 자격증, 온라인강의, 공부법 등)">교육/학습 (외국어, 자격증, 온라인강의, 공부법 등)</option>
                <option value="쇼핑/소비 (온라인쇼핑, 중고거래, 할인혜택, 가성비제품 등)">쇼핑/소비 (온라인쇼핑, 중고거래, 할인혜택, 가성비제품 등)</option>
                <option value="자동차/교통 (자동차보험, 중고차, 대중교통, 주차 등)">자동차/교통 (자동차보험, 중고차, 대중교통, 주차 등)</option>
                <option value="취업/직장 (이직, 연차, 퇴사, 직장생활, 4대보험 등)">취업/직장 (이직, 연차, 퇴사, 직장생활, 4대보험 등)</option>
                <option value="기타(사용자입력)">기타(사용자입력)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateEvergreen}
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>장기 자산형 에버그린 주제 추천 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>에버그린 주제 추천받기</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab 4: 롱테일 키워드 주제 */}
      {activeTab === "longtail" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            실시간 구글 검색 및 네이버 검색을 활용하여, 검색량은 적지만 명확한 목적을 가진 사용자를 타겟으로 하는 '롱테일 키워드' 주제를 추천받으세요. 경쟁이 낮아 상위 노출에 유리하며, 구매나 특정 행동으로 이어질 확률이 높은 잠재고객을 유치하는 데 효과적입니다.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              콘텐츠 유형 선택 (11개 분야)
            </label>
            <select
              value={ltType}
              onChange={(e) => setLtType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="계절/이벤트">계절/이벤트</option>
              <option value="건강/피트니스">건강/피트니스</option>
              <option value="재테크/금융">재테크/금융</option>
              <option value="IT/기술/소프트웨어">IT/기술/소프트웨어</option>
              <option value="부동산/인테리어">부동산/인테리어</option>
              <option value="교육/학습/자기계발">교육/학습/자기계발</option>
              <option value="취업/커리어">취업/커리어</option>
              <option value="쇼핑/제품 리뷰">쇼핑/제품 리뷰</option>
              <option value="여행 (국내/해외)">여행 (국내/해외)</option>
              <option value="자동차 (구매/관리)">자동차 (구매/관리)</option>
              <option value="법률/세금">법률/세금</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerateLongtail}
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>저경쟁 고전환 롱테일 주제 추천 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>롱테일 주제 추천받기</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab 5: 메모/파일 기반 */}
      {activeTab === "memo" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            가지고 있는 아이디어 메모, 초안, 강의 노트, 관련 자료 파일 등을 기반으로 블로그 주제를 추천받으세요. AI가 핵심 내용을 분석하여 가장 매력적이고 발전 가능성이 높은 포스트 제목을 제안해 드립니다.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              메모/초안 입력
            </label>
            <textarea
              rows={4}
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="여기에 아이디어를 자유롭게 작성하거나 아래 버튼을 통해 파일을 업로드하세요."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-300">
              <Upload className="w-3.5 h-3.5" />
              <span>파일 업로드 (.txt, .md 등)</span>
              <input
                type="file"
                accept=".txt,.md,.text"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {memoText && (
              <span className="text-xs text-emerald-600 font-medium">
                ✓ 텍스트가 정상 로드되었습니다 ({memoText.length.toLocaleString()}자)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateMemo}
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>메모 분석 및 주제 도출 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>메모 기반 주제 추천받기</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Recommendations Result Card Grid */}
      {recommendedTopics.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              추천 주제 목록 (클릭 시 하단 포스트 생성란에 자동 주입됩니다)
            </h4>
            <span className="text-[11px] text-slate-400">
              총 {recommendedTopics.length}개 제안됨
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedTopics.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onSelectTopic(item.title, item.desc)}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-400 cursor-pointer transition group shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                      {item.title}
                    </h5>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                    {item.desc}
                  </p>
                </div>

                {item.keywords && item.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.keywords.map((kw, kidx) => (
                      <span
                        key={kidx}
                        className="px-1.5 py-0.5 text-[10px] font-medium bg-white text-slate-600 border border-slate-200 rounded-md"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
