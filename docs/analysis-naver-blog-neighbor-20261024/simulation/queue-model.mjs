// 단일 프로세스의 순서/경합 모의 모델. DB 잠금·RLS·외부 서비스 성공을 증명하지 않는다.
import { createHash } from 'node:crypto';

export const MAX_CAPS = Object.freeze({ request: 20, like: 100, comment: 30 });
const DAY = 86_400_000;
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const digest = text => createHash('sha256').update(text).digest('hex');
const category = kind => kind === 'reply' ? 'comment' : kind;
export const kstDay = now => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);

class Mutex {
  tail = Promise.resolve();
  async run(fn) {
    let release;
    const previous = this.tail;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    try { return fn(); } finally { release(); }
  }
}

export class QueueModel {
  #lock = new Mutex();
  #jobs = new Map();
  #counts = new Map();
  #slots = new Map();
  #actions = new Map();
  #settings;
  constructor({ userId, actors, caps = {}, enabled = false, policyAllowed = false }) {
    this.userId = userId;
    this.actors = new Set(actors);
    this.#settings = { caps: { ...MAX_CAPS, ...caps }, enabled, policyAllowed, mode: 'review', revision: 1 };
    this.#validateCaps(this.#settings.caps);
  }
  #validateCaps(caps) {
    for (const [key, max] of Object.entries(MAX_CAPS)) {
      if (!Number.isInteger(caps[key]) || caps[key] < 0 || caps[key] > max) fail('invalid_cap');
    }
  }
  #owner(ctx) { if (ctx?.userId !== this.userId) fail('owner_mismatch'); }
  #job(ctx, id) {
    this.#owner(ctx);
    const job = this.#jobs.get(id);
    if (!job) fail('not_found');
    if (!this.actors.has(job.actorId) || ctx.observedActorId !== job.actorId) fail('account_mismatch');
    return job;
  }
  #guard(ctx, job, now) {
    if (ctx.online === false) fail('offline');
    if (!this.#settings.enabled) fail('stopped');
    if (!this.#settings.policyAllowed) fail('policy_unverified');
    if (now >= job.expiresAt) fail('content_expired');
    if (job.approvalHash !== digest(job.body) || job.approvalRevision !== this.#settings.revision) fail('approval_changed');
    if (job.neighborId === job.actorId) fail('own_blog');
    if (job.kind !== 'request' && job.relationship !== 'mutual') fail('not_mutual');
    if (job.kind === 'request' && ['mutual', 'pending'].includes(job.relationship)) fail('already_related');
  }
  #counter(day, kind) {
    const key = `${day}:${category(kind)}`;
    if (!this.#counts.has(key)) this.#counts.set(key, { reserved: 0, succeeded: 0 });
    return this.#counts.get(key);
  }
  #slot(job, day) { return JSON.stringify([job.neighborId, day]); }
  #action(job) { return JSON.stringify([job.actorId, job.neighborId, job.postId, category(job.kind)]); }
  #release(job) {
    this.#counter(job.day, job.kind).reserved--;
    if (this.#slots.get(this.#slot(job, job.day)) === job.id) this.#slots.delete(this.#slot(job, job.day));
    if (this.#actions.get(this.#action(job)) === job.id) this.#actions.delete(this.#action(job));
  }
  #fence(ctx, token) {
    const job = this.#job(ctx, token.id);
    if (job.generation !== token.generation || job.device !== token.device) fail('stale_claim');
    return job;
  }
  settings() { return structuredClone(this.#settings); }
  setSettings(ctx, patch) {
    this.#owner(ctx);
    const next = { ...this.#settings, ...patch, caps: { ...this.#settings.caps, ...patch.caps } };
    if (!['review', 'auto'].includes(next.mode)) fail('invalid_mode');
    this.#validateCaps(next.caps);
    this.#settings = { ...next, revision: this.#settings.revision + 1 };
  }
  add(ctx, input, now) {
    this.#owner(ctx);
    if (this.#jobs.has(input.id)) fail('duplicate_job');
    if (!['request', 'like', 'comment', 'reply'].includes(input.kind)) fail('invalid_kind');
    if (!this.actors.has(input.actorId) || ctx.observedActorId !== input.actorId) fail('account_mismatch');
    this.#jobs.set(input.id, {
      id: input.id, actorId: input.actorId, neighborId: input.neighborId, postId: input.postId ?? '',
      kind: input.kind, body: input.body ?? '', relationship: input.relationship ?? 'unknown',
      liked: input.liked ?? null, createdAt: now, expiresAt: now + 30 * DAY, state: 'draft', generation: 0,
    });
  }
  approve(ctx, id) {
    const job = this.#job(ctx, id);
    if (!['draft', 'ready'].includes(job.state)) fail('not_editable');
    job.approvalHash = digest(job.body);
    job.approvalRevision = this.#settings.revision;
    job.state = 'ready';
  }
  edit(ctx, id, body) {
    const job = this.#job(ctx, id);
    if (!['draft', 'ready'].includes(job.state)) fail('not_editable');
    job.body = body; job.state = 'draft'; job.approvalHash = null;
  }
  observe(ctx, id, { relationship, liked }) {
    const job = this.#job(ctx, id);
    if (relationship !== undefined) job.relationship = relationship;
    if (liked !== undefined) job.liked = liked;
  }
  snapshot(ctx, id) { return structuredClone(this.#job(ctx, id)); }
  usage(day, kind) { return structuredClone(this.#counter(day, kind)); }
  async claim(ctx, id, device, now) {
    return this.#lock.run(() => {
      const job = this.#job(ctx, id), day = kstDay(now);
      this.#guard(ctx, job, now);
      if (['armed', 'uncertain'].includes(job.state)) fail('effect_unconfirmed');
      if (job.state === 'succeeded') fail('already_done');
      if (job.state === 'claimed') {
        if (job.leaseUntil > now && job.day === day) fail('busy');
        this.#release(job); job.state = 'ready';
      }
      if (job.state !== 'ready') fail('not_ready');
      const counter = this.#counter(day, job.kind);
      if (counter.reserved + counter.succeeded >= this.#settings.caps[category(job.kind)]) fail('daily_cap');
      if (category(job.kind) === 'comment' && this.#slots.has(this.#slot(job, day))) fail('neighbor_day_cap');
      if (this.#actions.has(this.#action(job))) fail('duplicate_action');
      counter.reserved++;
      if (category(job.kind) === 'comment') this.#slots.set(this.#slot(job, day), id);
      this.#actions.set(this.#action(job), id);
      Object.assign(job, { state: 'claimed', day, device, generation: job.generation + 1, leaseUntil: now + 60_000 });
      return { id, device, generation: job.generation };
    });
  }
  async arm(ctx, token, now) {
    return this.#lock.run(() => {
      const job = this.#fence(ctx, token);
      this.#guard(ctx, job, now);
      if (job.state !== 'claimed') fail('not_claimed');
      if (job.day !== kstDay(now)) fail('day_changed');
      if (job.leaseUntil <= now) fail('claim_expired');
      const count = this.#counter(job.day, job.kind);
      if (count.reserved + count.succeeded > this.#settings.caps[category(job.kind)]) fail('cap_lowered');
      if (job.kind === 'like' && job.liked !== false) {
        this.#release(job); job.state = 'skipped'; return { ...token, skipped: true };
      }
      job.state = 'armed';
      job.permitUntil = Math.min(now + 30_000, Date.parse(`${job.day}T00:00:00+09:00`) + DAY);
      return { ...token, permitUntil: job.permitUntil };
    });
  }
  canExecute(ctx, token, now) {
    try {
      const job = this.#fence(ctx, token);
      this.#guard(ctx, job, now);
      return job.state === 'armed' && now < job.permitUntil && job.day === kstDay(now);
    } catch { return false; }
  }
  async result(ctx, token, outcome, { matched = false, provedNoEffect = false } = {}) {
    return this.#lock.run(() => {
      const job = this.#fence(ctx, token);
      if (job.state === 'succeeded') {
        if (outcome !== 'success') fail('terminal_result');
        return structuredClone(job);
      }
      if (!['armed', 'uncertain'].includes(job.state)) fail('not_armed');
      if (outcome === 'success' && matched) {
        const count = this.#counter(job.day, job.kind); count.reserved--; count.succeeded++;
        job.state = 'succeeded';
        if (job.kind === 'request') job.relationship = 'pending';
      } else if (outcome === 'no_effect' && provedNoEffect && job.state === 'armed') {
        this.#release(job); job.state = 'failed_no_effect';
      } else {
        job.state = 'uncertain';
      }
      return structuredClone(job);
    });
  }
}
