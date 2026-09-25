"use client";

import { useState } from "react";
import { 
  Wand2, Sparkles, ArrowRight, RefreshCw, AlertCircle, Copy, Check, 
  Camera, Box, Palette, Layers, Zap, Tag, RotateCcw,
  Feather, Brush, Film, Smile, PenTool, Building2, Flame, LayoutGrid
} from "lucide-react";

interface Step1PromptEnhancerProps {
  onApplyPrompt: (prompt: string, negativePrompt?: string) => void;
}

const PRESET_STYLES = [
  { id: "photorealistic", name: "실사 포토리얼리즘", icon: Camera, desc: "8K 카메라인 렌즈 & 조명 디테일 극대화" },
  { id: "3d_digital", name: "3D 디지털 아트", icon: Box, desc: "Cinema 4D / Octane 렌더 픽사 3D 스타일" },
  { id: "artistic_editorial", name: "감성 패션 화보", icon: Palette, desc: "Vogue 룩북 스타일 패션/인물 화보" },
  { id: "vector_illustration", name: "벡터 일러스트", icon: Layers, desc: "SVG 그래픽 & 깔끔한 그래픽 디자인" },
  { id: "cyberpunk_neon", name: "사이버펑크 네온", icon: Zap, desc: "네온 라이팅 & 미래도시 신비로운 야경" },
  { id: "oriental_ink", name: "동양 수묵화", icon: Feather, desc: "한지 질감 & 먹선 수묵 채색 미학" },
  { id: "watercolor_pastel", name: "수채화 파스텔", icon: Brush, desc: "투명한 파스텔 톤 동화 감성 수채화" },
  { id: "cinematic_film", name: "35mm 필름", icon: Film, desc: "Kodak Portra 아날로그 필름 빈티지 감성" },
  { id: "claymation", name: "클레이 스톱모션", icon: Smile, desc: "지점토 핸드메이드 스톱모션 미니어처" },
  { id: "webtoon_lineart", name: "웹툰 라인아트", icon: PenTool, desc: "명확한 먹선 아웃라인 & 웹툰 스타일" },
  { id: "architectural", name: "건축 & 인테리어", icon: Building2, desc: "ArchDaily 스타일 공간 렌더링 & 빛 조화" },
  { id: "dark_fantasy", name: "다크 판타지", icon: Flame, desc: "웅장한 마법 광원 & 고딕 콘셉트 아트" },
  { id: "minimal_flat", name: "미니멀 플랫 아트", icon: LayoutGrid, desc: "세련된 칼라 블록 & 모던 포스터 디자인" },
];

