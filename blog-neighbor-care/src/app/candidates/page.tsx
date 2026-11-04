import { redirect } from 'next/navigation';
// v1.16: 옛 주소(북마크·안내 보존) → 「이웃」 화면의 후보 찾기 탭.
export default function CandidatesPage() { redirect('/neighbors?tab=candidates'); }
