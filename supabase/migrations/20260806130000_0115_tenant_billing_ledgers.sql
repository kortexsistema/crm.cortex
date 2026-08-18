-- =============================================================================
-- Migration 0115 — Tenant Billing Ledgers & Credits
-- =============================================================================
-- Adiciona tabelas de Ledger transacional (recarga de créditos vs consumo)
-- isoladas por tenant (organization).
-- =============================================================================

create table if not exists public.tenant_credits (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  balance_cents bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Como Postgres types não suportam "create type if not exists" facilmente, usamos um bloco anônimo
do $$
begin
  if not exists (select 1 from pg_type where typname = 'billing_transaction_type') then
    create type public.billing_transaction_type as enum ('recharge', 'llm_usage');
  end if;
end
$$;

create table if not exists public.tenant_billing_ledgers (
  id uuid primary key default extensions.uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_type public.billing_transaction_type not null,
  amount_cents bigint not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_billing_ledgers_org_time on public.tenant_billing_ledgers (organization_id, created_at desc);

-- RLS para tenant_credits
alter table public.tenant_credits enable row level security;

drop policy if exists "tenant_credits_select" on public.tenant_credits;
create policy "tenant_credits_select" on public.tenant_credits
  for select using (
    public.fn_role_at_least(organization_id, 'manager')
    or public.fn_is_platform_admin()
  );

-- RLS para tenant_billing_ledgers
alter table public.tenant_billing_ledgers enable row level security;

drop policy if exists "tenant_billing_ledgers_select" on public.tenant_billing_ledgers;
create policy "tenant_billing_ledgers_select" on public.tenant_billing_ledgers
  for select using (
    public.fn_role_at_least(organization_id, 'manager')
    or public.fn_is_platform_admin()
  );

-- Function and trigger para manter o saldo atualizado de forma atômica
create or replace function public.fn_update_tenant_credits()
returns trigger
security definer
set search_path = ''
as $$
begin
  insert into public.tenant_credits (organization_id, balance_cents, updated_at)
  values (new.organization_id, new.amount_cents, now())
  on conflict (organization_id)
  do update set
    balance_cents = public.tenant_credits.balance_cents + new.amount_cents,
    updated_at = now();
  return new;
end;
$$ language plpgsql;

revoke execute on function public.fn_update_tenant_credits() from public, anon, authenticated;
grant execute on function public.fn_update_tenant_credits() to service_role;

drop trigger if exists trg_update_tenant_credits on public.tenant_billing_ledgers;
create trigger trg_update_tenant_credits
  after insert on public.tenant_billing_ledgers
  for each row
  execute function public.fn_update_tenant_credits();
