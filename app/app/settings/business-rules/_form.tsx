"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBusinessRules } from "@/app/actions/settings/business-rules";

interface Props {
  initialContent: string;
}

export function BusinessRulesForm({ initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.includes("## ")) {
      toast.error("O texto deve conter pelo menos uma seção nomeada com '## '.");
      return;
    }

    startTransition(async () => {
      const r = await saveBusinessRules(content);
      if (r.ok) toast.success("Diretrizes e Regras de Negócio salvas.");
      else toast.error(`Erro: ${r.error} - ${r.details || ''}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="content">Texto das Regras (Markdown suportado)</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="min-h-[400px] font-mono text-sm"
            placeholder={`## Tom de Voz\n- Seja amigável mas profissional...\n\n## Restrições\n- Nunca ofereça descontos sem permissão...`}
          />
          <p className="text-xs text-muted-foreground">
            A engine do agente de IA exige que este conteúdo comece com pelo menos um título markdown do tipo <code>## Seção</code>.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
