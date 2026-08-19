import { requireAuth, isMfaEnrolled } from "@/lib/auth/server";
import { Card } from "@/components/ui/card";
import { SecurityClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  await requireAuth();
  const enrolled = await isMfaEnrolled();

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Segurança</h1>
        <p className="text-sm text-muted-foreground">MFA, recovery codes e sessões.</p>
      </header>



      <SecurityClient mfaEnrolled={enrolled} />
    </div>
  );
}
