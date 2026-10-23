'use client'
import { useState } from 'react'

const steps = [
  ['원고 저장', '본인 원고의 제목·본문·이미지·발행 설정을 확인합니다.', '이미지가 빠졌거나 부분 입력이면 자동 발행하지 않습니다. 웹에서 검토한 원고를 사용하세요.'],
  ['블로그 연결', '설정에서 발급한 본인 토큰과 실제 블로그 이름을 확장에 저장합니다.', '확장은 로그인된 본인 블로그의 새 빈 탭만 사용합니다. 기존에 작성 중인 탭은 입력 대상으로 쓰지 않습니다.'],
  ['자동 포스팅', '공개 범위·현재 발행을 확인한 뒤 자동 포스팅 시작을 한 번 누릅니다.', '실행 원고는 수정·삭제·재전송이 잠깁니다. 예약 설정은 기존 입력 준비를 사용할 수 있으며 이번 자동 포스팅은 즉시 발행입니다.'],
  ['실제 결과 확인', '웹 원고의 실제 발행 완료·게시 URL·발행 시각을 확인합니다.', '결과가 불확실하면 확장의 마지막 발행 결과만 다시 확인을 실행합니다. 최종 버튼과 원고 입력을 다시 실행하지 않습니다.'],
]
export default function AutoPublishGuide() {
  const [step, setStep] = useState(0), [notice, setNotice] = useState('')
  const rule = '본인 원고 검토 → 실제 블로그·공개 범위 확인 → 자동 포스팅 1회 → 실제 URL·서버 발행 기록 확인. 결과가 불확실하면 재발행하지 않고 결과만 다시 확인.'
  return <section className="my-8 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" aria-label="티스토리 자동 포스팅 사용 안내">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">🚀 확장 자동 포스팅</h2><span className="text-sm">⏱ 약 3분 · 발행 기능 무료 / AI 생성 별도</span><a className="text-orange-700 underline" href="/settings">본인 연동·최신 확장 열기 ↗</a></div>
    <div className="mb-4 rounded-xl bg-orange-50 p-5"><h3 className="font-bold">원고에서 실제 게시 URL까지</h3><p className="mt-2 text-sm">입력·발행 설정 확인 후 마지막 발행을 한 번 진행하고, 실제 게시 결과를 회원 원고에 기록합니다.</p></div>
    <div className="grid grid-cols-2 gap-2" aria-label="자동 포스팅 4단계">{steps.map((item, i) => <button key={item[0]} type="button" aria-pressed={step === i} onClick={() => setStep(i)} className={`rounded-xl border p-3 font-bold ${step === i ? 'bg-orange-600 text-white' : 'border-orange-200 bg-orange-50 text-orange-800'}`}>STEP {i + 1}<br />{item[0]}</button>)}</div>
    <div className="my-5 space-y-2" aria-live="polite"><h3 className="font-bold">{step + 1}. {steps[step][0]}</h3><p>{steps[step][1]}</p><p className="text-sm text-slate-600">{steps[step][2]}</p></div>
    <div className="rounded-xl border bg-slate-50 p-4"><code className="text-sm">{rule}</code><button type="button" className="ml-3 rounded border bg-white px-3 py-1" onClick={async () => { try { await navigator.clipboard.writeText(rule); setNotice('자동 포스팅 규칙을 복사했습니다.') } catch { setNotice('규칙을 직접 선택해 복사해 주세요.') } }}>규칙 복사</button><p role="status" className="mt-2 text-sm">{notice}</p></div>
    <p className="my-3 rounded-lg bg-green-50 p-3 text-sm">💡 발행 기록 새로고침은 서버의 실제 결과만 읽습니다. 새 원고는 기존 원고를 복제해 만들 수 있으며 최초 30일 보관 기한은 유지됩니다.</p>
    <p className="my-3 rounded-lg bg-amber-50 p-3 text-sm">⚠️ 공개 자동 포스팅은 실제 공개 게시입니다. 입력 준비 완료와 실제 발행 완료를 구분하세요. 보호글 비밀번호 자동 입력은 지원하지 않습니다.</p>
    <a className="inline-block rounded-lg bg-orange-600 px-4 py-2 font-bold text-white" href="https://www.tistory.com/" target="_blank" rel="noreferrer">티스토리 로그인·내 블로그 열기 ↗</a>
  </section>
}
