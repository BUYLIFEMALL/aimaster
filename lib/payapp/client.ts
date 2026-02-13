/**
 * 페이앱(PayApp) API 클라이언트
 * API 문서: https://payapp.kr/dev/
 *
 * 결제 흐름:
 * 1. 서버 → 페이앱: 결제 요청 (payreq) → bill_id, url 수신
 * 2. 클라이언트: 팝업으로 url 열기
 * 3. 결제 완료 → 페이앱 → 서버 webhook (callbackurl)
 * 4. 서버: 결제 검증 후 구독 생성
 */

const PAYAPP_API_URL = "https://api.payapp.kr/oapi/apiLoad.php";

export interface PayappRequestParams {
  cmd: "payreq";
  userid: string;         // 페이앱 회원 아이디
  goodname: string;       // 상품명
  price: number;          // 결제 금액 (원)
  recvphone: string;      // 구매자 연락처 (없으면 "01000000000")
  orderid: string;        // 주문번호 (고유값)
  callbackurl: string;    // 웹훅 URL
  returnurl: string;      // 결제 완료 후 이동 URL
  feedbackurl?: string;   // 결제창 닫힐 때 호출
  memo?: string;          // 메모
}

export interface PayappResponse {
  state: number;          // 1: 성공
  errorCode: string;
  errorMsg: string;
  bill_id?: string;       // 결제 고유 ID
  url?: string;           // 결제창 URL
}

export interface PayappWebhookData {
  userid: string;
  goodname: string;
  price: string;
  bill_id: string;
  pay_id: string;
  recvphone: string;
  buyerphone: string;
  memo: string;
  orderid: string;
  pay_type: string;       // CARD, BANK, PHONE 등
  feedback: string;       // "0" or error
}

/**
 * 페이앱 결제 요청
 * 서버에서만 호출 (Server Action / API Route)
 */
export async function createPayappPayment(params: Omit<PayappRequestParams, "cmd" | "userid">) {
  const memberId = process.env.PAYAPP_MEMBER_ID;
  const secretKey = process.env.PAYAPP_SECRET_KEY;

  if (!memberId || !secretKey || memberId === "your_payapp_member_id") {
    throw new Error("페이앱 계정 정보가 설정되지 않았습니다. .env.local을 확인하세요.");
  }

  const body = new URLSearchParams({
    cmd: "payreq",
    userid: memberId,
    goodname: params.goodname,
    price: String(params.price),
    recvphone: params.recvphone || "01000000000",
    orderid: params.orderid,
    callbackurl: params.callbackurl,
    returnurl: params.returnurl,
    ...(params.feedbackurl ? { feedbackurl: params.feedbackurl } : {}),
    ...(params.memo ? { memo: params.memo } : {}),
  });

  const res = await fetch(PAYAPP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();

  // 페이앱 응답: "state=1&errorCode=&errorMsg=&bill_id=XXX&url=https://..."
  const result: Record<string, string> = {};
  text.split("&").forEach((pair) => {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  });

  if (result.state !== "1") {
    throw new Error(`페이앱 오류 [${result.errorCode}]: ${result.errorMsg}`);
  }

  return {
    billId: result.bill_id,
    paymentUrl: result.url,
  };
}

/**
 * 페이앱 결제 검증
 * 웹훅 수신 후 서버에서 검증
 */
export async function verifyPayappPayment(billId: string) {
  const memberId = process.env.PAYAPP_MEMBER_ID;

  const body = new URLSearchParams({
    cmd: "paycheck",
    userid: memberId!,
    bill_id: billId,
  });

  const res = await fetch(PAYAPP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  const result: Record<string, string> = {};
  text.split("&").forEach((pair) => {
    const [k, v] = pair.split("=");
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  });

  return {
    isValid: result.state === "1",
    payStatus: result.pay_state, // "1": 결제완료
    price: parseInt(result.price || "0"),
    goodname: result.goodname,
    orderid: result.orderid,
  };
}

/**
 * 구독 만료일 계산
 */
export function calcExpiresAt(billingType: string): Date | null {
  const now = new Date();
  switch (billingType) {
    case "monthly":   { const d = new Date(now); d.setDate(d.getDate() + 30);  return d; }
    case "biannual":  { const d = new Date(now); d.setDate(d.getDate() + 180); return d; }
    case "annual":    { const d = new Date(now); d.setDate(d.getDate() + 365); return d; }
    case "lifetime":  return null;
    default:          { const d = new Date(now); d.setDate(d.getDate() + 30);  return d; }
  }
}
