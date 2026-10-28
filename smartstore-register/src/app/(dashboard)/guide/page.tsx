import Link from "next/link";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";
import { SHOP_DETAIL_SITE, MAIN_SITE } from "@/lib/version";

// 연동 & 사용 매뉴얼 — 초보자도 따라 하도록(주인님 2026-10-28 「초보자들도 보고 따라 할수 있는 수준으로」).
// 규격: docs/MANUAL_AND_INTEGRATION_GUIDELINES.md(헤더 바·히어로·4단계 카드·상세 단계·팁·주의·직링크). 내용은 v1.23 실제 동작·실물 시험 기준.

const SELLER = "https://sell.smartstore.naver.com";

const QUICK = [
  { n: 1, emoji: "🛍", title: "준비하기", body: "상세페이지 자동화에서 상품을 만들고, 크롬에서 스마트스토어센터에 로그인해 둡니다.", time: "처음 5분" },
  { n: 2, emoji: "🧩", title: "확장 설치·연결", body: "확장 ZIP을 받아 크롬에 설치하고, 버튼 한 번으로 내 계정과 연결합니다.", time: "처음 3분" },
  { n: 3, emoji: "⚙", title: "스토어 기본값", body: "A/S 전화·원산지·배송처럼 매번 같은 값을 한 번만 넣습니다.", time: "처음 5분" },
  { n: 4, emoji: "📦", title: "보내고 확인하기", body: "상품을 골라 확장으로 보내면 판매자센터 칸이 채워집니다. 결과는 등록 기록에서 봅니다.", time: "상품당 3분" },
];

const MODES = [
  { name: "입력만", what: "칸만 채우고 멈춥니다. 저장은 회원님이 직접 누릅니다.", when: "처음 써 볼 때 · 새 카테고리 첫 등록", tone: "text-emerald-700" },
  { name: "임시저장까지", what: "판매자센터 「임시저장」까지 누릅니다. 실제 상품은 생기지 않고 나중에 이어서 등록합니다.", when: "확인 뒤 천천히 올리고 싶을 때", tone: "text-sky-700" },
  { name: "바로 등록", what: "「저장하기」까지 눌러 상품을 만듭니다. 기본은 전시중지(손님에게 안 보임)로 올라갑니다.", when: "익숙해진 뒤", tone: "text-rose-700" },
];

const TROUBLE = [
  { s: "「등록 기록」에 「확장 대기」에서 넘어가지 않아요", f: "확장이 꺼져 있거나 다른 계정과 연결됐을 수 있습니다. 「🧩 확장 연결」에서 연결된 계정이 지금 로그인한 계정과 같은지(✅) 보고, 다르면 「다시 연결하기」를 누르세요." },
  { s: "「스마트스토어센터 로그인이 필요합니다」", f: "크롬에서 스마트스토어센터에 다시 로그인한 뒤 같은 상품을 다시 보내세요." },
  { s: "배송 템플릿이 「없음」으로 실패해요", f: "다른 스토어로 로그인돼 있을 수 있습니다. 「등록 기록」 끝의 「판매자센터: 스토어명」이 내 스토어인지 확인하세요. 템플릿 이름은 판매자센터 「템플릿 관리」 이름과 글자까지 같아야 합니다." },
  { s: "카테고리를 못 찾아요", f: "검색어를 짧게 바꾸세요(예: 「노트북 백팩」 → 「백팩」). 확장은 검색어 → 마지막 낱말 → 상품 카테고리 경로 순서로 다시 찾습니다." },
  { s: "검색 태그 하나가 「거절」됐어요", f: "카테고리·브랜드·판매처 이름이 든 태그는 스마트스토어가 받지 않습니다(예: 「노트북가방」). 저장은 막지 않으니 다른 낱말로 바꾸면 됩니다." },
  { s: "작업이 「입력 중」에서 오래 멈춰요", f: "PC 화면이 잠기면 확장도 멈춥니다. 작업 중에는 잠기지 않게 두세요. 15분이 지나면 이미지 주소가 만료되니 다시 보내 주세요." },
  { s: "확장을 새로고침했더니 작업이 「중단」됐어요", f: "확장이 일하는 중에 새로고침·탭 닫기를 하면 그 작업은 중단으로 남습니다(이중 등록 방지). 다시 보내면 됩니다." },
  { s: "새 칸이 화면에 안 보여요", f: "오래 열어 둔 등록기 탭은 F5로 새로고침하세요. 옛 화면에서 보낸 작업은 「오래된 화면」으로 실행되지 않습니다." },
  { s: "대시보드에 「⚠️ 바뀐 칸」이 떠요", f: "네이버가 판매자센터 화면을 바꾼 것입니다. 담당자가 확장을 고칠 때까지 「입력만」으로 보내고, 표시된 칸은 직접 확인하세요." },
];

