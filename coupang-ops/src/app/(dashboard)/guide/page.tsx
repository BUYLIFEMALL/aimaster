import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";

export const dynamic = "force-dynamic";

const WING = "https://wing.coupang.com";

const STEPS = [
  { emoji: "🔑", title: "WING에서 키 발급", body: "판매자정보 → 추가판매정보 → OPEN API 키 발급" },
  { emoji: "🌐", title: "내 고정 IP 만들기", body: "Fixie 가입, 프록시 주소와 고정 IP 2개 확인" },
  { emoji: "🛡️", title: "자체개발 + IP 등록", body: "연동 방식 「자체개발」, 내 고정 IP 2개 넣기" },
  { emoji: "🧩", title: "이 프로그램에 키 등록", body: "업체코드·Access Key·Secret Key·WING 로그인 ID" },
  { emoji: "✅", title: "연결 시험 → 사용", body: "연결이 확인되면 상품 등록부터 시작" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="space-y-5">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="쿠팡 WING Open API 키를 발급받아 이 프로그램과 연결하는 방법입니다." />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700">⏱ 약 10분</span>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700">💳 비용 없음(쿠팡 API 무료)</span>
        <a href={WING} target="_blank" rel="noreferrer" className="rounded-full bg-blue-700 px-3 py-1 font-bold text-white hover:bg-blue-800">쿠팡 WING 열기 ↗</a>
      </div>

      <section className="slw-card p-5">
        <h2 className="text-lg font-extrabold text-slate-900">🚀 한눈에 보기</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          이 프로그램은 쿠팡이 판매자에게 공식으로 주는 <b>WING Open API</b>로 동작합니다. 화면을 대신 누르는 방식이 아니라서 빠르고 안정적입니다.
          판매자 본인의 키를 한 번 등록하면, 내 Fixie 계정의 고정 IP로만 쿠팡에 요청을 보냅니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-[11px] font-black text-blue-700">STEP {i + 1}</p>
              <p className="mt-1 font-extrabold text-slate-900">{s.emoji} {s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">STEP 1. WING에서 Open API 키 발급</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          <li><a href={WING} target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">쿠팡 WING</a>에 판매자 계정으로 로그인합니다.</li>
          <li>왼쪽 메뉴 <b>판매자정보 → 추가판매정보</b>로 들어가 아래쪽 <b>「OPEN API 키 발급」</b>을 찾습니다.</li>
          <li>「발급」 버튼을 누르면 <b>업체코드(A로 시작)·Access Key·Secret Key</b>가 나옵니다. 이미 발급돼 있으면 그 값을 씁니다.</li>
        </ol>
        <Notice tone="warn">
          ⚠️ <b>판매정지 상태</b>(오래 쓰지 않은 계정 등)에서는 키 발급·재발급이 막힙니다. 먼저 WING 「온라인 문의」로 판매를 재개해 주세요.
        </Notice>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">STEP 2. 내 고정 IP 만들기(Fixie)</h2>
        <p className="text-sm leading-relaxed text-slate-700">쿠팡은 WING에 등록한 IP에서 온 요청만 받습니다. 이 프로그램 서버는 나가는 IP가 바뀌므로, 항상 같은 IP로 나가게 해 주는 Fixie를 거칩니다.</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          <li><a href="https://usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Fixie 사이트 ↗</a>에서 가입하고 <b>HTTP/HTTPS용</b> 프록시를 만듭니다.</li>
          <li><a href="https://app.usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Fixie 대시보드 ↗</a>에서 <b>프록시 주소</b>와 <b>고정 IP 2개</b>를 확인합니다.</li>
          <li>이 프로그램 <Link href="/connect" className="font-bold text-blue-700 underline">🔑 API키등록·플랫폼연동</Link>의 「내 고정 IP 만들기」 칸에 프록시 주소를 넣고 저장합니다.</li>
        </ol>
        <CopyBox label="주소 모양" text="http://fixie:토큰@내주소.usefixie.com:80" />
        <Notice tone="tip">💡 요금은 내 Fixie 계정에 적용됩니다. 무료 Tricycle은 월 500회, 유료 Commuter는 월 2,500회에 5달러입니다(2026-10-31 Fixie 요금표 기준). 첫 화면에서 이번 달 호출 수를 볼 수 있고, 아침 요약은 켜 두면 월 약 210회를 씁니다.</Notice>
        <Notice tone="warn">⚠️ 프록시 주소에는 비밀 토큰이 들어 있습니다. 다른 사람에게 보여 주지 마세요. 재발급하면 이 프로그램에도 새 주소를 넣어 주세요.</Notice>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">STEP 3. 연동 방식 「자체개발」 + 허용 IP 등록</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          <li>같은 화면의 <b>「연동 정보 → 수정」</b>을 누르고 연동 방식을 <b>「자체개발」</b>로 고릅니다.</li>
          <li>업체 입력 방식은 <b>「자체개발(직접입력)」</b>, 업체명은 자유롭게(예: 내 상호), URL은 아래 주소(https:// 없이)를 넣습니다.</li>
          <li>IP 주소 칸에 Fixie 대시보드의 고정 IP를 <b>하나씩</b> 넣고 그때마다 <b>「추가」</b>를 누릅니다(두 개). 목록에 둘 다 보이면 「확인」을 누릅니다.</li>
        </ol>
        <CopyBox label="URL" text="www.buylife.xyz" />
        <Notice tone="tip">
          💡 IP는 등록 후 쿠팡에 반영되기까지 30분~1시간, 처음 발급한 키는 최대 24시간이 걸릴 수 있습니다. 바로 연결이 안 되면 잠시 뒤 다시 시험해 주세요.
        </Notice>
        <Notice tone="warn">
          ⚠️ 쿠팡은 키 하나에 연동을 <b>한 곳만</b> 허용합니다. 다른 셀러툴(통합관리 프로그램)을 쓰고 계시면 자체개발로 바꿀 때 그 연동이 끊깁니다.
          연동 정보 수정은 횟수 제한이 있으니 IP를 한 번에 정확히 넣어 주세요. 저장 버튼이 안 보이면 화면 배율을 줄여 보세요.
        </Notice>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">STEP 3·4. 키 등록과 연결 시험</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          왼쪽 메뉴 「판매자정보 → API키등록·플랫폼연동」에서 업체코드·Access Key·Secret Key와 <b>WING 로그인 ID</b>(상품 등록에 필요)를 넣고 「연결 시험」을 눌러 주세요.
        </p>
        <Notice tone="warn">
          🔒 키 값은 채팅·메신저·캡처로 다른 사람에게 보내지 마세요. 노출됐다면 WING에서 <b>「재발급」</b>으로 바꾸면 이전 키는 쓸 수 없게 됩니다.
          키는 <b>최대 6개월</b>만 쓸 수 있어 만료 전에 재발급해 다시 등록해야 합니다.
        </Notice>
      </section>

      <section className="slw-card space-y-2 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">❓ 자주 묻는 질문</h2>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">주문을 가장 빨리 처리하는 방법은요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">「주문」에서 결제완료를 불러와 「처리하고 발주서 파일 받기」를 누릅니다. 받은 파일을 택배사에 올리고, 송장이 채워진 파일을 「송장 파일 올리기」로 올린 뒤 등록하면 끝납니다. 파일에는 고객 정보가 있어 서버에 저장하지 않으니, 다 쓴 파일은 지워 주세요. 택배사 파일은 「주문번호」나 「배송번호」, 「송장번호」 칸만 있으면 읽습니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">상세페이지 프로그램을 안 써도 등록할 수 있나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">네. 「상품 등록 → 상세페이지 없이 등록」에서 이미지와 상품명·가격을 넣거나, 「내 쿠팡 상품 → 상품 수정 → 복사 등록」으로 기존 상품을 복사합니다. 자주 쓰는 값은 등록 템플릿으로 저장해 불러올 수 있습니다. 복사본은 저장만 되며 승인 요청은 직접 보냅니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">아침 요약 알림은 어떻게 켜나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">「판매자정보 → 아침 요약 알림」에서 텔레그램 봇, 메일 SMTP, SOLAPI 카카오톡 중 받을 곳을 연결하고 무료 cron-job.org API 키를 넣은 뒤 시각을 골라 켭니다. 카카오톡은 내 카카오 채널을 친구로 추가해야 받을 수 있고 요금은 내 SOLAPI에 청구됩니다. 건수만 보내고 고객 정보는 보내지 않으며, 쿠팡에는 읽기만 합니다. 한 번에 쿠팡을 7번 읽으므로 호출 상한에 닿으면 그날은 쉬고 알려 드립니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">AI 추천은 무엇을 채우나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">상품 등록 3단계에서 고른 AI의 본인 키로 검색어와 검색 속성을 추천받습니다. 이미 넣은 값은 덮어쓰지 않고, 쿠팡 목록에 없는 값은 버립니다. 사용량은 회원 키에 청구되며, 보내기 전에 직접 확인해 주세요. 등록 기록은 30일 뒤 자동으로 지워집니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">상품을 고치면 바로 반영되나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">「내 쿠팡 상품 → 상품 수정」에서 배송·반품 값은 승인 없이 바로 바뀝니다. 상품명·브랜드·검색어는 승인된 상품이면 쿠팡 재승인 뒤 반영됩니다. 가격·재고·판매 상태는 「옵션 관리」나 「일괄 가격·재고」에서 바꾸고, 이미지와 옵션 구성은 WING에서 고쳐 주세요.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">쿠폰을 만들면 비용이 드나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">할인액은 계약 조건에 따라 판매자 정산에서 빠질 수 있으니, 계약의 판매자 부담 비율과 예산을 확인한 뒤 만들어 주세요. 쿠폰은 내일 0시부터 시작할 수 있고, 넣은 옵션은 뺄 수 없어 바꾸려면 파기해야 합니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">「매출·정산」의 순이익은 어떻게 계산하나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">쿠팡이 실제로 계산한 정산액에서 판매자 쿠폰과, 회원이 넣은 개당 원가 × 순판매수량을 뺍니다. 택배비·포장비는 원가에 포함해 주세요. 원가를 넣지 않은 옵션은 순이익을 표시하지 않습니다. 매출은 구매확정 또는 배송완료 7일 뒤에 잡히므로 최근 주문은 아직 없을 수 있습니다. 「주문 리포트용 파일 받기」로 받은 파일은 AI 쇼핑몰 주문·매출 리포트에 그대로 올릴 수 있습니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">반품 승인 버튼이 안 보이는 건은 어떻게 하나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">10만원 미만 빠른환불 대상이나 입고 확인을 마친 건은 쿠팡이 자동으로 승인할 수 있어 승인 단계가 필요 없습니다. 쿠팡 조회 조건에 「입고완료」가 없어, 입고 확인 뒤 승인 버튼은 그 자리에서 다시 읽은 건에만 나타납니다. 목록을 새로 불러온 뒤 보이지 않으면 WING에서 처리해 주세요.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">AI가 문의에 자동으로 답변하나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">아니요. AI는 초안만 만들고, 회원이 고쳐서 확인을 눌러야 등록됩니다. 「API키등록·플랫폼연동」에 쓰실 AI(Claude·GPT·Gemini)의 본인 키를 등록하면 화면에서 플랫폼과 모델을 고를 수 있고, 사용량은 회원 키에 청구됩니다. 고객 연락처와 번호는 가린 뒤 AI에 보내며, 고객센터 미답변 건은 24시간이 지나면 쿠팡이 처리하므로 그 전에 답해 주세요.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">「품절 예방」은 자동으로 재고를 채우나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">아니요. 버튼을 누를 때 상품 20개씩 점검해 품절·부족 옵션을 보여 주고, 재고는 회원이 수량을 넣고 확인을 누른 옵션만 바뀝니다. 판매 중지 옵션은 재고를 채워도 저절로 재개되지 않으니 「내 쿠팡 상품」의 「옵션 관리」에서 재개해 주세요.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">쿠팡 API를 쓰면 제재를 받지 않나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">쿠팡이 판매자에게 공식으로 제공하는 연동 방식이라 사용 자체로 제재받지 않습니다. 다만 같은 옵션값 중복, 승인 뒤 가격 −50%~+100% 범위 같은 상품 규칙은 지켜야 합니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">사용료가 있나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">쿠팡 Open API는 무료입니다. 이 프로그램 이용 권한은 AIMaster 회원 등급·이용 기간을 따릅니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">Fixie는 왜 필요한가요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">쿠팡은 WING에 등록한 IP에서 온 요청만 받는데, 이 프로그램 서버는 나가는 IP가 바뀝니다. Fixie가 요청을 항상 같은 IP로 내보내 주므로, 그 IP를 WING에 등록해 두면 연결됩니다. 쿠팡 기능이 아니라 고정 IP를 빌려주는 별도 서비스이고, 회원마다 본인 계정을 씁니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">연결 시험에서 IP를 허용하지 않는다고 나와요</summary>
          <p className="mt-2 leading-relaxed text-slate-700">오류 문구에 지금 나가는 IP가 함께 나오면 그 IP가 WING 허용 IP에 있는지 확인해 주세요. 등록 후 쿠팡에 반영되기까지 30분~1시간 걸릴 수 있습니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">내 PC IP도 등록해야 하나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">아니요. 쿠팡 호출은 모두 내 Fixie 고정 IP로 나가므로 그 IP 두 개만 넣으면 됩니다.</p>
        </details>
      </section>
    </div>
  );
}
