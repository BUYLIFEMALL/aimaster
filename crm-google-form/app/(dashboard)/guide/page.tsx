import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHero } from "@/components/layout/PageHero";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE = [
  { icon: "🔗", title: "구글폼 등록", desc: "「구글폼 연결」에서 폼 이름 등록 → 전용 웹훅 주소가 생겨요", time: "10초", href: "/sources" },
  { icon: "🧩", title: "Apps Script 연결", desc: "응답 시트 → 확장 프로그램 → Apps Script에 코드 붙여넣고 「양식 제출 시」 트리거", time: "약 3분", href: "/sources" },
  { icon: "⚙️", title: "매핑·채널 고르기", desc: "이름·연락처·이메일 질문 제목 입력, 보낼 채널 체크", time: "1분", href: "/sources" },
  { icon: "📥", title: "자동 접수·발송", desc: "응답마다 신청자 접수 확인 + 운영자 텔레그램 알림", time: "자동", href: "/submissions" },
];

const CHANNELS = [
  { chip: "📧 이메일", need: "SMTP 계정", desc: "신청자 이메일로 접수 확인" },
  { chip: "📱 문자(SMS)", need: "SOLAPI", desc: "신청자 휴대폰으로 문자" },
  { chip: "💛 카카오 알림톡", need: "SOLAPI + 카카오 채널 + 승인 템플릿", desc: "정보성 안내(템플릿 변수 매핑)" },
  { chip: "💬 카카오 친구톡", need: "SOLAPI + 카카오 채널", desc: "채널 친구에게 자유 형식 메시지" },
  { chip: "✈️ 텔레그램", need: "본인 봇", desc: "운영자에게 신청 내역 요약" },
  { chip: "📢 RCS 프로모션", need: "SOLAPI + RCS 브랜드", desc: "선택한 신청자에게 1회 발송" },
];

const FAQ = [
  {
    q: "테스트 응답을 보냈는데 접수 내역에 안 떠요.",
    a: "Apps Script의 트리거가 「양식 제출 시」로 등록됐는지, 코드 안 웹훅 주소가 「구글폼 연결」 카드의 주소와 같은지 확인하세요. 폼이 「일시중지」 상태여도 받지 않습니다.",
  },
  {
    q: "상태가 「발송 실패」예요.",
    a: "접수 내역의 빨간 안내 문구를 확인하세요. 대부분 발송 계정 미연결이거나, 필드 매핑의 질문 제목이 구글폼 질문과 글자 하나라도 다른 경우입니다.",
  },
  {
    q: "비용은 얼마나 드나요?",
    a: "프로그램 자체 비용 외에, 문자·알림톡·친구톡·RCS는 회원님 SOLAPI 계정 요금이 건당 차감됩니다. 이메일·텔레그램은 발송 요금이 없습니다.",
  },
  {
    q: "접수 후 팔로우업 자동 발송은 무엇으로 돌아가나요? 내 cron-job.org로 돌릴 수 있나요?",
    a: "기본은 「AIMaster 기본(Vercel)」으로 매일 09시에 보낼 팔로우업을 확인해 보냅니다(따로 할 일 없음). 본인 계정으로 돌리고 싶으면 설정 → ⏰ 예약 발행에서 본인 cron-job.org API 키를 저장하고 「내 cron-job.org」를 고르세요. 규칙을 켜면 작업이 자동으로 켜지고, 켜진 규칙이 없으면 자동으로 멈춥니다. 「구글폼 연결」 위쪽 상태 줄에서 전체 일시정지·재개도 할 수 있습니다.",
  },
  {
    q: "예전 vercel.app 주소로 Apps Script를 만들었어요.",
    a: "「구글폼 연결」 카드의 새 웹훅 주소로 스크립트를 다시 붙여넣으면 바로 정상 동작합니다. 옛 주소는 곧 정리될 예정이에요.",
  },
];

