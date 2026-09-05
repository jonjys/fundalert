import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="mono text-lime">404</p>
      <h1 className="mt-2 text-3xl font-semibold">No signal on this coordinate</h1>
      <Link href="/signals" className="mt-6 inline-block text-sm text-lime hover:underline">
        Back to signals
      </Link>
    </main>
  );
}
