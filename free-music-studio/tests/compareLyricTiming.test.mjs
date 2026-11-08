import test from "node:test";
import assert from "node:assert/strict";
import { compareLyricTiming } from "../scripts/compare-lyric-timing.mjs";
const sample = (starts, status = "automatic") => ({sourceId:"test-song", lyricsHash:"a".repeat(64), duration:30,
  cues:starts.map((start,i)=>({lineId:`line-${i+1}`,text:`시험 가사 ${i+1}`,start,status}))});

test("전체 정답의 줄별 오차·평균·최대·0.5초 경계 계산",()=>{
 const r=compareLyricTiming(sample([1,3.5,5.8]),sample([1,3,5],"manual"));
 assert.equal(r.fullSongComparison,true); assert.equal(r.comparedLines,3);
 assert.ok(Math.abs(r.meanAbsoluteErrorSeconds-1.3/3)<1e-10);
 assert.ok(Math.abs(r.maxAbsoluteErrorSeconds-0.8)<1e-10);
 assert.equal(r.withinHalfSecondPercent,200/3);
});
test("같은 가사라도 다른 음원·길이·가사 해시는 비교 거절",()=>{
 for(const patch of [{sourceId:"other"},{duration:31},{lyricsHash:"b".repeat(64)}])
  assert.throws(()=>compareLyricTiming(sample([1]),{...sample([1],"manual"),...patch}),/같은 음원/);
});
test("중복 줄 번호·틀린 문장·잘못된 시작 시간 거절",()=>{
 const a=sample([1,3]), b=sample([1,3],"manual");
 b.cues[1].lineId=b.cues[0].lineId; assert.throws(()=>compareLyricTiming(a,b),/올바르지/);
 const c=sample([1,3],"manual"); c.cues[1].text="다른 가사";
 assert.throws(()=>compareLyricTiming(a,c),/일치/);
 for(const start of [-1,30,NaN]) assert.throws(()=>compareLyricTiming(sample([1]),sample([start],"manual")),/올바르지/);
});
test("수동 확정한 일부 줄만 비교하고 전체 정확도로 표시하지 않음",()=>{
 const b=sample([1,3],"manual"); b.cues[1].status="automatic";
 const r=compareLyricTiming(sample([1,20]),b);
 assert.equal(r.manualReferenceLines,1); assert.equal(r.comparedLines,1);
 assert.equal(r.fullSongComparison,false); assert.equal(r.withinHalfSecondPercent,100);
});
test("자동 추정 누락은 통과율 분모에서 빼지 않음",()=>{
 const r=compareLyricTiming(sample([1,null]),sample([1,3],"manual"));
 assert.equal(r.missingPredictionLines,1); assert.equal(r.withinHalfSecondPercent,50);
 assert.equal(r.meanAbsoluteErrorSeconds,0); assert.equal(r.fullSongComparison,false);
});
test("수동 정답이 없으면 점수를 만들지 않으며 추정 전부 누락은 null 통계",()=>{
 assert.throws(()=>compareLyricTiming(sample([1]),sample([1])),/수동으로 확정/);
 const r=compareLyricTiming(sample([null]),sample([1],"manual"));
 assert.equal(r.meanAbsoluteErrorSeconds,null); assert.equal(r.maxAbsoluteErrorSeconds,null);
 assert.equal(r.withinHalfSecondPercent,0);
});

test("수동으로 고친 자료를 자동 원본으로 재사용하면 거절",()=>{
 assert.throws(()=>compareLyricTiming(sample([1],"manual"),sample([1],"manual")),/수정 전 자동 결과/);
});
