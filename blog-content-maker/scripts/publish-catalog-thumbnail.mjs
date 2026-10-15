// Catalog artwork is public; member-generated images remain in the private app bucket.
// Platform DB credentials are loaded locally and never printed or sent to image generation.
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
const env = Object.fromEntries((await fs.readFile(new URL('../.env.local', import.meta.url), 'utf8')).split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const n = l.indexOf('='); const v = l.slice(n + 1).trim(); return [l.slice(0, n), v.startsWith('"') ? JSON.parse(v) : v]; }));
if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'esgxyikcnnvmlhygjkth.supabase.co') throw new Error('Unexpected platform database');
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const slug = 'blog-content-maker';
const { data: program, error: lookupError } = await client.from('programs').select('id,slug').eq('slug', slug).single();
if (lookupError || program?.id !== '5299d74c-ea40-4452-a9cc-0fd96ced44d0') throw new Error('Expected existing catalog registration missing');
const bytes = await fs.readFile(new URL('../docs/assets/blog-content-maker-thumbnail.jpg', import.meta.url));
const path = `catalog/${slug}-thumbnail.jpg`;
const { error } = await client.storage.from('program-images').upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });
if (error) throw new Error(error.message);
const { data } = client.storage.from('program-images').getPublicUrl(path);
const thumbnailUrl = `${data.publicUrl}?v=${Date.now()}`;
// The metadata update is recorded separately as SQL, and applied only after this check.
const response = await fetch(thumbnailUrl);
if (!response.ok) throw new Error(`Public thumbnail HTTP ${response.status}`);
const downloaded = Buffer.from(await response.arrayBuffer());
if (!bytes.equals(downloaded)) throw new Error('Published thumbnail differs from the approved image');
await fs.writeFile(new URL('../docs/catalog-thumbnail-release-20261016.json', import.meta.url), JSON.stringify({ slug, thumbnail_url: thumbnailUrl, storage_bucket: 'program-images', storage_path: path, width: 1600, height: 900, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), public_http: response.status }, null, 2) + '\n');
console.log(JSON.stringify({ uploaded: true, thumbnail_url: thumbnailUrl, bytes: bytes.length, verified: true }));
