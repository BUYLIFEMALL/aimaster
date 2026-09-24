const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function getAllBucketFiles(bucketName, pathStr = '') {
  let files = [];
  const { data: items, error } = await supabase.storage.from(bucketName).list(pathStr, { limit: 1000 });
  if (error || !items) return files;

  for (const item of items) {
    const fullPath = pathStr ? `${pathStr}/${item.name}` : item.name;
    // Check if folder (item.id === null or metadata === null or no size)
    if (!item.id && !item.metadata) {
      const subFiles = await getAllBucketFiles(bucketName, fullPath);
      files.push(...subFiles);
    } else {
      files.push({ ...item, fullPath });
    }
  }
  return files;
}

async function test() {
  const start = Date.now();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets) return;

  const results = await Promise.all(
    buckets.map(async (b) => {
      const files = await getAllBucketFiles(b.name);
      let audioCount = 0, audioBytes = 0;
      let imageCount = 0, imageBytes = 0;
      let videoCount = 0, videoBytes = 0;
      let otherCount = 0, otherBytes = 0;
      let totalBytes = 0;

      for (const f of files) {
        const size = f.metadata?.size || f.size || 0;
        const mime = (f.metadata?.mimetype || f.mimetype || '').toLowerCase();
        const name = f.name.toLowerCase();

        totalBytes += size;

        if (
          mime.startsWith('audio/') ||
          name.endsWith('.mp3') ||
          name.endsWith('.wav') ||
          name.endsWith('.m4a') ||
          name.endsWith('.ogg')
        ) {
          audioCount += 1;
          audioBytes += size;
        } else if (
          mime.startsWith('image/') ||
          name.endsWith('.png') ||
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.webp') ||
          name.endsWith('.gif')
        ) {
          imageCount += 1;
          imageBytes += size;
        } else if (
          mime.startsWith('video/') ||
          name.endsWith('.mp4') ||
          name.endsWith('.webm') ||
          name.endsWith('.mov')
        ) {
          videoCount += 1;
          videoBytes += size;
        } else {
          otherCount += 1;
          otherBytes += size;
        }
      }

      return {
        bucket: b.name,
        fileCount: files.length,
        audioCount,
        audioBytes,
        imageCount,
        imageBytes,
        videoCount,
        videoBytes,
        otherCount,
        otherBytes,
        totalBytes,
        sizeFormatted: totalBytes > 1024 * 1024 ? (totalBytes / (1024 * 1024)).toFixed(2) + ' MB' : (totalBytes / 1024).toFixed(1) + ' KB'
      };
    })
  );

  console.log('Results in', Date.now() - start, 'ms:');
  console.log(JSON.stringify(results, null, 2));
}

test();
