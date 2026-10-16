import Link from "next/link";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { FACEBOOK_REDIRECT_NEW, INSTAGRAM_REDIRECT_NEW } from "@/lib/oauthRedirect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 📖 연동 & 사용 매뉴얼(2026-10-17, docs/PROGRAM_DESIGN_STANDARD.md 7번·5.6절): 흐름 다이어그램 → 단계 카드 → FAQ.
// 화면 문구는 실제 메뉴 이름(설정·주제 수집·게시글 관리)과 같게 유지한다.

const FLOW = [
  { icon: "🔑", title: "키·계정 연결", desc: "본인 AI 키 + 인스타그램" },
  { icon: "📰", title: "주제 수집", desc: "HTTP·RSS·Perplexity" },
  { icon: "🎨", title: "AI 생성", desc: "캡션·이미지·카드뉴스" },
  { icon: "🚀", title: "게시", desc: "즉시 또는 예약" },
];

const STEPS: { no: number; icon: string; title: string; href: string; link: string; body: React.ReactNode }[] = [
  {
    no: 1,
    icon: "🤖",
    title: "AI API 키 등록",
    href: "/settings",
    link: "API키등록·플랫폼연동 열기",
    body: (
      <>
        <p>캡션 생성용으로 OpenAI 또는 Anthropic(Claude) 키 중 1개를 등록합니다.</p>
        <p>이미지·카드뉴스를 AI로 만들려면 Google Gemini 키를, 실시간 트렌드 주제를 모으려면 Perplexity 키를 함께 등록합니다.</p>
        <p>키 발급 방법은 설정 화면 맨 아래 &quot;📖 연동 매뉴얼&quot; 버튼으로 볼 수 있습니다.</p>
      </>
    ),
  },
  {
    no: 2,
    icon: "📷",
    title: "내 Meta 앱 준비 + 인스타그램 연결",
    href: "/settings",
    link: "설정 화면의 ‘🧭 등록할 주소 한눈에 보기’ 열기",
    body: (
      <>
        <p>인스타그램 <b>비즈니스 또는 크리에이터(전문) 계정</b>만 연결할 수 있습니다(개인 계정 불가).</p>
        <p>Meta 개발자 센터에서 본인 앱을 만들고, 설정 화면 맨 위 카드의 주소를 복사 버튼으로 그대로 등록합니다.</p>
        <p>연결 방식은 두 가지이며 둘 중 하나만 성공하면 됩니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <span className="font-semibold text-blue-700">파란 버튼 = Facebook 페이지 방식</span>: 인스타그램이 Facebook 페이지에 연결돼 있을 때. 앱 설정 › 기본 설정의 <b>앱 ID·시크릿</b>을 &quot;📘 Facebook 페이지 방식용&quot; 칸에 넣습니다.
          </li>
          <li>
            <span className="font-semibold text-green-700">초록 버튼 = Instagram 로그인 방식</span>: Facebook 페이지 없이 연결할 때. <b>Instagram 앱 ID·시크릿</b>(맨 위 앱 ID와 다른 값)을 &quot;Instagram 앱 ID&quot; 칸에 넣습니다.
          </li>
        </ul>
      </>
    ),
  },
  {
    no: 3,
    icon: "📰",
    title: "게시글 주제 수집",
    href: "/candidates",
    link: "게시글 주제 수집 열기",
    body: (
      <>
        <p>HTTP(웹 주소 지정), RSS(구독 피드), Perplexity(트렌드 검색) 중 하나로 글감을 모읍니다.</p>
        <p>수집된 주제 목록에서 마음에 드는 주제의 [이 주제로 글쓰기]를 누르면 새 게시글 작성 화면으로 넘어갑니다.</p>
      </>
    ),
  },
  {
    no: 4,
    icon: "🎨",
    title: "AI로 캡션·이미지 만들기",
    href: "/posts/new",
    link: "새 게시글 작성 열기",
    body: (
      <>
        <p>게시물 형식을 고릅니다: <b>피드(이미지 1장)</b> 또는 <b>카드뉴스(캐러셀 4장)</b>.</p>
        <p>&quot;AI로 자동 생성&quot;을 누르면 캡션·해시태그와 이미지가 만들어지고, 내용은 직접 고칠 수 있습니다.</p>
      </>
    ),
  },
  {
    no: 5,
    icon: "🚀",
    title: "즉시 게시 또는 예약 게시",
    href: "/posts",
    link: "게시글 관리 열기",
    body: (
      <>
        <p>&quot;게시방식 결정&quot;에서 즉시 게시 또는 예약 게시(시각 지정)를 고릅니다.</p>
        <p>예약한 글은 대시보드의 &quot;다가오는 예약 게시&quot;에서 확인하고, 실패하면 게시글 상세에 실패 사유가 표시됩니다.</p>
      </>
    ),
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "연결할 때 ‘차단된 URL’ 또는 ‘리디렉션 URI 화이트리스트에 없음’이 나와요.",
    a: (
      <>
        <p>내 Meta 앱 › 비즈니스용 Facebook 로그인 › 설정 › <b>유효한 OAuth 리디렉션 URI</b>에 아래 주소를 추가하고 맨 아래 [변경 내용 저장]을 눌러주세요.</p>
        <div className="mt-2"><CopyAddress value={FACEBOOK_REDIRECT_NEW} /></div>
        <p className="mt-2">저장 후 같은 화면 맨 위 &quot;URI 리디렉션 유효성 검사기&quot;에서 &quot;유효한 리디렉션 URI&quot;가 나오면 됩니다.</p>
      </>
    ),
  },
  {
    q: "Instagram 화면에 ‘Invalid platform app’이 나와요.",
    a: (
      <>
        <p>&quot;Instagram 앱 ID&quot; 칸에 Facebook 앱 ID(앱 화면 맨 위 값)가 들어간 경우입니다.</p>
        <p>이용 사례 › 맞춤 설정 › Instagram 로그인이 포함된 API 설정 화면 맨 위의 <b>Instagram 앱 ID·시크릿</b>으로 바꿔주세요.</p>
      </>
    ),
  },
  {
    q: "Instagram 방식에서 ‘Invalid redirect_uri’가 나와요.",
    a: (
      <>
        <p>같은 화면 &quot;4. Instagram 비즈니스 로그인 설정&quot;의 OAuth 리디렉션 URI에 아래 주소를 추가해주세요.</p>
        <div className="mt-2"><CopyAddress value={INSTAGRAM_REDIRECT_NEW} /></div>
      </>
    ),
  },
  {
    q: "개인 계정도 연결되나요?",
    a: <p>안 됩니다. 인스타그램 앱 › 설정 › 계정 유형에서 비즈니스 또는 크리에이터 계정으로 바꾼 뒤 연결해주세요.</p>,
  },
  {
    q: "AI 생성 버튼을 누르면 ‘API 키 등록이 필요합니다’가 떠요.",
    a: <p>이 프로그램은 회원 본인 키로만 동작합니다. API키등록·플랫폼연동에서 필요한 키를 등록한 뒤 다시 눌러주세요.</p>,
  },
  {
    q: "연결 토큰은 언제 다시 연결해야 하나요?",
    a: <p>설정 화면 &quot;연동 계정&quot;에 토큰 만료 날짜가 표시됩니다. 만료 전에 같은 색 버튼으로 다시 연결하면 됩니다.</p>,
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">📖 연동 & 사용 매뉴얼</h1>
        <p className="text-sm text-neutral-600">처음 오셨나요? 아래 5단계만 따라 하면 인스타그램 자동 포스팅을 시작할 수 있습니다.</p>
      </div>

      {/* 흐름 다이어그램 */}
      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FLOW.map((f, i) => (
            <div key={f.title} className="relative rounded-xl border border-sky-100 bg-sky-50 p-3 text-center">
              <div className="text-2xl">{f.icon}</div>
              <p className="mt-1 text-sm font-bold text-neutral-900">{f.title}</p>
              <p className="text-xs text-neutral-500">{f.desc}</p>
              {i < FLOW.length - 1 && (
                <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-sky-400 sm:block">➔</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 단계 카드 */}
      <div className="space-y-4">
        {STEPS.map((s) => (
          <div key={s.no} className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                {s.no}
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                {s.icon} {s.title}
              </h2>
            </div>
            <div className="space-y-1.5 pl-11 text-sm leading-relaxed text-neutral-700">{s.body}</div>
            <div className="mt-3 pl-11">
              <Link href={s.href} className="text-sm font-medium text-sky-700 hover:underline">
                → {s.link}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* 주의 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        <p className="font-semibold">💡 꼭 알아두세요</p>
        <p>AI 키와 인스타그램 계정은 모두 회원 본인 것으로 연결합니다. 다른 사람이나 운영자의 키로 대신 동작하지 않습니다.</p>
        <p>AI 사용 요금은 등록한 본인 키의 제공사에 청구됩니다.</p>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-neutral-900">❓ 자주 묻는 질문</h2>
        <div className="divide-y divide-neutral-200">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="cursor-pointer text-sm font-semibold text-neutral-800">Q. {f.q}</summary>
              <div className="mt-2 space-y-1 text-sm leading-relaxed text-neutral-600">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
