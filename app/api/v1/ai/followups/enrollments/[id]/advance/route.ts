import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIVE_STATUSES = ["active", "waiting_reply", "paused_handoff"];

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const { id } = await ctx.params;
  if (!UUID_RX.test(id)) {
    return fail("invalid_request", "id inválido.", 400, { requestId });
  }

  const authz = await requireRole("manager", { requestId, resource: "followup_enrollments" });
  if (!authz.ok) return authz.response;
  const { user, org: activeOrg } = authz;

  const supabase = await createClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("followup_enrollments")
    .select("id, status, current_node_id")
    .eq("id", id)
    .eq("organization_id", activeOrg.orgId)
    .maybeSingle();
  if (fetchErr) return fail("internal_error", fetchErr.message, 500, { requestId });
  if (!existing) return fail("not_found", "Enrollment não encontrado.", 404, { requestId });

  if (!LIVE_STATUSES.includes(existing.status)) {
    return fail("already_terminal", "Enrollment já está encerrado.", 409, { requestId });
  }

  const { data: updated, error: updErr } = await supabase
    .from("followup_enrollments")
    .update({
      status: "active",
      next_eval_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", activeOrg.orgId)
    .select("id, status, updated_at")
    .single();
  if (updErr || !updated) {
    return fail("internal_error", updErr?.message ?? "followup_enrollment_advance_failed", 500, {
      requestId,
    });
  }

  const { error: eventErr } = await supabase.from("followup_enrollment_events").insert({
    organization_id: activeOrg.orgId,
    enrollment_id: id,
    node_id: existing.current_node_id,
    event_type: "advanced_manual",
    payload: { actor_user_id: user.id },
  });
  if (eventErr) {
    logger.error("[followup.enrollment.advance] event insert failed", { error: eventErr.message, requestId });
  }

  void audit({
    action: "followup_enrollment.advanced",
    actorUserId: user.id,
    organizationId: activeOrg.orgId,
    resourceType: "followup_enrollment",
    resourceId: id,
    requestId,
    metadata: { previous_status: existing.status },
  });

  return ok(updated, { requestId });
}
