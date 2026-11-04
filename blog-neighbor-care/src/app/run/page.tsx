import type { Metadata } from 'next';
import { RunStatus } from './RunStatus';
export const dynamic = 'force-dynamic';
// v1.18 C-2 (6): 확장이 순회용으로 여는 탭. 탭 제목과 화면만 보고도 「자동 실행 중인 탭」임을 알 수 있게 한다.
// 이 주소는 확장이 그대로 있는지 확인하는 기준이므로 화면 안에서 다른 주소로 옮기지 않는다(로그인 확인·이동 없음).
export const metadata: Metadata = { title: '🤖 자동 실행 중 · 이웃 소통' };
export default function RunPage() {
  return <div className="bnc-app"><main className="run-page panel">
    <h1>🤖 자동 실행 중</h1>
    <p className="run-lead"><strong>이 탭을 그대로 두세요.</strong> 확장이 이 탭에서 승인된 이웃 글을 차례로 열어 읽고 공감·댓글을 남깁니다.</p>
    <ul>
      <li>다른 탭이나 다른 프로그램을 써도 됩니다 — 이 탭이 가려지면 잠시 멈췄다가 다시 보이면 이어갑니다.</li>
      <li>브라우저 창을 최소화하거나 이 탭을 닫으면 멈춥니다.</li>
      <li>하루 상한과 동작 시간대 안에서만 실행하고, 결과가 불확실하면 다시 누르지 않습니다.</li>
    </ul>
    <RunStatus />
  </main></div>;
}
