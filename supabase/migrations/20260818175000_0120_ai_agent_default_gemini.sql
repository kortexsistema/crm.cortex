-- Fix: Define o Gemini como provedor padrão de IA (Migration 0120)
-- Mudança aplicada a ai_agents para garantir que novos agentes iniciem 
-- com google/gemini-1.5-flash por padrão em vez da Anthropic.

ALTER TABLE public.ai_agents ALTER COLUMN model SET DEFAULT 'google/gemini-1.5-flash';
