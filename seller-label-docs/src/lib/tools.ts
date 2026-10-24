// 도구함 목록 — 좌측 메뉴·홈 카드가 함께 쓴다(순서 = 플랜의 구현 순서).
export interface ToolItem {
  href: string;
  emoji: string;
  label: string;
  short: string;
  description: string;
  when: string;
}

export const TOOLS: ToolItem[] = [
  { href: "/label", emoji: "🏷", label: "라벨 인쇄", short: "A4 라벨지 · 엑셀 대량 · 바코드", description: "A4 라벨지에 상품명·주소·바코드·QR·식품 표시사항을 칸마다 채워 인쇄합니다. 엑셀로 칸마다 다른 내용을 한 번에 넣을 수 있습니다.", when: "출고 상품 라벨, 주소 라벨, 식품 한글표시사항" },
  { href: "/qr", emoji: "🔳", label: "QR 만들기", short: "색·모양 · 대비 검사 · PNG/SVG", description: "스토어·리뷰·카카오 채널 주소를 QR로 만들고 색과 점 모양을 꾸밉니다. 휴대폰이 읽을 수 있는 대비인지 바로 알려 드립니다.", when: "포장지·전단·명함에 넣을 QR" },
  { href: "/rename", emoji: "🗂", label: "파일명 일괄 변경", short: "공통 이름 + 순번 → ZIP", description: "상품 사진 여러 장의 이름을 「상품_01, 상품_02…」처럼 한 번에 바꿔 ZIP으로 저장합니다.", when: "상품 사진 등록 준비, 촬영본 정리" },
  { href: "/pdf", emoji: "📄", label: "PDF 정리", short: "사진→PDF · 합치기 · 나누기 · 추출", description: "사진을 PDF로 만들고, 여러 PDF를 합치거나 필요한 페이지만 뽑고 순서를 바꿉니다.", when: "입점 서류, 견적서, 카탈로그 정리" },
  { href: "/sign", emoji: "✍", label: "문서 서명", short: "손글씨·서명 이미지 → PDF·사진", description: "손글씨 서명이나 서명 이미지를 PDF·사진 위 원하는 자리에 넣고, 모든 페이지 같은 자리에 한 번에 찍습니다.", when: "계약서·확인서 날인 표시(법적 전자서명 아님)" },
];
