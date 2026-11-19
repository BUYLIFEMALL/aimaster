export * from "./config-none.mjs";
const P = () => globalThis.T.policy;
export const platformSchedulerPolicy = {
  defaultMode: "cronjob",
  choiceColumn: "platform_chosen_at",
  allowed: async (s, u) => { if (P().allowedThrows) throw new Error("권한 조회 실패"); return P().allowed.has(u); },
  listAllowedUserIds: async () => { if (P().listThrows) throw new Error("목록 조회 실패"); return [...P().allowed]; },
};
