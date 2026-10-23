import type { Metadata } from 'next'
import './globals.css'
import BlogShell from './_components/BlogShell'

export const metadata: Metadata = {
  title: '티스토리 포스팅 자동화',
  description: '본인 원고 생성부터 전용 확장을 통한 티스토리 자동 포스팅과 발행 결과 기록까지 연결하는 블로그 자동화',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        <BlogShell>{children}</BlogShell>
      </body>
    </html>
  )
}
