// 바코드 값 검사(순수 함수). 바코드 번호 자체는 회원이 GS1 등에서 발급받은 번호를 넣는다 — 여기서는 형식만 본다.

export type CodeType = "none" | "code128" | "ean13" | "qrcode" | "datamatrix";

export const CODE_TYPES: { id: CodeType; label: string; twoD: boolean }[] = [
  { id: "none", label: "넣지 않음", twoD: false },
  { id: "code128", label: "바코드 Code128(영문·숫자)", twoD: false },
  { id: "ean13", label: "바코드 EAN-13(상품 13자리)", twoD: false },
  { id: "qrcode", label: "QR 코드", twoD: true },
  { id: "datamatrix", label: "데이터매트릭스", twoD: true },
];

/** EAN-13 앞 12자리로 마지막 검증 숫자를 계산한다. */
export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error("숫자 12자리가 필요합니다.");
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/** 값이 그 바코드 종류에 맞는지 확인한다. 문제가 없으면 null, 있으면 한국어 안내. */
export function checkCodeValue(type: CodeType, value: string): string | null {
  const v = value.trim();
  if (type === "none") return null;
  if (!v) return "바코드에 넣을 값이 비어 있습니다.";
  if (type === "ean13") {
    if (!/^\d{12,13}$/.test(v)) return "EAN-13은 숫자 12자리 또는 13자리여야 합니다.";
    if (v.length === 13) {
      const expect = ean13CheckDigit(v.slice(0, 12));
      if (Number(v[12]) !== expect) return `마지막 검증 숫자가 맞지 않습니다(계산값 ${expect}). 번호를 다시 확인해 주세요.`;
    }
    return null;
  }
  if (type === "code128") {
    // eslint-disable-next-line no-control-regex
    if (!/^[\x20-\x7e]+$/.test(v)) return "Code128에는 영문·숫자·기호만 넣을 수 있습니다(한글 불가). 한글이 필요하면 QR을 쓰세요.";
    if (v.length > 80) return "Code128 값이 너무 깁니다(80자 이하 권장).";
    return null;
  }
  if (v.length > 1000) return "2차원 코드에 넣을 값이 너무 깁니다(1000자 이하).";
  return null;
}

/** bwip-js 옵션 이름으로 바꾼다. */
export function bwipOptions(type: Exclude<CodeType, "none">, value: string) {
  const text = value.trim();
  if (type === "ean13") return { bcid: "ean13", text, includetext: true, textxalign: "center" as const, scale: 3, height: 12 };
  if (type === "code128") return { bcid: "code128", text, includetext: true, textxalign: "center" as const, scale: 3, height: 12 };
  if (type === "qrcode") return { bcid: "qrcode", text, eclevel: "M", scale: 4 };
  return { bcid: "datamatrix", text, scale: 4 };
}