const GUIDE_LINKS = [
  { guideId: "1dbea19b-4c83-4453-ae41-0b59d7f27b5f", label: "네이버 메일(SMTP) 연동하기" },
  { guideId: "eb8f5eaf-6ef7-46b8-9b05-994e944fe69a", label: "SOLAPI(알림톡/친구톡) API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHero
        badge="📖 연동 & 사용 매뉴얼"
        title="5분 만에 끝내는 구글폼 자동 응대"
        description="구글폼 등록부터 신청자 자동 안내·운영자 알림까지, 아래 4단계만 따라오시면 됩니다."
      >
        <Link href="/sources" className="mx-btn-primary">
          🔗 구글폼 연결하러 가기
        </Link>
      </PageHero>

      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mx-primary text-2xl">🙋</div>
        <div className="mx-card rounded-tl-none p-4">
          <p className="text-sm leading-relaxed text-mx-text">
            안녕하세요, 접수 도우미예요! 구글폼에 신청이 들어오면 제가 <b>바로 신청자에게 접수 확인</b>을 보내고, 대표님께는{" "}
            <b>텔레그램으로 알려</b> 드려요. 며칠 뒤 안내 문자 같은 <b>팔로우업</b>도 규칙만 정해 두면 알아서 보낼게요.
          </p>
        </div>
      </div>

      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🧭 설정 순서</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {PIPELINE.map((step, idx) => (
            <li key={step.title} className="relative">
              <Link
                href={step.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-4 transition-colors hover:border-mx-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mx-primary text-xs font-bold text-white">{idx + 1}</span>
                  <span className="mx-chip px-2 py-0.5">⏱ {step.time}</span>
                </div>
                <span className="mt-3 text-3xl">{step.icon}</span>
                <span className="mt-2 text-sm font-bold text-mx-text">{step.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-mx-muted">{step.desc}</span>
              </Link>
              {idx < PIPELINE.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-lg text-mx-accent md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-card mb-6">
        <h2 className="mx-section-title">📮 보낼 수 있는 채널</h2>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="mx-table min-w-[520px]">
            <thead>
              <tr>
                <th>채널</th>
                <th>필요한 연결</th>
                <th>쓰임</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((c) => (
                <tr key={c.chip}>
                  <td>
                    <span className="mx-chip-blue">{c.chip}</span>
                  </td>
                  <td className="text-mx-muted">{c.need}</td>
                  <td>{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-4">
          <p className="text-sm font-bold text-[#047857]">💡 TIP</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#065f46]">
            <li>필드 매핑의 질문 제목은 구글폼 질문과 <b>글자·띄어쓰기까지 똑같이</b> 적어야 이름·연락처가 채워져요.</li>
            <li>「접수 후 팔로우업」으로 3일 뒤 안내, 7일 뒤 만족도 조사처럼 단계별 메시지를 만들 수 있어요. 메시지의 {"{name}"}은 신청자 이름으로 바뀝니다.</li>
            <li>처음에는 본인 연락처로 테스트 응답을 보내 실제로 받아 보세요.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <p className="text-sm font-bold text-[#92400e]">⚠️ 꼭 알아 두세요</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-[#78350f]">
            <li>모든 발송은 회원님 <b>본인 발송 계정</b>으로만 나갑니다(운영자 계정 대신 사용 없음).</li>
            <li>문자·카카오·RCS는 실제 요금이 발생해요. 광고성 메시지는 수신 동의를 받은 신청자에게만 보내세요.</li>
            <li>웹훅 주소는 비밀번호처럼 다뤄 주세요. 주소를 아는 사람은 가짜 접수를 넣을 수 있어요.</li>
          </ul>
        </div>
      </div>

      <section className="mx-card mb-6">
        <h2 className="mx-section-title">🔑 발송 계정 연결 매뉴얼</h2>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
          <Link href="/settings" className="mx-btn-primary min-h-[40px] text-xs">
            🔑 지금 계정 연결하기
          </Link>
        </div>
      </section>

      <section className="mx-card">
        <h2 className="mx-section-title">❓ 자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl bg-mx-raised p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-mx-text">
                <span className="mr-1 text-mx-accent group-open:hidden">＋</span>
                <span className="mr-1 hidden text-mx-accent group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-mx-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
