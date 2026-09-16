export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-zinc-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-zinc-500">Check the link, or ask whoever shared it with you for a new one.</p>
    </div>
  );
}
