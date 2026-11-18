import Link from "next/link";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import {
  ExternalLink,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Layers,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  {
    n: 1,
    emoji: "🔑",
    title: "11번가 API 키 확인 & 등록",
    body: "11번가 셀러오피스 로그인 → OPEN API 센터 › 「API 관리」 › 「인증하기」(2차 인증) 후 발급된 키를 복사해 「API키등록·플랫폼연동」 1번 칸에 저장합니다. (유효기간 약 1년, 상품소싱기에 이미 등록했으면 자동 연동)",
    link: { href: "/connect", label: "API키등록·플랫폼연동 이동", external: false },
  },
  {
    n: 2,
    emoji: "🔌",
    title: "서울 서버 연결 시험 (읽기 전용)",
    body: "「연결 시험(읽기만)」 버튼을 누르면 11번가 계정의 출고지·반품/교환지 주소를 실시간으로 불러옵니다. 목록이 정상 표시되면 연동 준비가 완료됩니다.",
    link: { href: "https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall", label: "11번가 OPEN API 센터 열기", external: true },
  },
  {
    n: 3,
    emoji: "🧪",
    title: "상품 불러오기 & 11st 규격 사전 검사",
    body: "AI 상세페이지 자동화에서 「검토 완료」한 상품을 고른 뒤, 1~5번 항목(말단 카테고리·10원 단위 가격·옵션·배송·상품정보고시)을 확인하고 6번 「🧪 11st 규격 검사하기」를 먼저 통과시킵니다.",
    link: { href: "/products", label: "상품 등록 목록 바로가기", external: false },
  },
  {
    n: 4,
    emoji: "🛡️",
    title: "공식 API 전송 & 자동 전시중지 보호",
    body: "7번 「11번가에 보내기 (등록 후 바로 전시중지)」를 누르면 11번가 공식 Seller API로 상품이 생성되고, 즉시 전시중지 상태로 안전하게 잠급니다. 셀러오피스에서 최종 점검 후 판매를 시작하세요.",
    link: { href: "https://soffice.11st.co.kr", label: "11번가 셀러오피스 바로가기", external: true },
  },
];

const BADGE_GUIDES = [
  {
    badge: "🟢 등록됨·전시중지",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    desc: "11번가 공식 API 등록과 동시에 안전하게 전시중지(판매 대기) 처리되었습니다. 셀러오피스에서 확인 후 판매를 개시하세요.",
  },
  {
    badge: "🟠 등록됨(전시 확인)",
    cls: "bg-amber-50 text-amber-900 border-amber-200",
    desc: "상품은 등록되었으나 자동 전시중지 요청이 응답하지 않았습니다. 셀러오피스에서 판매 상태를 즉시 확인해 주세요.",
  },
  {
    badge: "⚠ 확인 필요 / ⏳ 보내는 중",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
    desc: "네트워크 지연 등으로 최종 응답이 불확실합니다. 중복 등록 사고를 막기 위해 재전송이 잠겨 있으니 셀러오피스에서 등록 여부를 먼저 확인하세요.",
  },
  {
    badge: "❌ 실패",
    cls: "bg-rose-50 text-rose-800 border-rose-200",
    desc: "규격 오류 또는 API 거절로 등록되지 않았습니다. 안내된 사유(말단 카테고리, 10원 단위 가격, 고시 항목 등)를 보완해 다시 검사하고 전송하세요.",
  },
];

const FORM_TIPS = [
  {
    icon: Layers,
    title: "최하위 리프 카테고리 필수",
    desc: "11번가는 대·중분류가 아닌 가장 마지막 단계(말단) 카테고리만 등록이 허용됩니다. 상품명으로 후보를 추천받거나 직접 말단까지 선택해 주세요.",
  },
  {
    icon: Sliders,
    title: "판매가 10원 단위 & 옵션 규칙",
    desc: "판매가는 반드시 10원 단위로 입력해야 하며(1원 단위 불가), 옵션명과 옵션값에 허용되지 않는 특수문자나 길이 초과가 있으면 사전 검사에서 자동으로 알려줍니다.",
  },
  {
    icon: ImageIcon,
    title: "대표·추가 사진 vs 상세설명 사진",
    desc: "대표·추가 사진은 11번가 서버로 직접 전송되어 누구나 영구 유지됩니다. 본문 상세설명 사진은 저장 구독 회원에게만 그대로 포함되며(비구독 회원은 핵심 특징·정보 텍스트로 자동 구성), 장기 판매 상품은 셀러오피스에서 직접 업로드하는 것을 권장합니다.",
  },
];