const STYLE_QUICK_TAGS_MAP: Record<string, Array<{ label: string; prompt: string }>> = {
  photorealistic: [
    { label: "#한옥카페 인물", prompt: "서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 20대 한국 여성, 따뜻한 오후 햇살" },
    { label: "#제주 감성 풍경", prompt: "제주도 해변 언덕 위 해질녘 노을빛 오션뷰 한옥 숙소와 감성적인 풍경" },
    { label: "#스튜디오 인물 컷", prompt: "도도한 시선의 20대 한국 남성 모델, 은은한 스튜디오 링 라이트 조명과 85mm 인물 포트레이트" },
  ],
  "3d_digital": [
    { label: "#3D 마케팅 아이콘", prompt: "혁신적인 스마트폰과 신용카드가 떠있는 3D 미니멀 클레이 아트 마케팅 아이콘 세트" },
    { label: "#픽사풍 귀여운 캐릭터", prompt: "동글동글한 안경을 쓴 귀여운 3D 토끼 탐정 캐릭터, Pixar 애니메이션 렌더링" },
    { label: "#미래지향 3D 오브젝트", prompt: "투명한 글래스모피즘 큐브와 입체 가상화폐 3D 디스플레이 렌더" },
  ],
  artistic_editorial: [
    { label: "#패션 룩북 화보", prompt: "모던한 미니멀 백그라운드 스튜디오에서 봄 신상 트렌치코트를 입은 모델의 패션 잡지 화보" },
    { label: "#보그 흑백 세련미", prompt: "Vogue 룩북 스타일, 드라마틱한 음영 대비가 돋보이는 모던 하이패션 포즈의 여성 모델" },
    { label: "#하이엔드 주얼리 컷", prompt: "고급스러운 아크릴 무대 위 다이아몬드 목걸이와 패션 잡지 커버컷 조명 연출" },
  ],
  vector_illustration: [
    { label: "#벡터 제품 일러스트", prompt: "친환경 오가닉 코스메틱 화장품 병과 나뭇잎 요소가 조화로운 벡터 평면 일러스트레이션" },
    { label: "#IT 스타트업 캐릭터", prompt: "노트북으로 코딩 중인 젊은 개발자 팀, 선명한 아웃라인과 모던 벡터 스타일" },
    { label: "#도시 생활 플랫 카드", prompt: "커피를 들고 도심 공원을 산책하는 사람들의 세련된 flat vector 그래픽" },
  ],
  cyberpunk_neon: [
    { label: "#사이버펑크 서울야경", prompt: "네온사인 가득한 비 내리는 사이버펑크 서울 야경 속 트렌디한 한국 여성의 몽환적인 포트레이트" },
    { label: "#네온 라이더 스피드", prompt: "미래도시 네온 고속도로를 질주하는 사이버펑크 오토바이 라이더와 청색/자홍색 이펙트" },
    { label: "#미래형 해커 로봇", prompt: "신비로운 홀로그램 인터페이스를 조작하는 미래형 안드로이드 해커" },
  ],
  oriental_ink: [
    { label: "#수묵 한복 포트레이트", prompt: "은은한 수묵 먹선과 한지 질감 속 아련한 분위기의 한복 입은 선비와 매화 가지" },
    { label: "#경복궁 수묵 산수화", prompt: "안개 낀 아침 삼각산과 경복궁 대웅전이 먹선의 짙고 옅음으로 그려진 동양 수묵화" },
    { label: "#달빛 매화 대나무", prompt: "둥근 은달빛 아래 대나무 잎과 흰 매화가 번진 조선 전통 수묵 채색화" },
  ],
  watercolor_pastel: [
    { label: "#수채화 파스텔 동화", prompt: "해질녘 분홍빛 노을 하늘 아래 동화 속 작은 목조 오두막과 꽃밭 풍경" },
    { label: "#수채화 고양이 감성", prompt: "창가 햇살 아래 졸고 있는 몽환적인 털 질감의 수채화 고양이 일러스트" },
    { label: "#파스텔 봄날 꽃길", prompt: "벚꽃잎이 날리는 시골 오솔길을 자전거로 달리는 아이의 맑은 수채화" },
  ],
  cinematic_film: [
    { label: "#35mm 빈티지 카페", prompt: "80년대 골목길 카페 야외 테라스에서 커피를 마시는 감성적인 빈티지 인물 컷" },
    { label: "#레트로 야간 스냅", prompt: "Kodak Portra 400 필름 특유의 따뜻한 입자와 비 오는 밤 도쿄 골목 네온 스냅" },
    { label: "#여름 바다 필름 감성", prompt: "햇빛이 수면에 반사되는 청량한 여름 바닷가와 90년대 필름 카메라 질감" },
  ],
  claymation: [
    { label: "#지점토 귀여운 공룡", prompt: "손맛 느껴지는 울퉁불퉁 지점토 질감의 알록달록 아기 공룡 스톱모션 인형" },
    { label: "#클레이 베이커리 빵", prompt: "따뜻한 오븐 속 귀여운 표정이 그려진 클레이 빵과 미니어처 주방" },
    { label: "#클레이 아기자기 마을", prompt: "아기자기한 클레이 스톱모션 미니어처 마을과 알록달록 자동차" },
  ],
  webtoon_lineart: [
    { label: "#웹툰 주인공 액션", prompt: "강렬한 먹선 아웃라인과 셀 셰이딩이 돋보이는 한국 판타지 웹툰 주인공 소환 씬" },
    { label: "#학원물 웹툰 로맨스", prompt: "학교 복도 창가 햇살 아래 서로 바라보는 고등학생 남녀 웹툰 명장면" },
    { label: "#도시 몬스터 웹툰", prompt: "서울 강남역 한복판에 나타난 거대 몬스터와 이에 맞서는 웹툰 히어로" },
  ],
  architectural: [
    { label: "#건축 인테리어", prompt: "통창 너머로 숲이 펼쳐지는 미니멀 우드 앤 콘크리트 고급 거실 인테리어 디자인" },
    { label: "#모던 단독주택 외관", prompt: "ArchDaily 잡지 커버 스타일, 자연광과 노출 콘크리트 조화의 미니멀 모던 주택" },
    { label: "#호텔 리조트 수영장", prompt: "발리 리조트풍 인피니티 풀과 해질녘 오렌지빛 라이팅 디자인 공간" },
  ],
  dark_fantasy: [
    { label: "#다크판타지 웅장함", prompt: "어둡고 신비로운 고성 타워 위에서 붉은 마법 룬을 시전하는 검은 로브의 마법사" },
    { label: "#심연의 고딕 기사", prompt: "자색 안개 가득한 폐허 성당 앞 거대한 대검을 든 고딕 다크 판타지 기사" },
    { label: "#용의 둥지 수호자", prompt: "용암이 흐르는 어두운 동굴 속 붉은 눈의 용과 고대 성물" },
  ],
  minimal_flat: [
    { label: "#미니멀 여행 포스터", prompt: "제주 돌하르방과 조용한 해변을 감각적인 컬러 블록으로 표현한 모던 아트 포스터" },
    { label: "#플랫 팝아트 인물", prompt: "강렬한 비비드 컬러와 단순한 기하학 도형으로 디자인된 인물 포스터" },
    { label: "#모던 미드센추리 가구", prompt: "60년대 미드센추리 모던 가구와 플랫 그래픽 일러스트" },
  ],
};

