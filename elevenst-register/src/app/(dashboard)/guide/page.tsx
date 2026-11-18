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
  Sparkles,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  {
    n: 1,
    emoji: "🔑",
    menuPath: "11번가 셀러오피스 → OPEN API 센터",
    title: "11번가 API 키 복사하기",
    body: "11번가 셀러오피스에 판매자 계정으로 로그인한 뒤, OPEN API 센터 › 「API 관리」에서 「인증하기」(2차 인증)를 완료하면 32자리 API 키가 나타납니다. 이 키를 그대로 복사해 두세요. (발급 후 1년간 유효)",
    link: { href: "https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall", label: "11번가 API 관리 바로가기", external: true },
  },
  {
    n: 2,
    emoji: "🔌",
    menuPath: "좌측 메뉴 > 🔑 API키등록·플랫폼연동",
    title: "키 저장 & 서울 서버 연결 시험",
    body: "「API키등록·플랫폼연동」 1번 칸에 복사한 키를 붙여 넣고 저장한 뒤, 2번 칸 「연결 시험(읽기만)」 버튼을 누르세요. 내 11번가 출고지·반품지 주소가 화면에 뜨면 연동 성공입니다! (상품소싱기에 이미 키를 넣었으면 자동 연동됩니다.)",
    link: { href: "/connect", label: "API키등록·플랫폼연동 이동", external: false },
  },
  {
    n: 3,
    emoji: "🧪",
    menuPath: "좌측 메뉴 > 📦 상품 등록 → 상품 클릭",
    title: "상품 불러오기 & 규격 사전 검사",
    body: "「AI 상세페이지 자동화」에서 「검토 완료」한 상품이 목록에 자동으로 나타납니다. 상품을 눌러 말단 카테고리·10원 단위 판매가·옵션·배송·고시 항목을 확인한 뒤, 6번 「🧪 11st 규격 검사하기」를 눌러 통과 여부를 미리 확인하세요.",
    link: { href: "/products", label: "상품 등록 목록 바로가기", external: false },
  },
  {
    n: 4,
    emoji: "🛡️",
    menuPath: "개별 상품 화면 하단 > 7번 전송",
    title: "11번가 전송 & 자동 전시중지 확인",
    body: "검사를 통과했다면 7번 「11번가에 보내기 (등록 후 바로 전시중지)」를 누릅니다. 11번가 공식 API로 즉시 등록되며, 곧바로 판매가 시작되지 않도록 프로그램이 자동으로 '전시중지'를 걸어 안전하게 보호합니다.",
    link: { href: "https://soffice.11st.co.kr", label: "11번가 셀러오피스에서 확인하기", external: true },
  },
];

const BADGE_GUIDES = [
  {
    badge: "🟢 등록됨·전시중지",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    desc: "정상적으로 11번가에 등록되었고 안전하게 '전시중지(판매 대기)' 상태입니다. 셀러오피스에서 가격·이미지를 최종 확인한 뒤 판매를 개시하세요.",
  },
  {
    badge: "🟠 등록됨(전시 확인)",
    cls: "bg-amber-50 text-amber-900 border-amber-200",
    desc: "상품은 등록되었지만 직후 전시중지 요청이 응답하지 않았습니다. 지금 바로 11번가 셀러오피스 상품관리에서 판매 상태를 직접 확인해 주세요.",
  },
  {
    badge: "⚠ 확인 필요 / ⏳ 보내는 중",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
    desc: "전송 도중 통신이 지연되어 최종 성공 여부를 알 수 없는 상태입니다. 중복 등록을 막기 위해 재전송 버튼이 잠겨 있으니 셀러오피스에서 먼저 확인하세요.",
  },
  {
    badge: "❌ 실패",
    cls: "bg-rose-50 text-rose-800 border-rose-200",
    desc: "11번가 규칙(카테고리, 가격, 필수 고시 등)에 맞지 않아 등록되지 않았습니다. 화면에 나온 안내 메시지를 수정한 뒤 다시 검사하고 전송하세요.",
  },
];

const FORM_TIPS = [
  {
    icon: Layers,
    title: "카테고리는 '가장 마지막(말단)'까지!",
    desc: "11번가는 대분류·중분류에는 상품을 올릴 수 없습니다. 상품명 추천으로 뜨는 후보를 누르거나, 직접 검색해서 가장 끝 단계(리프 카테고리)까지 선택해 주세요.",
  },
  {
    icon: Sliders,
    title: "가격은 '10원 단위' (끝자리 0원)",
    desc: "판매가와 즉시할인 금액은 반드시 10원 단위여야 합니다(예: 19,900원 O / 19,905원 X). 옵션 가격이나 재고, 금지 특수문자 오류도 「규격 검사하기」에서 한 번에 잡아줍니다.",
  },
  {
    icon: ImageIcon,
    title: "대표 사진 vs 상세설명 본문 사진",
    desc: "대표·추가 사진은 11번가 서버로 직접 전송되어 누구나 계속 보입니다. 반면 본문 상세설명 이미지는 저장 구독 회원에게만 그대로 들어가며(일반 회원은 특징·정보 텍스트로 자동 구성), 오래 팔 상품은 셀러오피스에서 직접 등록해 두는 것을 권장합니다.",
  },
];

