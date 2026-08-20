/**
 * Embedding wrapper for the RAG pipeline.
 *
 * Routes through Vercel AI Gateway when `AI_GATEWAY_API_KEY` is set; otherwise
 * uses the OpenAI provider directly (still no `@anthropic-ai/sdk`-style imports
 * — embeddings are an OpenAI capability and the gateway proxies them).
 */

import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

import { env } from "@/lib/env";
import {
  DEFAULT_EMBEDDING_MODEL,
  isEmbeddingProviderConfigured,
  type ModelId,
} from "@/lib/ai/gateway";

export interface EmbedOptions {
  organizationId: string;
  model?: ModelId;
}

export interface EmbedResult {
  embedding: number[];
  promptTokens: number;
  model: string;
}

export async function embedText(
  content: string,
  opts: EmbedOptions,
): Promise<EmbedResult> {
  if (!isEmbeddingProviderConfigured()) {
    throw new Error("embed_unavailable: no OPENAI_API_KEY configured");
  }
  const model = opts.model ?? DEFAULT_EMBEDDING_MODEL;

  const resolvido = createOpenAI({ apiKey: env.OPENAI_API_KEY }).textEmbeddingModel(
    String(model).replace(/^openai\//, ""),
  );

  const result = await embed({
    model: resolvido,
    value: content,
  });

  // EmbedResult.embedding is `number[]` for single-value embed.
  const promptTokens =
    (result.usage as { tokens?: number; promptTokens?: number } | undefined)?.tokens ??
    (result.usage as { tokens?: number; promptTokens?: number } | undefined)?.promptTokens ??
    0;

  return {
    embedding: result.embedding,
    promptTokens,
    model: typeof model === "string" ? model : String(model),
  };
}
