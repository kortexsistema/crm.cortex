-- =============================================================================
-- MIGRATION: 0117_auto_provision_org
-- DESCRIPTION: Cria um Database Trigger em auth.users para garantir que
-- todo novo usuário receba um tenant default e seu vínculo, blindando 
-- fluxos alternativos (ex: OAuth, admin panel, auto-confirm).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  org_slug text;
  base_slug text;
  org_name text;
BEGIN
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

  -- 5. Criar o vínculo de membro, adaptando-se caso a tabela tenha sido renomeada.
  -- Usamos o information_schema para evitar que o código quebre caso a tabela não exista com o nome antigo.
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

-- Garante que apenas postgres tenha acesso de dono
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Adiciona o trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
