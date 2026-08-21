"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { validatePlaybookLayerContent } from "@/lib/agent-engine/agent/playbook";

export type SaveBusinessRulesResult =
  | { ok: true }
  | { ok: false; error: string; details?: unknown };

const schema = z.object({
  content: z.string().max(10000), // Markdown content
});

export async function saveBusinessRules(content: string): Promise<SaveBusinessRulesResult> {
  const parsed = schema.safeParse({ content });
  if (!parsed.success) {
    return { ok: false, error: "validation_failed", details: parsed.error.flatten() };
  }

  const authUser = await loadAuthUser();
  if (!authUser) return { ok: false, error: "unauthenticated" };
  const activeOrg = await resolveActiveOrg(authUser);
  if (!activeOrg) return { ok: false, error: "forbidden_tenant" };
  if (!authUser.is_platform_admin && ROLE_RANK[activeOrg.role] < ROLE_RANK.manager) {
    return { ok: false, error: "forbidden_role" };
  }

  // Validate the playbook format (must have a ## heading and <= 200 lines)
  try {
    validatePlaybookLayerContent(parsed.data.content);
  } catch (err: unknown) {
    return { ok: false, error: "invalid_format", details: err instanceof Error ? err.message : String(err) };
  }

  const supabase = createAdminClient();
  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id");
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;

  // 1. Insert into playbook_versions
  const { data: version, error: insertErr } = await supabase
    .from("playbook_versions")
    .insert({
      organization_id: activeOrg.orgId,
      layer: "domain",
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (insertErr || !version) {
    return { ok: false, error: "failed_to_insert_version", details: insertErr?.message };
  }

  // 2. Update pointer (upsert via PostgREST doesn't support partial unique indexes)
  let pointerErr = null;
  const { data: updated, error: updateErr } = await supabase
    .from("playbook_pointers")
    .update({ version_id: version.id })
    .eq("organization_id", activeOrg.orgId)
    .eq("layer", "domain")
    .select("version_id");

  if (updateErr) {
    pointerErr = updateErr;
  } else if (!updated || updated.length === 0) {
    const { error: insertErr } = await supabase
      .from("playbook_pointers")
      .insert({
        organization_id: activeOrg.orgId,
        layer: "domain",
        version_id: version.id,
      });
    if (insertErr && insertErr.code !== "23505") {
      pointerErr = insertErr;
    }
  }

  if (pointerErr) {
    return { ok: false, error: "failed_to_update_pointer", details: `${pointerErr.code} - ${pointerErr.message}` };
  }

  await audit({
    action: "playbook.domain_updated",
    actorUserId: authUser.id,
    organizationId: activeOrg.orgId,
    resourceType: "playbook",
    resourceId: version.id,
    requestId,
    ip,
    userAgent,
    metadata: { layer: "domain" },
  });

  revalidatePath("/app/settings/business-rules");
  return { ok: true };
}
