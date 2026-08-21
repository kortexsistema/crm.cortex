const fs = require('fs');
let content = fs.readFileSync('c:/Kortex/supabase/baseline.sql', 'utf8');

const targetStr = 'ALTER TABLE "public"."ai_models" OWNER TO "postgres";';
const replacementStr = 'ALTER TABLE "public"."ai_models" OWNER TO "postgres";\n\nALTER TABLE public.ai_models DROP CONSTRAINT IF EXISTS ai_models_provider_check;\nALTER TABLE public.ai_models ADD CONSTRAINT ai_models_provider_check \nCHECK (provider IN (\'openrouter\', \'google\', \'anthropic\', \'openai\'));';

content = content.replace(targetStr, replacementStr);

const endPattern = /-- -+\r?\n-- Ap.ndice: Corrigir restri..o de provedores para aceitar openrouter[\s\S]*$/i;
content = content.replace(endPattern, '');

fs.writeFileSync('c:/Kortex/supabase/baseline.sql', content, 'utf8');
