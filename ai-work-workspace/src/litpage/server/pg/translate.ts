// SQLite SQL → Postgres SQL 변환기. 원본 litpage SQL을 고치지 않고 쓰기 위한 것으로, 원본이 실제로 쓰는 문법만
// 다룬다(2026-10-24 원본 서버 전수 조사 기준). 새 SQL을 쓸 때도 SQLite 문법으로 쓰면 이 변환기를 거친다.
//   ?                      → $1, $2 … (따옴표 안은 건드리지 않음)
//   INSERT OR IGNORE INTO  → INSERT INTO … ON CONFLICT DO NOTHING
//   INSERT OR REPLACE INTO → INSERT INTO … ON CONFLICT (기본 키) DO UPDATE SET …   (기본 키는 표 만들 때 기록)
//   LIKE                   → ILIKE (SQLite LIKE는 ASCII 대소문자를 가리지 않음)
//   camelCase 이름         → "camelCase" (Postgres는 따옴표 없는 이름을 소문자로 바꿈)
//   표 만들기·고치기       → INTEGER→BIGINT, REAL→DOUBLE PRECISION, BLOB→BYTEA, AUTOINCREMENT→BIGSERIAL,
//                            ADD COLUMN → ADD COLUMN IF NOT EXISTS, WITHOUT ROWID/STRICT 제거
//   PRAGMA, FTS5 가상 표   → 실행하지 않음(빈 문장)
//   sqlite_master 표 확인  → pg_tables (현재 스키마)
// json_extract(문자, '$.a.b')·json_num·json_valid는 마이그레이션에서 같은 이름의 SQL 함수로 만든다.

const PRIMARY_KEYS = new Map<string, string[]>();

/** 따옴표 밖 구간에만 fn을 적용한다('…', "…" 모두 보존). */
function mapOutsideQuotes(sql: string, fn: (chunk: string) => string): string {
  let out = '';
  let buf = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      out += fn(buf);
      buf = '';
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    buf += ch;
    i++;
  }
  return out + fn(buf);
}

/** 여러 문장을 따옴표 밖의 ;로 나눈다. */
export function splitStatements(sql: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      cur += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          cur += sql[++i];
        } else quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      cur += '\n';
      continue;
    }
    if (ch === ';') {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function rememberPrimaryKey(stmt: string) {
  const m = /^CREATE TABLE(?: IF NOT EXISTS)?\s+("?[\w.]+"?)\s*\(([\s\S]*)\)\s*$/i.exec(stmt.trim());
  if (!m) return;
  const table = m[1].replace(/"/g, '').toLowerCase();
  const body = m[2];
  const composite = /PRIMARY KEY\s*\(([^)]+)\)/i.exec(body);
  if (composite) {
    PRIMARY_KEYS.set(table, composite[1].split(',').map((s) => s.trim()));
    return;
  }
  for (const line of body.split(',')) {
    const col = /^\s*("?\w+"?)\s+\w+[^,]*\bPRIMARY KEY\b/i.exec(line);
    if (col) {
      PRIMARY_KEYS.set(table, [col[1]]);
      return;
    }
  }
}

function translateDdl(stmt: string): string {
  return mapOutsideQuotes(stmt, (c) =>
    c
      .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, 'BIGSERIAL PRIMARY KEY')
      .replace(/\bAUTOINCREMENT\b/gi, '')
      .replace(/\bINTEGER\b/gi, 'BIGINT')
      .replace(/\bREAL\b/gi, 'DOUBLE PRECISION')
      .replace(/\bBLOB\b/gi, 'BYTEA')
      .replace(/\)\s*WITHOUT\s+ROWID\b/gi, ')')
      .replace(/\)\s*STRICT\b/gi, ')')
      .replace(/\bADD COLUMN (?!IF NOT EXISTS)/gi, 'ADD COLUMN IF NOT EXISTS '),
  );
}

