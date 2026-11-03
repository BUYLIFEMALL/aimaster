// 동의 문구(2026-11-03 주인님 확인, docs/CONSENT_DRAFT_20261103.md A·B). 문구를 바꾸면 판을 올린다(이미 받은 동의는 옛 판으로 남음).
export const CONSENT_VERSION = "consent-v1";

export const DEAL_TYPES = ["매매", "전세", "월세"] as const;
export type DealType = (typeof DEAL_TYPES)[number];
export const PROPERTY_TYPES = ["아파트", "빌라·주택", "오피스텔", "상가", "사무실", "토지", "기타"] as const;
export const CONSENT_METHODS = ["전화", "방문", "문자", "서면"] as const; // 수기 입력 때(링크 접수는 「링크」)
export const CLIENT_STATUSES = ["상담 중", "보류", "계약", "종료"] as const;

export function collectionConsentItems(officeName: string) {
  return [
    { label: "수집·이용 목적", text: "원하시는 조건에 맞는 매물 상담과 연락" },
    { label: "수집 항목", text: "이름, 휴대폰 번호, 원하는 거래(매매·전세·월세)·지역·유형·예산·면적·입주 시기, 남기신 메모" },
    { label: "보유·이용 기간", text: "마지막 상담일부터 1년. 그 뒤 자동으로 지웁니다. 언제든 삭제를 요청하실 수 있습니다." },
    { label: "동의를 거부할 권리", text: "동의하지 않으셔도 됩니다. 다만 동의하지 않으시면 이 화면으로 상담을 신청하실 수 없고, 전화·방문 상담은 그대로 가능합니다." },
    { label: "처리를 맡긴 곳", text: `${officeName}은(는) 고객 명부 보관을 Buylife(부동산 고객관리 프로그램)에 맡기고, 문자는 ${officeName}의 SOLAPI 계정으로 보냅니다. 맡은 곳은 이 목적 밖으로 쓰지 않습니다.` },
  ];
}

export const OPTIONAL_FIELDS_NOTE = "필수 항목(이름·휴대폰·거래 종류) 밖의 칸은 비워 두셔도 됩니다.";

export function adConsentText(officeName: string) {
  return `(선택) ${officeName}이(가) 조건에 맞는 매물 안내 문자(광고)를 보내는 것에 동의합니다. 동의하지 않으셔도 상담은 그대로 받으실 수 있습니다. 밤 9시~아침 8시에는 보내지 않고, 받은 뒤에도 문자 안 링크로 언제든 무료로 그만 받을 수 있습니다.`;
}

/** 휴대폰 번호 → 010-1234-5678. 휴대폰이 아니면 null */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(d)) return null;
  return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** 「8억」「5000」「3.5억」 → 만 원. 비면 null, 읽지 못하면 NaN */
export function parseManwon(raw: string): number | null {
  const s = raw.replace(/[,\s원]/g, "");
  if (!s) return null;
  const m = s.match(/^(?:(\d+(?:\.\d+)?)억)?(?:(\d+)(?:만)?)?$/);
  if (!m || (!m[1] && !m[2])) return Number.NaN;
  return Math.round((m[1] ? Number(m[1]) * 10000 : 0) + (m[2] ? Number(m[2]) : 0));
}
