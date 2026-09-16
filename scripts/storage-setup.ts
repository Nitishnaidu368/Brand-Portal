import { MAX_UPLOAD_BYTES } from "../src/lib/config";
import { STORAGE_BUCKET, supabase } from "../src/lib/storage";

async function main() {
  const storage = supabase().storage;
  const { data, error } = await storage.listBuckets();
  if (error) throw error;
  const options = { public: false, fileSizeLimit: MAX_UPLOAD_BYTES };
  const result = data.some((bucket) => bucket.id === STORAGE_BUCKET)
    ? await storage.updateBucket(STORAGE_BUCKET, options)
    : await storage.createBucket(STORAGE_BUCKET, options);
  if (result.error) throw result.error;
  console.log(`Private bucket ${STORAGE_BUCKET} configured with a ${MAX_UPLOAD_BYTES}-byte limit.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
