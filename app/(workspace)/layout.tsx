import { AppShell } from '@/components/layout/app-shell';

/**
 * The server build protects these routes in middleware; the static build has no
 * middleware, so AppShell renders the same pages inside a client-side AuthGate
 * (see components/layout/app-shell.tsx).
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
