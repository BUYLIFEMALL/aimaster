// 강의 일정 한 번 가져오기의 순수 모듈 시험 — 2026-11-20 WS-20261118-02(플랜 docs/PLAN_20261120_NOTION_LECTURE_IMPORT.md).
// 엄격 CSV 판독(§3-1)·날짜/시간대 해석(§4)·중복 판정(§6-1)을 합성 표본으로 확인한다. DB·서버·네트워크를 쓰지 않는다.
// 이 모듈들은 아직 어디에서도 부르지 않는다(API·화면 연결은 다음 단위).
import { describe, expect, it } from 'vitest';
import { readStrictCsv, STRICT_CSV_MAX_ROWS } from '../../src/litpage/server/content/lectureImport/strictCsv.ts';
import { isKnownTimeZone, parseLectureDate, resolveLectureDate, wallClockOffsets } from '../../src/litpage/server/content/lectureImport/lectureDates.ts';
import { dedupeKey, judgeDuplicates, normalizeTitle } from '../../src/litpage/server/content/lectureImport/dedupe.ts';

const ok = <T extends { ok: boolean }>(r: T) => {
  expect(r.ok).toBe(true);
  return r as Extract<T, { ok: true }>;
};
const fail = <T extends { ok: boolean }>(r: T) => {
  expect(r.ok).toBe(false);
  return r as Extract<T, { ok: false }>;
};

