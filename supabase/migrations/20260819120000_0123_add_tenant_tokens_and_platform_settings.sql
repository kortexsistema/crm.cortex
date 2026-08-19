ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "tokens_balance" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "tokens_cycle_end_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "tokens_extra_status" text DEFAULT 'none' NOT NULL CHECK ("tokens_extra_status" IN ('none', 'requested', 'granted'));

CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" text PRIMARY KEY,
    "value_encrypted" bytea NOT NULL,
    "value_iv" bytea NOT NULL,
    "value_tag" bytea NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."platform_settings" OWNER TO "postgres";
ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform Admins can read settings" ON "public"."platform_settings" FOR SELECT TO authenticated USING (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

CREATE POLICY "Platform Admins can modify settings" ON "public"."platform_settings" FOR ALL TO authenticated USING (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
) WITH CHECK (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.decrement_tenant_tokens(org_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  UPDATE public.organizations
  SET tokens_balance = tokens_balance - amount
  WHERE id = org_id;
END;
\$\$;

REVOKE EXECUTE ON FUNCTION public.decrement_tenant_tokens(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decrement_tenant_tokens(uuid, integer) TO service_role;

