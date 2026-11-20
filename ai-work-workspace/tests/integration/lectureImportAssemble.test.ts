// 강의 일정 한 번 가져오기의 판정 조립과 결과 계약 시험 — 2026-11-20 WS-20261118-02(플랜 §5-2).
// 구조 → 열 매핑 → 해석 → 시간대 → 중복의 순서, 집계와 사유 코드, 응답 예산(UTF-8 본문 3,000,000바이트)·10,000행·rowsOmitted·dupOf,
// 내용 미노출, 결정적 결과를 합성 표본으로 확인한다. DB·서버·네트워크를 쓰지 않는다. 이 모듈은 아직 어디에서도 부르지 않는다.
import { describe, expect, it } from 'vitest';
import {
  assembleLectureImport, buildLectureResponse, LECTURE_RESPONSE_BUDGET, responseBytes,
  type AssembleInput, type Judged, type RowEntry,
} from '../../src/litpage/server/content/lectureImport/assemble.ts';
import { judgeDuplicates } from '../../src/litpage/server/content/lectureImport/dedupe.ts';

const base = (csv: string, over: Partial<AssembleInput> = {}): AssembleInput => ({ csv, mapping: { title: '제목', date: '날짜' }, timeZone: 'Asia/Seoul', existing: [], ...over });
const ok = (input: AssembleInput) => {
  const r = assembleLectureImport(input);
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r as Extract<typeof r, { ok: true }>;
};
const fileError = (input: AssembleInput) => {
  const r = assembleLectureImport(input);
  expect(r.ok).toBe(false);
  return (r as Extract<typeof r, { ok: false }>).error;
};
const sum = (t: Judged['totals']) => t.created + t.duplicate + t.failed + t.tz_mismatch;