const FAQ = [
  { q: "판매자센터 비밀번호나 판매자 키를 맡겨야 하나요?", a: "아니요. 회원님이 크롬에서 직접 로그인해 두면, 확장은 그 화면에서만 칸을 채웁니다. 비밀번호·판매자 키는 받지 않습니다." },
  { q: "같은 상품을 두 번 등록하게 되면 어떻게 하나요?", a: "이미 「바로 등록」한 상품은 「한 번 더 등록합니다」에 체크해야만 다시 보냅니다. 결과가 불확실하면 확장은 자동으로 다시 등록하지 않습니다. 판매자 관리 코드(AIM-…)로 판매자센터에서 찾을 수도 있습니다." },
  { q: "상품속성 「✨ 추천」은 비용이 드나요?", a: "회원님 본인의 Claude(Anthropic) API 키로 한 번 부릅니다(한 번에 아주 적은 비용). 키가 없으면 메인 사이트 「API키생성|플랫폼연동」에서 등록하라는 안내가 나옵니다. 추천은 빈 칸만 채우고, 보내기 전에 회원님이 확인합니다." },
  { q: "여러 상품을 한꺼번에 보낼 수 있나요?", a: "「📦 등록할 상품」 목록에서 상품을 체크하고 「고른 상품 연속 보내기」(최대 20개)를 누르면 하나씩 차례로 처리합니다. 「입력만」은 연속 보내기에서 쓸 수 없고, 예약구매는 넣지 않습니다." },
  { q: "판매자센터 화면 점검은 무엇인가요?", a: "확장이 7일마다 상품 등록 화면을 읽기만 해서, 칸 이름이 바뀌지 않았는지 확인합니다. 아무것도 입력·저장하지 않고, 점검용 탭은 끝나면 닫힙니다. 대시보드 「🩺 판매자센터 화면 점검」에서 「지금 점검」도 할 수 있습니다." },
  { q: "등록 기록은 언제까지 남나요?", a: "30일 동안 남고 그 뒤 자동으로 지워집니다." },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="slw-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">{n}</span>
        <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
      </div>
      <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

function Do({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

const ext = "rounded-lg border px-3 py-1.5 text-xs font-bold";

export default function GuidePage() {
  return (
    <div className="space-y-5">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="처음 한 번만 준비하면, 그다음부터는 상품을 골라 보내기만 하면 됩니다." />

      {/* 헤더 메타데이터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">🛒 이커머스</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">⏱ 처음 준비 약 15분 · 상품당 약 3분</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">🔒 비밀번호·판매자 키 받지 않음</span>
        <span className="flex-1" />
        <a href={SELLER} target="_blank" rel="noreferrer" className={`${ext} border-emerald-300 bg-emerald-50 text-emerald-800`}>스마트스토어센터 ↗</a>
        <a href={`${SHOP_DETAIL_SITE}/products`} target="_blank" rel="noreferrer" className={`${ext} border-slate-300 bg-white text-slate-700`}>AI 상세페이지 자동화 ↗</a>
      </div>

      {/* 개요 히어로 카드 */}
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
        <p className="text-sm font-extrabold text-emerald-900">이 프로그램이 해 주는 일</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
          AI 상세페이지 자동화에서 만든 상품을, 회원님 크롬의 확장이 <b>스마트스토어센터 「상품 등록」 화면에 칸마다 대신 입력</b>합니다.
          카테고리·상품명·가격·이미지·상세설명·옵션·배송·상품속성까지 채우고, 결과와 멈춘 칸을 「등록 기록」에 남깁니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-slate-700">
          {["🛍 상세페이지 상품", "→", "📦 등록기에서 보내기", "→", "🧩 내 크롬 확장", "→", "🏪 판매자센터 칸 채움", "→", "🧾 등록 기록"].map((x, i) => (
            <span key={i} className={x === "→" ? "text-slate-400" : "rounded-lg border border-emerald-200 bg-white px-2 py-1"}>{x}</span>
          ))}
        </div>
      </section>

      {/* 핵심 4단계 카드 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map((s) => (
          <div key={s.n} className="slw-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-emerald-700">STEP {s.n}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">⏱ {s.time}</span>
            </div>
            <p className="mt-1 text-base font-extrabold text-slate-900">{s.emoji} {s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>

      {/* 단계별 상세 안내 */}
      <Step n={1} title="준비하기 — 상품 만들기와 판매자센터 로그인">
        <p className="font-bold text-slate-900">① 상품 만들기</p>
        <Do items={[
          <>「<a className="font-bold underline" href={`${SHOP_DETAIL_SITE}/products/new`} target="_blank" rel="noreferrer">AI 상세페이지 자동화 ↗</a>」에서 상품명·정상가·대표 사진을 넣고 섹션 이미지를 만듭니다.</>,
          <>상품을 다 만들었으면 그 화면에서 「검토 완료」를 눌러 두세요. 이 등록기 목록에 <b>✅ 검토 완료</b>로 먼저 보입니다.</>,
        ]} />
        <p className="font-bold text-slate-900">② 스마트스토어센터 로그인</p>
        <Do items={[
          <>확장을 쓸 <b>같은 크롬</b>에서 스마트스토어센터에 로그인합니다.</>,
          <>오른쪽 위 스토어 이름이 <b>등록할 스토어가 맞는지</b> 꼭 확인하세요(스토어가 여러 개면 자주 헷갈립니다).</>,
        ]} />
        <CopyBox text={SELLER} label="스마트스토어센터" />
        <p className="font-bold text-slate-900">③ 팝업 허용(처음 한 번)</p>
        <p>상세설명을 넣는 스마트 에디터가 팝업 창으로 열리기 때문에 필요합니다. 아래 주소를 크롬 주소창에 붙여 넣고 → 「팝업 전송 및 리디렉션 사용이 허용됨」의 「추가」 → 판매자센터 주소를 넣습니다.</p>
        <CopyBox text="chrome://settings/content/popups" label="크롬 주소창" />
        <CopyBox text={SELLER} label="추가할 주소" />
      </Step>

      <Step n={2} title="확장 설치·연결 — 처음 한 번">
        <Do items={[
          <>왼쪽 메뉴 <Link href="/extension" className="font-bold underline">🧩 확장 연결</Link>에서 「확장 ZIP 받기」를 누릅니다.</>,
          <>받은 ZIP의 압축을 풉니다. <b>푼 폴더는 지우거나 옮기지 마세요</b>(크롬이 그 폴더를 계속 씁니다).</>,
          <>크롬 주소창에 아래 주소를 넣고 → 오른쪽 위 「개발자 모드」를 켭니다.</>,
          <>「압축해제된 확장 프로그램을 로드합니다」를 눌러 푼 폴더를 고릅니다. 「AI 스마트스토어 상품 자동등록기」 카드가 생기면 설치 끝입니다.</>,
          <>다시 <Link href="/extension" className="font-bold underline">🧩 확장 연결</Link> 화면에서 「연결하기」를 누릅니다. <b>연결된 계정 이메일이 지금 로그인한 계정과 같으면 ✅</b>로 보입니다.</>,
        ]} />
        <CopyBox text="chrome://extensions" label="크롬 주소창" />
        <Notice tone="tip">💡 새 버전이 나오면 확장 연결 화면에 알림이 뜹니다. ZIP을 다시 받아 <b>같은 폴더에 덮어쓰고</b> chrome://extensions에서 카드의 새로고침(↻)을 누르세요.</Notice>
      </Step>

      <Step n={3} title="스토어 기본값 — 매번 같은 값은 한 번만">
        <p>왼쪽 메뉴 <Link href="/defaults" className="font-bold underline">⚙ 스토어 기본값</Link>에서 넣고 「기본값 저장」을 누릅니다. 모든 상품에 함께 쓰입니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[12px]">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-1.5 pr-2">칸</th><th className="py-1.5 pr-2">넣는 법</th><th className="py-1.5">필수</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-1.5 pr-2 font-bold">A/S 전화번호</td><td className="pr-2">고객이 연락할 번호(예: 1588-0000)</td><td>✅</td></tr>
              <tr><td className="py-1.5 pr-2 font-bold">원산지</td><td className="pr-2">국산 / 수입산(수입사) 중 고르기</td><td>✅</td></tr>
              <tr><td className="py-1.5 pr-2 font-bold">상품정보제공고시</td><td className="pr-2">상품군 고르기(맞는 상품군이 없으면 「기타 재화」)</td><td>✅</td></tr>
              <tr><td className="py-1.5 pr-2 font-bold">어린이제품인증</td><td className="pr-2">어린이용이 아니면 「인증대상 아님」</td><td>카테고리에 따라</td></tr>
              <tr><td className="py-1.5 pr-2 font-bold">배송</td><td className="pr-2"><b>배송 템플릿 이름</b>(판매자센터 「템플릿 관리」 이름 그대로) 또는 택배사·배송비 직접 입력</td><td>✅ 둘 중 하나</td></tr>
              <tr><td className="py-1.5 pr-2 font-bold">반품/교환</td><td className="pr-2">반품 택배사·반품비·교환비 — <b>템플릿을 쓰면 비워 두세요</b></td><td>선택</td></tr>
              <tr><td className="py-1.5 pr-2 font-bold">구매/리뷰 혜택</td><td className="pr-2">포인트·복수구매 할인. 포토 리뷰 포인트 ≥ 텍스트 리뷰 포인트(스마트스토어 규칙)</td><td>선택</td></tr>
            </tbody>
          </table>
        </div>
      </Step>

      <Step n={4} title="상품 보내고 결과 확인하기">
        <p className="font-bold text-slate-900">① 보내기</p>
        <Do items={[
          <>왼쪽 메뉴 <Link href="/products" className="font-bold underline">📦 등록할 상품</Link>에서 상품을 누릅니다.</>,
          <><b>카테고리 검색어</b>를 짧게 넣습니다(예: 「백팩」, 「텀블러」). 확장이 마지막 단계 카테고리까지 고릅니다.</>,
          <><b>판매가</b>를 확인합니다. 스마트스토어만 다르게 받으려면 여기서 고치면 되고, 상세페이지 상품은 바뀌지 않습니다.</>,
          <><b>옵션</b>(선택): 쓰지 않음 / 단독형 / 조합형. 조합형은 조합마다 재고를 넣으면 상품 재고는 합계로 자동 계산됩니다.</>,
          <><b>상품속성</b>(선택): 「🔎 이 카테고리 속성 불러오기」 → 판매자센터에 있는 이름·보기 그대로 고르기 → 「✨ 상세페이지 내용으로 추천」으로 빈 칸 채우기. 「필수」 표시가 비면 노란 안내가 뜹니다.</>,
          <>태그·브랜드·모델명·추가상품·예약구매는 필요할 때만 넣습니다.</>,
          <><b>등록 방식</b>을 고르고 「🧩 확장으로 보내기」를 누릅니다.</>,
          <>판매자센터 탭이 열리고 칸이 하나씩 채워집니다(2~3분). <b>끝날 때까지 그 탭을 누르거나 닫지 마세요.</b></>,
        ]} />
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <div key={m.name} className="rounded-lg border border-slate-200 p-3">
              <p className={`text-sm font-extrabold ${m.tone}`}>{m.name}</p>
              <p className="mt-1 text-[12px] text-slate-700">{m.what}</p>
              <p className="mt-1 text-[11px] text-slate-500">언제: {m.when}</p>
            </div>
          ))}
        </div>
        <p className="font-bold text-slate-900">② 결과 확인</p>
        <Do items={[
          <>왼쪽 메뉴 <Link href="/history" className="font-bold underline">🧾 등록 기록</Link>에서 상태를 봅니다: 입력 완료 · 임시저장 완료 · 등록 완료 · 실패.</>,
          <>「직접 확인할 칸」이 있으면 판매자센터에서 그 칸만 고치면 됩니다. 기록 끝의 「판매자센터: 스토어명」으로 어느 스토어에 들어갔는지도 확인하세요.</>,
          <><b>마지막 확인은 판매자센터에서</b>: 임시저장은 「임시저장 된 내용(N건)」 숫자, 바로 등록은 「상품 조회/수정」 목록에서 확인합니다.</>,
        ]} />
      </Step>

      {/* 팁·주의 배너 */}
      <Notice tone="tip">
        💡 <b>처음에는 「입력만」으로</b> 한 번 보내 판매자센터 화면을 눈으로 확인하고, 익숙해지면 「임시저장까지」 → 「바로 등록」 순서로 바꾸세요.
        여러 상품은 목록에서 체크하고 「고른 상품 연속 보내기」(최대 20개)를 쓰면 하나씩 차례로 처리됩니다.
      </Notice>
      <Notice tone="warn">
        ⚠️ <b>작업 중에는</b> PC 화면 잠금·확장 새로고침·판매자센터 탭 닫기를 하지 마세요(작업이 멈추거나 중단됩니다).
        스토어가 여러 개면 <b>로그인한 스토어</b>를 꼭 확인하세요. 판매자센터 화면이 바뀌면 대시보드 「🩺 판매자센터 화면 점검」에 표시됩니다.
      </Notice>

      {/* 문제 해결 */}
      <section className="slw-card p-4 sm:p-5">
        <h2 className="text-base font-extrabold text-slate-900">🛠 이럴 땐 이렇게</h2>
        <div className="mt-2 divide-y divide-slate-100">
          {TROUBLE.map((t) => (
            <div key={t.s} className="py-2.5">
              <p className="text-[13px] font-bold text-slate-900">🔸 {t.s}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{t.f}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <div className="slw-card divide-y divide-slate-100 p-0">
        {FAQ.map((f) => (
          <details key={f.q} className="p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">Q. {f.q}</summary>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>

      {/* 직링크 */}
      <div className="flex flex-wrap gap-2">
        <Link href="/extension" className={`${ext} border-emerald-600 bg-emerald-600 text-white`}>🧩 확장 연결하러 가기</Link>
        <Link href="/defaults" className={`${ext} border-slate-300 bg-white text-slate-700`}>⚙ 스토어 기본값</Link>
        <Link href="/products" className={`${ext} border-slate-300 bg-white text-slate-700`}>📦 등록할 상품</Link>
        <a href={`${MAIN_SITE}/api-settings`} target="_blank" rel="noreferrer" className={`${ext} border-slate-300 bg-white text-slate-700`}>🔑 내 API 키 등록(추천용) ↗</a>
      </div>
    </div>
  );
}
