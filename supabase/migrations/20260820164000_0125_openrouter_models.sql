-- ---------------------------------------------------------------------------
-- 1. Deprecar modelos legados
-- ---------------------------------------------------------------------------
UPDATE public.ai_models
SET deprecated_at = now()
WHERE provider != 'openrouter';

-- ---------------------------------------------------------------------------
-- 2. Inserir novos modelos OpenRouter
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_models
  (provider, model_id, display_name, description, input_price_per_million_cents, output_price_per_million_cents, supports_tools)
VALUES
  -- Atendimento Humanizado (Claude/GPT)
  ('openrouter', 'anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Inteligência de ponta para interações humanizadas complexas', 300, 1500, true),
  ('openrouter', 'anthropic/claude-3.5-sonnet:beta', 'Claude 3.5 Sonnet (Beta)', 'Acesso antecipado aos novos recursos do Sonnet', 300, 1500, true),
  ('openrouter', 'anthropic/claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'Velocidade e inteligência acessível', 100, 500, true),
  ('openrouter', 'openai/gpt-4o', 'GPT-4o', 'Modelo flagship da OpenAI, excelente para raciocínio multimodal', 250, 1000, true),
  ('openrouter', 'openai/gpt-4o-mini', 'GPT-4o Mini', 'Modelo rápido e acessível da OpenAI', 15, 60, true),
  
  -- Google Gemini
  ('openrouter', 'google/gemini-1.5-pro', 'Gemini 1.5 Pro', 'Geração de texto de alta capacidade com grande janela de contexto', 125, 500, true),
  ('openrouter', 'google/gemini-1.5-flash', 'Gemini 1.5 Flash', 'Alta performance com baixo custo e latência', 10, 40, true),
  ('openrouter', 'google/gemini-2.0-flash-001', 'Gemini 2.0 Flash', 'A mais nova geração flash do Google', 10, 40, true),
  ('openrouter', 'google/gemini-2.0-pro-exp-02-05', 'Gemini 2.0 Pro (Exp)', 'Versão experimental do Gemini 2.0 Pro', 200, 800, true),
  
  -- Gratuitos para Testes
  ('openrouter', 'meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B (Gratuito)', 'Modelo aberto de 70B focado em instruções, gratuito no OpenRouter', 0, 0, true),
  ('openrouter', 'google/gemini-2.0-flash-exp:free', 'Gemini 2.0 Flash (Gratuito)', 'Versão experimental gratuita do novo modelo flash', 0, 0, true),
  ('openrouter', 'google/gemini-2.0-pro-exp-02-05:free', 'Gemini 2.0 Pro (Gratuito)', 'Versão experimental gratuita da linha Pro do Google', 0, 0, true),
  
  -- Outros Provedores
  ('openrouter', 'deepseek/deepseek-chat', 'DeepSeek V3', 'Modelo acessível e muito performático de uso geral', 14, 28, true),
  ('openrouter', 'deepseek/deepseek-r1', 'DeepSeek R1', 'Especialista em raciocínio aberto (o1-like)', 55, 219, true),
  ('openrouter', 'meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B', 'A linha flagship aberta da Meta', 15, 60, true),
  ('openrouter', 'qwen/qwen-2.5-72b-instruct', 'Qwen 2.5 72B', 'Modelo instrucional de última geração da Alibaba', 40, 40, true)
ON CONFLICT (provider, model_id) DO UPDATE SET
  display_name = excluded.display_name,
  description = excluded.description,
  input_price_per_million_cents = excluded.input_price_per_million_cents,
  output_price_per_million_cents = excluded.output_price_per_million_cents,
  supports_tools = excluded.supports_tools,
  deprecated_at = null;

-- ---------------------------------------------------------------------------
-- 3. Atualizar modelos nos agentes e versões
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_agents ALTER COLUMN model SET DEFAULT 'meta-llama/llama-3.3-70b-instruct:free';

UPDATE public.ai_agents a
SET model = 'meta-llama/llama-3.3-70b-instruct:free'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_models m
  WHERE m.provider = 'openrouter' AND m.model_id = a.model
);

UPDATE public.ai_agent_versions v
SET provider = 'openrouter',
    model = 'meta-llama/llama-3.3-70b-instruct:free'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_models m
  WHERE m.provider = 'openrouter' AND m.model_id = v.model
);
