/**
 * Vercel AI Gateway wrapper.
 *
 * Centralises model routing so the rest of the codebase only references model
 * strings like `"anthropic/claude-sonnet-4-6"`. Lazy initialisation: if
 * `AI_GATEWAY_API_KEY` (or `ANTHROPIC_API_KEY` as fallback) is missing we
 * deliberately do NOT throw at import time — `isAiGatewayConfigured()` lets
 * callers skip gracefully.
 *
 * Anti-pattern guard (CLAUDE.md): we never `import Anthropic from "@anthropic-ai/sdk"`.
 * Only model strings via the gateway-shaped `ai` SDK calls.
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { env } from "@/lib/env";
import { loadPlatformSetting } from "./credentials";
import { logger } from "@/lib/logger";

/** Endpoint da OpenRouter. Compatível com a API da OpenAI, então o provider
 *  `@ai-sdk/openai` fala com ela sem dependência nova. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type ModelId =
  // Atendimento Humanizado (Claude/GPT)
  | "anthropic/claude-3.5-sonnet"
  | "anthropic/claude-3.5-sonnet:beta"
  | "anthropic/claude-3-5-haiku-20241022"
  | "openai/gpt-4o"
  | "openai/gpt-4o-mini"
  // Google Gemini
  | "google/gemini-1.5-pro"
  | "google/gemini-1.5-flash"
  | "google/gemini-2.0-flash-001"
  | "google/gemini-2.0-pro-exp-02-05"
  // Gratuitos para Testes (OpenRouter)
  | "meta-llama/llama-3.3-70b-instruct:free"
  | "google/gemini-2.0-flash-exp:free"
  | "google/gemini-2.0-pro-exp-02-05:free"
  // Outros Provedores
  | "deepseek/deepseek-chat"
  | "deepseek/deepseek-r1"
  | "meta-llama/llama-3.3-70b-instruct"
  | "qwen/qwen-2.5-72b-instruct"
  | "openai/text-embedding-3-small"
  // Compatibilidade Legada
  | "google/gemini-3.6-flash"
  | "google/gemini-3.5-flash"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.0-flash"
  | "google/gemini-3.1-pro"
  | "anthropic/claude-sonnet-5"
  | "anthropic/claude-opus-5"
  | "anthropic/claude-haiku-4-5"
  // Allow arbitrary tenant-configured strings without losing autocomplete on the canonical ones.
  | (string & {});

export async function getDefaultChatModel(): Promise<ModelId> {
  const model = await loadPlatformSetting("DEFAULT_CHAT_MODEL");
  if (model) {
    return model as ModelId;
  }
  return "google/gemini-2.0-flash-exp:free";
}

export const DEFAULT_EMBEDDING_MODEL: ModelId = "openai/text-embedding-3-small";

export async function isAiGatewayConfigured(): Promise<boolean> {
  return (
    Boolean(env.OPENROUTER_API_KEY) ||
    Boolean(await loadPlatformSetting("OPENROUTER_API_KEY"))
  );
}

/**
 * Resolve o modelo de CHAT para algo que o `ai` SDK saiba executar.
 *
 * Existe porque `isAiGatewayConfigured()` e a execução real estavam
 * desalinhados: a checagem dizia "tem IA" com a `ANTHROPIC_API_KEY` (a única
 * que o install.sh exige), mas quem executava passava o id como STRING, e no
 * AI SDK string com barra é roteada pelo gateway da Vercel — que sem
 * `AI_GATEWAY_API_KEY` cai no plano anônimo e devolve
 *
 *     Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module.
 *
 * Ou seja: em TODA instalação self-host padrão o worker de sentimento falhava
 * em loop. Mesma armadilha que o `embed.ts` já documentava e resolvia para
 * embeddings; aqui o caminho de chat ficou sem o equivalente.
 *
 * Ordem de resolução, do mais específico ao mais genérico:
 *   1. Gateway da Vercel  -> devolve a string; o gateway roteia e fatura
 *   2. OpenRouter         -> provider OpenAI-compatível apontado ao endpoint
 *      dela. Os ids da OpenRouter já são `provider/modelo`, então o mesmo id
 *      canônico serve sem tradução.
 *   3. Provider direto     -> Anthropic ou OpenAI, conforme o prefixo do id
 *
 * Devolve null quando nada está configurado, para o chamador PULAR com motivo
 * claro em vez de estourar com erro de rede lá dentro.
 */
export async function resolveLanguageModel(model: ModelId): Promise<LanguageModel | null> {
  const id = String(model);

  const openRouterKey = env.OPENROUTER_API_KEY || await loadPlatformSetting("OPENROUTER_API_KEY");
  if (openRouterKey) {
    return createOpenAI({
      apiKey: openRouterKey,
      baseURL: env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL,
      headers: {
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL || "https://crmkortex.pro",
        "X-Title": "Kortex CRM",
      },
    })(id);
  }

  logger.error("[ai-gateway] Falha ao resolver o modelo: Nenhuma chave do OpenRouter configurada.", { model: id });
  return null;
}

export function isEmbeddingProviderConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY);
}
