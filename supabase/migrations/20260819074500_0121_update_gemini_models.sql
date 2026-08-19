-- Adiciona os novos modelos ao catálogo (tela e budget)
insert into public.ai_models (provider, model_id, display_name, description, input_price_per_million_cents, output_price_per_million_cents, supports_tools)
values
  ('google', 'gemini-3.6-flash', 'Gemini 3.6 Flash', 'Nova geração Flash', 150, 900, true),
  ('google', 'gemini-3.5-flash', 'Gemini 3.5 Flash', 'Alta performance com custo reduzido', 150, 900, true),
  ('google', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 'Geração anterior Flash', 30, 250, true),
  ('google', 'gemini-3.1-pro', 'Gemini 3.1 Pro', 'Nova geração Pro', 200, 1200, true)
on conflict (provider, model_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  input_price_per_million_cents = excluded.input_price_per_million_cents,
  output_price_per_million_cents = excluded.output_price_per_million_cents,
  supports_tools = excluded.supports_tools;

insert into public.ai_pricing (model, prompt_cents_per_million_tokens, completion_cents_per_million_tokens, notes)
values
  ('gemini-3.6-flash', 150, 900, 'catálogo 0121'),
  ('gemini-3.5-flash', 150, 900, 'catálogo 0121'),
  ('gemini-2.5-flash', 30, 250, 'catálogo 0121'),
  ('gemini-3.1-pro', 200, 1200, 'catálogo 0121')
on conflict (model) do update set
  prompt_cents_per_million_tokens = excluded.prompt_cents_per_million_tokens,
  completion_cents_per_million_tokens = excluded.completion_cents_per_million_tokens,
  notes = excluded.notes,
  superseded_at = null;

-- Altera o default em ai_agents
ALTER TABLE public.ai_agents ALTER COLUMN model SET DEFAULT 'google/gemini-3.5-flash';
