/**
 * Upload an existing program catalog image to Supabase Storage and update the
 * matching programs.thumbnail_url value.
 *
 * Usage: node scripts/upload-program-thumbnail.mjs <program-slug> <image-path>
 */
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    const [, key, rawValue] = match;
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const [slug, imagePath] = process.argv.slice(2);
if (!slug || !imagePath) {
  console.error("Usage: node scripts/upload-program-thumbnail.mjs <program-slug> <image-path>");
  process.exit(1);
}

const env = readEnvFile(new URL("../.env.local", import.meta.url));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
  process.exit(1);
}

const extension = extname(basename(imagePath)).toLowerCase();
const contentTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const contentType = contentTypes[extension];
if (!contentType) {
  console.error("Only JPG, PNG, and WebP thumbnail files are supported.");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const file = readFileSync(imagePath);
const storagePath = `catalog/${slug}-thumbnail${extension === ".jpeg" ? ".jpg" : extension}`;

const { error: uploadError } = await supabase.storage
  .from("program-images")
  .upload(storagePath, file, { cacheControl: "31536000", contentType, upsert: true });
if (uploadError) {
  console.error(`Storage upload failed: ${uploadError.message}`);
  process.exit(1);
}

const { data: publicUrl } = supabase.storage.from("program-images").getPublicUrl(storagePath);
const thumbnailUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
const { data: updated, error: updateError } = await supabase
  .from("programs")
  .update({ thumbnail_url: thumbnailUrl })
  .eq("slug", slug)
  .select("id, slug, thumbnail_url");
if (updateError) {
  console.error(`Program update failed: ${updateError.message}`);
  process.exit(1);
}
if (!updated?.length) {
  console.error(`No program found for slug: ${slug}`);
  process.exit(1);
}

console.log(JSON.stringify(updated[0]));
