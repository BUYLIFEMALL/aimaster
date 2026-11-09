import Link from "next/link";
import { BookOpen, Lightbulb, AlertTriangle, ExternalLink } from "lucide-react";

// 연동 & 사용 매뉴얼 기본판(1단계). 플랜 8단계에서 docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 8대 템플릿으로 완성한다.
const STEPS = [
  { n: 1, emoji: "🔑", title: "(선택) Claude 키 등록", body: "AI 작사를 쓰려면 [API키등록·플랫폼연동]에 본인 Claude API 키를 넣습니다. 가사를 직접 쓰면 키가 없어도 됩니다.", href: "/settings" },
  { n: 2, emoji: "✍️", title: "곡 만들기", body: "곡 제목·길이·스타일(영어 태그)·가사를 적고 저장합니다. 주제만 적고 [가사 채우기]를 눌러 AI 작사로 채울 수도 있습니다.", href: "/songs" },
  { n: 3, emoji: "🖥️", title: "내 PC 엔진 연결", body: "「내 PC 엔진」 화면의 [설치 파일 받기]로 받아 더블클릭하면 설치되고 엔진이 켜집니다(윈도우 10·11, 「Windows의 PC 보호」 창이 뜨면 [추가 정보] → [실행]). 엔진 창의 연결 코드 6자리를 같은 화면에 넣습니다. 브라우저마다 한 번만 하면 됩니다.", href: "/engine" },
  { n: 4, emoji: "🎧", title: "노래 만들고 듣기", body: "곡 만들기 화면 아래 [노래 만들기]를 누르면 걸린 시간이 보이고, 완성되면 바로 듣고 MP3로 내려받습니다. 만든 노래는 내 PC 보관함에 남아 「모든 음악」에서 다시 들을 수 있습니다. 첫 곡은 음악 모델(약 10GB)을 받느라 더 걸립니다.", href: "/songs" },
];

// 기본 4단계를 마친 뒤 더 해 볼 수 있는 것(v1.26~v1.30 기능, 백로그 C-2)
const MORE = [
  { emoji: "🎛️", title: "분위기·빠르기·목소리 고르기", body: "곡 만들기의 AI 작사에서 장르 버튼, 분위기(최대 3개)·빠르기·목소리를 누르면 엔진이 알아듣는 영어 태그로 스타일에 들어갑니다. 서로 반대인 분위기를 고르면 경고가 뜹니다.", where: "곡 만들기 › AI 작사", href: "/songs" },
  { emoji: "🌏", title: "다른 언어로 부르기", body: "가사 언어를 50개 중에서 고를 수 있습니다. 「추천」 10개(한국어·영어·일본어 등)가 가장 자연스럽게 부릅니다.", where: "곡 만들기 › 가사 언어", href: "/songs" },
  { emoji: "🎨", title: "내 곡으로 커버", body: "곡 만들기 오른쪽 곡 카드의 🎨 버튼(또는 「모든 음악」 곡 메뉴의 「이 곡으로 커버 만들기」)을 누르면 원곡 멜로디에 새 스타일로 다시 부릅니다. 원곡을 얼마나 따를지 20~100%로 정합니다.", where: "곡 만들기 › 오른쪽 곡 카드", href: "/songs" },
  { emoji: "🎼", title: "YuE2 커버(멜로디 받아 적기)", body: "「가져온 음악」의 커버에서 엔진을 「YuE2 · 원곡 멜로디 받아 적기」로 고르면, 원곡의 노래 멜로디를 악보로 받아 적은 뒤 그 멜로디로 새 가사·새 스타일을 부릅니다(엔진 0.8.0 이상, 윈도우 + NVIDIA 그래픽 메모리 8GB 이상). 새 가사가 꼭 필요하고, 원곡과 글자 수·구간이 비슷할수록 잘 맞습니다. 비상업용(개인 감상·비수익)이며 처음 쓸 때 받아 적기 모델 약 1GB를 받습니다.", where: "가져온 음악", href: "/import" },
  { emoji: "🖼️", title: "음악앨범", body: "좌측 「음악앨범」에서 곡과 따로 앨범 그림을 만들어 모아 둡니다. 내 Gemini·OpenAI·Replicate 키로 그리거나 「내 PC (무료)」로 그리고, 그림 설명은 한글로 적어도 됩니다. 곡 만들기의 「만들어 둔 앨범에서 고르기」나 「모든 음악」 곡 메뉴의 「앨범에서 표지 고르기」로 곡 표지가 됩니다. 앨범 카드의 「이 그림으로 곡 만들기」를 누르면 AI가 그림을 보고 곡 주제·장르·분위기·스타일을 채워 줍니다(내 AI 키 1번).", where: "음악앨범", href: "/albums" },
  { emoji: "🎚️", title: "마스터링", body: "완성된 곡의 소리 크기·균형을 다듬습니다. 「모든 음악」 곡 메뉴(…)의 「마스터링」을 누르면 대기열에서 만들고 새 곡으로 남습니다.", where: "모든 음악 › 곡 메뉴", href: "/library" },
  { emoji: "🎤", title: "Stem 분리", body: "보컬/반주 2트랙 또는 보컬·드럼·베이스·기타·피아노·그 외 6트랙으로 나눕니다. 결과 WAV는 노래 저장 폴더의 「Stem」에 생깁니다.", where: "모든 음악 › 곡 메뉴", href: "/library" },
  { emoji: "⏱️", title: "가사 시간 맞추기", body: "곡 상세의 「가사 시간」에서 자동 맞추기(내 PC가 보컬을 듣고 줄마다 시각을 찾음)나 탭으로 직접 맞출 수 있고, LRC·SRT로 내보냅니다.", where: "모든 음악 › 곡 상세", href: "/library" },
  { emoji: "🎬", title: "플레이리스트 영상", body: "고른 곡들을 이어 붙여 유튜브용 MP4를 만듭니다. 템플릿·미리보기가 있고, 가사 시간이 있으면 가사 영상도 됩니다.", where: "영상 만들기", href: "/video" },
];

