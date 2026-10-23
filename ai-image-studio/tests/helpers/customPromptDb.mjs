import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const actors = { a: randomUUID(), b: randomUUID() };
const cache = new Map();
export function loadTs(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const localRequire = createRequire(filename);
  const requireModule = specifier => {
    const file = path.resolve(path.dirname(filename), specifier + '.ts');
    return specifier.startsWith('.') && fs.existsSync(file) ? loadTs(path.relative(root, file)) : localRequire(specifier);
  };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)(requireModule, mod, mod.exports);
  return mod.exports;
}

export async function createDb() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
    CREATE TABLE public.style_preset_prompts (
      id uuid PRIMARY KEY, style_id text NOT NULL, label text NOT NULL,
      prompt text NOT NULL, display_order integer NOT NULL, created_at timestamptz DEFAULT now()
    );
    GRANT SELECT ON public.style_preset_prompts TO authenticated;
    ALTER TABLE public.style_preset_prompts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_defaults ON public.style_preset_prompts FOR SELECT TO authenticated USING(true);
    CREATE SCHEMA cron;
    CREATE TABLE cron.fixture_jobs(id bigserial PRIMARY KEY, jobname text, schedule text, command text);
    CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS
      $$ INSERT INTO cron.fixture_jobs(jobname,schedule,command) VALUES($1,$2,$3) RETURNING id $$;
  `);
  await db.query('INSERT INTO auth.users(id) VALUES($1),($2)', [actors.a, actors.b]);
  const defaults = JSON.parse(fs.readFileSync(path.join(root, 'lib/prompts/stylePresetPrompts.json'), 'utf8')).map(row => ({ ...row, id: randomUUID() }));
  await db.query(`INSERT INTO public.style_preset_prompts(id,style_id,label,prompt,display_order)
    SELECT id,style_id,label,prompt,display_order FROM jsonb_to_recordset($1::jsonb)
    AS r(id uuid,style_id text,label text,prompt text,display_order integer)`, [JSON.stringify(defaults)]);
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261020004317_image_studio_custom_style_prompts.sql'), 'utf8');
  await db.exec(migration);
  return { db, defaults };
}

export async function asUser(db, id, operation) {
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await operation(); } finally { await db.exec('RESET ROLE'); }
}

// Supabase query-shaped test adapter. SQL runs against actual local Postgres RLS,
// not an in-memory mock of ownership rules. Auth/JWT verification itself is simulated.
export function clientFor(db, userId) {
  class Query {
    constructor(table) {
      if (!['ais_user_style_prompts', 'style_preset_prompts'].includes(table)) throw Error('Unexpected table');
      this.table = table; this.action = 'select'; this.filters = []; this.ordering = []; this.fields = '*';
    }
    select(fields = '*') { this.fields = fields; return this; }
    insert(value) { this.action = 'insert'; this.value = value; return this; }
    update(value) { this.action = 'update'; this.value = value; return this; }
    delete() { this.action = 'delete'; return this; }
    eq(field, value) { this.filters.push([field, '=', value]); return this; }
    gt(field, value) { this.filters.push([field, '>', value]); return this; }
    order(field, options) { this.ordering.push([field, options?.ascending === false ? 'DESC' : 'ASC']); return this; }
    maybeSingle() { this.one = true; return this.run(); }
    single() { this.one = true; this.required = true; return this.run(); }
    then(resolve, reject) { return this.run().then(resolve, reject); }
    async run() {
      const column = name => { if (!/^[a-z_]+$/.test(name)) throw Error('Invalid test column'); return name; };
      const fields = this.fields === '*' ? '*' : this.fields.split(',').map(column).join(',');
      const params = [];
      const parameter = value => { params.push(value); return '$' + params.length; };
      let sql;
      if (this.action === 'insert') {
        const keys = Object.keys(this.value);
        sql = `INSERT INTO public.${this.table}(${keys.map(column).join(',')}) VALUES(${keys.map(key => parameter(this.value[key])).join(',')})`;
      } else if (this.action === 'update') {
        sql = `UPDATE public.${this.table} SET ${Object.keys(this.value).map(key => column(key) + '=' + parameter(this.value[key])).join(',')}`;
      } else sql = this.action === 'delete' ? `DELETE FROM public.${this.table}` : `SELECT ${fields} FROM public.${this.table}`;
      if (this.filters.length) sql += ' WHERE ' + this.filters.map(([key, op, value]) => column(key) + op + parameter(value)).join(' AND ');
      if (this.action === 'select' && this.ordering.length) sql += ' ORDER BY ' + this.ordering.map(([key, direction]) => column(key) + ' ' + direction).join(',');
      if (this.action !== 'select') sql += ' RETURNING ' + fields;
      try {
        const result = await db.transaction(async transaction => {
          await transaction.exec('SET LOCAL ROLE authenticated');
          await transaction.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [userId]);
          return transaction.query(sql, params);
        });
        if (this.required && result.rows.length !== 1) return { data: null, error: { code: 'PGRST116' } };
        return { data: this.one ? result.rows[0] ?? null : result.rows, error: null };
      } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
    }
  }
  return { from: table => new Query(table) };
}
