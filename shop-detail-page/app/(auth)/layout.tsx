export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🖼️</div>
          <h1 className="text-xl font-black text-gray-900">AI 상세페이지 이미지 자동생성기</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
