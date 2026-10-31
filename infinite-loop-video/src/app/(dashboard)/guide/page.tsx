import Link from "next/link";
import { LoopModeDiagram } from "@/components/ui/LoopModeDiagram";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  Download,
  Film,
  Zap,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

const STEPS = [
  {
    icon: "🎞️",
    title: "1. 영상 업로드 & 트리밍",
    desc: "5~15초 사이의 임팩트 있는 9:16 세로 영상을 업로드하고 핵심 루프 구간을 앞뒤 컷합니다.",
    time: "10초 소요"
  },
  {
    icon: "🔬",
    title: "2. 루프 엔진 자동 정합",
    desc: "스마트 시임리스 엔진이 앞뒤 프레임의 색감과 모션을 나노 단위로 분석하여 최적의 연결 구간을 찾습니다.",
    time: "15초 소요"
  },
  {
    icon: "🎯",
    title: "3. 대본 훅 & 오디오 맞춤",
    desc: "마지막 문장과 첫 문장이 매끄럽게 연결되는 루프 나레이션 기법을 적용해 시청자의 재시청을 유도합니다.",
    time: "30초 소요"
  },
  {
    icon: "⚡",
    title: "4. 고속 렌더 & 자동 포스팅",
    desc: "GPU 가속 1080p 60fps MP4로 즉시 렌더링 후 크롬 확장을 통해 유튜브 쇼츠에 원클릭 발행합니다.",
    time: "원클릭 완성"
  },
];

const GOOD_SOURCES = [
  "🌊 바다 파도 및 폭포 물결",
  "🔥 모닥불 및 캠핑 불꽃",
  "💃 댄스 챌린지 및 스텝 동작",
  "🌀 회전하는 3D 그래픽 / 피젯 스피너",
  "🍳 요리 및 베이킹 조리 과정",
  "🎨 드로잉 및 만들기 메이킹"
];

const HARD_SOURCES = [
  "🎥 카메라가 마구 흔들리는 핸드헬드 샷",
  "🎬 장면이 급변하는 컷 편집 영상",
  "🗣️ 말하는 인물의 입 모양이 크게 바뀔 때",
  "⚡ 조명이 깜빡이거나 번쩍이는 씬"
];

const FAQS = [
  {
    q: "Q. 루프 영상이 왜 유튜브 쇼츠 알고리즘에서 폭발적으로 떡상하나요?",
    a: "유튜브 쇼츠 알고리즘의 최우선 평가 지표는 '평균 시청 지속률(APVD)'입니다. 시청자가 영상의 끝을 눈치채지 못하고 2~3회 반복 시청하게 되면 지속률이 150%~250%를 기록하며 강력한 추천 트래픽을 타게 됩니다."
  },
  {
    q: "Q. 내 영상이 서버로 업로드되어 유출될 위험은 없나요?",
    a: "전혀 없습니다. 모든 분석과 렌더링 처리는 회원님의 기기(브라우저 WASM 또는 내 PC 하드웨어 가속) 안에서 100% 로컬로만 작동하며, 외부 서버로 단 1바이트의 영상도 전송되지 않습니다."
  },
  {
    q: "Q. 배경음악이나 대본 목소리도 부드럽게 이어지나요?",
    a: "네! 스마트 루프 모드는 영상뿐만 아니라 오디오 트랙도 이퀄 파워 크로스페이드 곡선으로 부드럽게 겹쳐서 연결하므로 '뚝' 끊기는 소리 없이 자연스럽게 이어집니다."
  },
  {
    q: "Q. 틱톡이나 인스타그램 릴스에도 동일하게 쓸 수 있나요?",
    a: "물론입니다. 1080×1920 세로 규격과 60FPS 고화질 MP4로 렌더링되므로, 쇼츠·릴스·틱톡 어디든 최고 화질로 업로드하실 수 있습니다."
  }
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 상단 히어로 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400 to-blue-500 opacity-15 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 border border-amber-200 text-amber-800">
          <BookOpen size={13} className="text-amber-600" />
          <span>공식 매뉴얼 & 베스트 프랙티스</span>
        </span>
        <h1 className="mt-3 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
          쇼츠 무한루프 영상 제작 <span className="text-amber-600">완벽 마스터 가이드</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          초보자도 1분 만에 떡상 루프 영상을 제작할 수 있는 실전 노하우와 프레임 정합 최적화 팁을 안내합니다.
        </p>
        <div className="mt-4">
          <Link href="/studio" className="btn-3d-amber text-xs">
            <span>스튜디오로 바로 가기</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 4단계 워크플로우 카드 */}
      <section className="lv-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Zap size={18} className="text-amber-600" />
            <span>4단계 무한루프 제작 파이프라인</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">순서대로 따라하기</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-2xs hover:border-amber-400 hover:bg-amber-50/20 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-black text-xs shadow-2xs">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    {s.time}
                  </span>
                </div>
                <div className="text-2xl mb-1.5">{s.icon}</div>
                <h3 className="text-sm font-black text-slate-900 leading-snug">{s.title}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-medium">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 루프 방식 비교 섹션 */}
      <section className="lv-card space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Film size={18} className="text-amber-600" />
            <span>루프 알고리즘 3대 모드 특징 비교</span>
          </h2>
        </div>
        <LoopModeDiagram />
      </section>

      {/* 추천 영상 vs 피해야 할 영상 대조 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
          <h3 className="text-sm font-black text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>루프 효과가 100% 극대화되는 추천 영상</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {GOOD_SOURCES.map((g) => (
              <span key={g} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-emerald-200 text-emerald-800 shadow-2xs">
                {g}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            * 카메라 위치가 고정되어 있거나 반복적인 모션이 있는 영상일수록 나노 프레임 매칭 정확도가 99%를 넘습니다.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5 space-y-3">
          <h3 className="text-sm font-black text-amber-900 flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-amber-600" />
            <span>정합 시 주의가 필요한 영상 소스</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {HARD_SOURCES.map((h) => (
              <span key={h} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-amber-200 text-amber-800 shadow-2xs">
                {h}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            * 컷 편집이 있거나 카메라가 마구 흔들리는 영상은 '핑퐁 바운스' 모드를 사용하시면 매끄럽게 연결됩니다.
          </p>
        </div>
      </div>

      {/* 시청 지속률 200% 꿀팁 & FAQ */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 lv-card space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
            <HelpCircle size={18} className="text-amber-600" />
            <span>자주 묻는 질문 (FAQ)</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <h4 className="text-xs font-extrabold text-amber-800">{faq.q}</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 숏폼 바이럴 시크릿 팁 카드 */}
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              <TrendingUp size={12} />
              <span>크리에이터 실전 꿀팁</span>
            </span>
            <h3 className="text-base font-black text-slate-900">
              루프 대본 훅 공식: 첫 문장과 끝 문장의 도킹
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              영상의 마지막 대사를 <i>"그래서 이 사실을 아는 사람은..."</i> 으로 끝내고, 첫 대사를 <i>"전 세계에 1%도 되지 않습니다"</i> 로 시작하면 시청자가 끝난 줄 모르고 3번 이상 반복 재생하게 됩니다.
            </p>
          </div>

          <div className="pt-4 border-t border-amber-200 mt-4">
            <Link href="/studio" className="btn-3d-amber w-full text-center py-2 text-xs">
              루프 영상 제작 시작하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
