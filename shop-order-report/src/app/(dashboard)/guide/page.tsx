import Link from "next/link";
import { TOOLS } from "@/lib/tools";

export const metadata = { title: "연동 & 사용 매뉴얼 | AI 쇼핑몰 주문·매출 리포트 자동화" };

const STEPS = [
  { emoji: "📥", title: "주문 파일 받기", body: "각 마켓 판매자센터의 주문 조회 화면에서 기간을 고르고 엑셀로 내려받습니다(아래 마켓별 경로)." },
  { emoji: "📤", title: "올리기·열 확인", body: "「주문 파일 올리기」에 끌어 놓으면 마켓과 열을 알아봅니다. 빨간 칸만 골라 주고 「주문 추가」를 누릅니다." },
  { emoji: "⚙", title: "원가 넣기", body: "「원가·수수료 설정」에서 상품별 원가·포장비와 택배비·광고비를 넣으면 순이익이 맞아집니다." },
  { emoji: "📊", title: "리포트 보기", body: "매출·순이익·재고·리뷰 화면을 보고 엑셀로 받거나 인쇄합니다. 새 파일을 올릴 때마다 자동으로 다시 계산합니다." },
];

const MARKET_PATHS = [
  { market: "스마트스토어", path: "스마트스토어센터 › 판매관리 › 주문통합검색(또는 구매확정 내역) › 엑셀 다운", tip: "엑셀에 비밀번호를 걸어 내려받았다면 엑셀에서 「다른 이름으로 저장」으로 암호 없이 저장하거나 CSV로 저장해 올려 주세요." },
  { market: "쿠팡", path: "쿠팡 WING › 주문/배송 › 배송관리 › 엑셀 다운로드", tip: "정산액은 정산 메뉴 파일에 있습니다. 주문 파일만 올리면 수수료로 추정합니다." },
  { market: "11번가", path: "셀러오피스 › 주문관리 › 발송처리/주문조회 › 엑셀 다운로드", tip: "열 이름이 다르면 열 맞추기에서 한 번만 골라 두면 다음부터 기억합니다." },
  { market: "G마켓·옥션", path: "ESM PLUS › 주문관리 › 주문확인/발송관리 › 엑셀 다운로드", tip: "G마켓·옥션이 한 파일에 섞여 있으면 마켓을 「G마켓」으로 두고, 필요하면 나눠 올리세요." },
];

const FAQ = [
  { q: "고객 개인정보가 서버로 가나요?", a: "가지 않습니다. 파일은 이 PC 브라우저에서 읽고, 이름·주소·전화번호 같은 열은 읽자마자 버립니다. 주문 줄(날짜·상품·수량·금액·상태)만 이 PC 브라우저에 보관합니다." },
  { q: "다른 PC나 휴대폰에서도 보이나요?", a: "주문은 이 PC에만 있어서 다른 기기에서는 다시 올려야 합니다. 원가·수수료 설정은 「설정 파일 받기」로 옮길 수 있습니다." },
  { q: "같은 주문을 두 번 올리면요?", a: "마켓과 주문 번호(상품주문번호)가 같으면 한 번만 셉니다. 나중에 올린 파일의 상태(배송완료·반품 등)로 바뀝니다." },
  { q: "순이익이 정확한가요?", a: "파일에 정산예정금액 열이 있으면 그 값을 쓰고, 없으면 마켓 대표 수수료로 추정합니다. ⚠ 표시 수수료는 공식 표를 확인하지 못한 대표값이니 판매자센터 요율로 바꿔 주세요. 원가를 넣지 않은 상품은 원가 0으로 계산됩니다." },
  { q: "엑셀이 안 열려요.", a: "비밀번호가 걸린 엑셀은 열 수 없습니다. 엑셀에서 암호 없이 다시 저장하거나 CSV로 저장해 올려 주세요." },
  { q: "AI 리뷰 요약은 돈이 드나요?", a: "누를 때만 회원님 본인 Gemini 키로 가장 저렴한 모델을 1번 부릅니다. 키가 없으면 메인 사이트 「API키등록·플랫폼연동」에서 등록하세요. 별점·자주 나온 말·불만 리뷰는 키 없이 무료입니다." },
  { q: "브라우저 데이터를 지우면요?", a: "보관한 주문과 설정이 사라집니다. 원본 엑셀로 다시 올리면 되고, 설정은 미리 「설정 파일 받기」로 받아 두세요." },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <header className="slw-card flex flex-wrap items-center gap-4 p-5">
        <span className="text-4xl" aria-hidden>📖</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">연동 & 사용 매뉴얼</h1>
          <p className="mt-1 text-sm text-slate-600">⏱ 처음 설정 약 5분 · 🔌 마켓 연결 없음(파일 올리기) · 🔑 AI 키는 리뷰 요약에만 선택</p>
        </div>
        <Link href="/upload" className="slw-primary">주문 파일 올리기 →</Link>
      </header>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">4단계로 끝내기</h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="slw-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">{i + 1}</span>
                <span className="text-2xl" aria-hidden>{s.emoji}</span>
              </div>
              <p className="mt-2 font-extrabold text-slate-900">{s.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="slw-card p-5">
        <h2 className="text-base font-extrabold text-slate-900">🧾 마켓별 주문 파일 받는 곳</h2>
        <p className="mt-1 text-[12px] text-slate-600">메뉴 이름은 마켓 화면 개편으로 바뀔 수 있습니다. 「주문」「엑셀 다운로드」를 찾으세요.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {MARKET_PATHS.map((m) => (
            <div key={m.market} className="rounded-xl border border-slate-200 p-4">
              <p className="font-extrabold text-slate-900">{m.market}</p>
              <p className="mt-1 text-[13px] text-slate-700">{m.path}</p>
              <p className="mt-1 text-[12px] text-teal-800">💡 {m.tip}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">화면별로 이럴 때</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="slw-card flex gap-3 p-4 hover:border-teal-400">
              <span className="text-3xl" aria-hidden>{t.emoji}</span>
              <span>
                <span className="block font-extrabold text-slate-900">{t.label}</span>
                <span className="mt-0.5 block text-[13px] text-slate-600">{t.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-[13px] leading-relaxed text-teal-900">
          <p className="font-extrabold">💡 팁</p>
          <p className="mt-1">한 달에 한 번 지난달 주문 파일(구매확정 포함)을 올리면 월별 추이가 쌓입니다. 이 PC 브라우저에 계속 보관되므로 몇 달 치를 나란히 볼 수 있습니다.</p>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900">
          <p className="font-extrabold">⚠ 주의</p>
          <p className="mt-1">여기 숫자는 올린 파일 기준입니다. 판매자센터 실제 정산과 다를 수 있으니 세금 신고·정산 대사는 판매자센터 정산 내역으로 하세요.</p>
        </div>
      </div>

      <section className="slw-card p-5">
        <h2 className="text-base font-extrabold text-slate-900">❓ 자주 묻는 질문</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {FAQ.map((f) => (
            <details key={f.q} className="py-3">
              <summary className="cursor-pointer text-[14px] font-bold text-slate-900">{f.q}</summary>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
