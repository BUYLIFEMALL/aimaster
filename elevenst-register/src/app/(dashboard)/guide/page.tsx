import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ExternalLink, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  {
    n: 1,
    emoji: "🔑",
    title: "11번가 API 키 확인",
    body: "11번가 셀러오피스에 판매자 계정으로 로그인 → OPEN API 센터 › 「API 관리」 › 「인증하기」(2차 인증) 후 보이는 키를 복사합니다. 키에는 만료일이 있어(발급 후 약 1년) 만료 전에 갱신해야 합니다.",
    link: { href: "https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall", label: "11번가 OPEN API 센터 바로가기" },
  },
  {
    n: 2,
    emoji: "🔑",
    title: "키 등록",
    body: "「API키등록·플랫폼연동」 1번 칸에 키를 붙여 넣고 저장합니다. 상품소싱기에 이미 등록한 11번가 키가 있으면 「저장됨」으로 표시되므로 건너뛰셔도 됩니다.",
    link: { href: "/connect", label: "API키등록·플랫폼연동 이동" },
  },
  {
    n: 3,
    emoji: "🔌",
    title: "연결 시험",
    body: "「연결 시험(읽기만)」을 누르면 11번가에 등록된 출고지·반품/교환지 주소를 실시간으로 조회합니다. 목록이 정상 노출되면 모든 연동 준비가 완료됩니다.",
    link: { href: "/connect", label: "연결 시험 진행하기" },
  },
  {
    n: 4,
    emoji: "📦",
    title: "상세페이지 상품 등록",
    body: "AI 상세페이지 자동화에서 상품을 만들고 「검토 완료」 후 이 프로그램에서 카테고리·가격·배송 정보를 확인합니다. 「검사하기」 통과 후 「11번가에 보내기」를 누르면 공식 API로 등록되고 즉시 「전시중지」로 안전하게 보호됩니다.",
    link: { href: "https://shop-detail-page.buylife.xyz/products", label: "AI 상세페이지 자동화 열기" },
  },
];

const FAQ = [
  { q: "왜 판매자 화면을 대신 클릭하지 않나요?", a: "11번가는 공식 Seller API를 제공합니다. 화면 조작(RPA/매크로)보다 안전하고 빠르며, UI 변경에도 멈춤 없이 안정적으로 동작합니다." },
  { q: "등록하면 바로 판매되나요?", a: "11번가 API에는 「임시저장」이 없어 등록과 동시에 판매가 시작됩니다. 그래서 이 프로그램은 전송 직후 자동으로 전시중지(판매중지) 상태로 보호해 둡니다. 셀러오피스에서 최종 점검 후 판매를 개시하세요." },
  { q: "상세페이지 사진도 11번가 상세설명에 들어가나요?", a: "저장 구독 회원만 들어갑니다. 상세 사진은 11번가가 가져가지 않고 우리 서버에서 계속 불러와 보여 주므로 보관 비용이 들기 때문입니다. 그 밖의 회원은 핵심 특징·상품 정보·사용법이 글로 들어가고, 상세 사진은 셀러오피스에서 직접 올리실 수 있습니다. 상세설명 사진은 저장 구독 중·보관 기간 안에서만 11번가에 보입니다. 구독이 끝나면(7일 유예 뒤) 또는 보관 기간이 지나면 보이지 않으니, 오래 판매할 상품은 셀러오피스에서 사진을 직접 올려 두세요. 대표·추가 사진은 11번가가 직접 보관하므로 누구나 그대로 보입니다." },
  { q: "하루에 몇 개까지 등록되나요?", a: "11번가 정책상 공식 API 상품 등록은 일일 500개까지 지원됩니다." },
  { q: "제 키를 다른 사람이 쓰나요?", a: "아니요. 11번가 키는 회원 본인의 개인 키만 사용하며, 다른 회원이나 운영자 키로 대신 보내지 않습니다." },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="처음 한 번만 설정하면, 이후에는 상세페이지에서 버튼 하나로 11번가에 등록합니다.">
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-[#FA0050]">
          <Clock size={12} /> 처음 설정 약 5분 소요
        </span>
      </PageHeader>

      <section className="grid gap-3.5 sm:grid-cols-2">
        {STEPS.map((s) => (
          <article key={s.n} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-rose-200 transition-colors">
            <p className="text-xs font-black text-[#FA0050] uppercase tracking-wider">STEP {s.n}</p>
            <h2 className="mt-1 flex items-center gap-2 text-base font-extrabold text-slate-900">
              <span aria-hidden>{s.emoji}</span> {s.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
            <a href={s.link.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#FA0050] hover:underline">
              <span>{s.link.label}</span>
              <ExternalLink size={11} />
            </a>
          </article>
        ))}
      </section>

      <Notice tone="tip">💡 고정 IP(Fixie)는 필요 없습니다. 11번가는 해외 IP 접속을 막기 때문에, 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다.</Notice>
      <Notice tone="warn">⚠️ 연결 시험이 「키를 받아들이지 않았습니다」로 실패하면, 11번가 「API 관리」의 키를 공백 없이 다시 복사해 넣고, 키 만료일이 지나지 않았는지 확인하세요.</Notice>

      <section className="space-y-2.5">
        <h2 className="text-base font-extrabold text-slate-900">자주 묻는 질문</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs group">
            <summary className="cursor-pointer text-sm font-extrabold text-slate-800 group-hover:text-[#FA0050] transition-colors">{f.q}</summary>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 border-t border-slate-100 pt-2.5">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