const FAQ = [
  {
    q: "왜 판매자 화면을 대신 클릭하지 않고 API로 보내나요?",
    a: "11번가는 공식 Seller Open API를 제공합니다. 브라우저 화면 조작(매크로/RPA)보다 훨씬 빠르고 안전하며, 셀러오피스 화면 개편에도 오류 없이 안정적으로 등록됩니다.",
  },
  {
    q: "등록하면 바로 고객에게 노출되어 판매되나요?",
    a: "11번가 API에는 '임시저장' 기능이 없어 등록과 동시에 판매 중 상태가 됩니다. 이를 방지하기 위해 본 프로그램은 전송 직후 자동으로 '전시중지'를 호출해 안전하게 판매 대기 상태로 보호합니다.",
  },
  {
    q: "해외 IP 차단 오류나 프록시(Fixie) 설정이 필요한가요?",
    a: "아니요. 별도의 고정 IP나 프록시 설정이 전혀 필요 없습니다. 11번가는 해외 IP 접근을 막지만, 이 프로그램은 한국(서울) 리전 서버에서 11번가와 직접 통신하므로 안정적으로 연결됩니다.",
  },
  {
    q: "상세페이지에서 만든 상품이 목록에 보이지 않아요.",
    a: "AI 상세페이지 자동화(shop-detail-page.buylife.xyz)에서 상품 생성 후 반드시 「검토 완료」 처리를 해야만 11번가 자동등록기 「상품 등록」 목록에 연동되어 표시됩니다.",
  },
  {
    q: "하루에 최대 몇 개까지 등록할 수 있나요?",
    a: "11번가 공식 Open API 정책상 판매자 계정당 하루 최대 500개까지 신규 상품 등록이 지원됩니다.",
  },
  {
    q: "내 API 키를 다른 사람이나 운영자가 사용하나요?",
    a: "아니요. 등록한 11번가 API 키는 회원 본인의 작업에만 사용되며 암호화되어 저장됩니다. 다른 회원이나 운영자 키로 대신 전송하지 않습니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📖"
        title="연동 & 사용자 매뉴얼"
        description="11번가 공식 API 연동부터 상세페이지 상품 불러오기·규격 검사·안전 전송까지 전체 사용 방법을 안내합니다."
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-[#FA0050]">
          <Clock size={12} /> 처음 설정 약 5분 소요
        </span>
      </PageHeader>

      {/* 1. 4단계 핵심 워크플로우 */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#FA0050]" />
          <span>전체 이용 순서 (4단계)</span>
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-rose-200 transition-colors"
            >
              <div>
                <p className="text-xs font-black text-[#FA0050] uppercase tracking-wider">STEP {s.n}</p>
                <h3 className="mt-1 flex items-center gap-2 text-base font-extrabold text-slate-900">
                  <span aria-hidden>{s.emoji}</span> {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
              </div>
              {s.link.external ? (
                <a
                  href={s.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FA0050] hover:underline"
                >
                  <span>{s.link.label}</span>
                  <ExternalLink size={11} />
                </a>
              ) : (
                <Link
                  href={s.link.href}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#FA0050] hover:underline"
                >
                  <span>{s.link.label}</span>
                  <ArrowRight size={11} />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 2. 상세 설정 및 검사 규칙 안내 */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">상품 편집·규격 검사 핵심 규칙</h2>
        <div className="grid gap-3.5 md:grid-cols-3">
          {FORM_TIPS.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-[#FA0050]">
                    <Icon size={15} />
                  </span>
                  <span>{tip.title}</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-slate-600">{tip.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 등록 결과 상태 배지 안내 */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#FA0050]" />
          <span>상품 목록 상태 배지 이해하기</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {BADGE_GUIDES.map((b) => (
            <div key={b.badge} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
              <span className={`inline-block rounded-md border px-2.5 py-1 text-xs font-extrabold ${b.cls}`}>
                {b.badge}
              </span>
              <p className="text-[12.5px] leading-relaxed text-slate-600">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Notice tone="tip">
        💡 고정 IP(Fixie)는 필요 없습니다. 11번가는 해외 IP 접속을 막기 때문에, 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다.
      </Notice>
      <Notice tone="warn">
        ⚠️ 연결 시험이 「키를 받아들이지 않았습니다」로 실패하면, 11번가 「API 관리」의 키를 공백 없이 다시 복사해 넣고, 키 만료일(발급 후 1년)이 지나지 않았는지 확인하세요.
      </Notice>

      {/* 4. 자주 묻는 질문 */}
      <section className="space-y-2.5">
        <h2 className="text-base font-extrabold text-slate-900">자주 묻는 질문 (FAQ)</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-2xs group">
            <summary className="cursor-pointer text-sm font-extrabold text-slate-800 group-hover:text-[#FA0050] transition-colors">
              {f.q}
            </summary>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 border-t border-slate-100 pt-2.5">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