describe('엄격 CSV 판독(§3-1)', () => {
  it('기본: 머리줄·행·줄 번호, 줄 끝 \\n·\\r\\n·\\r, 맨 앞 BOM 한 번', () => {
    for (const nl of ['\n', '\r\n', '\r']) {
      const r = ok(readStrictCsv(`﻿제목,날짜${nl}강의 A,2026-11-20${nl}강의 B,2026-11-21${nl}`));
      expect(r.header).toEqual(['제목', '날짜']);
      expect(r.rows).toEqual([{ line: 2, cells: ['강의 A', '2026-11-20'] }, { line: 3, cells: ['강의 B', '2026-11-21'] }]);
      expect(r.rowErrors).toEqual([]);
    }
    // 마지막 줄에 줄 끝이 없어도 같다
    expect(ok(readStrictCsv('a,b\n1,2')).rows).toEqual([{ line: 2, cells: ['1', '2'] }]);
    // BOM은 맨 앞 한 번만 뗀다(칸 안의 것은 그대로)
    expect(ok(readStrictCsv('﻿a\n﻿x')).rows[0].cells).toEqual(['﻿x']);
  });

  it('정상적인 여러 줄 칸: 한 행으로 세고 줄바꿈을 보존하며, 뒤 행들의 줄 번호가 밀리지 않는다', () => {
    const r = ok(readStrictCsv('제목,메모,날짜\n"강의 A","첫 줄\n둘째 줄\r\n셋째 ""따옴표"" 줄",2026-11-20\n강의 B,,2026-11-21\n'));
    expect(r.rows).toEqual([
      { line: 2, cells: ['강의 A', '첫 줄\n둘째 줄\r\n셋째 "따옴표" 줄', '2026-11-20'] },
      { line: 5, cells: ['강의 B', '', '2026-11-21'] }, // 여러 줄 칸이 3줄을 썼으므로 다음 행은 5번째 물리 줄
    ]);
    // 따옴표 칸 안의 쉼표는 구분자가 아니다. 빈 따옴표 칸은 빈 값
    expect(ok(readStrictCsv('a,b\n"x,y",""')).rows[0].cells).toEqual(['x,y', '']);
  });

  it('파일 끝까지 닫히지 않은 따옴표: 파일 전체 구조 오류, 따옴표가 열린 줄 번호', () => {
    expect(fail(readStrictCsv('제목,날짜\n강의 A,2026-11-20\n"강의 B,2026-11-21\n강의 C,2026-11-22\n')).error).toEqual({ code: 'unterminated_quote', line: 3 });
    // 여러 줄 칸 뒤에 열린 경우에도 물리 줄 번호가 맞다
    expect(fail(readStrictCsv('a,b\n"1\n2",x\n"열림,y')).error).toEqual({ code: 'unterminated_quote', line: 4 });
    // 짝이 맞지 않는 "" 탈출로 끝까지 닫히지 않는 경우
    expect(fail(readStrictCsv('a\n"x""')).error).toEqual({ code: 'unterminated_quote', line: 2 });
  });

  it('닫힌 따옴표 뒤의 글자·따옴표 없는 칸 안의 따옴표: 파일 전체 구조 오류', () => {
    expect(fail(readStrictCsv('a,b\n"x"y,1')).error).toEqual({ code: 'text_after_closing_quote', line: 2 });
    expect(fail(readStrictCsv('a,b\n"x" ,1')).error).toEqual({ code: 'text_after_closing_quote', line: 2 });
    expect(fail(readStrictCsv('a,b\n1,2\nx"y,1')).error).toEqual({ code: 'quote_in_unquoted_field', line: 3 });
    expect(fail(readStrictCsv('a,b\n ,x\n "x",1')).error).toEqual({ code: 'quote_in_unquoted_field', line: 3 }); // 앞에 공백이 있으면 따옴표 칸이 아니다
  });

  it('열 수 불일치: 그 줄만 실패, 줄 번호·기대·실제 열 수 — 모자란 칸을 채우지 않는다', () => {
    const r = ok(readStrictCsv('제목,날짜,완료\nA,2026-11-20,Yes\nB,2026-11-21\nC,2026-11-22,No,남는 칸\n"D\n여러 줄",2026-11-23,Yes\nE\n'));
    expect(r.rows.map((x) => x.line)).toEqual([2, 5]);
    expect(r.rowErrors).toEqual([
      { line: 3, code: 'column_count', expected: 3, got: 2 },
      { line: 4, code: 'column_count', expected: 3, got: 4 },
      { line: 7, code: 'column_count', expected: 3, got: 1 },
    ]);
    // 끝의 쉼표는 빈 칸 하나다
    expect(ok(readStrictCsv('a,b\n1,')).rows[0].cells).toEqual(['1', '']);
  });

  it('빈 줄은 건너뛰고 줄 번호는 물리 줄 그대로. 따옴표 빈 칸 한 개짜리 줄은 빈 줄이 아니다', () => {
    const r = ok(readStrictCsv('\n\na\n\n1\n\n\n2\n'));
    expect(r.header).toEqual(['a']);
    expect(r.rows).toEqual([{ line: 5, cells: ['1'] }, { line: 8, cells: ['2'] }]);
    expect(ok(readStrictCsv('a\n""\n')).rows).toEqual([{ line: 2, cells: [''] }]);
  });

  it('머리줄 오류와 행 수 초과: 파일 전체 거절', () => {
    expect(fail(readStrictCsv('')).error).toEqual({ code: 'no_header' });
    expect(fail(readStrictCsv('﻿\n\n')).error).toEqual({ code: 'no_header' });
    expect(fail(readStrictCsv(',,\n1,2,3')).error).toEqual({ code: 'no_header' });
    expect(fail(readStrictCsv('제목,,날짜\n1,2,3')).error).toEqual({ code: 'empty_header_name', column: 2 });
    expect(fail(readStrictCsv('제목,날짜, 제목 \n1,2,3')).error).toEqual({ code: 'duplicate_header', column: 3 });
    const many = (n: number) => 'a\n' + Array.from({ length: n }, (_, i) => String(i)).join('\n');
    expect(ok(readStrictCsv(many(STRICT_CSV_MAX_ROWS))).rows.length).toBe(STRICT_CSV_MAX_ROWS);
    expect(fail(readStrictCsv(many(STRICT_CSV_MAX_ROWS + 1))).error).toEqual({ code: 'too_many_rows', limit: STRICT_CSV_MAX_ROWS });
  });
});

