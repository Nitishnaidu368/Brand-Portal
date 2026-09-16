import { sqlClient } from "../src/lib/db";
import { cleanupExpiredUploads } from "../src/lib/uploads";

async function main() {
  let count = 0;
  for (;;) {
    const removed = await cleanupExpiredUploads();
    count += removed;
    if (!removed) break;
  }
  console.log(`Removed ${count} expired staging uploads.`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => sqlClient.end());