const FAQ = [
  { q: "정말 요금이 없나요?", a: "음악 생성은 회원님 PC에서 돌아가므로 생성 요금이 없습니다. AI 작사를 쓸 때만 회원님 Claude 계정에 소액(가사 1곡 약 $0.01~0.03)이 청구됩니다." },
  { q: "SUNO와 비교하면 어떤가요?", a: "공개 모델로 만들기 때문에 음질은 SUNO보다 조금 아쉬울 수 있지만, 곡 수 제한 없이 내 PC에서 계속 만들 수 있습니다." },
  { q: "만든 곡은 어디에 저장되나요?", a: "음원 파일은 회원님 PC에만 저장됩니다. 이 사이트에는 곡 제목·스타일·가사만 저장되며, 생성일로부터 30일 뒤 자동으로 지워집니다." },
  { q: "그래픽카드가 없어도 되나요?", a: "됩니다. CPU 모드로 돌아가며 30초 곡에 약 1분 30초가 걸립니다. NVIDIA 그래픽카드나 Apple Silicon 맥이면 더 빠르고 고품질 모드를 쓸 수 있습니다." },
  { q: "모델 파일이 커서 C 드라이브가 꽉 찼어요.", a: "「내 PC 엔진」의 「모델 저장 공간」에서 음악 모델 폴더를, 「음악앨범」 화면 「내 PC 그림 모델」의 「다른 폴더로 바꾸기」에서 그림 모델 폴더를 다른 드라이브로 옮길 수 있습니다. 받아 둔 모델은 다시 받지 않고 옮겨집니다." },
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

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-100">✨ 익숙해지면 더 해 볼 수 있는 것</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MORE.map((m) => (
            <li key={m.title} className="flex flex-col rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4">
              <p className="text-sm font-bold text-slate-100">
                {m.emoji} {m.title}
              </p>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-400">{m.body}</p>
              <Link href={m.href} className="mt-2.5 inline-flex items-center gap-1 self-start text-[11px] font-semibold text-emerald-300 underline underline-offset-2">
                {m.where} <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500">마스터링·Stem·가사 자동 맞추기·영상·내 PC 그림은 엔진 0.6.9 이상(내 PC 그림은 0.7.0 이상)에서 쓸 수 있습니다. 「내 PC 엔진」에 새 버전 알림이 뜨면 설치 파일을 다시 받아 주세요.</p>
      </section>

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
