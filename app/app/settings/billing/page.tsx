import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { TenantBillingClient } from "./_client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Faturamento" };

export default async function BillingPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg || ROLE_RANK[activeOrg.role] < ROLE_RANK.admin) {
    redirect("/403");
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("tokens_balance, tokens_extra_status")
    .eq("id", activeOrg.orgId)
    .single();

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Faturamento</h1>
        <p className="text-sm text-muted-foreground">Planos, limites e consumo de IA.</p>
      </header>
      
      {org ? (
        <TenantBillingClient 
          tokensBalance={org.tokens_balance} 
          tokensStatus={org.tokens_extra_status} 
        />
      ) : (
        <p>Erro ao carregar dados de consumo.</p>
      )}
    </div>
  );
}
