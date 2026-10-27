import { authorizeMember } from '@/lib/access';
import ReaderConnection from './reader-connection';
import { ProgramShell } from '../../components/ProgramShell';

export const dynamic = 'force-dynamic';
export default async function ReaderPage() {
  let error = '';
  try { const access = await authorizeMember(); if (!access.allowed) error = access.error; }
  catch { error = '연결 서버 준비 상태를 확인해 주세요.'; }
  if (error) return <ProgramShell><section className="panel"><h1>본인 글 읽기 연결</h1>
    <p>{error}</p><a className="primary" href="https://www.buylife.xyz/login">AIMaster 로그인</a></section></ProgramShell>;
  return <ProgramShell><ReaderConnection /></ProgramShell>;
}
