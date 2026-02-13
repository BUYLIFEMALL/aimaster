const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.buylife.xyz";

/** 공통 이메일 레이아웃 */
function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- 헤더 -->
<tr><td style="padding:24px 32px;text-align:center;">
  <a href="${APP_URL}" style="text-decoration:none;">
    <span style="display:inline-block;background:linear-gradient(135deg,#d4af37,#f5c842);color:#000;font-weight:900;font-size:14px;padding:8px 12px;border-radius:8px;margin-right:8px;">AI</span>
    <span style="background:linear-gradient(135deg,#d4af37,#f5c842);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;font-size:22px;">AI Master</span>
  </a>
</td></tr>

<!-- 본문 -->
<tr><td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px 32px;">
  ${body}
</td></tr>

<!-- 푸터 -->
<tr><td style="padding:24px 32px;text-align:center;">
  <p style="color:#a0a0b0;font-size:12px;margin:0 0 8px;">
    &copy; ${new Date().getFullYear()} AI Master. All rights reserved.
  </p>
  <p style="margin:0;">
    <a href="${APP_URL}" style="color:#d4af37;font-size:12px;text-decoration:none;">www.buylife.xyz</a>
    &nbsp;|&nbsp;
    <a href="${APP_URL}/support" style="color:#d4af37;font-size:12px;text-decoration:none;">고객지원</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** 골드 버튼 */
function goldButton(text: string, href: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 0;">
    <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#f5c842);color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">${text}</a>
  </td></tr></table>`;
}

/** 정보 행 */
function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;color:#a0a0b0;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
    <td style="padding:10px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">${value}</td>
  </tr>`;
}

// ─── 템플릿들 ───────────────────────────────────────────

export interface WelcomeData {
  name: string;
  affiliateCode: string;
}

export function welcomeEmail(data: WelcomeData) {
  const body = `
    <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">
      환영합니다, <span style="color:#d4af37;">${data.name}</span>님!
    </h1>
    <p style="color:#a0a0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">
      AI Master에 가입해 주셔서 감사합니다.<br/>
      AI 기반 마케팅 자동화 도구로 비즈니스를 성장시키세요.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:16px;">
    <tr><td style="padding:12px 16px;">
      <p style="color:#a0a0b0;font-size:12px;margin:0 0 4px;">나의 추천 코드</p>
      <p style="color:#d4af37;font-size:20px;font-weight:800;margin:0;letter-spacing:2px;">${data.affiliateCode}</p>
      <p style="color:#a0a0b0;font-size:12px;margin:4px 0 0;">추천 링크를 공유하고 수수료를 받으세요!</p>
    </td></tr>
    </table>

    ${goldButton("프로그램 둘러보기", `${APP_URL}/programs`)}
  `;

  return {
    subject: "[AI Master] 회원가입을 환영합니다!",
    html: layout("AI Master 회원가입", body),
  };
}

export interface PaymentData {
  name: string;
  programName: string;
  planName: string;
  billingType: string;
  amount: number;
  orderId: string;
  paidAt: string;
  expiresAt: string | null;
}

const BILLING_LABELS: Record<string, string> = {
  monthly: "월간",
  biannual: "반기",
  annual: "연간",
  lifetime: "평생",
};