describe('날짜 칸 읽기(§4-1)', () => {
  it('지원 표기: 영어·한국어·ISO × 날짜만·일시·날짜 범위·일시 범위', () => {
    const cases: [string, unknown][] = [
      ['2026-11-20', { start: { date: '2026-11-20' } }],
      ['November 20, 2026', { start: { date: '2026-11-20' } }],
      ['2026년 11월 20일', { start: { date: '2026-11-20' } }],
      ['2026-11-20 10:00', { start: { date: '2026-11-20', time: '10:00' } }],
      ['2026-11-20T09:05:59', { start: { date: '2026-11-20', time: '09:05' } }], // 초는 버린다
      ['November 20, 2026 10:00 AM', { start: { date: '2026-11-20', time: '10:00' } }],
      ['November 20, 2026 12:00 AM', { start: { date: '2026-11-20', time: '00:00' } }],
      ['November 20, 2026 12:30 PM', { start: { date: '2026-11-20', time: '12:30' } }],
      ['2026년 11월 20일 오전 10:00', { start: { date: '2026-11-20', time: '10:00' } }],
      ['2026년 11월 20일 오후 3:05', { start: { date: '2026-11-20', time: '15:05' } }],
      ['2026년 11월 20일 15:05', { start: { date: '2026-11-20', time: '15:05' } }],
      ['November 20, 2026 → November 22, 2026', { start: { date: '2026-11-20' }, end: { date: '2026-11-22' } }],
      ['2026-11-20 ~ 2026-11-22', { start: { date: '2026-11-20' }, end: { date: '2026-11-22' } }],
      ['2026-11-20 – 2026-11-22', { start: { date: '2026-11-20' }, end: { date: '2026-11-22' } }],
      ['2026-11-20 - 2026-11-22', { start: { date: '2026-11-20' }, end: { date: '2026-11-22' } }],
      ['2026년 11월 20일 오전 10:00 → 오후 12:00', { start: { date: '2026-11-20', time: '10:00' }, end: { date: '2026-11-20', time: '12:00' } }],
      ['November 20, 2026 10:00 AM → 12:00 PM', { start: { date: '2026-11-20', time: '10:00' }, end: { date: '2026-11-20', time: '12:00' } }],
      ['November 20, 2026 10:00 PM → November 21, 2026 1:00 AM', { start: { date: '2026-11-20', time: '22:00' }, end: { date: '2026-11-21', time: '01:00' } }],
      ['  2026-02-29  ', null], // 평년
      ['2028-02-29', { start: { date: '2028-02-29' } }], // 윤년
    ];
    for (const [raw, want] of cases) {
      const r = parseLectureDate(raw);
      if (want === null) expect(r, raw).toEqual({ ok: false, code: 'invalid_date' });
      else expect(r, raw).toEqual({ ok: true, ...(want as object) });
    }
  });

  it('시간대 표기는 분 단위 오프셋으로만 보관한다(지역 이름으로 바꾸지 않음)', () => {
    expect(ok(parseLectureDate('November 20, 2026 10:00 AM (GMT+9) → November 20, 2026 12:00 PM')).start.zone).toEqual({ offsetMinutes: 540, named: false });
    expect(ok(parseLectureDate('2026-11-20 10:00 (GMT-4) → 2026-11-22 10:00 (GMT-5)'))).toMatchObject({ start: { zone: { offsetMinutes: -240 } }, end: { zone: { offsetMinutes: -300 } } });
    expect(ok(parseLectureDate('2026-11-20 10:00 (GMT+05:30)')).start.zone).toEqual({ offsetMinutes: 330, named: false });
    expect(ok(parseLectureDate('2026-11-20 10:00 (UTC+0900)')).start.zone).toEqual({ offsetMinutes: 540, named: false });
    expect(ok(parseLectureDate('2026-11-20 10:00 (KST)')).start.zone).toEqual({ offsetMinutes: 540, named: true });
    for (const z of ['UTC', 'GMT', 'utc']) expect(ok(parseLectureDate(`2026-11-20 10:00 (${z})`)).start.zone).toEqual({ offsetMinutes: 0, named: true });
    // 뜻이 여럿인 약어·범위 밖 오프셋은 받지 않는다
    for (const z of ['EST', 'CST', 'PDT', 'Asia/Seoul', 'GMT+15', 'GMT+9:75', '+9']) expect(parseLectureDate(`2026-11-20 10:00 (${z})`), z).toEqual({ ok: false, code: 'zone_unsupported' });
  });

  it('시작·종료를 각각 검증한다 — 추정으로 채우지 않는다', () => {
    const bad: [string, string][] = [
      ['', 'empty'],
      ['   ', 'empty'],
      ['2026-02-30', 'invalid_date'],
      ['2026-13-01', 'invalid_date'],
      ['2026-00-10', 'invalid_date'],
      ['2026년 4월 31일', 'invalid_date'],
      ['November 31, 2026', 'invalid_date'],
      ['2026-11-20 → 2026-11-31', 'invalid_date'], // 종료 쪽
      ['2026-11-20 24:00', 'invalid_time'],
      ['2026-11-20 12:60', 'invalid_time'],
      ['2026-11-20 13:00 PM', 'invalid_time'],
      ['2026-11-20 0:30 AM', 'invalid_time'],
      ['2026년 11월 20일 오후 13:00', 'invalid_time'],
      ['2026-11-20 10:00 → 2026-11-20 25:00', 'invalid_time'], // 종료 쪽
      ['2026-11-20 10:00 → 2026-11-21', 'range_time_one_side'],
      ['2026-11-20 → 2026-11-21 10:00', 'range_time_one_side'],
      ['2026-11-22 → 2026-11-20', 'end_before_start'],
      ['2026-11-20 10:00 → 2026-11-20 09:59', 'end_before_start'],
      ['2026년 11월 20일 오후 3:00 → 오전 10:00', 'end_before_start'],
      ['11/20/2026', 'unsupported_format'],
      ['Nov 20, 2026', 'unsupported_format'], // 줄인 월 이름은 지원 표에 없다
      ['Smarch 20, 2026', 'unsupported_format'],
      ['내일', 'unsupported_format'],
      ['2026-11-20 오후 3시', 'unsupported_format'],
      ['2026-11-20 → 12:00', 'unsupported_format'], // 시작에 시각이 없는데 종료가 시각만
      ['2026-11-20 → 2026-11-21 → 2026-11-22', 'unsupported_format'],
      ['2026-11-20~2026-11-22', 'unsupported_format'], // 공백 없는 ~는 구분자가 아니다
    ];
    for (const [raw, code] of bad) expect(parseLectureDate(raw), JSON.stringify(raw)).toEqual({ ok: false, code });
    // 종료가 시작과 같으면 범위가 아니라 단일 값
    expect(parseLectureDate('2026-11-20 10:00 → 2026-11-20 10:00')).toEqual({ ok: true, start: { date: '2026-11-20', time: '10:00' } });
    expect(parseLectureDate('2026-11-20 → 2026-11-20')).toEqual({ ok: true, start: { date: '2026-11-20' } });
  });
});