const TROUBLESHOOT = [
  {
    symptom: "연결 시험에서 '키를 받아들이지 않았습니다'가 떠요.",
    fix: "11번가 OPEN API 센터에서 2차 인증을 마쳤는지, 복사할 때 앞뒤 공백이 들어가지 않았는지, 발급 후 1년이 지나 만료되지 않았는지 확인하세요.",
  },
  {
    symptom: "상세페이지에서 만든 상품이 목록에 안 보여요.",
    fix: "AI 상세페이지 자동화(shop-detail-page.buylife.xyz)에서 해당 상품 페이지에 들어가 「검토 완료」 버튼을 눌러야 이곳 목록에 표시됩니다.",
  },
  {
    symptom: "상품을 보냈는데 수정해서 다시 보내고 싶어요.",
    fix: "이미 등록 성공한 상품은 중복 등록 방지를 위해 다시 보내기가 잠깁니다. 내용 수정이 필요하면 11번가 셀러오피스에서 해당 상품 번호(#)를 열어 직접 수정해 주세요.",
  },
];

const FAQ = [
  {
    q: "왜 판매자 화면을 대신 클릭하지 않고 API로 보내나요?",
    a: "11번가는 공식 Seller Open API를 제공합니다. 브라우저를 대신 조작하는 매크로 방식보다 훨씬 빠르고 정확하며, 11번가 사이트 개편에도 멈추지 않고 안정적으로 등록됩니다.",
  },
  {
    q: "등록하면 바로 고객에게 노출되어 팔리나요?",
    a: "11번가 API에는 '임시저장' 기능이 없어 등록 즉시 판매가 시작됩니다. 이를 막기 위해 이 프로그램은 전송 직후 자동으로 '전시중지'를 걸어 안전하게 보호합니다.",
  },
  {
    q: "해외 IP 차단이나 고정 IP(Fixie) 설정이 필요한가요?",
    a: "아니요, 전혀 필요 없습니다. 11번가는 해외 IP를 차단하지만 본 프로그램은 한국(서울) 리전 서버에서 11번가와 직접 통신하므로 별도 설정 없이 바로 연결됩니다.",
  },
  {
    q: "하루에 몇 개까지 상품을 등록할 수 있나요?",
    a: "11번가 공식 Open API 정책상 판매자 계정당 하루 최대 500개까지 신규 상품 등록을 지원합니다.",
  },
  {
    q: "내 API 키를 다른 사람이나 운영자가 쓰나요?",
    a: "아니요. 등록하신 11번가 키는 회원 본인의 요청에만 암호화되어 사용되며, 다른 회원이나 운영자 키로 대신 보내지 않습니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📖"
        title="연동 & 사용자 매뉴얼"
        description="처음 오신 분도 5분 만에 따라 할 수 있도록 11번가 키 발급부터 상품 검사·안전 등록까지 알기 쉽게 정리했습니다."
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-[#FA0050]">
          <Clock size={12} /> 처음 설정 약 5분 소요
        </span>
      </PageHeader>

      {/* 0. 초보자 3줄 핵심 요약 */}
      <section className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/70 via-white to-rose-50/40 p-5 shadow-xs space-y-2.5">
        <h2 className="text-sm font-black text-[#FA0050] flex items-center gap-1.5">
          <Sparkles size={15} />
          <span>가장 먼저 할 일 3가지 (한눈에 보기)</span>
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3 text-[13px]">
          <div className="rounded-xl bg-white border border-rose-100 p-3">
            <span className="font-black text-[#FA0050]">1. 키 1번만 등록</span>
            <p className="text-slate-600 mt-1 text-xs">11번가 API 키를 저장하고 「연결 시험」으로 출고지 주소를 불러옵니다.</p>
          </div>
          <div className="rounded-xl bg-white border border-rose-100 p-3">
            <span className="font-black text-[#FA0050]">2. 검사 버튼 먼저</span>
            <p className="text-slate-600 mt-1 text-xs">상세페이지 상품을 골라 「규격 검사하기」로 오류가 없는지 미리 확인합니다.</p>
          </div>
          <div className="rounded-xl bg-white border border-rose-100 p-3">
            <span className="font-black text-[#FA0050]">3. 보내고 판매 시작</span>
            <p className="text-slate-600 mt-1 text-xs">보내면 즉시 「전시중지」로 보호되니, 셀러오피스에서 확인 후 판매를 켭니다.</p>
          </div>
        </div>
      </section>

      {/* 1. 4단계 상세 따라하기 */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#FA0050]" />
          <span>단계별 따라하기 (STEP 1 ~ 4)</span>
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-rose-200 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-[#FA0050] uppercase tracking-wider">STEP {s.n}</p>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {s.menuPath}
                  </span>
                </div>
                <h3 className="mt-2 flex items-center gap-2 text-base font-extrabold text-slate-900">
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

      {/* 2. 상품 편집·규격 검사 핵심 규칙 */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">실패를 줄이는 입력 핵심 규칙</h2>
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
          <span>상품 목록 상태 배지별 의미 &amp; 대처법</span>
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

      {/* 4. 자주 겪는 문제 1분 해결 */}
      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Wrench size={17} className="text-[#FA0050]" />
          <span>자주 겪는 문제 1분 해결</span>
        </h2>
        <div className="space-y-2.5">
          {TROUBLESHOOT.map((t) => (
            <div key={t.symptom} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <p className="text-[13px] font-extrabold text-slate-900">Q. {t.symptom}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">→ {t.fix}</p>
            </div>
          ))}
        </div>
      </section>

      <Notice tone="tip">
        💡 고정 IP(Fixie)는 필요 없습니다. 11번가는 해외 IP 접속을 막기 때문에, 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다.
      </Notice>

      {/* 5. 자주 묻는 질문 */}
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
