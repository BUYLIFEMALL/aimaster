// blog는 자체 배포(blog 프로젝트 루트가 "/")와 AIMaster 루트에 내장된 배포
// (app/(main)/blog/*가 blog 컴포넌트를 직접 import, 실제 경로는 "/blog/*")
// 두 가지 방식으로 서빙된다. 페이지 내부의 절대경로 링크("/posts/1" 등)는
// 어느 쪽으로 서빙되는지에 따라 앞에 "/blog"를 붙여야 할 수도, 아닐 수도 있다.
// 이 함수는 현재 실제로 로드된 URL을 보고 그 접두사를 런타임에 판별한다.
export function getBlogBasePath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname.startsWith("/blog") ? "/blog" : "";
}
