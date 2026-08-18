-- Migration 0116: Add 'domain' layer to playbook
-- Replaces the constraints to allow layer = 'domain' in playbook_versions and playbook_pointers

alter table public.playbook_versions drop constraint if exists playbook_versions_layer_check;
alter table public.playbook_versions add constraint playbook_versions_layer_check check (layer in ('platform', 'domain', 'tenant', 'campaign'));

alter table public.playbook_pointers drop constraint if exists playbook_pointers_layer_check;
alter table public.playbook_pointers add constraint playbook_pointers_layer_check check (layer in ('platform', 'domain', 'tenant', 'campaign'));
