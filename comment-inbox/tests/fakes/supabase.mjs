// 메모리 가짜 Supabase — 게시 함수·그날 목록이 쓰는 만큼만(select·update·eq·neq·gte·lt·in·or·order·limit·maybeSingle).
// 한 요청의 조건 확인과 값 변경은 한 번에(중간에 다른 요청이 끼지 않게) 처리해 DB의 행 단위 원자성과 같게 동작한다.
export function createFakeSupabase(tables) {
  return { from: (name) => new Query(tables, name) };
}

class Query {
  constructor(tables, name) {
    this.tables = tables;
    this.name = name;
    this.filters = [];
    this.op = "select";
    this.values = null;
    this.returning = false;
    this.single = false;
  }
  select() {
    if (this.op === "update") this.returning = true;
    return this;
  }
  update(values) {
    this.op = "update";
    this.values = values;
    return this;
  }
  eq(col, val) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  neq(col, val) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }
  gte(col, val) {
    this.filters.push((r) => r[col] != null && r[col] >= val);
    return this;
  }
  lt(col, val) {
    this.filters.push((r) => r[col] != null && r[col] < val);
    return this;
  }
  in(col, vals) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  order(col, { ascending = true } = {}) {
    this.sort = [col, ascending];
    return this;
  }
  limit(n) {
    this.max = n;
    return this;
  }
  // PostgREST or 문법 중 게시 함수가 쓰는 것만: "칸.is.null,칸.lt.값"
  or(expr) {
    const parts = expr.split(",");
    this.filters.push((r) =>
      parts.some((p) => {
        const [col, op, ...rest] = p.split(".");
        const val = rest.join(".");
        if (op === "is" && val === "null") return r[col] == null;
        if (op === "lt") return r[col] != null && r[col] < val;
        throw new Error(`가짜 DB가 모르는 조건: ${p}`);
      }),
    );
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve().then(() => this.run()).then(resolve, reject);
  }
  run() {
    const rows = (this.tables[this.name] ??= []).filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") {
      for (const r of rows) Object.assign(r, this.values);
      return { data: this.returning ? rows.map((r) => ({ id: r.id })) : null, error: null };
    }
    if (this.sort) {
      const [col, asc] = this.sort;
      rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.max != null) rows.splice(this.max);
    if (this.single) return { data: rows[0] ? { ...rows[0] } : null, error: null };
    return { data: rows.map((r) => ({ ...r })), error: null };
  }
}