export function paymentEmail(data: PaymentData) {
  const amountStr = new Intl.NumberFormat("ko-KR").format(data.amount) + "원";
  const paidDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(data.paidAt));
  const expiryDate = data.expiresAt
    ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(data.expiresAt))
    : "평생 이용";

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.2);line-height:56px;font-size:28px;">✓</div>
    </div>
    <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;text-align:center;">
      결제가 완료되었습니다
    </h1>
    <p style="color:#a0a0b0;font-size:15px;text-align:center;margin:0 0 32px;">
      ${data.name}님, 결제해 주셔서 감사합니다.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("프로그램", data.programName)}
      ${infoRow("플랜", `${data.planName} (${BILLING_LABELS[data.billingType] || data.billingType})`)}
      ${infoRow("결제 금액", amountStr)}
      ${infoRow("결제일시", paidDate)}
      ${infoRow("이용 기간", expiryDate)}
      ${infoRow("주문번호", data.orderId)}
    </table>

    ${goldButton("대시보드에서 확인하기", `${APP_URL}/dashboard`)}

    <p style="color:#a0a0b0;font-size:12px;text-align:center;margin:24px 0 0;">
      결제 관련 문의는 <a href="${APP_URL}/support" style="color:#d4af37;text-decoration:none;">고객지원</a>을 이용해주세요.
    </p>
  `;

  return {
    subject: `[AI Master] 결제 완료 - ${data.programName}`,
    html: layout("결제 완료", body),
  };
}

export interface ExpiryReminderData {
  name: string;
  programName: string;
  planName: string;
  expiresAt: string;
  daysLeft: number;
}

export function expiryReminderEmail(data: ExpiryReminderData) {
  const expiryDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  }).format(new Date(data.expiresAt));

  const urgencyColor = data.daysLeft <= 3 ? "#ef4444" : "#f59e0b";

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.2);line-height:56px;font-size:28px;">⏰</div>
    </div>
    <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;text-align:center;">
      구독 만료 <span style="color:${urgencyColor};">D-${data.daysLeft}</span>
    </h1>
    <p style="color:#a0a0b0;font-size:15px;text-align:center;margin:0 0 32px;">
      ${data.name}님, 구독이 곧 만료됩니다.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:4px;">
      ${infoRow("프로그램", data.programName)}
      ${infoRow("플랜", data.planName)}
      ${infoRow("만료일", expiryDate)}
      ${infoRow("남은 기간", `${data.daysLeft}일`)}
    </table>

    <p style="color:#a0a0b0;font-size:14px;text-align:center;margin:24px 0 0;">
      구독을 갱신하여 서비스를 계속 이용하세요.
    </p>
    ${goldButton("구독 갱신하기", `${APP_URL}/programs`)}
  `;

  return {
    subject: `[AI Master] 구독 만료 D-${data.daysLeft} - ${data.programName}`,
    html: layout("구독 만료 알림", body),
  };
}

export interface SupportInquiryData {
  name: string;
  email: string;
  type: string;
  message: string;
}

/** 관리자에게 보내는 문의 접수 알림 */
export function supportInquiryEmail(data: SupportInquiryData) {
  const body = `
    <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">
      새 문의가 접수되었습니다
    </h1>
    <p style="color:#a0a0b0;font-size:15px;margin:0 0 24px;">
      아래 내용을 확인하고 답변해 주세요.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("이름", data.name)}
      ${infoRow("이메일", data.email)}
      ${infoRow("문의 유형", data.type)}
    </table>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#a0a0b0;font-size:12px;margin:0 0 8px;">문의 내용</p>
      <p style="color:#fff;font-size:14px;line-height:1.8;margin:0;white-space:pre-wrap;">${data.message}</p>
    </div>

    ${goldButton("이메일로 답변하기", `mailto:${data.email}?subject=Re: [AI Master] ${data.type}`)}
  `;

  return {
    subject: `[AI Master 문의] ${data.type} - ${data.name}`,
    html: layout("고객 문의", body),
  };
}

/** 고객에게 보내는 문의 접수 확인 */
export function supportConfirmEmail(data: SupportInquiryData) {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.2);line-height:56px;font-size:28px;">✓</div>
    </div>
    <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;text-align:center;">
      문의가 접수되었습니다
    </h1>
    <p style="color:#a0a0b0;font-size:15px;text-align:center;margin:0 0 32px;">
      ${data.name}님, 빠른 시일 내에 답변 드리겠습니다.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow("문의 유형", data.type)}
    </table>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;">
      <p style="color:#a0a0b0;font-size:12px;margin:0 0 8px;">내가 보낸 문의</p>
      <p style="color:#fff;font-size:14px;line-height:1.8;margin:0;white-space:pre-wrap;">${data.message}</p>
    </div>

    <p style="color:#a0a0b0;font-size:12px;text-align:center;margin:24px 0 0;">
      평일 24시간 이내에 답변 드리겠습니다.
    </p>
  `;

  return {
    subject: `[AI Master] 문의가 접수되었습니다`,
    html: layout("문의 접수 확인", body),
  };
}
