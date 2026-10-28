import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";
import { SERVER_IPS } from "@/lib/version";

export const dynamic = "force-dynamic";

const WING = "https://wing.coupang.com";

const STEPS = [
  { emoji: "🔑", title: "WING에서 키 발급", body: "판매자정보 → 추가판매정보 → OPEN API 키 발급" },
  { emoji: "🌐", title: "자체개발 + IP 등록", body: "연동 방식 「자체개발」, 우리 서버 IP 2개 넣기" },
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
        <a href={WING} target="_blank" rel="noreferrer" className="rounded-full bg-rose-700 px-3 py-1 font-bold text-white hover:bg-rose-800">쿠팡 WING 열기 ↗</a>
      </div>

      <section className="slw-card p-5">
        <h2 className="text-lg font-extrabold text-slate-900">🚀 한눈에 보기</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          이 프로그램은 쿠팡이 판매자에게 공식으로 주는 <b>WING Open API</b>로 동작합니다. 화면을 대신 누르는 방식이 아니라서 빠르고 안정적입니다.
          판매자 본인의 키를 한 번 등록하면, 우리 서버가 쿠팡에 등록된 고정 IP로만 요청을 보냅니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-[11px] font-black text-rose-700">STEP {i + 1}</p>
              <p className="mt-1 font-extrabold text-slate-900">{s.emoji} {s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">STEP 1. WING에서 Open API 키 발급</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          <li><a href={WING} target="_blank" rel="noreferrer" className="font-bold text-rose-700 underline">쿠팡 WING</a>에 판매자 계정으로 로그인합니다.</li>
          <li>왼쪽 메뉴 <b>판매자정보 → 추가판매정보</b>로 들어가 아래쪽 <b>「OPEN API 키 발급」</b>을 찾습니다.</li>
          <li>「발급」 버튼을 누르면 <b>업체코드(A로 시작)·Access Key·Secret Key</b>가 나옵니다. 이미 발급돼 있으면 그 값을 씁니다.</li>
        </ol>
        <Notice tone="warn">
          ⚠️ <b>판매정지 상태</b>(오래 쓰지 않은 계정 등)에서는 키 발급·재발급이 막힙니다. 먼저 WING 「온라인 문의」로 판매를 재개해 주세요.
        </Notice>
      </section>

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">STEP 2. 연동 방식 「자체개발」 + 허용 IP 등록</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          <li>같은 화면의 <b>「연동 정보 → 수정」</b>을 누르고 연동 방식을 <b>「자체개발」</b>로 고릅니다.</li>
          <li>업체 입력 방식은 <b>「자체개발(직접입력)」</b>, 업체명은 자유롭게(예: 내 상호), URL은 아래 주소(https:// 없이)를 넣습니다.</li>
          <li>IP 주소 칸에 우리 서버 IP를 <b>하나씩</b> 넣고 그때마다 <b>「추가」</b>를 누릅니다(두 개). 목록에 둘 다 보이면 「확인」을 누릅니다.</li>
        </ol>
        <CopyBox label="URL" text="www.buylife.xyz" />
        {SERVER_IPS.map((ip, i) => <CopyBox key={ip} label={`IP ${i + 1}`} text={ip} />)}
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
          키 등록 화면과 연결 시험 버튼은 다음 업데이트에서 열립니다. 업체코드·Access Key·Secret Key와 <b>WING 로그인 ID</b>(상품 등록에 필요)를 준비해 두세요.
        </p>
        <Notice tone="warn">
          🔒 키 값은 채팅·메신저·캡처로 다른 사람에게 보내지 마세요. 노출됐다면 WING에서 <b>「재발급」</b>으로 바꾸면 이전 키는 쓸 수 없게 됩니다.
          키는 <b>최대 6개월</b>만 쓸 수 있어 만료 전에 재발급해 다시 등록해야 합니다.
        </Notice>
      </section>

      <section className="slw-card space-y-2 p-5">
        <h2 className="text-lg font-extrabold text-slate-900">❓ 자주 묻는 질문</h2>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">쿠팡 API를 쓰면 제재를 받지 않나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">쿠팡이 판매자에게 공식으로 제공하는 연동 방식이라 사용 자체로 제재받지 않습니다. 다만 같은 옵션값 중복, 승인 뒤 가격 −50%~+100% 범위 같은 상품 규칙은 지켜야 합니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">사용료가 있나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">쿠팡 Open API는 무료입니다. 이 프로그램 이용 권한은 AIMaster 회원 등급·이용 기간을 따릅니다.</p>
        </details>
        <details className="rounded-lg border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">내 PC IP도 등록해야 하나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-700">아니요. 쿠팡 호출은 모두 우리 서버에서 나가므로 위 서버 IP 두 개만 넣으면 됩니다.</p>
        </details>
      </section>
    </div>
  );
}
