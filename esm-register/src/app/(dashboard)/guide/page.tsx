import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";
import { SHOP_DETAIL_SITE } from "@/lib/version";

export const dynamic = "force-dynamic";

// 연동·사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 규격(헤더 바·소개·4단계 카드·상세 단계·팁/주의·직링크)

const STEPS = [
  { emoji: "🏪", title: "ESM+ 준비", desc: "ESM+에 로그인하고 「배송정보관리」에 택배사·출고지·배송비 정책을 만들어 둡니다." },
  { emoji: "⚙", title: "기본값 적기", desc: "배송비 정책 번호·출고지 이름·고시 상품군을 한 번만 적습니다." },
  { emoji: "🧩", title: "확장 연결", desc: "크롬 확장을 설치하고 버튼 한 번으로 내 계정과 연결합니다." },
  { emoji: "🛒", title: "보내기·확인", desc: "상품을 고르고 「입력만」으로 보낸 뒤 ESM+ 화면과 등록 기록을 확인합니다." },
];

// 확장이 채우는 칸 / 회원이 ESM+ 화면에서 직접 넣는 칸 — src/lib/esm/fields.ts·extension/background.js 기준
const AUTO_FIELDS = [
  "카테고리(검색어로 찾아 고르고 기본이용료 기록)",
  "판매사이트(G마켓·옥션·둘 다)",
  "상품명(한글 50자 · 영문·숫자 100자까지)",
  "판매가(10원 단위)·재고",
  "대표·추가 사진 최대 15장",
  "상세설명 이미지(섹션을 가로 860px 한 장으로 합쳐 올림)",
  "옵션 단독형 1개(추가금 0원, 값 50개까지)",
  "상품정보 고시(「상품상세 참조」)·인증대상 아님",
  "배송 템플릿 또는 택배사·발송정책·출고지·배송비 정책",
];
const MANUAL_FIELDS = [
  "옵션마다 가격이 다르거나 조합형 옵션",
  "KC 인증 번호·영업허가 등 인증 정보",
  "배송비 정책·출고지 새로 만들기(「배송정보관리」에서)",
  "할인·쿠폰·프로모션 등 판매 조건",
];

const RECOVERY = [
  ["🔐 로그인이 풀렸다고 나와요", "확장은 비밀번호를 다루지 않고 그 자리에서 멈춥니다. 크롬에서 ESM+에 다시 로그인한 뒤 「등록할 상품」에서 다시 보내 주세요."],
  ["⏸ 중간 칸에서 멈췄어요", "「등록 기록」에 멈춘 칸이 남습니다. 열려 있는 ESM+ 탭에서 그 칸부터 직접 채우고 「임시저장」 또는 「등록하기」를 누르면 됩니다."],
  ["❓ 등록이 됐는지 모르겠어요", "결과가 불확실하면 확장이 자동으로 다시 등록하지 않습니다(중복 상품 방지). ESM+ 「상품관리」에서 먼저 확인하고, 없을 때만 다시 보내 주세요."],
  ["📝 「입력만」 뒤 직접 등록했는데 기록이 그대로예요", "정상입니다. 「입력만」은 칸을 다 채운 순간 「입력 완료」로 기록을 끝내고, 그 뒤 회원이 직접 누른 임시저장·등록과 상품번호는 프로그램이 알 수 없습니다. 결과는 ESM+ 「상품관리」에서 확인해 주세요."],
  ["🔁 같은 상품을 또 올리고 싶어요", "「바로 등록」에 이미 성공한 상품은 「한 번 더 등록합니다」를 체크해야 다시 보낼 수 있습니다."],
];

