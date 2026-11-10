import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ExternalLink, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  {
    n: 1,
    emoji: "🔑",
    title: "11번가 API 키 확인",
    body: "11번가 셀러오피스에 판매자 계정으로 로그인 → OPEN API 센터 › 「API 관리」에서 키를 확인합니다(키 보기는 2차 인증 뒤). 키에는 만료일이 있어(발급 후 약 1년) 만료 전에 갱신해야 합니다.",
    link: { href: "https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall", label: "11번가 API 관리" },
  },
  {
    n: 2,
    emoji: "🌐",
    title: "내 고정 IP(Fixie) 준비",
    body: "11번가는 등록된 IP에서 온 요청만 받습니다. 우리 서버는 나가는 IP가 바뀌므로, 회원 본인 Fixie 계정의 고정 IP 2개로 내보냅니다. 쿠팡 운영에서 이미 등록했다면 그대로 씁니다.",
    link: { href: "/connect", label: "고정 IP 등록(API키등록·플랫폼연동)" },
  },
  {
    n: 3,
    emoji: "🧱",
    title: "11번가에 IP 2개 등록",
    body: "API 관리 › 접속권한 › 「IP 직접 입력: 사용」을 고르고, 「실서버 IP」 칸에 Fixie 고정 IP 2개를 세미콜론(;)으로 이어 넣은 뒤 저장합니다. 셀링툴 업체 선택은 하지 않아도 됩니다.",
    link: { href: "https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall", label: "API 관리 열기" },
  },
  {
    n: 4,
    emoji: "📦",
    title: "상세페이지 상품 등록(다음 버전)",
    body: "AI 상세페이지 자동화에서 상품을 만들고 「검토 완료」 → 「11번가에 등록하기」를 누르면 이 프로그램이 카테고리·가격·배송 정보를 채워 11번가 공식 API로 보냅니다. 처음에는 등록 직후 바로 「전시중지」해 두고 확인할 수 있게 합니다.",
    link: { href: "https://shop-detail-page.buylife.xyz/products", label: "AI 상세페이지 자동화" },
  },
];

const FAQ = [
  { q: "왜 판매자 화면을 대신 클릭하지 않나요?", a: "11번가는 공식 Seller API를 제공합니다. 화면 조작보다 안정적이고, 화면이 바뀌어도 멈추지 않습니다." },
  { q: "등록하면 바로 판매되나요?", a: "11번가 API에는 「임시저장」이 없어 등록과 동시에 판매가 시작됩니다. 그래서 이 프로그램은 등록 방식을 고르게 하고, 처음에는 등록 직후 전시중지를 함께 걸 수 있게 만듭니다." },
  { q: "하루에 몇 개까지 등록되나요?", a: "11번가 정책상 API 상품 등록은 하루 500개까지입니다." },
  { q: "Fixie 비용이 드나요?", a: "Fixie 무료 요금제는 월 500회 호출입니다. 쿠팡 운영과 같은 주소를 쓰면 두 프로그램 호출이 합쳐지니, 많이 쓰면 유료 요금제를 검토하세요." },
  { q: "제 키를 다른 사람이 쓰나요?", a: "아니요. 키와 고정 IP는 회원 본인 것만 쓰며, 다른 회원이나 운영자 키로 대신 보내지 않습니다." },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="처음 한 번만 설정하면, 이후에는 상세페이지에서 버튼 하나로 11번가에 등록합니다.">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
          <Clock size={12} /> 처음 설정 약 10분
        </span>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s) => (
          <article key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-extrabold text-indigo-600">STEP {s.n}</p>
            <h2 className="mt-1 flex items-center gap-2 text-base font-extrabold text-slate-900">
              <span aria-hidden>{s.emoji}</span> {s.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
            <a href={s.link.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline">
              {s.link.label} <ExternalLink size={11} />
            </a>
          </article>
        ))}
      </section>

      <Notice tone="tip">💡 쿠팡 운영을 쓰고 계시면 고정 IP는 이미 있습니다. 11번가 「실서버 IP」 칸에 같은 IP 2개만 넣으면 됩니다.</Notice>
      <Notice tone="warn">⚠️ 11번가 「IP 직접 입력」을 「미사용」으로 두면 연결 시험이 「접근 거부」로 실패합니다. 저장 버튼까지 눌렀는지 꼭 확인하세요.</Notice>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-slate-900">자주 묻는 질문</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-800">{f.q}</summary>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
