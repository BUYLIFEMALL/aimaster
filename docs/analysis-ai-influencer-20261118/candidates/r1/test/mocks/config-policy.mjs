export * from "./config-none.mjs";
const P = () => globalThis.T.policy;
// 연결점(권장 구성): 선택 칸 + 판 번호 칸
export const platformSchedulerPolicy = {
  defaultMode: "cronjob",
  choiceColumn: "platform_chosen_at",
  revisionColumn: "mode_rev",
  allowed: async (s, u) => { if (P().allowedThrows) throw new Error("권한 조회 실패"); return P().allowed.has(u); },
  listAllowedUserIds: async () => { if (P().listThrows) throw new Error("목록 조회 실패"); return [...P().allowed]; },
};
