/** Prepared ZIPs are uploaded to a Downloads block or a page button. */
export function GET() {
  return new Response("Automatic ZIP downloads are no longer available. Use the portal’s uploaded files.", {
    status: 410,
    headers: { "Cache-Control": "no-store" },
  });
}
