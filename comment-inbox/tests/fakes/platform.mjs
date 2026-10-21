// 가짜 계정 읽기·토큰·플랫폼 호출·키 조회 — 시험마다 fake.reset()으로 초기화.
// 플랫폼 호출은 실제처럼 잠깐 기다린 뒤(동시 요청이 겹치도록) 호출 횟수를 센다.
export const fake = {
  calls: 0,
  failNext: false,
  account: { access_token: "tok", token_expires_at: null, username: "me", instagram_user_id: "ig-me", threads_user_id: "th-me" },
  reset() {
    this.calls = 0;
    this.failNext = false;
    this.account = { access_token: "tok", token_expires_at: null, username: "me", instagram_user_id: "ig-me", threads_user_id: "th-me" };
  },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function platformCall(kind) {
  await wait(20);
  if (fake.failNext) {
    fake.failNext = false;
    throw new Error(`가짜 ${kind} 실패`);
  }
  fake.calls += 1;
  return `${kind}-${fake.calls}`;
}

// 계정 읽기(memberAccount)
export const getCommentAccount = async () => (await wait(5), fake.account);
export const getReplyAccount = async () => (await wait(5), fake.account);
export const getYtReplyAccount = async () => (await wait(5), fake.account);
export const getDmAccount = async () => (await wait(5), fake.account);

// 토큰(token)
export const getValidInstagramAccessToken = async () => "tok";
export const getValidThreadsAccessToken = async () => "tok";
export const getValidYoutubeAccessToken = async () => "tok";

// 플랫폼 호출(client)
export const postInstagramCommentReply = async () => ({ replyId: await platformCall("ig") });
export const postThreadsCommentReply = async () => ({ replyId: await platformCall("th") });
export const postCommentReply = async () => ({ replyId: await platformCall("yt") });
export const sendInstagramDirectMessage = async () => ({ messageId: await platformCall("dm") });

// 키 조회(apiKeys)
export const getUserApiKey = async () => "key";
export const resolveApiKey = async () => "key";