describe('판정 조립(§5-2): 단계 순서와 집계', () => {
  const CSV = [
    '제목,메모,날짜', // 1
    '강의 A,첫 주,2026-11-20 10:00', // 2 새로
    ',제목 없음,2026-11-20 11:00', // 3 제목 없음
    '강의 B,열이 모자람', // 4 열 수
    '강의 C,,내일', // 5 날짜 해석 실패
    '강의 D,,2026-11-20 10:00 (GMT+0)', // 6 시간대 불일치(서울)
    '강의 A,같은 키,2026-11-20 10:00', // 7 파일 안 중복(2번 줄)
    '강의 E,,2026-11-20 10:00:30', // 8 초
    '강의 F,,2026-11-21', // 9 새로
    '"강의 G","여러 줄', // 10~11 여러 줄 칸
    '메모",2026-11-22 9:00 PM', //
    '강의 F,,2026-11-21 09:00', // 12 같은 날 하루 종일이 파일에 있음 → 비슷한 일정
    '', // 13 빈 줄
    '   ,공백 제목,2026-11-23', // 14 제목 없음(공백뿐)
  ].join('\n');

  it('줄마다 한 가지 결과 — 파일의 물리 줄 순서, 사유 코드, 집계', () => {
    const r = ok(base(CSV));
    expect(r.rows).toEqual([
      [2, 'created', ''],
      [3, 'failed', 'title_missing'],
      [4, 'failed', 'column_count'],
      [5, 'failed', 'unsupported_format'],
      [6, 'tz_mismatch', 'tz_start'],
      [7, 'duplicate', 'dup_file'],
      [8, 'failed', 'seconds_unsupported'],
      [9, 'created', ''],
      [10, 'created', ''],
      [12, 'created', 'similar'],
      [14, 'failed', 'title_missing'],
    ] satisfies RowEntry[]);
    expect(r.dupOf).toEqual([null, null, null, null, null, 2, null, null, null, null, null]);
    expect(r.totals).toEqual({ rows: 11, created: 4, duplicate: 1, failed: 5, tz_mismatch: 1, wall_clock: 0 });
    expect(sum(r.totals)).toBe(r.totals.rows);
    // 넣을 행: created만, 제목은 앞뒤 공백만 뗀 원문, 값은 저장 형식
    expect(r.toWrite).toEqual([
      { line: 2, title: '강의 A', value: { type: 'datetime', start_date: '2026-11-20', start_time: '10:00', time_zone: 'Asia/Seoul' } },
      { line: 9, title: '강의 F', value: { type: 'date', start_date: '2026-11-21' } },
      { line: 10, title: '강의 G', value: { type: 'datetime', start_date: '2026-11-22', start_time: '21:00', time_zone: 'Asia/Seoul' } },
      { line: 12, title: '강의 F', value: { type: 'datetime', start_date: '2026-11-21', start_time: '09:00', time_zone: 'Asia/Seoul' } },
    ]);
  });

  it('명시 벽시계 예외: 불일치 줄이 created(wall_clock)가 되고 부분집계에 잡힌다 — 합계는 그대로', () => {
    const r = ok(base(CSV, { wallClock: true }));
    expect(r.rows.find((x) => x[0] === 6)).toEqual([6, 'created', 'wall_clock']);
    expect(r.totals).toEqual({ rows: 11, created: 5, duplicate: 1, failed: 5, tz_mismatch: 0, wall_clock: 1 });
    expect(sum(r.totals)).toBe(r.totals.rows);
    expect(r.totals.wall_clock).toBeLessThanOrEqual(r.totals.created);
    expect(r.toWrite.find((x) => x.line === 6)?.value).toEqual({ type: 'datetime', start_date: '2026-11-20', start_time: '10:00', time_zone: 'Asia/Seoul' }); // 시각을 옮기지 않는다
    // 없는 시각·두 번 있는 시각은 예외로도 실패로 남는다
    const ny = ok(base('제목,날짜\nX,2026-03-08 02:30\nY,2026-11-01 01:30 (GMT-4)\nZ,2026-11-02 10:00 (GMT+9)', { timeZone: 'America/New_York', wallClock: true }));
    expect(ny.rows).toEqual([[2, 'failed', 'time_nonexistent'], [3, 'failed', 'time_ambiguous'], [4, 'created', 'wall_clock']]);
  });

  it('앞 단계에서 걸린 줄은 뒤 단계로 가지 않는다 — 실패·보류 줄은 중복의 근거도 대상도 아니다', () => {
    const csv = ['제목,날짜', '강의 A,2026-11-20 10:00 (GMT+0)', '강의 A,2026-11-20 10:00', '강의 B,2026-02-30', '강의 B,2026-03-02'].join('\n');
    const r = ok(base(csv));
    // 2번 줄(보류)과 키가 같은 3번 줄은 중복이 아니라 새로 넣는다. 4번 줄(실패) 다음의 5번 줄도 마찬가지
    expect(r.rows).toEqual([[2, 'tz_mismatch', 'tz_start'], [3, 'created', ''], [4, 'failed', 'invalid_date'], [5, 'created', '']]);
    // 열 수가 틀린 줄은 제목·날짜가 그럴듯해도 구조 단계에서 끝난다
    expect(ok(base('제목,날짜\n강의 A,2026-11-20,남는 칸\n강의 A,2026-11-20')).rows).toEqual([[2, 'failed', 'column_count'], [3, 'created', '']]);
  });

  it('표의 기존 행과의 중복: 근거는 그 행의 id, 재시도하면 저장된 줄만 duplicate로 바뀌고 나머지 판정은 그대로', () => {
    const first = ok(base(CSV));
    const stored = first.toWrite.map((w) => ({ id: `row-${String(w.line).padStart(2, '0')}`, title: w.title, value: w.value }));
    const second = ok(base(CSV, { existing: stored }));
    expect(second.rows).toEqual([
      [2, 'duplicate', 'dup_table'],
      [3, 'failed', 'title_missing'],
      [4, 'failed', 'column_count'],
      [5, 'failed', 'unsupported_format'],
      [6, 'tz_mismatch', 'tz_start'],
      [7, 'duplicate', 'dup_table'], // 표의 기존 행이 파일의 앞 줄보다 우선
      [8, 'failed', 'seconds_unsupported'],
      [9, 'duplicate', 'dup_table'],
      [10, 'duplicate', 'dup_table'],
      [12, 'duplicate', 'dup_table'],
      [14, 'failed', 'title_missing'],
    ]);
    expect(second.dupOf).toEqual(['row-02', null, null, null, null, 'row-02', null, 'row-09', 'row-10', 'row-12', null]);
    expect(second.dupOf.length).toBe(second.rows.length);
    expect(second.totals).toEqual({ rows: 11, created: 0, duplicate: 5, failed: 5, tz_mismatch: 1, wall_clock: 0 });
    expect(second.toWrite).toEqual([]);
    // 실패·보류 줄은 첫 실행과 같은 판정·같은 사유
    for (const line of [3, 4, 5, 6, 8, 14]) expect(second.rows.find((x) => x[0] === line)).toEqual(first.rows.find((x) => x[0] === line));
    // 종료만 다른 기존 행 → 근거와 함께 건너뜀, 무효한 기존 행은 근거가 되지 않는다
    const endDiffers = ok(base('제목,날짜\n강의 A,2026-11-20 10:00 → 2026-11-20 12:00', {
      existing: [
        { id: 'bad', title: '강의 A', value: { type: 'datetimerange', start_date: '2026-11-20', start_time: '10:00', end_date: '2026-11-31', end_time: '12:00' } as any },
        { id: 'good', title: '강의 A', value: { type: 'datetimerange', start_date: '2026-11-20', start_time: '10:00', end_date: '2026-11-20', end_time: '13:00' } as any },
      ],
    }));
    expect([endDiffers.rows, endDiffers.dupOf]).toEqual([[[2, 'duplicate', 'dup_table_end_differs']], ['good']]);
  });

  it('파일 전체를 멈추는 오류: 구조 오류가 가장 먼저, 그다음 시간대·열 매핑 — 판정 결과 없음', () => {
    // 구조 오류는 시간대·매핑이 틀려도 먼저 나온다(따옴표 검증 선행)
    expect(fileError(base('제목,날짜\n"열림,2026-11-20', { timeZone: '+09:00', mapping: { title: '없음', date: '없음' } }))).toEqual({ code: 'unterminated_quote', line: 2 });
    expect(fileError(base('제목,날짜\nA"B,2026-11-20'))).toEqual({ code: 'quote_in_unquoted_field', line: 2 });
    expect(fileError(base(''))).toEqual({ code: 'no_header' });
    expect(fileError(base('제목,제목\nA,B'))).toEqual({ code: 'duplicate_header', column: 2 });
    for (const timeZone of ['+09:00', 'GMT+9', 'Etc/GMT-9', '', 'Nowhere/Zone']) expect(fileError(base('제목,날짜\nA,2026-11-20', { timeZone })), timeZone).toEqual({ code: 'zone_invalid' });
    // 시간대 오류는 줄을 하나도 판정하기 전에 걸린다: 데이터 줄이 없거나, 모든 줄이 앞 단계에서 걸리는 파일도 통과시키지 않는다
    expect(fileError(base('제목,날짜\n', { timeZone: '+09:00' }))).toEqual({ code: 'zone_invalid' });
    expect(fileError(base('제목,날짜\n,2026-11-20\nA,내일\nB,2026-11-20,남는 칸', { timeZone: 'GMT+9' }))).toEqual({ code: 'zone_invalid' });
    // 시간대가 틀리면 열 매핑이 틀렸어도 시간대 오류가 먼저다(순서 고정)
    expect(fileError(base('제목,날짜\nA,2026-11-20', { timeZone: '', mapping: { title: '없음', date: '없음' } }))).toEqual({ code: 'zone_invalid' });
    expect(fileError(base('제목,날짜\nA,2026-11-20', { mapping: { title: '이름', date: '날짜' } }))).toEqual({ code: 'title_column_missing' });
    expect(fileError(base('제목,날짜\nA,2026-11-20', { mapping: { title: '제목', date: '일시' } }))).toEqual({ code: 'date_column_missing' });
    expect(fileError(base('제목,날짜\nA,2026-11-20', { mapping: { title: '날짜', date: '날짜' } }))).toEqual({ code: 'same_column' });
    // 열 이름은 앞뒤 공백을 뗀 머리줄 값과 정확히 같아야 한다(대소문자·부분 일치로 고르지 않는다)
    expect(ok(base(' 제목 , 날짜 \nA,2026-11-20')).totals.created).toBe(1);
    expect(fileError(base('Title,Date\nA,2026-11-20', { mapping: { title: 'title', date: 'Date' } }))).toEqual({ code: 'title_column_missing' });
    // 머리줄만 있는 파일은 오류가 아니라 0행
    expect(ok(base('제목,날짜\n')).totals).toEqual({ rows: 0, created: 0, duplicate: 0, failed: 0, tz_mismatch: 0, wall_clock: 0 });
  });

  it('결정적: 같은 입력이면 같은 결과, 기존 행을 읽어 온 순서에 좌우되지 않고, 입력을 바꾸지 않는다', () => {
    const existing = [
      { id: 'r-3', title: '강의 A', value: { type: 'datetime', start_date: '2026-11-20', start_time: '10:00' } as any },
      { id: 'r-1', title: '강의 A', value: { type: 'datetime', start_date: '2026-11-20', start_time: '10:00' } as any }, // 같은 키가 표에 둘
      { id: 'r-2', title: '강의 F', value: { type: 'date', start_date: '2026-11-21' } as any },
    ];
    const frozen = JSON.stringify(existing);
    const a = ok(base(CSV, { existing }));
    const b = ok(base(CSV, { existing }));
    const reversed = ok(base(CSV, { existing: [...existing].reverse() }));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(a));
    expect(a.dupOf[0]).toBe('r-1'); // 같은 키의 기존 행 가운데 id가 가장 앞서는 것
    expect(judgeDuplicates([{ line: 2, title: '강의 A', value: existing[0].value }], existing)[0].dupOf).toBe('r-1');
    expect(JSON.stringify(existing)).toBe(frozen);
    expect(JSON.stringify(buildLectureResponse(a))).toBe(JSON.stringify(buildLectureResponse(reversed)));
  });
});

