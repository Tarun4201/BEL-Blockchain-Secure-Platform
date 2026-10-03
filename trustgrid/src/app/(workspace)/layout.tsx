import { redirect } from "next/navigation";
import { getSessionPersona, isChainConfigured } from "@/lib/session";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const persona = await getSessionPersona();
  if (!persona) {
    redirect("/login");
  }

  const chainLive = isChainConfigured();

  return (
    <AppShell persona={persona} chainLive={chainLive}>
      {children}
    </AppShell>
  );
}
