import Link from "next/link";
import { LoopModeDiagram } from "@/components/ui/LoopModeDiagram";

// 연동 & 사용 매뉴얼 (2026-10-17 디자인 리뉴얼) — 문구는 루프 만들기 화면의 실제 동작과 맞춘다.
const STEPS = [
  { icon: "📤", title: "영상 올리기", desc: "동영상을 끌어다 놓거나 눌러서 고릅니다. 50MB 이하, 30초 미만이 가장 빠르고 안정적이에요.", time: "10초" },
  { icon: "🧭", title: "방식 고르기", desc: "스마트 루프는 가장 닮은 구간을 자동으로 찾고, 강제 오버랩은 끝과 처음을 1초 겹치고, 바운스는 앞뒤로 왕복해요.", time: "10초" },
  { icon: "🎚️", title: "다듬기", desc: "최소 루프 길이, 시작·종료 지점(0.01초 단위), 크로스페이드 길이를 조절해요. 자연스러움 점수가 낮으면 크로스페이드를 늘려 보세요.", time: "1분" },
  { icon: "🎞️", title: "내보내기", desc: "반복 횟수(1~200)와 형식(MP4·WebM·GIF)을 고르고 만들기를 누르면 바로 내려받을 수 있어요.", time: "수십 초" },
];

const GOOD = ["🌊 파도·물결", "🔥 모닥불·불꽃", "🚶 걷기·달리기", "🌀 회전하는 물체", "☁️ 흐르는 구름"];
const HARD = ["🎥 카메라가 크게 움직이는 영상", "🎬 장면이 바뀌는 영상(컷 편집)", "🗣️ 말하는 사람의 입 모양"];

const FAQ = [
  {
    q: "내 영상이 서버로 올라가나요?",
    a: "아니요. 모든 처리는 이 기기의 브라우저 안에서만 이뤄집니다. 영상이 서버로 전송되지 않고, API 키도 필요 없어요.",
  },
  {
    q: "처음 만들 때 왜 오래 걸리나요?",
    a: "처음 한 번은 브라우저가 변환 엔진을 내려받기 때문이에요. 그 뒤로는 훨씬 빨라집니다.",
  },
  {
    q: "소리도 함께 반복되나요?",
    a: "MP4·WebM은 소리도 함께 이어집니다. GIF는 형식상 소리가 들어가지 않아요.",
  },
  {
    q: "GIF가 작게 나와요.",
    a: "GIF는 파일이 커지기 쉬워 480px 폭으로 줄여 1회분만 저장합니다. 큰 화면이 필요하면 MP4나 WebM을 고르세요.",
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-lv-border bg-lv-surface p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full lv-gradient opacity-20 blur-3xl" />
        <span className="lv-chip">📖 연동 & 사용 매뉴얼</span>
        <h1 className="mt-3 text-2xl font-extrabold text-lv-text">
          4단계로 끝내는 <span className="lv-gradient-text">무한 반복 영상</span>
        </h1>
        <p className="mt-2 text-sm text-lv-muted">API 키나 외부 계정 연동 없이, 로그인만 하면 바로 쓸 수 있어요.</p>
        <Link href="/studio" className="lv-btn-primary mt-4">
          🎬 루프 만들러 가기
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full lv-gradient text-2xl">🎞️</div>
        <div className="lv-card rounded-tl-none">
          <p className="text-sm leading-relaxed text-lv-text">
            안녕하세요, 루프 비서예요! 영상을 올려 주시면 <b>끝과 처음이 가장 닮은 순간</b>을 찾아 <b>끊김 없이 이어지는 반복 영상</b>으로
            만들어 드릴게요. 영상은 <b>회원님 기기 안에서만</b> 처리되니 안심하세요.
          </p>
        </div>
      </div>

      <section className="lv-card">
        <h2 className="lv-section-title">🧭 사용 순서</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex h-full flex-col rounded-xl border border-lv-border bg-lv-raised p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full lv-gradient text-xs font-bold text-white">{i + 1}</span>
                  <span className="lv-chip">⏱ {s.time}</span>
                </div>
                <span className="mt-3 text-3xl">{s.icon}</span>
                <span className="mt-2 text-sm font-bold text-lv-text">{s.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-lv-muted">{s.desc}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-lv-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="lv-card">
        <h2 className="lv-section-title">🔁 루프 방식 비교</h2>
        <LoopModeDiagram />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-lv-success/30 bg-lv-success/10 p-4">
          <p className="text-sm font-bold text-lv-success">👍 자연스럽게 잘 이어지는 영상</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GOOD.map((g) => (
              <span key={g} className="lv-chip text-lv-text">{g}</span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-lv-muted">배경이 일정하거나 움직임이 반복되는 영상일수록 잘 이어져요.</p>
        </div>
        <div className="rounded-xl border border-lv-warn/40 bg-lv-warn/10 p-4">
          <p className="text-sm font-bold text-lv-warn">⚠️ 점수가 낮게 나올 수 있는 영상</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {HARD.map((g) => (
              <span key={g} className="lv-chip text-lv-text">{g}</span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-lv-muted">이럴 때는 크로스페이드를 길게 하거나 「바운스」를 써 보세요.</p>
        </div>
      </div>

      <section className="lv-card">
        <h2 className="lv-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-lv-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-lv-text">
                <span className="mr-1 text-lv-muted group-open:hidden">＋</span>
                <span className="mr-1 hidden text-lv-muted group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-lv-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