describe('결과 계약(§5-2): 응답 모양과 예산', () => {
  it('미리보기와 확정 응답은 같은 모양 — 확정에만 written이 붙고, 서버가 계산한 「달라진 것」 칸은 없다', () => {
    const judged = ok(base('제목,날짜\nA,2026-11-20\nA,2026-11-20\nB,어제'));
    const preview = buildLectureResponse(judged);
    expect(preview).toEqual({ totals: { rows: 3, created: 1, duplicate: 1, failed: 1, tz_mismatch: 0, wall_clock: 0 }, rows: [[2, 'created', ''], [3, 'duplicate', 'dup_file'], [4, 'failed', 'unsupported_format']], dupOf: [null, 2, null] });
    const written = { rows: judged.totals.created, tableId: 'tbl-1', createdTable: true };
    const committed = buildLectureResponse(judged, { written });
    expect(committed).toEqual({ ...preview, written });
    expect(Object.keys(committed).sort()).toEqual(['dupOf', 'rows', 'totals', 'written']);
    expect(Object.keys(preview).sort()).toEqual(['dupOf', 'rows', 'totals']);
    // written.rows는 벽시계 예외로 넣은 행을 포함한 전체 삽입 수 = totals.created
    const wc = ok(base('제목,날짜\nA,2026-11-20 10:00 (GMT+0)\nB,2026-11-20 11:00', { wallClock: true }));
    expect(wc.totals).toMatchObject({ created: 2, wall_clock: 1 });
    expect(wc.toWrite.length).toBe(wc.totals.created);
    // 응답은 판정 결과의 사본이다(응답을 고쳐도 판정 결과가 바뀌지 않는다)
    committed.totals.created = 999;
    committed.written!.rows = 999;
    expect([judged.totals.created, written.rows]).toEqual([1, 1]);
  });

  it('내용 미노출: 응답에는 줄 번호·코드·중복 근거만 — 제목·칸 내용·날짜 원문·넣을 값이 없다', () => {
    const csv = ['제목,비밀 메모,날짜,담당', 'SECRET-제목-가,SECRET-메모-1,2026-11-20 10:00,SECRET-담당-1', 'SECRET-제목-가,SECRET-메모-2,2026-11-20 10:00,x', 'SECRET-제목-나,SECRET-메모-3,SECRET-날짜-원문,x', 'SECRET-제목-다,,2026-11-21 10:00 (GMT+0),x'].join('\n');
    const judged = ok(base(csv, { existing: [{ id: 'row-기존-1', title: 'SECRET-제목-라', value: { type: 'date', start_date: '2026-11-25' } as any }] }));
    const body = buildLectureResponse(judged, { written: { rows: 1, tableId: 'tbl-1', createdTable: false } });
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/SECRET|메모|담당|2026-11-2|Asia\/Seoul|start_date|title/);
    expect(body.rows.every((r) => r.length === 3 && Number.isInteger(r[0]) && typeof r[1] === 'string' && typeof r[2] === 'string')).toBe(true);
    expect('toWrite' in body).toBe(false);
    // 중복 근거로 나가는 식별자는 줄 번호 또는 대상 표의 기존 행 id뿐이다
    const dup = buildLectureResponse(ok(base('제목,날짜\nSECRET-제목-라,2026-11-25', { existing: [{ id: 'row-기존-1', title: 'SECRET-제목-라', value: { type: 'date', start_date: '2026-11-25' } as any }] })));
    expect(dup.dupOf).toEqual(['row-기존-1']);
    expect(JSON.stringify(dup)).not.toContain('SECRET');
  });

  it('최대 10,000행: 가장 긴 사유·근거로 채워도 기본 예산 3,000,000바이트 안이고 잘리지 않는다', () => {
    expect(LECTURE_RESPONSE_BUDGET).toBe(3_000_000);
    const id = (i: number) => `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`; // 행 id 길이(36자)
    const lines = ['제목,날짜'];
    const existing = [];
    for (let i = 0; i < 10_000; i++) {
      lines.push(`강의 ${i},2026-11-20 10:00 → 2026-11-20 12:00`);
      existing.push({ id: id(i), title: `강의 ${i}`, value: { type: 'datetimerange', start_date: '2026-11-20', start_time: '10:00', end_date: '2026-11-20', end_time: '13:00' } as any });
    }
    const judged = ok(base(lines.join('\n'), { existing }));
    expect(judged.totals).toEqual({ rows: 10_000, created: 0, duplicate: 10_000, failed: 0, tz_mismatch: 0, wall_clock: 0 });
    expect(judged.rows[9_999]).toEqual([10_001, 'duplicate', 'dup_table_end_differs']);
    const body = buildLectureResponse(judged, { written: { rows: 0, tableId: id(0), createdTable: false } });
    expect(body.rowsOmitted).toBeUndefined();
    expect(body.rows.length).toBe(10_000);
    const bytes = responseBytes(body);
    expect(bytes).toBeLessThanOrEqual(LECTURE_RESPONSE_BUDGET);
    expect(bytes).toBeGreaterThan(700_000); // 실제로 큰 응답이다(대략 0.9MB)
    expect(bytes).toBe(Buffer.byteLength(JSON.stringify(body), 'utf8'));
  }, 60_000);

  it('예산 경계: 정확히 맞으면 그대로, 1바이트만 모자라도 뒤에서 잘리고 rowsOmitted — 합계·written은 온전', () => {
    // 한글 id(UTF-8 3바이트)를 섞어 글자 수가 아니라 바이트로 재는지 확인한다
    const rows: RowEntry[] = [];
    const dupOf: (number | string | null)[] = [];
    for (let i = 0; i < 400; i++) {
      rows.push([i + 2, i % 3 === 0 ? 'duplicate' : 'created', i % 3 === 0 ? 'dup_table' : '']);
      dupOf.push(i % 3 === 0 ? `행-${i}-가나다` : null);
    }
    const totals = { rows: 400, created: 266, duplicate: 134, failed: 0, tz_mismatch: 0, wall_clock: 7 };
    const written = { rows: 266, tableId: '표-1', createdTable: true };
    const judged = { totals, rows, dupOf };
    const full = buildLectureResponse(judged, { written });
    const S = responseBytes(full);
    expect(JSON.stringify(full).length).toBeLessThan(S); // 글자 수 < 바이트 수(한글)
    expect(buildLectureResponse(judged, { written, budget: S })).toEqual(full);
    expect(buildLectureResponse(judged, { written, budget: S }).rowsOmitted).toBeUndefined();
    const oneShort = buildLectureResponse(judged, { written, budget: S - 1 });
    expect(oneShort.rowsOmitted).toBeGreaterThan(0);
    expect(responseBytes(oneShort)).toBeLessThanOrEqual(S - 1);
    // 예산을 여러 값으로 바꿔 가며: 본문 ≤ 예산, 앞부분 그대로, 빠진 수 = 전체 − 남은 수, 한 행 더 넣으면 넘는다(가장 긴 앞부분)
    const envelope = responseBytes({ totals, rows: [], dupOf: [], rowsOmitted: 400, written });
    let cut = 0;
    for (let budget = envelope; budget < S; budget += 97) {
      const b = buildLectureResponse(judged, { written, budget });
      const kept = b.rows.length;
      expect(responseBytes(b), `budget ${budget}`).toBeLessThanOrEqual(budget);
      expect(b.rows).toEqual(rows.slice(0, kept));
      expect(b.dupOf).toEqual(dupOf.slice(0, kept));
      expect(b.dupOf.length).toBe(kept);
      expect(b.rowsOmitted).toBe(400 - kept);
      expect(b.totals).toEqual(totals);
      expect(b.written).toEqual(written);
      const oneMore = { totals, rows: rows.slice(0, kept + 1), dupOf: dupOf.slice(0, kept + 1), rowsOmitted: 400 - kept - 1, written };
      expect(responseBytes(oneMore), `budget ${budget} +1`).toBeGreaterThan(budget);
      expect(buildLectureResponse(judged, { written, budget })).toEqual(b); // 같은 예산이면 같은 결과
      cut++;
    }
    expect(cut).toBeGreaterThan(50);
    // 예산이 봉투보다 작으면 행을 모두 빼고 합계·written만 남긴다(자르지 않는 칸은 끝까지 온전)
    const tiny = buildLectureResponse(judged, { written, budget: 10 });
    expect(tiny).toEqual({ totals, rows: [], dupOf: [], rowsOmitted: 400, written });
    // 미리보기(written 없음)도 같은 규칙
    const preview = buildLectureResponse(judged, { budget: 2_000 });
    expect(preview.written).toBeUndefined();
    expect(responseBytes(preview)).toBeLessThanOrEqual(2_000);
    expect(preview.rowsOmitted! + preview.rows.length).toBe(400);
    // 판정 결과는 잘라도 바뀌지 않는다
    expect([rows.length, dupOf.length, totals.rows]).toEqual([400, 400, 400]);
  });
});
