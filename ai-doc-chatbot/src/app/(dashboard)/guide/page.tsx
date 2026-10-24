import Link from "next/link";
import { ProviderGuide } from "@/lib/compatibleChat/ProviderGuide";

const STEPS = [
  { emoji: "🔑", title: "본인 API 키 등록", body: "답변할 AI의 본인 키를 [API키등록·플랫폼연동]에 등록합니다. 문서 참고·읽기는 Upstage, 웹 검색은 Tavily 키가 필요합니다. 등록한 키는 다른 AIMaster 프로그램에서도 함께 씁니다.", href: "/settings", cta: "키 등록하기" },
  { emoji: "📄", title: "내 문서 올리기", body: "회사 소개서·매뉴얼·강의 자료처럼 자주 묻는 내용이 담긴 문서를 올립니다. 내용을 조각내 임베딩해 두고 질문할 때 관련 부분을 찾습니다.", href: "/documents", cta: "문서 올리기" },
  { emoji: "💬", title: "질문하기", body: "AI 채팅에서 질문하면 내 문서에서 근거를 찾고, 최신 정보가 필요하면 웹을 검색해서 답합니다. 대화는 채팅방별로 저장됩니다.", href: "/chat", cta: "채팅 시작" },
  { emoji: "🔎", title: "출처 확인", body: "답변 아래 📄(문서 이름)·🌐(웹 링크) 표시로 어떤 자료를 참고했는지 확인하고, 중요한 내용은 원문을 직접 확인합니다.", href: "/chat", cta: "답변 보기" },
];

const FAQ = [
  { q: "커스텀 봇에도 새 AI 키가 필요한가요?", a: "새 키는 필수가 아닙니다. 기본 번역·요약·업무 문서 봇과 내 봇은 기존 Upstage로도 사용할 수 있습니다. 봇 관리에서 역할·모델·온도를 저장하고 채팅방에서 선택하세요. 다른 공급자를 골랐을 때만 해당 회원 본인 키가 필요합니다." },
  { q: "봇을 수정하거나 삭제하면 예전 대화도 바뀌나요?", a: "바뀌지 않습니다. 새 답변부터 선택한 봇을 쓰고, 이전 답변에는 당시 봇 이름·지침·실제 모델을 따로 기록합니다. 삭제된 봇을 고른 방에서는 새 봇을 선택하거나 일반 채팅으로 해제해 주세요. 직접 저장한 봇 설정과, 기존 30일 보관을 따르는 대화·답변 당시 기록은 구분합니다." },
  { q: "키가 없으면 쓸 수 없나요?", a: "선택한 답변 AI의 본인 키가 필요합니다. Groq·OpenRouter·Cloudflare로 일반 대화만 하려면 「내 문서 참고」를 끄세요. 문서 검색·읽기는 Upstage 키, 웹 검색은 Tavily 키가 따로 필요합니다." },
  { q: "어떤 질문에 웹 검색을 하나요?", a: "질문마다 AI가 최신 정보(뉴스·가격·일정·최근 출시 등)가 필요한지 먼저 판단하고, 필요할 때만 Tavily MCP로 검색합니다. 입력창 아래 「웹 검색」을 끄면 검색하지 않습니다." },
  { q: "내 문서와 대화는 어디에 저장되나요?", a: "회원님 계정에만 저장되어 다른 회원은 볼 수 없습니다. 원본 파일은 보관하지 않고 뽑은 글·임베딩·대화만 저장하며, 만든 날부터 30일이 지나면 자동으로 지워집니다." },
  { q: "요금은 어떻게 되나요?", a: "답변은 선택한 AI, 문서 읽기·임베딩은 Upstage, 웹 검색은 Tavily의 회원 본인 계정 한도와 요금을 따릅니다. 무료 한도가 있어도 Paid 계정 조건은 다를 수 있으니 공식 콘솔을 확인해 주세요. 유료 모델로 자동 변경하지 않습니다." },
  { q: "PDF를 올렸는데 실패했어요.", a: "파일당 50MB까지 올릴 수 있습니다(4MB가 넘으면 저장소를 거쳐 자동으로 올라갑니다). 100쪽이 넘는 PDF는 「읽는 중인 큰 문서」에 표시되고 몇 분 뒤 저장됩니다. 같은 문서(이름·크기 동일)는 두 번 올릴 수 없으니, 다시 올리려면 기존 문서를 먼저 삭제해 주세요. 한 문서에서 저장되는 조각은 최대 400개라 아주 긴 문서는 앞부분 위주로 검색됩니다." },
];

export default function GuidePage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-sky-500/10 p-6">
        <p className="text-3xl">🤖📚🌐</p>
        <h1 className="mt-2 text-xl font-bold text-slate-100">AI 문서 챗봇 자동화 사용 매뉴얼</h1>
        <p className="mt-1 text-sm text-slate-300">내 문서와 실시간 웹 검색을 근거로, 출처까지 보여 주며 답하는 AI 챗봇입니다. 아래 4단계만 따라 하면 바로 쓸 수 있어요.</p>
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border border-[#262c3d] bg-[#161922] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-200">{i + 1}</span>
              <span className="text-2xl">{s.emoji}</span>
              <h2 className="text-sm font-bold text-slate-100">{s.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
            <Link href={s.href} className="mt-3 inline-block text-xs font-bold text-indigo-300 hover:text-indigo-200">
              {s.cta} →
            </Link>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5">
        <h2 className="text-sm font-bold text-slate-100">⚙️ 답변이 만들어지는 과정</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {["질문", "📄 내 문서 검색(임베딩)", "🌐 웹 검색 필요? → Tavily", "🤖 선택한 AI가 근거로 답변", "🔎 출처 표시·저장"].map((t, i, arr) => (
            <span key={t} className="flex items-center gap-2">
              <span className="rounded-lg border border-[#2d3448] bg-[#0d0f17] px-3 py-2">{t}</span>
              {i < arr.length - 1 && <span className="text-slate-500">→</span>}
            </span>
          ))}
        </div>
      </div>

      <ProviderGuide dark />
      <section className="space-y-3 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-5">
        <p className="text-xs text-indigo-300">🤖 내 봇 활용 · 설정 약 2분 · <Link href="/bots" className="underline">봇 관리 바로 열기 →</Link></p>
        <h2 className="text-base font-bold text-slate-100">내 역할을 저장하고 대화마다 선택하세요</h2>
        <ol className="grid gap-3 sm:grid-cols-2">{["① 기본 봇을 고르거나 내 역할 지침을 작성", "② 본인 모델·온도와 함께 저장", "③ 채팅방의 대화 봇에서 선택·해제", "④ 답변 아래 당시 설정을 펼쳐 확인"].map((step) => <li key={step} className="rounded-xl border border-slate-700 bg-[#161922] p-3 text-sm text-slate-300">{step}</li>)}</ol>
        <p className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-200">💡 기본 봇은 바로 선택할 수 있습니다. 원하는 문구로 바꾸려면 「내 봇으로 편집」해서 본인 설정으로 저장하세요.</p>
        <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">⚠️ 역할 지침에 비밀번호나 API 키를 넣지 마세요. 봇 삭제는 과거 대화를 지우지 않으며, 삭제된 봇을 쓰던 방에서는 직접 해제/변경해야 합니다.</p>
      </section>
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-100">❓ 자주 묻는 질문</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-[#262c3d] bg-[#161922] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">{f.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
