import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { TenantBillingClient } from "./_client";
import { notFound } from "next/navigation";

export const metadata = { title: "Faturamento do Tenant — Admin" };

export default async function TenantBillingPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, tokens_balance, tokens_extra_status")
    .eq("id", id)
    .single();

  if (!org) {
    return notFound();
  }

  return (
    <TenantBillingClient 
      tenantId={org.id} 
      tokensBalance={org.tokens_balance} 
      tokensStatus={org.tokens_extra_status} 
    />
  );
}