export function Step1PromptEnhancer({ onApplyPrompt }: Step1PromptEnhancerProps) {
  const [idea, setIdea] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("photorealistic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    enhancedPrompt: string;
    styleNotes: string;
    negativePrompt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const activeStyleInfo = PRESET_STYLES.find((s) => s.id === selectedPreset) || PRESET_STYLES[0];
  const activeTags = STYLE_QUICK_TAGS_MAP[selectedPreset] || STYLE_QUICK_TAGS_MAP.photorealistic;

  const handleEnhance = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, presetStyle: selectedPreset })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "프롬프트 최적화 생성에 실패했습니다.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectQuickTag = (tagPrompt: string) => {
    setIdea(tagPrompt);
  };

  return (
    <div id="step1-container" className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 backdrop-blur-xl space-y-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 px-3.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 whitespace-nowrap">
            <span className="text-sm font-bold">Step 1</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-amber-400" />
              AI 프롬프트 최적화 생성기 (UI/UX 고도화)
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              원하는 아이디어를 자유롭게 입력하거나 추천 태그를 클릭해보세요. AI가 최적의 영문 프롬프트를 만듭니다.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200">화풍 / 화법 프리셋 선택</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {PRESET_STYLES.map((st) => {
            const IconComponent = st.icon;
            const isSelected = selectedPreset === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedPreset(st.id)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-zinc-400"}`} />
                  <span className="text-sm font-bold text-white">{st.name}</span>
                </div>
                <span className="text-xs text-zinc-400 line-clamp-1">{st.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Quick Idea Recommendation Tags based on selected style */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
          <Tag className="h-3.5 w-3.5 text-amber-400" />
          <span><strong className="text-amber-400 font-extrabold">[{activeStyleInfo.name}]</strong> 전용 추천 아이디어 (클릭 시 자동 입력):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectQuickTag(tag.prompt)}
              className="rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="예: 서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 한국 여성, 따뜻한 오후 햇살"
          rows={3}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {(() => {
            const hasContent = Boolean(idea.trim() || result);
            return (
              <button
                type="button"
                disabled={!hasContent}
                onClick={() => {
                  setIdea("");
                  setResult(null);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3.5 text-sm font-bold border border-amber-400/50 shadow-lg shadow-amber-500/20 transition-all active:scale-95 min-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-700 disabled:shadow-none disabled:active:scale-100"
                title={hasContent ? "입력된 아이디어를 초기화합니다" : "초기화할 내용이 없습니다"}
              >
                <RotateCcw className="h-4 w-4" />
                <span>프롬프트 초기화 (Reset)</span>
              </button>
            );
          })()}

          <button
            onClick={handleEnhance}
            disabled={loading || !idea.trim()}
            className="flex items-center gap-2.5 rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>AI 마스터 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 fill-zinc-950" />
                <span>마스터 프롬프트 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3.5 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
            <span className="font-bold text-amber-300 text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              최적화 생성된 영문 프롬프트
            </span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm text-zinc-200 hover:text-white bg-zinc-900 px-3.5 py-1.5 rounded-lg border border-zinc-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "복사됨" : "복사하기"}
              </button>
              <button
                onClick={() => onApplyPrompt(result.enhancedPrompt, result.negativePrompt)}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-3 text-sm font-black text-zinc-950 hover:from-amber-300 hover:to-yellow-300 transition-all shadow-xl shadow-amber-500/40 ring-4 ring-amber-400/50 hover:ring-amber-300 transform hover:scale-[1.03] active:scale-95 animate-pulse cursor-pointer"
              >
                <span>Step 2에 적용하기 (1-Click)</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </div>

          <p className="font-mono text-base text-zinc-100 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800 select-all">
            {result.enhancedPrompt}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-300 pt-1">
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
              <span className="font-bold text-amber-400">💡 적용된 연출 노하우:</span> {result.styleNotes}
            </div>
            {result.negativePrompt && (
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400">🚫 부정 프롬프트:</span> {result.negativePrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
