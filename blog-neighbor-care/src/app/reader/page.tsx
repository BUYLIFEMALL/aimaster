import { redirect } from 'next/navigation';
// v1.16: 확장 팝업 「프로그램 열기 · 연결」과 옛 북마크가 쓰는 주소 — 연결 칸은 설정 화면 맨 위로 옮겼다.
export default function ReaderPage() { redirect('/settings#connection'); }
