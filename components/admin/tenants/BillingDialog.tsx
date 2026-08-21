"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TenantOrganization } from "@/hooks/useTenantDetail";

const formSchema = z.object({
  subscription_status: z.enum(["active", "pending_payment", "expiring", "suspended"]).nullable(),
  billing_due_date: z.string().nullable(),
  billing_contact_phone: z.string().nullable(),
});

interface BillingDialogProps {
  open: boolean;
  onClose: () => void;
  organization: TenantOrganization;
}

export function BillingDialog({ open, onClose, organization }: BillingDialogProps) {
  const queryClient = useQueryClient();
  const settings = organization.settings || {};

  const [status, setStatus] = useState<string>(settings.subscription_status || (organization.status === "suspended" ? "suspended" : "active"));
  const [dueDate, setDueDate] = useState<string>(settings.billing_due_date || "");
  const [contact, setContact] = useState<string>(settings.billing_contact_phone || "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        subscription_status: status === "none" ? null : status,
        billing_due_date: dueDate || null,
        billing_contact_phone: contact || null,
      };
      return apiClient.patch(`/api/v1/admin/tenants/${organization.id}`, payload);
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["admin", "tenant", organization.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      onClose();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setError(err.message || "Erro ao atualizar dados.");
    },
  });

  const handleSave = () => {
    setError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dados de Faturamento</DialogTitle>
          <DialogDescription>
            Atualize o controle manual de assinaturas para <strong>{organization.display_name}</strong>.
            Alterar para "Suspenso" bloqueará o acesso do tenant imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Status da Assinatura</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending_payment">Pendente de Pagamento</SelectItem>
                <SelectItem value="expiring">Vencendo</SelectItem>
                <SelectItem value="suspended">Inativo / Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="due_date">Data de Vencimento</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact">Contato Financeiro / Telefone</Label>
            <Input
              id="contact"
              placeholder="(11) 99999-9999"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
