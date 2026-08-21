"use server";

import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptKey, bufToBytea } from "@/lib/crypto/aes_gcm";
import { audit } from "@/lib/audit";

export async function saveGlobalAIKey(provider: string, apiKey: string) {
  const { user } = await requirePlatformAdmin();
  const admin = createAdminClient();

  if (!apiKey || apiKey.trim() === "") {
    return { ok: false, error: "A chave de API não pode estar vazia." };
  }

  const secret = encryptKey(apiKey.trim());

  // Convert buffers to PostgREST format '\xHEX'
  const valueEncrypted = bufToBytea(secret.ciphertext);
  const valueIv = bufToBytea(secret.iv);
  const valueTag = bufToBytea(secret.tag);

  let settingId = "";
  if (provider === "openai") settingId = "OPENAI_API_KEY";
  else if (provider === "openrouter") settingId = "OPENROUTER_API_KEY";
  else return { ok: false, error: "Provedor inválido." };

  const { error } = await admin
    .from("platform_settings")
    .upsert(
      {
        id: settingId,
        value_encrypted: valueEncrypted,
        value_iv: valueIv,
        value_tag: valueTag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    return { ok: false, error: "Falha ao salvar configuração global: " + error.message };
  }

  await audit({
    organizationId: user.id, // For platform actions, we might use a system org or user id
    actorUserId: user.id,
    action: "platform.settings.ai_key_updated",
    resourceType: "platform_settings",
    resourceId: settingId,
    metadata: { provider },
    actingAsPlatformAdmin: true,
  });

  return { ok: true };
}

export async function grantTenantTokens(tenantId: string, amount: number) {
  const { user } = await requirePlatformAdmin();
  const admin = createAdminClient();

  if (amount <= 0) {
    return { ok: false, error: "A quantidade de tokens deve ser maior que zero." };
  }

  const { error } = await admin.rpc("decrement_tenant_tokens", {
    org_id: tenantId,
    amount: -amount, // Negative amount to increment
  });

  if (error) {
    return { ok: false, error: "Falha ao adicionar tokens ao tenant." };
  }

  // Update status back to none
  await admin
    .from("organizations")
    .update({ tokens_extra_status: "none" })
    .eq("id", tenantId);

  await audit({
    organizationId: tenantId,
    actorUserId: user.id,
    action: "platform.tenant.tokens_granted",
    resourceType: "organizations",
    resourceId: tenantId,
    metadata: { amount },
    actingAsPlatformAdmin: true,
  });

  return { ok: true };
}

export async function saveGlobalModelSetting(modelId: string) {
  const { user } = await requirePlatformAdmin();
  const admin = createAdminClient();

  if (!modelId || modelId.trim() === "") {
    return { ok: false, error: "O modelo não pode estar vazio." };
  }

  const secret = encryptKey(modelId.trim());

  // Convert buffers to PostgREST format '\xHEX'
  const valueEncrypted = bufToBytea(secret.ciphertext);
  const valueIv = bufToBytea(secret.iv);
  const valueTag = bufToBytea(secret.tag);

  const { error } = await admin
    .from("platform_settings")
    .upsert(
      {
        id: "DEFAULT_CHAT_MODEL",
        value_encrypted: valueEncrypted,
        value_iv: valueIv,
        value_tag: valueTag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    return { ok: false, error: "Falha ao salvar modelo global: " + error.message };
  }

  await audit({
    organizationId: user.id,
    actorUserId: user.id,
    action: "platform.settings.ai_key_updated",
    resourceType: "platform_settings",
    resourceId: "DEFAULT_CHAT_MODEL",
    metadata: { modelId },
    actingAsPlatformAdmin: true,
  });

  return { ok: true };
}

export async function syncOpenRouterModels() {
  const { user } = await requirePlatformAdmin();
  const admin = createAdminClient();

  try {
    const { env } = await import("@/lib/env");
    const { loadPlatformSetting } = await import("@/lib/ai/credentials");

    const apiKey = env.OPENROUTER_API_KEY || (await loadPlatformSetting("OPENROUTER_API_KEY"));
    if (!apiKey) {
      return { ok: false, error: "Chave da OpenRouter não configurada globalmente." };
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL || "https://crmkortex.pro",
        "X-Title": "Kortex CRM",
      },
    });

    if (!res.ok) {
      return { ok: false, error: `Falha na API da OpenRouter: ${res.statusText}` };
    }

    const json = await res.json();
    const allModels = json.data || [];

    // Filtrar apenas modelos focados em chat/texto e ativos
    const chatModels = allModels.filter((m: any) => {
      // Ignorar explicitamente modelos de embedding
      if (m.id.toLowerCase().includes("embedding") || m.name.toLowerCase().includes("embedding")) return false;
      
      // O modelo precisa retornar texto
      const outputModalities = m.architecture?.output_modalities || [];
      if (outputModalities.length > 0 && !outputModalities.includes("text")) return false;

      return true;
    });

    const upsertRows = chatModels.map((m: any) => {
      const isFree = m.id.endsWith(":free") || (m.pricing?.prompt === "0" && m.pricing?.completion === "0");
      const supportsTools = m.supported_parameters?.includes("tools") || m.supported_parameters?.includes("tool_choice") || false;
      
      return {
        provider: "openrouter",
        model_id: m.id,
        display_name: m.name,
        description: m.description,
        context_window: m.context_length || 0,
        input_price_per_million_cents: isFree ? 0 : Math.round(Number(m.pricing?.prompt || 0) * 1_000_000 * 100),
        output_price_per_million_cents: isFree ? 0 : Math.round(Number(m.pricing?.completion || 0) * 1_000_000 * 100),
        supports_tools: supportsTools,
        is_default_for_provider: false, // Mantém os defaults manuais
        metadata: {
          architecture: m.architecture,
          top_provider: m.top_provider,
        },
      };
    });

    // Como são muitos modelos (centenas), inserimos em lotes
    let syncedCount = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
      const batch = upsertRows.slice(i, i + BATCH_SIZE);
      const { error } = await admin.from("ai_models").upsert(batch, { onConflict: "provider,model_id" });
      if (error) {
        console.error("Erro no upsert do batch de ai_models:", error);
        return { ok: false, error: "Erro ao gravar dados no banco de dados." };
      }
      syncedCount += batch.length;
    }

    await audit({
      organizationId: user.id,
      actorUserId: user.id,
      action: "platform.settings.models_synced",
      resourceType: "ai_models",
      resourceId: "openrouter",
      metadata: { count: syncedCount },
      actingAsPlatformAdmin: true,
    });

    return { ok: true, count: syncedCount };
  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return { ok: false, error: error.message || "Erro inesperado." };
  }
}
