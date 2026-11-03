import Link from "next/link";
import { BookOpen, Lightbulb, AlertTriangle, ExternalLink } from "lucide-react";

// 연동 & 사용 매뉴얼 기본판(1단계). 플랜 8단계에서 docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 8대 템플릿으로 완성한다.
const STEPS = [
  { n: 1, emoji: "🔑", title: "(선택) Claude 키 등록", body: "AI 작사를 쓰려면 [API키등록·플랫폼연동]에 본인 Claude API 키를 넣습니다. 가사를 직접 쓰면 키가 없어도 됩니다.", href: "/settings" },
  { n: 2, emoji: "✍️", title: "곡 만들기", body: "곡 제목·길이·스타일(영어 태그)·가사를 적고 저장합니다. 주제만 적고 [가사 채우기]를 눌러 AI 작사로 채울 수도 있습니다.", href: "/songs" },
  { n: 3, emoji: "🖥️", title: "내 PC 엔진 연결", body: "「내 PC 엔진」 화면의 [설치 파일 받기]로 받아 더블클릭하면 설치되고 엔진이 켜집니다(윈도우 10·11, 「Windows의 PC 보호」 창이 뜨면 [추가 정보] → [실행]). 엔진 창의 연결 코드 6자리를 같은 화면에 넣습니다. 브라우저마다 한 번만 하면 됩니다.", href: "/engine" },
  { n: 4, emoji: "🎧", title: "노래 만들고 듣기", body: "곡 만들기 화면 아래 [노래 만들기]를 누르면 걸린 시간이 보이고, 완성되면 바로 듣고 MP3로 내려받습니다. 만든 노래는 내 PC 보관함에 남아 「모든 음악」에서 다시 들을 수 있습니다. 첫 곡은 음악 모델(약 10GB)을 받느라 더 걸립니다.", href: "/songs" },
];

const FAQ = [
  { q: "정말 요금이 없나요?", a: "음악 생성은 회원님 PC에서 돌아가므로 생성 요금이 없습니다. AI 작사를 쓸 때만 회원님 Claude 계정에 소액(가사 1곡 약 $0.01~0.03)이 청구됩니다." },
  { q: "SUNO와 비교하면 어떤가요?", a: "공개 모델로 만들기 때문에 음질은 SUNO보다 조금 아쉬울 수 있지만, 곡 수 제한 없이 내 PC에서 계속 만들 수 있습니다." },
  { q: "만든 곡은 어디에 저장되나요?", a: "음원 파일은 회원님 PC에만 저장됩니다. 이 사이트에는 곡 제목·스타일·가사만 저장되며, 생성일로부터 30일 뒤 자동으로 지워집니다." },
  { q: "그래픽카드가 없어도 되나요?", a: "됩니다. CPU 모드로 돌아가며 30초 곡에 약 1분 30초가 걸립니다. NVIDIA 그래픽카드나 Apple Silicon 맥이면 더 빠르고 고품질 모드를 쓸 수 있습니다." },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">📖 연동 & 사용 매뉴얼</h1>
            <p className="mt-0.5 text-xs text-slate-400">⏱ 처음 설정 약 10분 · 💻 내 PC에서 노래 생성 · 🔑 키는 AI 작사에만(선택)</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-emerald-500/20 bg-[#0a0f1d] p-6">
        <p className="text-base font-bold text-slate-100">🎵 가사만 준비하면, 노래는 내 PC가 만듭니다</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          웹에서 가사와 스타일을 정리하고, 내 PC에 설치한 엔진이 키·요금 없이 노래를 만듭니다. 음원은 회원님 PC에만 남습니다.
        </p>
      </section>

      <ol className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.n} className="flex flex-col rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
            <span className="text-[11px] font-bold text-emerald-300">STEP {s.n}</span>
            <p className="mt-1 text-sm font-bold text-slate-100">
              {s.emoji} {s.title}
            </p>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{s.body}</p>
            <Link href={s.href} className="mt-3 inline-flex items-center gap-1 self-start rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40">
              바로 가기 <ExternalLink className="h-3 w-3" />
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 text-xs leading-relaxed text-sky-200">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <span>
          💡 가사에 <code className="rounded bg-slate-900 px-1">[Verse]</code>·<code className="rounded bg-slate-900 px-1">[Chorus]</code>처럼 구간 표시를 넣고, 스타일은
          「장르, 악기, 보컬, 분위기, BPM」 순서의 영어 태그로 쓰면 결과가 안정적입니다.
        </span>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <span>⚠️ 다른 사람의 노래 가사를 그대로 넣거나, 권리가 없는 곡으로 커버를 만들지 마세요. 실제 가수 이름을 스타일에 넣는 것도 피해 주세요.</span>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
        <h2 className="text-sm font-bold text-slate-100">자주 묻는 질문</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-slate-800 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-200">{f.q}</summary>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
