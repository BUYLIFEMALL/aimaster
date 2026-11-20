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
/** 응답 만들기가 성공해야 하는 자리: 본문을 꺼내고, 본문이 예산 이하이며 bytes가 실제 크기와 같은지 함께 확인한다 */
const built = (...args: Parameters<typeof buildLectureResponse>) => {
  const r = buildLectureResponse(...args);
  expect(r.ok, JSON.stringify(r).slice(0, 200)).toBe(true);
  const okR = r as Extract<typeof r, { ok: true }>;
  expect(okR.bytes).toBe(responseBytes(okR.body));
  expect(okR.bytes).toBeLessThanOrEqual(args[1]?.budget ?? LECTURE_RESPONSE_BUDGET);
  return okR.body;
};

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
    expect(r.totals).toEqual({ rows: 11, created: 4, duplicate: 1, failed: 5, tz_mismatch: 1, wall_clock: 0, similar: 1 });
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
    expect(r.totals).toEqual({ rows: 11, created: 5, duplicate: 1, failed: 5, tz_mismatch: 0, wall_clock: 1, similar: 1 });
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
    expect(second.totals).toEqual({ rows: 11, created: 0, duplicate: 5, failed: 5, tz_mismatch: 1, wall_clock: 0, similar: 0 });
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
    expect(ok(base('제목,날짜\n')).totals).toEqual({ rows: 0, created: 0, duplicate: 0, failed: 0, tz_mismatch: 0, wall_clock: 0, similar: 0 });
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
    expect(JSON.stringify(built(a))).toBe(JSON.stringify(built(reversed)));
  });
});

