-- =============================================================================
-- MIGRATION: 0119_handle_new_user_opt_out
-- DESCRIPTION: Atualiza o trigger on_auth_user_created para respeitar a flag
-- skip_org_provision, evitando a criação de um tenant inútil quando o
-- Super Admin estiver cadastrando manualmente um usuário para uma empresa recém-criada.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  org_slug text;
  base_slug text;
  org_name text;
BEGIN
  -- 0. Opt-out: Se a flag skip_org_provision estiver presente, não provisiona nada
  IF new.raw_user_meta_data->>'skip_org_provision' = 'true' THEN
    RETURN new;
  END IF;

  -- 1. Extrair org_name do metadata ou usar um fallback
  org_name := coalesce(new.raw_user_meta_data->>'org_name', split_part(new.email, '@', 1), 'Minha empresa');
  
  -- 2. Gerar um slug base (apenas alfanuméricos e hífens, minúsculo)
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'org';
  END IF;
  
  -- 3. Garantir unicidade anexando o início do user_id
  org_slug := substring(base_slug from 1 for 25) || '-' || substr(new.id::text, 1, 6);

  -- 4. Criar a organização ativa e capturar o ID
  INSERT INTO public.organizations (slug, display_name, legal_name, status)
  VALUES (
    org_slug, 
    org_name, 
    org_name, 
    'active'
  ) RETURNING id INTO new_org_id;

  -- 5. Criar o vínculo de membro
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_organizations') THEN
    EXECUTE format('
      INSERT INTO public.user_organizations (user_id, organization_id, role, accepted_at)
      VALUES (%L, %L, ''admin'', now())
    ', new.id, new_org_id);
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_members') THEN
    EXECUTE format('
      INSERT INTO public.tenant_members (user_id, organization_id, role, accepted_at)
      VALUES (%L, %L, ''admin'', now())
    ', new.id, new_org_id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
