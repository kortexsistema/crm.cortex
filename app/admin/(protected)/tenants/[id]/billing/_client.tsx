"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { grantTenantTokens } from "@/app/actions/admin-ai-settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function TenantBillingClient({ tenantId, tokensBalance, tokensStatus }: { tenantId: string, tokensBalance: number, tokensStatus: string }) {
  const [amount, setAmount] = useState(1000000);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function handleGrant() {
    if (amount <= 0) {
      toast.error("O valor deve ser maior que zero.");
      return;
    }
    setIsSaving(true);
    const res = await grantTenantTokens(tenantId, amount);
    setIsSaving(false);
    
    if (res.ok) {
      toast.success(`Foram adicionados ${amount.toLocaleString()} tokens ao tenant!`);
      setAmount(1000000);
      router.refresh();
    } else {
      toast.error(res.error || "Erro ao adicionar tokens.");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Saldo de Tokens IA</CardTitle>
          <CardDescription>Gerencie o saldo de tokens disponíveis para este tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Saldo Atual</p>
              <p className="text-3xl font-bold">{tokensBalance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">tokens</span></p>
            </div>
            {tokensStatus === "requested" && (
              <Badge variant="warning" className="text-sm">Solicitação Pendente</Badge>
            )}
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="tokens">Conceder Pacote Extra</Label>
            <div className="flex items-center gap-3">
              <Input 
                id="tokens" 
                type="number" 
                min={0}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="max-w-[200px]"
              />
              <Button disabled={isSaving} onClick={handleGrant}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Adicionar Tokens
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A quantidade será somada ao saldo atual. Se havia uma solicitação pendente, ela será marcada como concluída.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