describe('시간대 판정(§4-2)', () => {
  const P = (raw: string) => ok(parseLectureDate(raw));
  const NY = 'America/New_York'; // 2026: 3월 8일 02:00 → 03:00, 11월 1일 02:00 → 01:00
  const LON = 'Europe/London'; // 2026: 3월 29일 01:00 → 02:00, 10월 25일 02:00 → 01:00

  it('벽시계 시각에 대응하는 순간의 수: 0(없음)·1·2(두 번)', () => {
    expect(wallClockOffsets('2026-11-20', '10:00', 'Asia/Seoul')).toEqual([540]);
    expect(wallClockOffsets('2026-11-20', '10:00', 'UTC')).toEqual([0]);
    expect(wallClockOffsets('2026-03-08', '01:59', NY)).toEqual([-300]);
    expect(wallClockOffsets('2026-03-08', '02:00', NY)).toEqual([]);
    expect(wallClockOffsets('2026-03-08', '02:30', NY)).toEqual([]);
    expect(wallClockOffsets('2026-03-08', '03:00', NY)).toEqual([-240]);
    expect(wallClockOffsets('2026-11-01', '00:59', NY)).toEqual([-240]);
    expect(wallClockOffsets('2026-11-01', '01:00', NY)).toEqual([-300, -240]);
    expect(wallClockOffsets('2026-11-01', '01:30', NY)).toEqual([-300, -240]);
    expect(wallClockOffsets('2026-11-01', '02:00', NY)).toEqual([-300]);
    expect(wallClockOffsets('2026-03-29', '01:30', LON)).toEqual([]);
    expect(wallClockOffsets('2026-10-25', '01:30', LON)).toEqual([0, 60]);
    expect(wallClockOffsets('2026-11-20', '10:00', 'Nowhere/Zone')).toBeNull();
    expect(isKnownTimeZone('Asia/Seoul')).toBe(true);
    for (const z of ['Nowhere/Zone', '', 'GMT+9 ']) expect(isKnownTimeZone(z), z).toBe(false);
  });

  it('시각은 옮기지 않는다 — 어느 시간대를 골라도 벽시계 값 그대로, time_zone은 고른 값 하나', () => {
    const raw = '2026년 11월 20일 오전 10:00 → 오후 12:00';
    for (const tz of ['Asia/Seoul', 'UTC', NY, LON]) {
      expect(resolveLectureDate(P(raw), tz)).toEqual({ ok: true, wallClock: false, value: { type: 'datetimerange', start_date: '2026-11-20', start_time: '10:00', end_date: '2026-11-20', end_time: '12:00', time_zone: tz } });
    }
    expect(resolveLectureDate(P('2026-11-20 10:00'), 'Asia/Seoul')).toEqual({ ok: true, wallClock: false, value: { type: 'datetime', start_date: '2026-11-20', start_time: '10:00', time_zone: 'Asia/Seoul' } });
    // 하루 종일·날짜 범위에는 시각·시간대 칸이 없다
    expect(resolveLectureDate(P('2026-11-20'), NY)).toEqual({ ok: true, wallClock: false, value: { type: 'date', start_date: '2026-11-20' } });
    expect(resolveLectureDate(P('2026-11-20 → 2026-11-22'), NY)).toEqual({ ok: true, wallClock: false, value: { type: 'daterange', start_date: '2026-11-20', end_date: '2026-11-22' } });
    expect(resolveLectureDate(P('2026-11-20 10:00'), 'Nowhere/Zone')).toEqual({ ok: false, code: 'zone_invalid' });
  });

  it('없는 시각·두 번 있는 시각: 저장하지 않는다 — 시작·종료 각각, 명시 벽시계 예외로도 살리지 않는다', () => {
    for (const wallClock of [false, true]) {
      expect(resolveLectureDate(P('2026-03-08 02:30'), NY, { wallClock })).toEqual({ ok: false, code: 'time_nonexistent', side: 'start' });
      expect(resolveLectureDate(P('2026-03-08 01:00 → 2026-03-08 02:30'), NY, { wallClock })).toEqual({ ok: false, code: 'time_nonexistent', side: 'end' });
      expect(resolveLectureDate(P('2026-11-01 01:30'), NY, { wallClock })).toEqual({ ok: false, code: 'time_ambiguous', side: 'start' });
      expect(resolveLectureDate(P('2026-10-31 23:00 → 2026-11-01 01:30'), NY, { wallClock })).toEqual({ ok: false, code: 'time_ambiguous', side: 'end' });
      // 파일의 오프셋으로 둘 중 하나를 가릴 수 있어도 저장 값에 남길 칸이 없다
      expect(resolveLectureDate(P('2026-11-01 01:30 (GMT-4)'), NY, { wallClock })).toEqual({ ok: false, code: 'time_ambiguous', side: 'start' });
      expect(resolveLectureDate(P('2026-03-29 01:30'), LON, { wallClock })).toEqual({ ok: false, code: 'time_nonexistent', side: 'start' });
      expect(resolveLectureDate(P('2026-10-25 01:30'), LON, { wallClock })).toEqual({ ok: false, code: 'time_ambiguous', side: 'start' });
    }
    // 같은 벽시계 값이라도 서머타임이 없는 시간대에서는 실패하지 않는다
    for (const raw of ['2026-03-08 02:30', '2026-11-01 01:30', '2026-03-29 01:30', '2026-10-25 01:30']) {
      for (const tz of ['Asia/Seoul', 'UTC']) expect(resolveLectureDate(P(raw), tz).ok, `${raw} ${tz}`).toBe(true);
    }
  });

  it('표기는 시작·종료를 각자의 일시 오프셋과 비교한다 — 경계를 넘어 양 끝이 달라도 각자 맞으면 정상', () => {
    // 서머타임 종료(11월 1일)를 넘는 범위: 시작 −4, 종료 −5 — 둘 다 맞다
    expect(resolveLectureDate(P('2026-10-31 10:00 (GMT-4) → 2026-11-02 10:00 (GMT-5)'), NY)).toEqual({
      ok: true, wallClock: false, value: { type: 'datetimerange', start_date: '2026-10-31', start_time: '10:00', end_date: '2026-11-02', end_time: '10:00', time_zone: NY },
    });
    // 한쪽에만 표기가 있으면 있는 쪽만 본다
    expect(resolveLectureDate(P('2026-10-31 10:00 (GMT-4) → 2026-11-02 10:00'), NY).ok).toBe(true);
    // 종료 쪽만 틀림(실제 −5인데 −4), 시작 쪽만 틀림, 둘 다 틀림
    expect(resolveLectureDate(P('2026-10-31 10:00 (GMT-4) → 2026-11-02 10:00 (GMT-4)'), NY)).toEqual({ ok: false, code: 'tz_mismatch', side: 'end' });
    expect(resolveLectureDate(P('2026-10-31 10:00 (GMT-5) → 2026-11-02 10:00 (GMT-5)'), NY)).toEqual({ ok: false, code: 'tz_mismatch', side: 'start' });
    expect(resolveLectureDate(P('2026-10-31 10:00 (GMT+9) → 2026-11-02 10:00 (GMT+9)'), NY)).toEqual({ ok: false, code: 'tz_mismatch', side: 'both' });
    // 이름 표기도 같은 방식: KST=+9, UTC=0
    expect(resolveLectureDate(P('2026-11-20 10:00 (KST)'), 'Asia/Seoul').ok).toBe(true);
    expect(resolveLectureDate(P('2026-11-20 10:00 (UTC)'), 'UTC').ok).toBe(true);
    expect(resolveLectureDate(P('2026-11-20 10:00 (UTC)'), 'Asia/Seoul')).toEqual({ ok: false, code: 'tz_mismatch', side: 'start' });
    expect(resolveLectureDate(P('2026-11-20 10:00 (KST)'), 'UTC')).toEqual({ ok: false, code: 'tz_mismatch', side: 'start' });
    expect(resolveLectureDate(P('2026-11-20 10:00 (KST) → 2026-11-20 12:00 (UTC)'), 'Asia/Seoul')).toEqual({ ok: false, code: 'tz_mismatch', side: 'end' });
    // 런던: 겨울 0, 여름 +1
    expect(resolveLectureDate(P('2026-01-10 09:00 (GMT)'), LON).ok).toBe(true);
    expect(resolveLectureDate(P('2026-07-10 09:00 (GMT+1)'), LON).ok).toBe(true);
    expect(resolveLectureDate(P('2026-07-10 09:00 (GMT)'), LON)).toEqual({ ok: false, code: 'tz_mismatch', side: 'start' });
    // 하루 종일 값의 표기도 그날 기준으로 본다
    expect(resolveLectureDate(P('2026-11-20 (GMT+9)'), 'Asia/Seoul').ok).toBe(true);
    expect(resolveLectureDate(P('2026-11-20 (GMT+9)'), 'UTC')).toEqual({ ok: false, code: 'tz_mismatch', side: 'start' });
  });

  it('명시 벽시계 예외(§4-2 9번 표): 불일치만 벽시계 그대로 저장하고 표시한다', () => {
    // 표기 없음 / 표기 일치: 예외 유무와 무관하게 같은 결과, wallClock 표시 없음
    for (const raw of ['2026-11-20 10:00', '2026-11-20 10:00 (GMT+9)', '2026-11-20 10:00 (KST)']) {
      const a = resolveLectureDate(P(raw), 'Asia/Seoul');
      expect(a).toEqual({ ok: true, wallClock: false, value: { type: 'datetime', start_date: '2026-11-20', start_time: '10:00', time_zone: 'Asia/Seoul' } });
      expect(resolveLectureDate(P(raw), 'Asia/Seoul', { wallClock: true })).toEqual(a);
    }
    // 표기 불일치: 예외 없으면 저장 안 함, 있으면 시각을 옮기지 않고 그대로 + 고른 시간대, wallClock 표시
    const raw = '2026-11-20 10:00 (GMT+9) → 2026-11-20 12:00 (GMT+9)';
    expect(resolveLectureDate(P(raw), 'UTC')).toEqual({ ok: false, code: 'tz_mismatch', side: 'both' });
    expect(resolveLectureDate(P(raw), 'UTC', { wallClock: true })).toEqual({
      ok: true, wallClock: true, value: { type: 'datetimerange', start_date: '2026-11-20', start_time: '10:00', end_date: '2026-11-20', end_time: '12:00', time_zone: 'UTC' },
    });
    expect(resolveLectureDate(P('2026-11-20 (GMT+9)'), 'UTC', { wallClock: true })).toEqual({ ok: true, wallClock: true, value: { type: 'date', start_date: '2026-11-20' } });
  });

  it('벽시계로는 종료가 뒤여도 실제 순간이 앞서면 실패(양 끝이 각각 유일한 시각일 때만 비교)', () => {
    // 뉴욕 11월 1일: 00:30(−4)은 04:30Z, 02:10(−5)은 07:10Z → 정상
    expect(resolveLectureDate(P('2026-11-01 00:30 → 2026-11-01 02:10'), NY).ok).toBe(true);
    // 범위가 없는 구간·두 번 있는 구간에 걸치지 않으면 벽시계 순서와 순간 순서가 같다
    expect(resolveLectureDate(P('2026-03-08 01:30 → 2026-03-08 03:10'), NY).ok).toBe(true);
  });
});

