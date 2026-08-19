"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requestExtraTokens } from "@/app/actions/tenant-billing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export function TenantBillingClient({ tokensBalance, tokensStatus, monthlyLimit = 2000000 }: { tokensBalance: number, tokensStatus: string, monthlyLimit?: number }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const router = useRouter();

  // Consider tokensBalance vs monthlyLimit. 
  // If tokensBalance is over limit, percentage is 0 (fully unused). 
  // Wait, if it's a descending balance, it represents what's left.
  const used = Math.max(0, monthlyLimit - tokensBalance);
  const percentage = Math.min(100, Math.round((used / monthlyLimit) * 100));

  async function handleRequest() {
    setIsRequesting(true);
    const res = await requestExtraTokens();
    setIsRequesting(false);
    
    if (res.ok) {
      toast.success("Solicitação enviada! A equipe será notificada.");
      router.refresh();
    } else {
      toast.error(res.error || "Erro ao solicitar tokens.");
    }
  }

  const isPending = tokensStatus === "requested";

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Consumo de IA (Tokens)</CardTitle>
              <CardDescription>Acompanhe o consumo do seu pacote mensal de interações.</CardDescription>
            </div>
            {isPending && (
              <Badge variant="warning">Análise Pendente</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Tokens Restantes</span>
              <span className="font-bold">{tokensBalance.toLocaleString()}</span>
            </div>
            <Progress value={100 - percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {used.toLocaleString()} tokens consumidos de um total base de {monthlyLimit.toLocaleString()}.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Precisa de mais interações?</h4>
            <p className="text-sm text-muted-foreground">
              Seu pacote de IA é válido por 30 dias. Se os tokens esgotarem antes da renovação, seu assistente deixará de responder, mas você pode solicitar um pacote avulso extra agora.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            disabled={isRequesting || isPending} 
            onClick={handleRequest}
          >
            {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "Solicitação de Pacote Extra Pendente" : "Solicitar Pacote Extra"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
