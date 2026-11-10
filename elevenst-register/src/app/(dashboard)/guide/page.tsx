import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ExternalLink, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  {
    n: 1,
    emoji: "🔑",
    title: "11번가 API 키 확인",
    body: "11번가 셀러오피스에 판매자 계정으로 로그인 → OPEN API 센터 › 「API 관리」 › 「인증하기」(2차 인증) 뒤 보이는 키를 복사합니다. 키에는 만료일이 있어(발급 후 약 1년) 만료 전에 갱신해야 합니다.",
    link: { href: "https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall", label: "11번가 API 관리" },
  },
  {
    n: 2,
    emoji: "🔑",
    title: "키 등록",
    body: "「API키등록·플랫폼연동」 1번 칸에 키를 붙여 넣고 저장합니다. 상품소싱기에 이미 넣은 11번가 키가 있으면 「저장됨」으로 보이니 건너뛰면 됩니다.",
    link: { href: "/connect", label: "API키등록·플랫폼연동" },
  },
  {
    n: 3,
    emoji: "🔌",
    title: "연결 시험",
    body: "「연결 시험(읽기만)」을 누르면 11번가에 등록된 출고지·반품/교환지 주소를 읽어 옵니다. 목록이 보이면 준비 끝입니다. 출고지가 없다면 11번가 셀러오피스에서 먼저 등록해 주세요.",
    link: { href: "/connect", label: "연결 시험하러 가기" },
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
  { q: "제 키를 다른 사람이 쓰나요?", a: "아니요. 11번가 키는 회원 본인 것만 쓰며, 다른 회원이나 운영자 키로 대신 보내지 않습니다." },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="처음 한 번만 설정하면, 이후에는 상세페이지에서 버튼 하나로 11번가에 등록합니다.">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
          <Clock size={12} /> 처음 설정 약 5분
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

      <Notice tone="tip">💡 고정 IP(Fixie)는 필요 없습니다. 11번가는 해외 IP 접속을 막기 때문에, 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다.</Notice>
      <Notice tone="warn">⚠️ 연결 시험이 「키를 받아들이지 않았습니다」로 실패하면, 11번가 「API 관리」의 키를 공백 없이 다시 복사해 넣고, 키 만료일이 지나지 않았는지 확인하세요.</Notice>

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
