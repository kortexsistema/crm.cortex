import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { getDefaultChatModel } from "@/lib/ai/gateway";
import { AdminAIClient } from "./_client";

export const metadata = { title: "Configurações Globais de IA — Admin" };

export default async function AdminAISettingsPage() {
  await requirePlatformAdmin();
  const initialDefaultModel = await getDefaultChatModel();
  return <AdminAIClient initialDefaultModel={initialDefaultModel} />;
}
