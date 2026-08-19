"use server";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export async function requestExtraTokens() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);

  if (!activeOrg || ROLE_RANK[activeOrg.role] < ROLE_RANK.admin) {
    return { ok: false, error: "Permissão insuficiente para gerenciar tokens." };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .update({ tokens_extra_status: "requested" })
    .eq("id", activeOrg.orgId);

  if (error) {
    return { ok: false, error: "Falha ao solicitar tokens extras." };
  }

  await audit({
    organizationId: activeOrg.orgId,
    actorUserId: user.id,
    action: "tenant.tokens_extra.requested",
    resourceType: "organizations",
    resourceId: activeOrg.orgId,
  });

  return { ok: true };
}
