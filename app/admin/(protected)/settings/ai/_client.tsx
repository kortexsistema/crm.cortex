"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveGlobalAIKey, saveGlobalModelSetting, syncOpenRouterModels } from "@/app/actions/admin-ai-settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

export function AdminAIClient({ initialDefaultModel = "" }: { initialDefaultModel?: string }) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [defaultModel, setDefaultModel] = useState(initialDefaultModel);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSyncModels() {
    setIsSyncing(true);
    const res = await syncOpenRouterModels();
    setIsSyncing(false);
    
    if (res.ok) {
      toast.success(`${res.count} modelos sincronizados com sucesso!`);
    } else {
      toast.error(res.error || "Erro ao sincronizar modelos.");
    }
  }

  async function handleSave(provider: string, key: string) {
    if (!key) {
      toast.error("Por favor, preencha a chave.");
      return;
    }
    if (provider === "openrouter" && !key.startsWith("sk-or-v1-")) {
      toast.error("A chave do OpenRouter deve começar com sk-or-v1-");
      return;
    }
    setIsSaving(true);
    const res = await saveGlobalAIKey(provider, key);
    setIsSaving(false);
    
    if (res.ok) {
      toast.success(`Chave global para ${provider} salva com sucesso!`);
      if (provider === "openai") setOpenaiKey("");
      else if (provider === "openrouter") setOpenrouterKey("");
    } else {
      toast.error(res.error || "Erro ao salvar a chave.");
    }
  }

  async function handleSaveModel() {
    if (!defaultModel) {
      toast.error("Por favor, selecione um modelo.");
      return;
    }
    setIsSavingModel(true);
    const res = await saveGlobalModelSetting(defaultModel);
    setIsSavingModel(false);
    
    if (res.ok) {
      toast.success("Modelo padrão atualizado com sucesso!");
    } else {
      toast.error(res.error || "Erro ao salvar o modelo.");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chaves de IA Globais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as credenciais fallback da plataforma. Estas chaves serão utilizadas pelos agentes caso o tenant não tenha configurado uma chave própria.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modelo Padrão (Bot e Classificação)</CardTitle>
          <CardDescription>
            Escolha qual modelo de IA será utilizado por padrão para conversar e analisar sentimentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="model-select">Modelo Base</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Selecione um modelo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Modelos Disponíveis</SelectLabel>
                  <SelectItem value="google/gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</SelectItem>
                  <SelectItem value="google/gemma-4-31b">Gemma 4 31B</SelectItem>
                  <SelectItem value="nvidia/nemotron-3-ultra">Nemotron 3 Ultra</SelectItem>
                  <SelectItem value="zhipu/glm-5.2">GLM 5.2</SelectItem>
                  <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="anthropic/claude-sonnet-5">Claude Sonnet 5</SelectItem>
                  <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={isSavingModel || !defaultModel} onClick={handleSaveModel}>
            {isSavingModel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Modelo
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Motor de IA Principal (Chat/Agentes)</CardTitle>
          <CardDescription>Chave Mestra do OpenRouter para roteamento universal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="openrouter">API Key OpenRouter</Label>
            <Input 
              id="openrouter" 
              type="password" 
              placeholder="sk-or-v1-..." 
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={isSaving} onClick={() => handleSave("openrouter", openrouterKey)}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Chave OpenRouter
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI (Embeddings e Áudio)</CardTitle>
          <CardDescription>Chave de API para geração de vetores (RAG) e transcrição Whisper.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="openai">API Key</Label>
            <Input 
              id="openai" 
              type="password" 
              placeholder="sk-proj-..." 
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={isSaving} onClick={() => handleSave("openai", openaiKey)}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Chave OpenAI
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronização de Modelos</CardTitle>
          <CardDescription>Sincroniza a lista de modelos de chat disponíveis diretamente da OpenRouter para o banco de dados da plataforma.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button disabled={isSyncing} onClick={handleSyncModels}>
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sincronizar Modelos com a OpenRouter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
