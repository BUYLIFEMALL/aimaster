// 디자인 빌더 D5-4 — 몰 종류별 디자인 편집 범위(잠금) 판정 한 곳(node --test 대상, DB 없음)
// 플랜 §3-3: 분양몰도 테마·템플릿·첫 화면·헤더 메뉴(결정 4)·목록/상세 표시는 고친다.
// 바닥글 판매자(사업자) 정보는 모든 몰에서 디자인으로 못 지운다(shop-frame.tsx가 늘 그림).
// 분양몰만 추가로: 무통장 입금 계좌 보이기는 결제 안내라 본사가 정한다(늘 보임).
// 몰 종류·모듈이 늘면 이 표 한 줄만 고친다(백엔드가 알림 — 상호 인수인계 S2).
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import type { FooterDesign } from "./frame.ts";

export type DesignPolicy = {
  /** 바닥글 「무통장 입금 계좌」 칸을 고칠 수 있는가 */
  footerBank: boolean;
  /** 편집 화면 위에 보여 줄 안내(잠긴 칸이 있을 때) */
  notes: string[];
};

const OPEN: DesignPolicy = { footerBank: true, notes: [] };

export function designPolicy(store: { kind?: string | null }): DesignPolicy {
  if (store.kind === "resale") {
    return { footerBank: false, notes: ["분양몰입니다 — 바닥글의 판매자 정보와 입금 계좌는 본사가 정하는 영역이라 바꿀 수 없습니다."] };
  }
  return OPEN;
}

/** 저장 직전 잠긴 칸을 정책 값으로 되돌린다(화면을 우회해 보내도 서버에서 막음) */
export function enforceFooter(policy: DesignPolicy, footer: FooterDesign): FooterDesign {
  return policy.footerBank ? footer : { ...footer, show_bank: true };
}