const FAQ = [
  ["G마켓과 옥션에 따로 올려야 하나요?", "아니요. ESM+ 한 화면에서 판매사이트 두 곳을 함께 체크해 한 번에 올립니다. 기본값에서 한 곳만 고를 수도 있습니다."],
  ["API 키나 비밀번호가 필요한가요?", "필요 없습니다. 회원 본인 크롬에서 회원이 직접 로그인한 ESM+ 화면에 확장이 입력합니다."],
  ["배송비 정책 번호는 어디서 보나요?", "ESM+ 「상품등록」 화면 배송 구역의 「배송비 선택」 버튼 글자 끝 괄호 안 숫자(예: 37246700)입니다. 「배송정보관리」 메뉴에서도 볼 수 있습니다."],
  ["수수료는 얼마인가요?", "카테고리마다 다릅니다. 확장이 카테고리를 고른 뒤 화면에 보이는 「카테고리 기본이용료」를 등록 기록에 남깁니다."],
  ["내 정보는 어디에 저장되나요?", "회원 본인 ESM+ 계정에 회원 본인 크롬에서만 입력합니다. 비밀번호는 저장하지 않고, 등록 기록은 회원 본인만 보며 30일 뒤 자동으로 지워집니다."],
  ["문의할 때 무엇을 보내면 되나요?", "「등록 기록」의 멈춘 칸·오류 문구와 ESM+ 화면 캡처를 보내 주세요. 캡처에서 주소·연락처·계좌 같은 개인정보는 가려 주세요."],
  ["확장이 중간에 멈췄어요.","그 자리에서 멈추고 「등록 기록」에 멈춘 칸을 남깁니다. ESM+ 탭에서 그 칸부터 직접 채우고 저장하면 됩니다. 결과가 불확실하면 확장이 자동으로 다시 등록하지 않습니다."],
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <div className="space-y-5">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="처음 쓰는 분도 순서대로 따라 하면 G마켓·옥션에 상품을 올릴 수 있습니다.">
        <a className="btn-3d-secondary !py-2 !px-4 text-xs" href="https://www.esmplus.com" target="_blank" rel="noreferrer">ESM+ 열기 ↗</a>
      </PageHeader>

      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">⏱ 처음 설정 약 10분</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">🔑 API 키 필요 없음</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">🖥 크롬(PC) 필요</span>
      </div>

      <Notice tone="warn">
        🧪 <b>지금 상태</b>: 크롬 확장이 ESM+ 「상품등록」 화면에 칸을 채우는 방식으로 동작합니다. 실제 ESM+ 화면에서의 시험이 아직 진행 중이라
        처음에는 반드시 <b>「입력만」</b>으로 채워진 칸을 눈으로 확인한 뒤 직접 저장해 주세요. ESM 공식 API로 서버가 바로 등록하는 방식은 아직 없습니다(준비 중).
      </Notice>

      <section className="slw-card p-5">
        <p className="text-base font-black text-slate-900">🛒 상세페이지 상품을 G마켓·옥션에 한 번에</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          AI 상세페이지 자동화에서 만든 상품을 불러와, 크롬 확장이 ESM+ 「상품등록」 화면의 칸을 위에서부터 채웁니다.
          카테고리를 먼저 고르고(수수료 기록) → 가격·재고 → 사진·상세 이미지 → 인증·고시 → 배송·반품 순서입니다.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="slw-card p-4">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">STEP {i + 1}</span>
            <p className="mt-2 text-sm font-black text-slate-900">{s.emoji} {s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>

      <section className="slw-card space-y-3 p-5 text-sm leading-relaxed text-slate-700">
        <h2 className="text-base font-black text-slate-900">1. ESM+ 준비</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>크롬에서 ESM+에 로그인합니다(G마켓·옥션 판매자 회원).</li>
          <li>「판매자정보 → 배송정보관리」에서 출고지·반품지 주소와 <b>배송비 정책</b>을 하나 이상 만들어 둡니다. 배송비는 상품등록 화면에서 새로 만들 수 없습니다.</li>
          <li>상품등록 화면에서 회원이 직접 확인할 칸: <b>반품/교환</b>(반품 교환지·편도 배송비), 카테고리에 따라 생기는 <b>영업허가증</b>(업종·기관·번호), <b>원산지</b>, 식품·화장품의 <b>제조일자·소비기한</b>.</li>
        </ol>
        <p className="text-[11px] text-slate-500">ESM+ 메뉴 이름·위치는 2026-11-15 화면 분석 기준이며 ESM+ 개편으로 바뀔 수 있습니다. 화면 캡처 안내는 실제 시험이 끝난 뒤 추가합니다.</p>
        <CopyBox text="https://www.esmplus.com" label="ESM+ 주소 복사" />

        <h2 className="pt-2 text-base font-black text-slate-900">2. 기본값 적기</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li><Link href="/defaults" className="font-bold text-emerald-700 underline">ESM+ 기본값</Link>에서 판매사이트(G마켓+옥션)·재고·부가세를 고릅니다.</li>
          <li>배송정보 템플릿 이름을 적거나, 비워 두고 택배사·발송정책·출고지 이름·배송비 정책 번호를 적습니다(ESM+ 화면 글자 그대로).</li>
          <li>고시 상품군(예: 주방용품)과 인증 「인증대상이 아님」 여부를 정합니다. KC 인증 대상 상품은 체크를 끄세요.</li>
        </ol>

        <h2 className="pt-2 text-base font-black text-slate-900">3. 확장 연결</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li><Link href="/extension" className="font-bold text-emerald-700 underline">확장 연결</Link>에서 ZIP을 받아 <b>지우지 않을 폴더</b>(예: 문서 폴더 안 새 폴더)에 압축을 풉니다. 다운로드 폴더처럼 정리하다 지우기 쉬운 곳은 피하세요.</li>
          <li>크롬 주소창에 아래 주소 → 오른쪽 위 「개발자 모드」 켜기 → 「압축해제된 확장 프로그램을 로드합니다」 → <b>manifest.json 파일이 바로 들어 있는 폴더</b>를 고릅니다.</li>
          <li>확장 목록에 「AI G마켓·옥션 상품 자동등록기」와 버전이 보이는지 확인합니다.</li>
          <li>확장 연결 화면을 새로고침한 뒤 <b>「🔗 확장 연결하기」</b>를 누릅니다. 「✅ 이 계정과 연결됨」과 내 이메일이 보이면 끝입니다.</li>
          <li>다른 AIMaster 계정으로 연결돼 있으면 「다른 계정과 연결돼 있습니다」가 뜹니다 — 그때는 <b>「🔗 이 계정으로 다시 연결」</b>을 누르세요.</li>
          <li><b>새 버전이 나오면</b>: ZIP을 다시 받아 같은 폴더에 덮어쓰기 → <code>chrome://extensions</code>에서 확장의 새로고침(↻) → 이 화면도 새로고침합니다.</li>
        </ol>
        <CopyBox text="chrome://extensions" label="확장 관리 주소 복사" />

        <h2 className="pt-2 text-base font-black text-slate-900">4. 보내기·확인</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li><a className="font-bold text-emerald-700 underline" href={`${SHOP_DETAIL_SITE}/products`} target="_blank" rel="noreferrer">AI 상세페이지 자동화</a>에서 상품을 만들고 「검토 완료」를 누릅니다.</li>
          <li><Link href="/products" className="font-bold text-emerald-700 underline">등록할 상품</Link>에서 상품을 고르고 카테고리 검색어·판매가를 확인합니다.</li>
          <li>등록 방식은 처음에 <b>「입력만」</b>을 고르고 보냅니다. ESM+에 로그인된 크롬에서 확장이 새 탭으로 「상품등록」을 열고 채웁니다.</li>
          <li>채운 화면을 확인한 뒤 「임시저장」 또는 「등록하기」를 직접 누릅니다. 「임시저장까지」·「바로 등록」 방식도 있지만, 실제 ESM+ 시험이 끝나기 전까지는 「입력만」을 권장합니다.</li>
          <li><Link href="/history" className="font-bold text-emerald-700 underline">등록 기록</Link>에서 결과·수수료·멈춘 칸을 봅니다. 상품번호는 「바로 등록」으로 확장이 등록까지 했을 때만 남습니다.</li>
        </ol>
      </section>

      <section className="slw-card grid gap-4 p-5 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-base font-black text-slate-900">🤖 확장이 채우는 칸</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-700">
            {AUTO_FIELDS.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-base font-black text-slate-900">✋ ESM+에서 직접 넣는 칸</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-700">
            {MANUAL_FIELDS.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">이런 상품은 「입력만」으로 보낸 뒤 남은 칸을 채우고 직접 저장하세요.</p>
        </div>
      </section>

      <section className="slw-card p-5">
        <h2 className="mb-2 text-base font-black text-slate-900">🛟 멈췄을 때 다시 하기</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {RECOVERY.map(([t, d]) => (
            <div key={t} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-800">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <Notice tone="tip">💡 상품명은 ESM+ 기준 한글 50자(영문·숫자 100자)까지입니다. 판매가는 10원 단위여야 하며, 할인가가 있으면 할인가가 판매가로 들어갑니다.</Notice>
      <Notice tone="warn">⚠️ 확장이 채우는 동안 ESM+ 탭을 닫거나 다른 칸을 누르지 마세요. 「바로 등록」은 실제 상품이 생기므로 확인 상자를 체크해야 보낼 수 있습니다.</Notice>

      <section className="slw-card p-5">
        <h2 className="mb-2 text-base font-black text-slate-900">자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">{q}</summary>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
