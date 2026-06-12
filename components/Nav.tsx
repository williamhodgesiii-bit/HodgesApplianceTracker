"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { doSignOut } from "@/app/(authed)/sign-out-action";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/add", label: "Add Appliance" },
  { href: "/appliances", label: "All Appliances" },
  { href: "/report", label: "Report" },
  { href: "/import", label: "Import" },
];

export function Nav({ userName }: { userName?: string | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-blue-700">
          🦷 Appliance Tracker
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive(link.href)
                  ? "bg-blue-100 text-blue-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link
            href="/account"
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              isActive("/account")
                ? "bg-blue-100 text-blue-800"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {userName ?? "Account"}
          </Link>
          <form action={doSignOut}>
            <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
