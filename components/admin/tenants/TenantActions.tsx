"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SuspendDialog } from "./SuspendDialog";
import { ReactivateDialog } from "./ReactivateDialog";
import { BillingDialog } from "./BillingDialog";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";
import type { TenantOrganization } from "@/hooks/useTenantDetail";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TenantActionsProps {
  organizationId: string;
  status: "active" | "suspended" | "redacted";
  displayName: string;
  organization: TenantOrganization;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TenantActions({
  organizationId,
  status,
  displayName,
  organization,
}: TenantActionsProps) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  const canSuspend = status === "active";
  const isSuspended = status === "suspended";
  const isRedacted = status === "redacted";

  return (
    <>
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ações
        </h2>

        {/* Edit Billing */}
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => setBillingOpen(true)}
          aria-label="Editar Faturamento"
          disabled={isRedacted}
        >
          Editar Faturamento
        </Button>

        {/* Impersonate (S-11.07) */}
        <ImpersonateButton
          organizationId={organizationId}
          displayName={displayName}
          disabled={isRedacted}
          disabledReason={
            isRedacted ? "Tenant redigido — ação não disponível" : undefined
          }
        />

        {/* Suspend */}
        {canSuspend && (
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => setSuspendOpen(true)}
            aria-label="Suspender tenant"
          >
            Suspender tenant
          </Button>
        )}

        {/* Reactivate */}
        {isSuspended && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setReactivateOpen(true)}
            aria-label="Reativar tenant"
          >
            Reativar tenant
          </Button>
        )}

        {isRedacted && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Tenant redigido — ações de gestão não disponíveis.
          </p>
        )}
      </div>

      <SuspendDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        organizationId={organizationId}
      />

      <ReactivateDialog
        open={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        organizationId={organizationId}
      />

      <BillingDialog
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        organization={organization}
      />
    </>
  );
}