describe('결과 계약(§5-2): 응답 모양과 예산', () => {
  it('미리보기와 확정 응답은 같은 모양 — 확정에만 written이 붙고, 서버가 계산한 「달라진 것」 칸은 없다', () => {
    const judged = ok(base('제목,날짜\nA,2026-11-20\nA,2026-11-20\nB,어제'));
    const preview = built(judged);
    expect(preview).toEqual({ totals: { rows: 3, created: 1, duplicate: 1, failed: 1, tz_mismatch: 0, wall_clock: 0, similar: 0 }, rows: [[2, 'created', ''], [3, 'duplicate', 'dup_file'], [4, 'failed', 'unsupported_format']], dupOf: [null, 2, null] });
    const written = { rows: judged.totals.created, tableId: 'tbl-1', createdTable: true };
    const committed = built(judged, { written });
    expect(committed).toEqual({ ...preview, written });
    expect(Object.keys(committed).sort()).toEqual(['dupOf', 'rows', 'totals', 'written']);
    expect(Object.keys(preview).sort()).toEqual(['dupOf', 'rows', 'totals']);
    // written.rows는 벽시계 예외로 넣은 행을 포함한 전체 삽입 수 = totals.created
    const wc = ok(base('제목,날짜\nA,2026-11-20 10:00 (GMT+0)\nB,2026-11-20 11:00', { wallClock: true }));
    expect(wc.totals).toMatchObject({ created: 2, wall_clock: 1, similar: 0 });
    expect(wc.toWrite.length).toBe(wc.totals.created);
    // 응답은 판정 결과의 사본이다(응답을 고쳐도 판정 결과가 바뀌지 않는다)
    committed.totals.created = 999;
    committed.written!.rows = 999;
    expect([judged.totals.created, written.rows]).toEqual([1, 1]);
  });

  it('내용 미노출: 응답에는 줄 번호·코드·중복 근거만 — 제목·칸 내용·날짜 원문·넣을 값이 없다', () => {
    const csv = ['제목,비밀 메모,날짜,담당', 'SECRET-제목-가,SECRET-메모-1,2026-11-20 10:00,SECRET-담당-1', 'SECRET-제목-가,SECRET-메모-2,2026-11-20 10:00,x', 'SECRET-제목-나,SECRET-메모-3,SECRET-날짜-원문,x', 'SECRET-제목-다,,2026-11-21 10:00 (GMT+0),x'].join('\n');
    const judged = ok(base(csv, { existing: [{ id: 'row-기존-1', title: 'SECRET-제목-라', value: { type: 'date', start_date: '2026-11-25' } as any }] }));
    const body = built(judged, { written: { rows: 1, tableId: 'tbl-1', createdTable: false } });
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/SECRET|메모|담당|2026-11-2|Asia\/Seoul|start_date|title/);
    expect(body.rows.every((r) => r.length === 3 && Number.isInteger(r[0]) && typeof r[1] === 'string' && typeof r[2] === 'string')).toBe(true);
    expect('toWrite' in body).toBe(false);
    // 중복 근거로 나가는 식별자는 줄 번호 또는 대상 표의 기존 행 id뿐이다
    const dup = built(ok(base('제목,날짜\nSECRET-제목-라,2026-11-25', { existing: [{ id: 'row-기존-1', title: 'SECRET-제목-라', value: { type: 'date', start_date: '2026-11-25' } as any }] })));
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
    expect(judged.totals).toEqual({ rows: 10_000, created: 0, duplicate: 10_000, failed: 0, tz_mismatch: 0, wall_clock: 0, similar: 0 });
    expect(judged.rows[9_999]).toEqual([10_001, 'duplicate', 'dup_table_end_differs']);
    const body = built(judged, { written: { rows: 0, tableId: id(0), createdTable: false } });
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
    const totals = { rows: 400, created: 266, duplicate: 134, failed: 0, tz_mismatch: 0, wall_clock: 7, similar: 3 };
    const written = { rows: 266, tableId: '표-1', createdTable: true };
    const judged = { totals, rows, dupOf };
    const full = built(judged, { written });
    const S = responseBytes(full);
    expect(JSON.stringify(full).length).toBeLessThan(S); // 글자 수 < 바이트 수(한글)
    expect(built(judged, { written, budget: S })).toEqual(full);
    expect(built(judged, { written, budget: S }).rowsOmitted).toBeUndefined();
    const oneShort = built(judged, { written, budget: S - 1 });
    expect(oneShort.rowsOmitted).toBeGreaterThan(0);
    expect(responseBytes(oneShort)).toBeLessThanOrEqual(S - 1);
    // 예산을 여러 값으로 바꿔 가며: 본문 ≤ 예산, 앞부분 그대로, 빠진 수 = 전체 − 남은 수, 한 행 더 넣으면 넘는다(가장 긴 앞부분)
    const envelope = responseBytes({ totals, rows: [], dupOf: [], rowsOmitted: 400, written });
    let cut = 0;
    for (let budget = envelope; budget < S; budget += 97) {
      const b = built(judged, { written, budget });
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
      expect(built(judged, { written, budget })).toEqual(b); // 같은 예산이면 같은 결과
      cut++;
    }
    expect(cut).toBeGreaterThan(50);
    // 예산이 최소 본문과 정확히 같으면 줄별 상세 0개로 성공(합계·written 온전), 1바이트라도 모자라면 성공이 아니다
    expect(built(judged, { written, budget: envelope })).toEqual({ totals, rows: [], dupOf: [], rowsOmitted: 400, written });
    expect(buildLectureResponse(judged, { written, budget: envelope - 1 })).toEqual({ ok: false, error: { code: 'budget_too_small', needed: envelope, budget: envelope - 1 } });
    // 미리보기(written 없음)도 같은 규칙
    const preview = built(judged, { budget: 2_000 });
    expect(preview.written).toBeUndefined();
    expect(responseBytes(preview)).toBeLessThanOrEqual(2_000);
    expect(preview.rowsOmitted! + preview.rows.length).toBe(400);
    // 판정 결과는 잘라도 바뀌지 않는다
    expect([rows.length, dupOf.length, totals.rows]).toEqual([400, 400, 400]);
  });

  it('예산을 넘는 성공 본문은 없다: 최소 본문 미만·비정상 예산은 성공과 구별되는 실패로 돌아온다', () => {
    const judged = ok(base('제목,날짜\nA,2026-11-20\nA,2026-11-20\nB,어제'));
    const written = { rows: 1, tableId: 'tbl-1', createdTable: true };
    for (const w of [undefined, written]) {
      const opts = w ? { written: w } : {};
      const min = responseBytes({ totals: judged.totals, rows: [], dupOf: [], rowsOmitted: 3, ...(w ? { written: w } : {}) });
      // 정확히 최소: 성공, 줄별 상세 0개, 합계·written 온전
      const atMin = buildLectureResponse(judged, { ...opts, budget: min });
      expect(atMin).toEqual({ ok: true, bytes: min, body: { totals: judged.totals, rows: [], dupOf: [], rowsOmitted: 3, ...(w ? { written: w } : {}) } });
      // 최소 미만: 1바이트만 모자라도 실패 — 본문이 없고, 필요한 크기를 알려 준다
      for (const budget of [min - 1, Math.floor(min / 2), 10, 1]) {
        const r = buildLectureResponse(judged, { ...opts, budget });
        expect(r, `budget ${budget}`).toEqual({ ok: false, error: { code: 'budget_too_small', needed: min, budget } });
        expect('body' in r).toBe(false);
      }
    }
    // 비정상 예산: 0·음수·소수·NaN·무한대·숫자 아님
    for (const budget of [0, -1, -3_000_000, 1.5, 2_999_999.9, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 2, '3000000', null, {}, [], true] as unknown as number[]) {
      expect(buildLectureResponse(judged, { budget }), String(budget)).toEqual({ ok: false, error: { code: 'budget_invalid' } });
    }
    // 예산을 주지 않으면 기본값, 아주 큰 정상 예산도 성공
    expect(buildLectureResponse(judged).ok).toBe(true);
    expect(buildLectureResponse(judged, { budget: Number.MAX_SAFE_INTEGER }).ok).toBe(true);
    // 행이 없는 판정: 자를 것이 없으므로 본문 전체가 최소 본문이다
    const empty = ok(base('제목,날짜\n'));
    const emptyMin = responseBytes({ totals: empty.totals, rows: [], dupOf: [] });
    expect(buildLectureResponse(empty, { budget: emptyMin })).toEqual({ ok: true, bytes: emptyMin, body: { totals: empty.totals, rows: [], dupOf: [] } });
    expect(buildLectureResponse(empty, { budget: emptyMin - 1 })).toEqual({ ok: false, error: { code: 'budget_too_small', needed: emptyMin, budget: emptyMin - 1 } });
    // 성공 결과에서만 본문을 꺼낼 수 있다(타입으로 강제)
    const r = buildLectureResponse(judged, { budget: 5 });
    // @ts-expect-error 성공 여부를 보지 않고는 body에 닿을 수 없다
    void r.body;
    if (r.ok) throw new Error('성공하면 안 된다');
    expect(r.error.code).toBe('budget_too_small');
  });

  it('잘리는 순서와 UTF-8 경계: 뒤에서부터 행 단위로만 — 1바이트씩 예산을 바꿔도 본문은 예산 이하이고 온전한 JSON이다', () => {
    // 근거 id에 한글(3바이트)·이모지(4바이트, 대리쌍)를 섞는다
    const rows: RowEntry[] = [];
    const dupOf: (number | string | null)[] = [];
    for (let i = 0; i < 24; i++) {
      rows.push([i + 2, 'duplicate', i % 2 ? 'dup_table' : 'dup_table_end_differs']);
      dupOf.push(i % 3 === 0 ? `행-${i}-가나다` : i % 3 === 1 ? `row-${i}-📅📌` : i + 1);
    }
    const totals = { rows: 24, created: 0, duplicate: 24, failed: 0, tz_mismatch: 0, wall_clock: 0, similar: 0 };
    const written = { rows: 0, tableId: '표-📅', createdTable: false };
    const judged = { totals, rows, dupOf };
    const full = built(judged, { written });
    const S = responseBytes(full);
    const min = responseBytes({ totals, rows: [], dupOf: [], rowsOmitted: 24, written });
    let lastKept = -1;
    const keptSeen = new Set<number>();
    for (let budget = min; budget <= S; budget++) {
      const r = buildLectureResponse(judged, { written, budget });
      if (!r.ok) throw new Error(`budget ${budget}: ${JSON.stringify(r.error)}`);
      const text = JSON.stringify(r.body);
      expect(Buffer.byteLength(text, 'utf8'), `budget ${budget}`).toBeLessThanOrEqual(budget);
      expect(r.bytes).toBe(Buffer.byteLength(text, 'utf8'));
      // 온전한 JSON이고 글자가 깨지지 않았다(대리쌍 반쪽·잘린 다중 바이트 없음)
      expect(JSON.parse(text)).toEqual(r.body);
      expect(Buffer.from(text, 'utf8').toString('utf8')).toBe(text);
      expect(text).not.toContain('\uFFFD');
      const kept = r.body.rows.length;
      // 앞에서부터 그대로, 뒤에서만 빠진다
      expect(r.body.rows).toEqual(rows.slice(0, kept));
      expect(r.body.dupOf).toEqual(dupOf.slice(0, kept));
      if (kept < 24) expect(r.body.rowsOmitted).toBe(24 - kept);
      else expect('rowsOmitted' in r.body).toBe(false);
      expect(r.body.totals).toEqual(totals);
      expect(r.body.written).toEqual(written);
      // 예산이 늘면 남는 행 수는 줄지 않는다
      expect(kept).toBeGreaterThanOrEqual(lastKept);
      lastKept = kept;
      keptSeen.add(kept);
    }
    expect(lastKept).toBe(24);
    expect(keptSeen.size).toBe(25); // 0개부터 24개까지 모든 길이가 한 번씩은 나온다(행 단위로만 잘린다)
    expect(buildLectureResponse(judged, { written, budget: min - 1 }).ok).toBe(false);
  });

  it('벽시계 예외와 비슷한 일정이 겹치면 한 낱말(wall_clock_similar)로 싣고 두 부분집계에 모두 잡힌다 — 어느 경고도 잃지 않는다', () => {
    const csv = ['제목,날짜', 'A,2026-11-20', 'A,2026-11-20 10:00 (GMT+0)', 'B,2026-11-21 10:00 (GMT+0)', 'C,2026-11-22', 'C,2026-11-22 09:00'].join('\n');
    const r = ok(base(csv, { wallClock: true }));
    expect(r.rows).toEqual([
      [2, 'created', ''],
      [3, 'created', 'wall_clock_similar'], // 표기 불일치를 그대로 넣었고, 같은 날 하루 종일 일정도 있다
      [4, 'created', 'wall_clock'],
      [5, 'created', ''],
      [6, 'created', 'similar'],
    ]);
    expect(r.totals).toEqual({ rows: 5, created: 5, duplicate: 0, failed: 0, tz_mismatch: 0, wall_clock: 2, similar: 2 });
    expect(sum(r.totals)).toBe(r.totals.rows);
    // 부분집계는 사유 코드에서 다시 셀 수 있다(집계와 줄별 상세가 어긋나지 않는다)
    const count = (...reasons: string[]) => r.rows.filter((x) => x[1] === 'created' && reasons.includes(x[2])).length;
    expect([count('wall_clock', 'wall_clock_similar'), count('similar', 'wall_clock_similar')]).toEqual([r.totals.wall_clock, r.totals.similar]);
    // 예외를 고르지 않으면 불일치 줄은 보류이고, 보류 줄은 비슷한 일정의 근거가 되지 않는다
    const plain = ok(base(csv));
    expect(plain.rows).toEqual([[2, 'created', ''], [3, 'tz_mismatch', 'tz_start'], [4, 'tz_mismatch', 'tz_start'], [5, 'created', ''], [6, 'created', 'similar']]);
    expect(plain.totals).toEqual({ rows: 5, created: 3, duplicate: 0, failed: 0, tz_mismatch: 2, wall_clock: 0, similar: 1 });
  });
});
