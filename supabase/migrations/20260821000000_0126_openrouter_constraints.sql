-- =============================================================================
-- Migration 0126: Permite 'openrouter' nas constraints de provider
-- =============================================================================

BEGIN;

-- 1. ai_provider_credentials
ALTER TABLE public.ai_provider_credentials DROP CONSTRAINT IF EXISTS ai_provider_credentials_provider_check;
ALTER TABLE public.ai_provider_credentials ADD CONSTRAINT ai_provider_credentials_provider_check 
CHECK (provider IN ('openrouter', 'google', 'anthropic', 'openai'));

-- 2. ai_agent_versions
ALTER TABLE public.ai_agent_versions DROP CONSTRAINT IF EXISTS ai_agent_versions_provider_check;
ALTER TABLE public.ai_agent_versions ADD CONSTRAINT ai_agent_versions_provider_check 
CHECK (provider IN ('openrouter', 'google', 'anthropic', 'openai'));

-- 3. ai_models (garantia, pois algumas bases podem estar desatualizadas antes do baseline)
ALTER TABLE public.ai_models DROP CONSTRAINT IF EXISTS ai_models_provider_check;
ALTER TABLE public.ai_models ADD CONSTRAINT ai_models_provider_check 
CHECK (provider IN ('openrouter', 'google', 'anthropic', 'openai'));

COMMIT;
