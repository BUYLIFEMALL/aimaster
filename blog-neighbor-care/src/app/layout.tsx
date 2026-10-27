import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'AI 블로그 이웃 소통 자동화', description: '내 글을 분석하고, 근거를 확인하며 이웃 후보를 선택합니다.' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body style={{ margin: 0, background: '#f4f7fa', color: '#203447', fontFamily: 'system-ui, sans-serif' }}>{children}</body></html>;
}
