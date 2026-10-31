import type { ReactNode } from "react";
import { requireProgramAccess } from "@/lib/access";
import { deleteProxyAction, deleteWingKeysAction } from "@/lib/actions/connection";
import { alertStatus } from "@/lib/actions/dailyAlert";
import { CronForm, KakaoForm, ResendForm, TelegramForm } from "@/components/AlertKeysPanel";
import { AiKeyForm } from "@/components/AiKeyForm";
import { ConnectionTest } from "@/components/ConnectionTest";
import { KeyExpiryForm } from "@/components/KeyExpiryForm";
import { GuideLinkButton } from "@/components/PlatformLinks";
import { ProxyKeyForm } from "@/components/ProxyKeyForm";
import { ConfirmButton, SetupTable } from "@/components/SetupTable";
import { Notice, PageHeader } from "@/components/ui/PageHeader";
import { WingKeyForm } from "@/components/WingKeyForm";
import { keyExpiryNotice } from "@/lib/coupang/prefs";
import { getAiKeyStatus, getAiModels, getKeyExpiry, getProxyStatus, getWingKeyStatus } from "@/lib/data";

// 구성 기준 realty-listing-alert /settings(2026-10-31 주인님 「이렇게 바꿔」). 필수·선택 칸 + 표, 입력은 줄 아래에 펼친다.
// platform_guides.id — 이 프로그램이 쓰는 플랫폼의 공개 매뉴얼(지침 CLAUDE.md 「API키등록·플랫폼연동 페이지 표준」)
const GUIDE_LINKS = [
  { guideId: "34c7fcab-7456-479c-bf0e-85a812489342", label: "쿠팡 WING Open API 키 발급받기" },
  { guideId: "a72978fc-193e-4895-9cb5-5157cc54b690", label: "Fixie 고정 IP 만들기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Claude API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Gemini API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
  { guideId: "3c66cf94-db5f-480f-b9d1-f53fbde82ffc", label: "Resend 메일 키 발급받기" },
  { guideId: "4042a4b3-e573-4baa-8f70-103f52b1cbbd", label: "카카오 연동하기" },
];

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ no, required, title, sub, children }: { no: string; required?: boolean; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="lab-card space-y-3 border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white ${required ? "bg-blue-700" : "bg-slate-400"}`}>{no} {required ? "필수" : "선택"}</span>
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {sub && <span className="text-[13px] text-slate-500">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ kakao?: string; kakao_error?: string }> }) {
  const q = await searchParams;
  const user = await requireProgramAccess();
  const [status, aiKeys, proxy, expiry, aiModels, alerts] = await Promise.all([
    getWingKeyStatus(user.id),
    getAiKeyStatus(user.id),
    getProxyStatus(user.id),
    getKeyExpiry(user.id).catch(() => ""),
    getAiModels(user.id).catch(() => ({})),
    alertStatus(user.id),
  ]);
  const expiryNotice = keyExpiryNotice(expiry, Date.now());

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔑" title="API키등록·플랫폼연동" description="연결·키 등록은 모두 여기서 합니다. 켜고 끄는 것은 각 기능 화면에서 합니다. 모든 키는 내 계정에만 저장되고 화면에는 끝 4자리만 보입니다." />

      {expiryNotice && <Notice tone="warn">🔑 {expiryNotice.text}</Notice>}
      {q.kakao === "connected" && <Notice tone="tip">✅ 카카오를 연결했습니다. 카카오톡 줄의 시험 메시지로 확인해 주세요.</Notice>}
      {q.kakao_error && <Notice tone="warn">❌ {q.kakao_error}</Notice>}

      <Step no="1" required title="🛒 쿠팡 연결">
        <SetupTable
          rows={[
            {
              id: "wing-card",
              name: "🔑 WING 키",
              sub: "쿠팡 판매 계정",
              on: status.saved,
              info: status.saved ? `${status.shown.vendorId} · ••••${String(status.shown.accessKey ?? "").slice(-4)} · ${status.shown.wingUserId} · 만료 ${expiry || "미입력"}` : "업체코드·Access Key·Secret Key·WING 로그인 ID",
              quick: status.saved ? <ConfirmButton label="삭제" action={deleteWingKeysAction} /> : undefined,
              issue: { href: "https://wing.coupang.com" },
              detail: (
                <>
                  <p className="text-[13px] text-slate-600">WING 「판매자정보 → 추가판매정보 → OPEN API 키 발급」의 값을 넣어 주세요. 연동 방식은 「자체개발」입니다.</p>
                  <WingKeyForm saved={status.saved} />
                  {status.saved && <KeyExpiryForm key={expiry} expiry={expiry} />}
                </>
              ),
            },
            {
              id: "proxy-card",
              name: "🛡 내 고정 IP",
              sub: "Fixie",
              on: !!proxy,
              info: proxy || "쿠팡은 WING에 등록한 IP에서 온 요청만 받습니다",
              quick: proxy ? <ConfirmButton label="삭제" action={deleteProxyAction} /> : undefined,
              issue: { href: "https://app.usefixie.com/" },
              detail: (
                <>
                  <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-700">
                    <li><a href="https://usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Fixie 가입 ↗</a> 후 HTTP/HTTPS 프록시를 만듭니다(무료 월 500회).</li>
                    <li><a href="https://app.usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Fixie 대시보드 ↗</a>에서 프록시 주소와 고정 IP 2개를 확인합니다.</li>
                    <li>프록시 주소를 아래에 저장합니다. 모양: <code className="rounded bg-slate-100 px-1 text-xs">http://fixie:토큰@내주소.usefixie.com:80</code></li>
                    <li>WING 연동 정보에서 연동 방식 「자체개발」을 고르고 고정 IP 2개를 하나씩 추가합니다.</li>
                  </ol>
                  <ProxyKeyForm shown={proxy} />
                </>
              ),
            },
            {
              id: "test-card",
              name: "🔌 연결 시험",
              sub: "읽기만 합니다",
              on: status.saved && !!proxy,
              onLabel: "시험 가능",
              offLabel: "키 필요",
              info: "내 출고지·반품지 목록을 읽어 키와 IP가 맞는지 확인합니다",
              openLabel: "시험",
              detail: <ConnectionTest saved={status.saved} />,
            },
          ]}
        />
      </Step>

      <Step no="2" title="📮 아침 요약 받을 곳" sub="쓰실 곳만 연결. 켜고 끄기는 「아침 요약 알림」에서">
        <SetupTable
          head={["받는 곳", "상태", "연결 정보"]}
          rows={[
            { id: "telegram-card", name: "✈️ 텔레그램", on: !!alerts.telegram, info: alerts.telegram ? `@${alerts.telegram}` : "내 봇으로 받습니다", issue: { href: "https://t.me/BotFather" }, detail: <TelegramForm status={alerts} /> },
            { id: "email-card", name: "✉️ 이메일", sub: "Resend", on: alerts.ready.email, info: alerts.resendKeySaved ? `키 등록됨 · ${alerts.emailTo}` : "내 Resend 키로 받습니다", issue: { href: "https://resend.com/api-keys" }, detail: <ResendForm status={alerts} /> },
            { id: "kakao-card", name: "💬 카카오톡", sub: "나와의 채팅", on: alerts.kakaoOk, onLabel: "✓ 연결됨", offLabel: "연결 전", info: alerts.kakaoOk ? alerts.kakaoNickname || "카카오 계정" : alerts.kakaoMessage, issue: { href: "https://developers.kakao.com/console/app" }, detail: <KakaoForm status={alerts} /> },
            { id: "cron-card", name: "⏰ 예약 키", sub: "cron-job.org", on: alerts.cronKeySaved, info: alerts.cronKeySaved ? "저장됨" : "매일 정한 시각에 요약을 실행합니다", issue: { href: "https://console.cron-job.org/settings" }, detail: <CronForm status={alerts} /> },
          ]}
        />
      </Step>

      <Step no="3" title="🤖 AI 모델 키" sub="OpenAI / Claude / Gemini · 쓰실 것만">
        <p className="text-[13px] text-slate-600">다른 프로그램에 등록한 키를 그대로 씁니다. 사용량은 내 키에 청구되며, 키와 모델은 「수정」으로 바꿉니다.</p>
        <AiKeyForm shown={aiKeys} models={aiModels} />
      </Step>

      <section className="lab-card space-y-3 border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-extrabold text-slate-900">📖 연동 매뉴얼</h2>
        <p className="text-[13px] text-slate-600">누르면 작은 창으로 열립니다. 이 화면 옆에 두고 따라 하세요.</p>
        <div className="flex flex-wrap gap-2">{GUIDE_LINKS.map((g) => <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />)}</div>
      </section>
    </div>
  );
}
