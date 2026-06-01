import type { ReactNode } from "react";
import AppNav from "@/components/AppNav";

/**
 * App shell layout. Wraps every route in the (app) group with the shared
 * AppNav. The landing page at src/app/page.tsx is NOT in this group, so it
 * stays clean. Route-group folder name is parenthesized and contributes no URL
 * segment: /oaths, /mint, /portfolio resolve directly.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col min-h-full font-sans"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <AppNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
