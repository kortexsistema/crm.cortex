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
