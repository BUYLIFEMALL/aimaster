export * from "./config-none.mjs";
const P = () => globalThis.T.policy;
// 비교용 구성: 판 번호 칸 없이 방식·선택 값만 비교(같은 행 비교·갱신)
export const platformSchedulerPolicy = {
  defaultMode: "cronjob",
  choiceColumn: "platform_chosen_at",
  allowed: async (s, u) => { if (P().allowedThrows) throw new Error("권한 조회 실패"); return P().allowed.has(u); },
  listAllowedUserIds: async () => { if (P().listThrows) throw new Error("목록 조회 실패"); return [...P().allowed]; },
};
