// BLOG는 2026-10-01부터 자체 Vercel 프로젝트(ai-auto-blog.vercel.app)로 단독 배포된다.
// 예전엔 www.buylife.xyz/blog 아래에 루트 앱에 내장돼 서빙돼서, 현재 주소가 "/blog"로
// 시작하는지 보고 링크 앞에 "/blog"를 붙였다. 지금은 루트의 /blog/* 주소가 새 주소로
// 넘겨지므로(루트 next.config.mjs redirects) 항상 접두사가 없다. 호출부가 많아 함수는 남겨둔다.
export function getBlogBasePath(): string {
  return "";
}

// 로그인은 이 앱의 /auth 화면에서 한다(AIMaster와 같은 Supabase 계정, 회원가입은 AIMaster에서만).
export function getBlogAuthPath(): string {
  return "/auth";
}
