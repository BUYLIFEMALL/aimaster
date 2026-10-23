// 받은편지함 서버 동작 시험용 가짜 — 로그인 회원·원래 프로그램 권한·DB·Next 기능.
// 시험마다 app.reset(db)로 초기화. 실제 로그인·DB에는 접속하지 않는다.
export const app = {
  user: { id: "user-1", email: "member@example.com" },
  access: {},
  db: null,
  usage: [],
  reset(db) {
    this.user = { id: "user-1", email: "member@example.com" };
    this.access = { "instagram-comment-reply": true, "threads-comment-reply": true, "youtube-auto-reply": true };
    this.db = db;
    this.usage = [];
  },
};

// next/cache
export const revalidatePath = () => {};
// react (Next 밖에서는 cache가 없어 그대로 실행)
export const cache = (fn) => fn;
// @/lib/access — 받은편지함 권한은 통과한 회원으로 본다(권한 판정 자체는 programAccess 시험 대상 아님)
export const requireProgramAccess = async () => app.user;
export const logProgramUsage = async (p) => void app.usage.push(p);
// @/lib/supabase/server · admin
export const createClient = async () => app.db;
export const createAdminClient = () => app.db;
// @/lib/programAccess — 원래 프로그램 권한
export const checkProgramAccess = async (_db, _userId, slug) => ({ allowed: app.access[slug] === true });
