import type { Metadata } from 'next'
import './globals.css'
import BlogShell from './_components/BlogShell'

export const metadata: Metadata = {
  title: '티스토리(원문)생성 자동화',
  description: '주제와 참고링크만 제시하면 검색엔진에 최적화된 고품질 기술 블로그 글을 자동으로 생성해 주는 AI 개발자 플랫폼',
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
