// 선택 칸 이름이 빠진 연결점 — 이때 Vercel은 누구에게도 열리지 않아야 한다
export * from "./config-none.mjs";
const P = () => globalThis.T.policy;
export const platformSchedulerPolicy = {
  defaultMode: "cronjob",
  allowed: async (s, u) => P().allowed.has(u),
  listAllowedUserIds: async () => [...P().allowed],
};
