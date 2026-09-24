import Link from "next/link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import ThemeToggle from "./ThemeToggle";

export default function IncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <Link href="/incidents" className="text-sm font-semibold tracking-tight">
          Incident War Room
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-foreground/80 hover:border-black/40 hover:text-foreground dark:border-white/20 dark:hover:border-white/50"
          >
            Studio
            <ArrowTopRightOnSquareIcon className="size-4" />
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
