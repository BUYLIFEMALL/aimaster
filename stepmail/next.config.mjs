/** @type {import('next').NextConfig} */
const nextConfig = {
  // 리드 엑셀 업로드(Server Action)가 기본 1MB 제한을 넘을 수 있어(잠재고객 목록이 수천 행이면
  // 파일이 수백 KB~수 MB) 넉넉하게 올려둔다.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