describe('중복 판정(§6-1)', () => {
  const dt = (date: string, time?: string, end?: [string, string?]) =>
    ({ type: time ? (end ? 'datetimerange' : 'datetime') : end ? 'daterange' : 'date', start_date: date, ...(time ? { start_time: time } : {}), ...(end ? { end_date: end[0], ...(end[1] ? { end_time: end[1] } : {}) } : {}) }) as any;

  it('제목 정규화와 키', () => {
    expect(normalizeTitle('  드림AI   강의\t1주차 ')).toBe('드림AI 강의 1주차');
    expect(normalizeTitle('가')).toBe('가'); // 풀어쓴 한글 자모 → NFC
    expect(dedupeKey(' A  B ', dt('2026-11-20', '10:00'))).toBe(dedupeKey('A B', dt('2026-11-20', '10:00')));
    expect(dedupeKey('A', dt('2026-11-20', '10:00'))).not.toBe(dedupeKey('A', dt('2026-11-20', '10:30')));
    expect(dedupeKey('A', dt('2026-11-20'))).not.toBe(dedupeKey('A', dt('2026-11-20', '00:00'))); // 하루 종일 ≠ 자정
    expect(dedupeKey('a', dt('2026-11-20'))).not.toBe(dedupeKey('A', dt('2026-11-20'))); // 대소문자는 구분한다
  });

  it('네 가지 경우(§6-1 표)', () => {
    const existing = [
      { id: 'e1', title: '강의 A', value: dt('2026-11-20', '10:00', ['2026-11-20', '12:00']) },
      { id: 'e2', title: '특강', value: dt('2026-11-21') },
    ];
    const rows = [
      { line: 2, title: '강의 B', value: dt('2026-11-20', '10:00', ['2026-11-20', '12:00']) }, // 이름이 다르고 시작 일시가 같음 → 다른 일정
      { line: 3, title: '강의 A', value: dt('2026-11-20', '10:00', ['2026-11-20', '13:00']) }, // 이름·시작 같고 종료만 다름 → 건너뜀 + 근거
      { line: 4, title: ' 강의  A ', value: dt('2026-11-20', '10:00', ['2026-11-20', '12:00']) }, // 완전히 같음(공백만 다름) → 건너뜀
      { line: 5, title: '강의 A', value: dt('2026-11-20', '14:00') }, // 시각만 다름 → 다른 일정
      { line: 6, title: '특강', value: dt('2026-11-21', '09:00') }, // 표에는 하루 종일, 파일은 시각 있음 → 가져오되 비슷한 일정 표시
      { line: 7, title: '강의 A', value: dt('2026-11-22', '10:00') }, // 날짜가 다름
    ];
    expect(judgeDuplicates(rows, existing)).toEqual([
      { line: 2, result: 'created' },
      { line: 3, result: 'duplicate', reason: 'dup_table_end_differs', dupOf: 'e1' },
      { line: 4, result: 'duplicate', reason: 'dup_table', dupOf: 'e1' },
      { line: 5, result: 'created' },
      { line: 6, result: 'created', similar: true },
      { line: 7, result: 'created' },
    ]);
  });

  it('파일 안 중복: 앞선 줄 번호를 근거로, 표의 기존 행이 우선. 같은 파일을 다시 넣으면 새로 0', () => {
    const rows = [
      { line: 2, title: 'A', value: dt('2026-11-20', '10:00') },
      { line: 3, title: 'A', value: dt('2026-11-20', '10:00') },
      { line: 4, title: 'A', value: dt('2026-11-20', '10:00', ['2026-11-20', '11:00']) }, // 파일 안에서는 종료가 달라도 dup_file
      { line: 5, title: 'B', value: dt('2026-11-20') },
      { line: 6, title: 'B', value: dt('2026-11-20', '09:00') }, // 파일 안의 비슷한 일정
    ];
    const first = judgeDuplicates(rows, []);
    expect(first).toEqual([
      { line: 2, result: 'created' },
      { line: 3, result: 'duplicate', reason: 'dup_file', dupOf: 2 },
      { line: 4, result: 'duplicate', reason: 'dup_file', dupOf: 2 },
      { line: 5, result: 'created' },
      { line: 6, result: 'created', similar: true },
    ]);
    // 첫 실행이 만든 행을 표에 넣고 같은 파일을 다시 판정 → 전부 건너뜀
    const created = rows.filter((_, i) => first[i].result === 'created').map((r) => ({ id: `row-${r.line}`, title: r.title, value: r.value }));
    const second = judgeDuplicates(rows, created);
    expect(second.every((v) => v.result === 'duplicate')).toBe(true);
    expect(second.map((v) => v.dupOf)).toEqual(['row-2', 'row-2', 'row-2', 'row-5', 'row-6']);
    expect(second[2].reason).toBe('dup_table_end_differs');
    // 입력을 바꾸지 않는다, 같은 입력이면 같은 결과
    expect(judgeDuplicates(rows, created)).toEqual(second);
  });
});
