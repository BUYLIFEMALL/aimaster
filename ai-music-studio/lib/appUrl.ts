// 이 프로그램 운영 주소 — 공급자 웹훅(완료 신호) 주소를 만들 때 쓴다(요청마다 주소를 넘기므로 환경변수 대신 고정).
export const APP_ORIGIN = "https://ai-music-studio.buylife.xyz";
export const webhookUrl = (provider: "fal" | "replicate" | "suno") => `${APP_ORIGIN}/api/webhooks/${provider}`;
