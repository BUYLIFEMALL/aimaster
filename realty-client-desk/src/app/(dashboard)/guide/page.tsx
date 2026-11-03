import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼(1단계, 2026-11-03) — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 4단계 카드 형식
const STEPS = [
  { n: 1, icon: "🔗", title: "접수 링크 만들기", desc: "「고객 접수 링크」에서 고객 화면에 보일 사무소 이름·전화를 넣고 링크를 만듭니다. 주소는 한 번만 보이니 바로 복사하세요." },
  { n: 2, icon: "📱", title: "링크 공유", desc: "문자·블로그 글·명함 QR에 링크를 붙입니다. 고객은 로그인 없이 원하는 조건을 적고 동의한 뒤 접수합니다." },
  { n: 3, icon: "👥", title: "접수 확인", desc: "「관심고객」에서 거래 종류·상태로 거르고, 동의 일시·광고 문자 동의 여부를 확인합니다." },
  { n: 4, icon: "✍️", title: "전화 고객 직접 입력", desc: "전화·방문 고객은 「고객 직접 입력」에서 넣습니다. 동의를 받았다는 확인과 방법·날짜가 있어야 저장돼요." },
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="mx-card flex flex-wrap items-center gap-3 p-4 text-xs text-mx-muted">
        <span className="mx-chip-blue">📖 연동 & 사용 매뉴얼</span>
        <span>⏱ 5분</span>
        <span>🔑 API 키 필요 없음(1단계)</span>
      </div>
      <div className="mx-card p-6">
        <h1 className="text-2xl font-black text-mx-text">관심고객을 동의와 함께 모으는 4단계</h1>
        <p className="mt-2 text-sm text-mx-muted">수첩·엑셀에 흩어진 매수·임대 문의를 한 명부로 모으고, 누가 언제 동의했는지 함께 남깁니다.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="mx-card p-4">
            <p className="text-xs font-bold text-mx-primary">STEP {s.n}</p>
            <p className="mt-1 text-2xl">{s.icon}</p>
            <p className="mt-1 font-bold text-mx-text">{s.title}</p>
            <p className="mt-1 text-sm text-mx-muted">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="mx-card border-l-4 border-l-mx-primary p-4 text-sm text-mx-text">
        💡 <b>팁</b>: 전화로 문의한 고객에게는 통화 중에 「연락처를 저장해 맞는 매물 안내에 써도 될까요? 1년 보관하고 원하시면 바로 지웁니다」라고 묻고, 「고객 직접 입력」에서 동의를 체크하세요.
      </div>
      <div className="mx-card border-l-4 border-l-mx-danger p-4 text-sm text-mx-text">
        ⚠️ <b>꼭 지켜 주세요</b>: 동의를 받지 않은 고객은 넣지 마세요. 사무소 개인정보 처리방침에 「고객 명부 보관: Buylife」 「문자 발송: SOLAPI(본인 계정)」를 적어 주세요. 매물 안내 문자(광고)는 광고 수신에 동의한 고객에게만, 밤 9시~아침 8시를 피해 보내야 해요(다음 단계에서 프로그램이 막아 드려요). 이 안내는 참고용이며 법률 자문이 아니에요.
      </div>
      <div className="mx-card p-5 text-sm text-mx-text">
        <h2 className="mx-section-title">❓ 자주 묻는 것</h2>
        <p className="mt-2"><b>링크 주소를 잃어버렸어요.</b> 보안 때문에 다시 볼 수 없어요. 새 링크를 만들고 예전 링크는 「멈추기」를 누르세요.</p>
        <p className="mt-2"><b>고객이 지워 달라고 해요.</b> 「관심고객」에서 그 고객의 「🗑 삭제」를 누르면 바로 지워져요.</p>
        <p className="mt-2"><b>광고 문자를 그만 받겠대요.</b> 「광고 수신거부 처리」를 누르면 앞으로 안내 문자 대상에서 빠져요.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/intake" className="mx-btn-primary inline-flex min-h-[44px] items-center px-4 text-sm">🔗 접수 링크 만들러 가기</Link>
        <Link href="/clients" className="mx-btn-ghost inline-flex min-h-[44px] items-center px-4 text-sm">👥 관심고객 보기</Link>
      </div>
    </div>
  );
}
