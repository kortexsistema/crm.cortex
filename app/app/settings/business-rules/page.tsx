import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import { BusinessRulesForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function BusinessRulesPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (!user.is_platform_admin && ROLE_RANK[activeOrg.role] < ROLE_RANK.manager) {
    redirect("/403");
  }

  const supabase = await createClient();

  // Load the current domain layer from playbook pointers and versions
  const { data, error } = await supabase
    .from("playbook_pointers")
    .select(`
      version_id,
      playbook_versions!inner ( content )
    `)
    .eq("organization_id", activeOrg.orgId)
    .eq("layer", "domain")
    .maybeSingle();

  // Playbook_versions is a joined table so we cast it
  const currentContent = data?.playbook_versions ? (data.playbook_versions as unknown as { content: string }).content : "## Regras de Negócio do Agente\n\n- O agente deve responder de forma clara e objetiva.\n";

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Diretrizes e Regras de Negócio</h1>
        <p className="text-sm text-muted-foreground">
          Configure o tom de voz, restrições e limites da persona do agente de IA da sua empresa. Manager only.
        </p>
      </header>
      
      <BusinessRulesForm initialContent={currentContent} />
    </div>
  );
}
