"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveGlobalAIKey, saveGlobalModelSetting } from "@/app/actions/admin-ai-settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminAIClient() {
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);

  async function handleSave(provider: string, key: string) {
    if (!key) {
      toast.error("Por favor, preencha a chave.");
      return;
    }
    setIsSaving(true);
    const res = await saveGlobalAIKey(provider, key);
    setIsSaving(false);
    
    if (res.ok) {
      toast.success(`Chave global para ${provider} salva com sucesso!`);
      if (provider === "google") setGeminiKey("");
      else if (provider === "anthropic") setAnthropicKey("");
      else if (provider === "openai") setOpenaiKey("");
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
                <SelectItem value="google/gemini-3.5-flash">Gemini 1.5 Flash</SelectItem>
                <SelectItem value="google/gemini-3.1-pro">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="anthropic/claude-sonnet-5">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="anthropic/claude-haiku-4-5">Claude 3.5 Haiku</SelectItem>
                <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
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
          <CardTitle>Google Gemini</CardTitle>
          <CardDescription>Chave de API do Google AI Studio ou Vertex AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="gemini">API Key</Label>
            <Input 
              id="gemini" 
              type="password" 
              placeholder="AIzaSy..." 
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={isSaving} onClick={() => handleSave("google", geminiKey)}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Chave Gemini
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anthropic Claude</CardTitle>
          <CardDescription>Chave de API para Claude 3/3.5.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="anthropic">API Key</Label>
            <Input 
              id="anthropic" 
              type="password" 
              placeholder="sk-ant-..." 
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={isSaving} onClick={() => handleSave("anthropic", anthropicKey)}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Chave Anthropic
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>OpenAI</CardTitle>
          <CardDescription>Chave de API para GPT-4o e Embeddings.</CardDescription>
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
    </div>
  );
}
