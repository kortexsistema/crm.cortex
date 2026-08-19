import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { AdminAIClient } from "./_client";

export const metadata = { title: "Configurações Globais de IA — Admin" };

export default async function AdminAISettingsPage() {
  await requirePlatformAdmin();
  return <AdminAIClient />;
}
