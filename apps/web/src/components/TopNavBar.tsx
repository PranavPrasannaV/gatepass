"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function TopNavBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/findings?q=${encodeURIComponent(q)}` : "/findings");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gatepass-200 bg-white px-6 dark:border-gatepass-700 dark:bg-gatepass-900">
      {/* Search — submits to the findings page filter */}
      <form onSubmit={submit} className="relative w-full max-w-[400px]">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gatepass-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search findings by class, path, severity…"
          className="h-9 w-full rounded-md border border-gatepass-300 bg-white pl-9 pr-3 text-sm text-gatepass-900 placeholder:text-gatepass-400 focus:outline-2 focus:outline-offset-2 focus:outline-accent-600 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-100 dark:placeholder:text-gatepass-500"
        />
      </form>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gatepass-100 text-gatepass-500 dark:bg-gatepass-800 dark:text-gatepass-400">
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
