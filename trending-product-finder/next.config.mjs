/** @type {import('next').NextConfig} */
const nextConfig = {
  // 루트("/") 진입은 next/navigation의 redirect()를 쓰는 page.tsx 대신 여기서 처리한다 —
  // 정적으로 프리렌더되는 page.tsx의 redirect()는 일반 HTTP 클라이언트(curl 등)에서
  // Location 헤더 없이 __next_error__ 셸만 내려주는 문제가 있음(stepmail 등에서 먼저
  // 발견/수정한 것과 동일한 버그 클래스라 신규 프로젝트는 처음부터 이 방식으로 만든다).
  // 로그인 여부 체크는 여전히 /watchlist 페이지의 requireProgramAccess()가 담당한다.
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/watchlist",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
