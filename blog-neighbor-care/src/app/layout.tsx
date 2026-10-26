import type { ReactNode } from 'react';
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body style={{ margin: 0, background: '#f4f7fa', color: '#203447', fontFamily: 'system-ui, sans-serif' }}>{children}</body></html>;
}
