export * from "./config-none.mjs";
const P = () => globalThis.T.policy;
export const platformSchedulerPolicy = {
  defaultMode: "cronjob",
  allowed: async (s, u) => { P().calls.push(["allowed", u]); if (P().allowedThrows) throw new Error("권한 조회 실패"); return P().allowed.has(u); },
  confirmed: async (s, u) => { if (P().confirmedThrows) throw new Error("확인 조회 실패"); return P().confirmed.has(u); },
  markConfirmed: async (s, u) => { if (P().markThrows) throw new Error("기록 실패"); P().confirmed.add(u); },
  listAllowedUserIds: async () => { if (P().listThrows) throw new Error("목록 조회 실패"); return [...P().allowed]; },
};