function quoteCamel(chunk: string): string {
  // json 경로·문자열은 따옴표 안이라 여기 오지 않는다. $1 같은 자리표시자도 camelCase가 아니다.
  return chunk.replace(/(?<![\w$"])([a-z][a-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, '"$1"');
}

/** 깊이 0의 쉼표로 나눈다(괄호 안 쉼표는 유지). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * ON CONFLICT … DO UPDATE SET a = a + excluded.a 의 오른쪽 `a`를 대상 표 이름으로 한정한다.
 * SQLite는 대상 표의 칸으로 보지만 Postgres는 대상 표와 excluded 중 어느 쪽인지 모호하다며 오류를 낸다.
 */
function qualifyUpsertSet(s: string): string {
  const head = /^INSERT INTO\s+("?[\w.]+"?)\s*\(([^)]*)\)/i.exec(s);
  const at = /\bDO UPDATE SET\b/i.exec(s);
  if (!head || !at) return s;
  const table = head[1];
  const cols = head[2].split(',').map((c) => c.trim().replace(/"/g, '')).filter(Boolean);
  const start = at.index + at[0].length;
  const tail = /\s(WHERE|RETURNING)\s/i.exec(s.slice(start));
  const end = tail ? start + tail.index : s.length;
  const assignments = splitTopLevel(s.slice(start, end)).map((a) => {
    const eq = a.indexOf('=');
    if (eq < 0) return a;
    const lhs = a.slice(0, eq);
    let rhs = a.slice(eq + 1);
    for (const c of cols) {
      rhs = rhs.replace(new RegExp(`(?<![\\w."])${c}\\b(?!\\s*\\()`, 'g'), `${table}.${c}`);
    }
    return `${lhs}=${rhs}`;
  });
  return s.slice(0, start) + assignments.join(',') + s.slice(end);
}

/** 한 문장을 변환한다. 실행할 필요가 없는 문장은 빈 문자열을 돌려준다. */
export function translateStatement(stmt: string): string {
  let s = stmt.trim();
  if (!s) return '';
  if (/^PRAGMA\b/i.test(s)) return '';
  if (/^CREATE VIRTUAL TABLE\b/i.test(s)) return '';
  if (/^BEGIN(\s+(IMMEDIATE|DEFERRED|EXCLUSIVE))?(\s+TRANSACTION)?$/i.test(s)) return 'BEGIN';
  // 표 존재 확인: SQLite 표 목록 → 현재 스키마의 Postgres 표 목록
  s = s.replace(/FROM sqlite_master WHERE type = 'table' AND name\b/gi, 'FROM pg_tables WHERE schemaname = current_schema() AND tablename');
  const isDdl = /^(CREATE|ALTER|DROP)\b/i.test(s);
  if (/^CREATE TABLE\b/i.test(s)) rememberPrimaryKey(s);
  if (isDdl) s = translateDdl(s);

  let conflict = '';
  const orIgnore = /^INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(s);
  const orReplace = /^INSERT\s+OR\s+REPLACE\s+INTO\b/i.test(s);
  if (orIgnore) {
    s = s.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO');
    conflict = ' ON CONFLICT DO NOTHING';
  } else if (orReplace) {
    s = s.replace(/^INSERT\s+OR\s+REPLACE\s+INTO\b/i, 'INSERT INTO');
    const m = /^INSERT INTO\s+("?[\w.]+"?)\s*\(([^)]*)\)/i.exec(s);
    const table = m?.[1].replace(/"/g, '').toLowerCase() ?? '';
    const pk = PRIMARY_KEYS.get(table);
    if (!m || !pk) throw new Error(`INSERT OR REPLACE: 기본 키를 모르는 표입니다 (${table})`);
    const cols = m[2].split(',').map((x) => x.trim());
    const pkSet = new Set(pk.map((x) => x.replace(/"/g, '').toLowerCase()));
    const sets = cols.filter((c) => !pkSet.has(c.replace(/"/g, '').toLowerCase())).map((c) => `${c} = EXCLUDED.${c}`);
    conflict = sets.length ? ` ON CONFLICT (${pk.join(', ')}) DO UPDATE SET ${sets.join(', ')}` : ` ON CONFLICT (${pk.join(', ')}) DO NOTHING`;
  }

  if (/^INSERT INTO\b/i.test(s)) s = qualifyUpsertSet(s);

  let n = 0;
  s = mapOutsideQuotes(s, (c) =>
    quoteCamel(
      c
        .replace(/\bLIKE\b/g, 'ILIKE')
        // SQLite `x IS ?` / `x IS NOT ?` (NULL도 같은 값으로 비교) → Postgres DISTINCT FROM
        .replace(/\bIS\s+NOT\s+\?/gi, 'IS DISTINCT FROM ?')
        .replace(/\bIS\s+\?/gi, 'IS NOT DISTINCT FROM ?')
        .replace(/\?/g, () => `$${++n}`),
    ),
  );

  if (conflict) {
    const ret = /\sRETURNING\s[\s\S]*$/i.exec(s);
    s = ret ? s.slice(0, ret.index) + conflict + ret[0] : s + conflict;
  }
  return s;
}

/** 한 문장짜리 질의를 변환한다(prepare용). */
export function translateQuery(sql: string): string {
  const parts = splitStatements(sql);
  if (parts.length > 1) throw new Error('prepare()에는 문장 하나만 넣을 수 있습니다.');
  return translateStatement(parts[0] ?? '');
}

/** 여러 문장 묶음을 변환한다(exec용). 빈 문장은 뺀다. */
export function translateBatch(sql: string): string[] {
  return splitStatements(sql).map(translateStatement).filter(Boolean);
}
