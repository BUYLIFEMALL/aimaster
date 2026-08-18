/** @type {import('next').NextConfig} */
const nextConfig = {
  // 리드 엑셀 업로드(Server Action)가 기본 1MB 제한을 넘을 수 있어(잠재고객 목록이 수천 행이면
  // 파일이 수백 KB~수 MB) 넉넉하게 올려둔다.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // 루트("/") 진입은 next/navigation의 redirect()를 쓰는 page.tsx 대신 여기서 처리한다 —
  // 정적으로 프리렌더되는 page.tsx의 redirect()는 일반 HTTP 클라이언트(curl 등)에서
  // Location 헤더 없이 __next_error__ 셸만 내려주는 문제가 실제로 발생함(2026-08-18/19
  // buylife.xyz/stepmail 및 stepmail-kappa.vercel.app 루트에서 확인). 로그인 여부 체크는
  // 여전히 /leads 페이지의 requireProgramAccess()가 담당하므로 동작은 동일하다.
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/leads",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
