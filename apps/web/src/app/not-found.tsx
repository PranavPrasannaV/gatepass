import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-gatepass-400">404</h1>
      <p className="text-gatepass-500">Page not found</p>
      <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
        Go home
      </Link>
    </div>
  );
}
