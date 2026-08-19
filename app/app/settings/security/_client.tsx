"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecoveryCodesPanel } from "@/components/auth/RecoveryCodesPanel";
import { MfaEnrollModal } from "@/components/auth/MfaEnrollModal";
import { regenerateRecoveryCodes } from "@/app/actions/settings/regenerateRecoveryCodes";
import { signOutEverywhere } from "@/app/actions/settings/signOutEverywhere";
import { unenrollMfa } from "@/app/actions/settings/unenrollMfa";

export function SecurityClient({ mfaEnrolled }: { mfaEnrolled: boolean }) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, startSignOut] = useTransition();
  const [isUnenrolling, startUnenroll] = useTransition();

  function handleRegenerate() {
    if (
      !confirm(
        "Gerar novos códigos invalida TODOS os atuais. Tem certeza?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await regenerateRecoveryCodes();
      if (r.ok) {
        setCodes(r.recovery_codes);
        toast.success("Novos códigos gerados.");
      } else {
        toast.error(`Erro: ${r.error}`);
      }
    });
  }

  function handleSignOutAll() {
    if (!confirm("Sair de TODOS os dispositivos? Você precisará fazer login de novo.")) return;
    startSignOut(async () => {
      await signOutEverywhere();
    });
  }

  function handleUnenroll() {
    if (!confirm("Tem certeza que deseja desativar a verificação em duas etapas? Isso reduz a segurança da sua conta.")) {
      return;
    }
    startUnenroll(async () => {
      const r = await unenrollMfa();
      if (r.ok) {
        toast.success("MFA desativado com sucesso.");
        setCodes(null);
      } else {
        toast.error(`Erro: ${r.error}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Autenticação em duas etapas (MFA)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mfaEnrolled
                ? "Sua conta está protegida por um código extra na hora de fazer login."
                : "Aumente a segurança da sua conta exigindo um código de um app autenticador ao fazer login."}
            </p>
          </div>
          {mfaEnrolled ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={isUnenrolling || isPending}
              onClick={handleUnenroll}
            >
              {isUnenrolling ? "Desativando…" : "Desativar MFA"}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowEnroll(true)}
            >
              Ativar MFA
            </Button>
          )}
        </div>

        {mfaEnrolled && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Códigos de recuperação</h3>
            <p className="text-xs text-muted-foreground">
              Use se perder acesso ao autenticador. Cada código é de uso único.
            </p>
            {codes ? (
              <RecoveryCodesPanel codes={codes} onAcknowledge={() => setCodes(null)} />
            ) : (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={handleRegenerate}
              >
                {isPending ? "Gerando…" : "Regenerar códigos de recuperação"}
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-sm font-semibold">Sessões ativas</h2>
        <p className="text-xs text-muted-foreground">
          Listagem de sessões — em breve. Por enquanto, deslogue todos os dispositivos:
        </p>
        <Button
          variant="outline"
          disabled={isSigningOut}
          onClick={handleSignOutAll}
        >
          {isSigningOut ? "Saindo…" : "Sair de todos os dispositivos"}
        </Button>
      </Card>

      {showEnroll && <MfaEnrollModal />}
    </div>
  );
}
