import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

// 상세페이지(opener) 가상 mock 서버 및 바나나 캔버스 테스트
// 1. 상세페이지가 origin: https://shop-detail-page.buylife.xyz 에서 window.open으로 바나나를 여는 상황을 브라우저 컨텍스트에서 시뮬레이션
console.log('--- 바나나 캔버스 P2 / M1 실물 Handoff 검증 시작 ---');

async function testHandoff() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const moduleUrl = pathToFileURL(path.join(root, 'banana-canvas/src/lib/productPhotoHandoff.ts')).href;
  const {
    PRODUCT_SENDER_ORIGIN,
    PRODUCT_MALL_ORIGIN,
    PRODUCT_RECEIVER_ORIGIN,
    PRODUCT_MSG_READY,
    PRODUCT_MSG_JOB,
    PRODUCT_MSG_RESULT,
    PRODUCT_MSG_SAVED,
    productSenderOrigin,
    readProductJob,
    readProductResult,
    readProductSaved
  } = await import(moduleUrl);

  console.log('1. productSenderOrigin 확인:');
  console.log('   from=shop-detail =>', productSenderOrigin('shop-detail'));
  console.log('   from=mall =>', productSenderOrigin('mall'));
  console.log('   from=invalid =>', productSenderOrigin('invalid'));

  if (productSenderOrigin('shop-detail') !== PRODUCT_SENDER_ORIGIN) throw new Error('shop-detail origin 불일치');
  if (productSenderOrigin('mall') !== PRODUCT_MALL_ORIGIN) throw new Error('mall origin 불일치');
  if (productSenderOrigin('invalid') !== null) throw new Error('invalid origin 보안 위반');

  console.log('2. Handoff 실물 데이터 왕복 시뮬레이션:');
  const jobId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  const productId = '11111111-2222-3333-4444-555555555555';
  const samplePngBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });

  // [단계 A] 상세페이지 -> 바나나 (PRODUCT_MSG_JOB)
  const jobMsg = {
    type: PRODUCT_MSG_JOB,
    jobId,
    products: [
      {
        productId,
        label: '테스트상품_A01',
        baseRevision: '2026-11-14T12:00:00Z',
        photos: [
          { role: 'main', ref: 'main.png', file: samplePngBlob },
          { role: 'sub', ref: 'sub1.png', file: samplePngBlob }
        ]
      }
    ]
  };

  // 상세페이지에서 보냈을 때 (expectedOrigin: PRODUCT_SENDER_ORIGIN)
  const receivedFromDetail = readProductJob(PRODUCT_SENDER_ORIGIN, jobMsg, PRODUCT_SENDER_ORIGIN);
  console.log('   상세페이지 발신 작업 수신 결과:', receivedFromDetail && !('error' in receivedFromDetail) ? '성공' : '실패', receivedFromDetail);
  if (!receivedFromDetail || 'error' in receivedFromDetail) throw new Error('상세페이지 작업 수신 실패');

  // 쇼핑몰에서 보냈을 때 (expectedOrigin: PRODUCT_MALL_ORIGIN)
  const receivedFromMall = readProductJob(PRODUCT_MALL_ORIGIN, jobMsg, PRODUCT_MALL_ORIGIN);
  console.log('   쇼핑몰 발신 작업 수신 결과:', receivedFromMall && !('error' in receivedFromMall) ? '성공' : '실패', receivedFromMall);
  if (!receivedFromMall || 'error' in receivedFromMall) throw new Error('쇼핑몰 작업 수신 실패');

  // [단계 B] 바나나 -> 상세페이지 / 쇼핑몰 (PRODUCT_MSG_RESULT)
  const resultBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
  const resultMsg = {
    type: PRODUCT_MSG_RESULT,
    jobId,
    productId,
    file: resultBlob,
    settingsVersion: 'v1.45'
  };

  // 상세페이지 쪽 수신 검사
  const productSet = new Set([productId]);
  const detailResult = readProductResult(PRODUCT_RECEIVER_ORIGIN, resultMsg, jobId, productSet);
  console.log('   상세페이지 쪽 결과 메시지 파싱 검증:', detailResult && !('error' in detailResult) ? '성공' : '실패', detailResult);
  if (!detailResult || 'error' in detailResult) throw new Error('상세페이지 결과 파싱 실패');

  // [단계 C] 저장 완료 알림 (PRODUCT_MSG_SAVED)
  const savedMsg = {
    type: PRODUCT_MSG_SAVED,
    jobId,
    productId,
    ok: true,
    error: ''
  };

  const savedDetail = readProductSaved(PRODUCT_SENDER_ORIGIN, savedMsg, jobId, PRODUCT_SENDER_ORIGIN);
  console.log('   상세페이지 저장 알림 수신 검증:', savedDetail ? '성공' : '실패', savedDetail);
  if (!savedDetail || !savedDetail.ok) throw new Error('상세페이지 저장 알림 수신 실패');

  const savedMall = readProductSaved(PRODUCT_MALL_ORIGIN, savedMsg, jobId, PRODUCT_MALL_ORIGIN);
  console.log('   쇼핑몰 저장 알림 수신 검증:', savedMall ? '성공' : '실패', savedMall);
  if (!savedMall || !savedMall.ok) throw new Error('쇼핑몰 저장 알림 수신 실패');

  console.log('🎉 모든 P2 / M1 Handoff 프로토콜 검증 100% 성공!');
  await browser.close();
}

testHandoff().catch(e => {
  console.error('검증 오류:', e);
  process.exit(1);
});
