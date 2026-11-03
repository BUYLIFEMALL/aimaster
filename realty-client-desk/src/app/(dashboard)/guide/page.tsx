import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼(1~4단계, 2026-11-03) — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 4단계 카드 형식
const STEPS = [
  { n: 1, icon: "🔗", title: "접수 링크 만들기", desc: "「고객 접수 링크」에서 고객 화면에 보일 사무소 이름·전화를 넣고 링크를 만듭니다. 주소는 한 번만 보이니 바로 복사하세요." },
  { n: 2, icon: "📱", title: "링크 공유", desc: "문자·블로그 글·명함 QR에 링크를 붙입니다. 고객은 로그인 없이 원하는 조건을 적고 동의한 뒤 접수합니다." },
  { n: 3, icon: "👥", title: "접수 확인", desc: "「관심고객」에서 거래 종류·상태로 거르고, 동의 일시·광고 문자 동의 여부를 확인합니다." },
  { n: 4, icon: "✍️", title: "전화 고객 직접 입력", desc: "전화·방문 고객은 「고객 직접 입력」에서 넣습니다. 동의를 받았다는 확인과 방법·날짜가 있어야 저장돼요." },
  { n: 5, icon: "🔑", title: "사무소·문자 계정 연결", desc: "「API키등록·플랫폼연동」에서 사무소 이름·전화번호(광고 문자 맨 앞에 들어감)와 본인 SOLAPI 계정을 저장합니다. 문자 요금은 본인 계정에서 나가요." },
  { n: 6, icon: "🏠", title: "매물 넣고 맞는 고객에게 안내", desc: "「내 매물」에 매물을 넣고 「맞는 고객 보기」를 누르면 조건이 맞는 고객이 나와요. 보낼 고객을 직접 고르고 미리보기를 본 뒤 보냅니다." },
  { n: 7, icon: "📅", title: "일정 넣고 아침 알림 받기", desc: "「일정」에 임장·계약·중도금·잔금·만기를 넣습니다. 정한 날(기본: 잔금 3일 전·만기 60일 전) 아침 8시에 내 핸드폰으로 문자가 와요(고객에게는 가지 않아요)." },
  { n: 8, icon: "✨", title: "광고 글 초안·명시 항목 점검", desc: "매물 화면에서 빠진 광고 명시 항목(등록번호·총 층수·사용승인일 등)을 확인하고, 본인 Claude 키로 광고 글·문자 초안을 만들어 고쳐 씁니다." },
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="mx-card flex flex-wrap items-center gap-3 p-4 text-xs text-mx-muted">
        <span className="mx-chip-blue">📖 연동 & 사용 매뉴얼</span>
        <span>⏱ 5분</span>
        <span>🔑 문자 안내만 본인 SOLAPI 계정 필요</span>
      </div>
      <div className="mx-card p-6">
        <h1 className="text-2xl font-black text-mx-text">관심고객을 모으고 맞는 매물을 안내하고 일정을 챙기는 8단계</h1>
        <p className="mt-2 text-sm text-mx-muted">수첩·엑셀에 흩어진 매수·임대 문의를 한 명부로 모으고, 누가 언제 동의했는지 함께 남깁니다.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        ⚠️ <b>꼭 지켜 주세요</b>: 동의를 받지 않은 고객은 넣지 마세요. 사무소 개인정보 처리방침에 「고객 명부 보관: Buylife」 「문자 발송: SOLAPI(본인 계정)」를 적어 주세요. 매물 안내 문자(광고)는 광고 수신에 동의한 고객에게만, 밤 9시~아침 8시를 피해 보내야 해요. 프로그램이 동의 안 한 고객·수신거부 고객·광고 동의 2년 지난 고객은 고를 수 없게 막고, 밤 시간에는 보내기 버튼을 막아요. 문자 맨 앞 「(광고)사무소 이름 전화번호」와 맨 끝 「무료수신거부 링크」는 자동으로 붙어요. 이 안내는 참고용이며 법률 자문이 아니에요.
      </div>
      <div className="mx-card p-5 text-sm text-mx-text">
        <h2 className="mx-section-title">❓ 자주 묻는 것</h2>
        <p className="mt-2"><b>링크 주소를 잃어버렸어요.</b> 보안 때문에 다시 볼 수 없어요. 새 링크를 만들고 예전 링크는 「멈추기」를 누르세요.</p>
        <p className="mt-2"><b>고객이 지워 달라고 해요.</b> 「관심고객」에서 그 고객의 「🗑 삭제」를 누르면 바로 지워져요.</p>
        <p className="mt-2"><b>광고 문자를 그만 받겠대요.</b> 고객이 문자 끝 링크를 누르면 바로 처리되고, 전화로 말씀하시면 「관심고객」에서 「광고 수신거부 처리」를 누르세요. 앞으로 안내 대상에서 빠져요.</p>
        <p className="mt-2"><b>맞는 고객이 안 나와요.</b> 고객 「원하는 지역」에 적힌 동 이름이 매물 소재지에 들어 있어야 해요. 거래 종류·매물 종류·예산(5%까지 여유)·면적도 함께 봐요.</p>
        <p className="mt-2"><b>같은 고객에게 다시 보내고 싶어요.</b> 같은 매물은 한 번만 보내져요. 실패한 기록만 「기록 지우고 다시 보낼 수 있게」로 지울 수 있어요.</p>
        <p className="mt-2"><b>AI 초안을 그대로 올려도 되나요?</b> 초안은 입력한 값만으로 만들지만 틀릴 수 있어요. 사실과 맞는지 확인하고, 「광고 명시 항목 점검」에 빠진 항목을 채운 뒤 올려 주세요. 초안은 저장되지 않고, 요금은 본인 Claude 계정에서 1회 약 10~30원이에요.</p>
        <p className="mt-2"><b>일정 알림이 안 와요.</b> 본인 SOLAPI 계정과 메인 사이트 핸드폰 번호가 있어야 해요. 알림은 하루 한 번 아침 8시에, 그날 알릴 일정을 한 통으로 보내요. 「일정」 화면 맨 위 상태 줄에서 일시정지 여부도 확인하세요.</p>
        <p className="mt-2"><b>고객 정보는 언제 지워지나요?</b> 마지막 상담일부터 1년이 지나면 매일 아침 정리 때 자동으로 지워져요(매물·발송 기록·일정도 1년).</p>
        <p className="mt-2"><b>광고 동의가 2년 지났대요.</b> 법에 따라 2년마다 다시 확인해야 해요. 고객에게 다시 동의를 받아 새로 저장해 주세요.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/intake" className="mx-btn-primary inline-flex min-h-[44px] items-center px-4 text-sm">🔗 접수 링크 만들러 가기</Link>
        <Link href="/clients" className="mx-btn-ghost inline-flex min-h-[44px] items-center px-4 text-sm">👥 관심고객 보기</Link>
        <Link href="/listings" className="mx-btn-ghost inline-flex min-h-[44px] items-center px-4 text-sm">🏠 내 매물 넣기</Link>
        <Link href="/events" className="mx-btn-ghost inline-flex min-h-[44px] items-center px-4 text-sm">📅 일정 넣기</Link>
      </div>
    </div>
  );
}
