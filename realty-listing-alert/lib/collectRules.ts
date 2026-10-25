// 수집 규칙(인수인계 §10) — 네이버 화면·응답이 바뀌면 확장 재설치 없이 이 값만 고쳐 배포한다.
// 0단계 사전 검증(PREVALIDATION_20261024.md)에서 확인한 값. 서버는 이 규칙을 내려보내기만 하고 네이버에 요청하지 않는다.
import { MAX_COMPLEXES_PER_RUN, MAX_PAGES_PER_DAY, SCHEDULE_JITTER } from "@/lib/limits";

export const COLLECT_RULES = {
  version: "2026-10-25.4",
  // 수집량 상한(2026-10-25 주인님 지시) — 값은 lib/limits.ts
  maxComplexesPerRun: MAX_COMPLEXES_PER_RUN,
  maxPagesPerDay: MAX_PAGES_PER_DAY,
  scheduleJitter: SCHEDULE_JITTER,
  complexUrl: "https://new.land.naver.com/complexes/{complexNo}",
  listPathIncludes: "/api/articles/complex/",
  fields: { list: "articleList", more: "isMoreData", price: "dealOrWarrantPrc", rent: "rentPrc" },
  maxPagesPerTarget: 10,
  scrollWaitMs: [2000, 5000],
  betweenTargetsMs: [10000, 30000],
  firstLoadWaitMs: 8000,
  // 중개사 번호(2026-10-25 주인님 결정 「사무실 + 휴대폰, 없으면 빈칸」): 새·가격 변동 매물만 상세를 읽는다. 서버에는 보내지 않는다.
  detail: {
    url: "https://new.land.naver.com/api/articles/{articleNo}?complexNo={complexNo}",
    office: ["realtorPhone", "representativeTelNo", "realtorTelNo"],
    mobile: ["cellPhoneNo", "realtorCellPhoneNo"],
    maxPerRun: 20,
    waitMs: [1000, 2000],
  },
  // 지역(동) 감시(2026-10-25): 동 번호로 단지 목록 → 매물 많은 순 상위 N곳. 첫 실물 시험에서 주소·칸 이름 확인(진단 기록).
  region: {
    pageUrl: "https://new.land.naver.com/complexes",
    listUrl: "https://new.land.naver.com/api/regions/complexes?cortarNo={cortarNo}&realEstateType=APT%3AABYG%3AJGC&order=",
    fields: { list: "complexList", no: "complexNo", name: "complexName", counts: ["dealCount", "leaseCount", "rentCount"] },
  },
} as const;
