import { auth } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { LiveRefresh } from "@/components/LiveRefresh";
import { IdleLogout } from "@/components/IdleLogout";

export const dynamic = "force-dynamic";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <LiveRefresh />
      <IdleLogout />
      <Nav userName={session?.user?.name} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
