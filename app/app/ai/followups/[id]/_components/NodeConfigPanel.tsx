"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash } from "@/lib/ui/icons";
import {
  waitConfigSchema,
  conditionConfigSchema,
  aiClassifyConfigSchema,
  actionConfigSchema,
  endConfigSchema,
  type FlowNode,
} from "@/lib/followup/graph-schema";
import type { RFNode, RFNodeData } from "@/lib/followup/graph-mappers";
import { NODE_VISUALS } from "./nodes/nodeVisuals";

type ConfigOf<T extends FlowNode["type"]> = Extract<FlowNode, { type: T }>["config"];

interface Props {
  node: RFNode;
  onChange: (patch: Partial<RFNodeData>) => void;
}

/**
 * Zod-driven config form, one variant per node type. Each field commits to
 * the live React Flow node (`onChange`) only when the candidate config
 * passes its schema — otherwise the field shows an inline error and the
 * canvas keeps the last valid config (never a half-written value upstream).
 */
export function NodeConfigPanel({ node, onChange }: Props) {
  const type = node.type as FlowNode["type"];
  const visual = NODE_VISUALS[type];
  const Icon = visual.icon;
  const [label, setLabel] = useState(node.data.label);
  const [labelError, setLabelError] = useState<string | null>(null);

  const commitLabel = (value: string) => {
    setLabel(value);
    if (value.trim().length < 1 || value.length > 60) {
      setLabelError("Rótulo precisa ter 1 a 60 caracteres.");
      return;
    }
    setLabelError(null);
    onChange({ label: value });
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto" data-testid="node-config-panel">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${visual.chipClassName}`}>
            <Icon size={14} aria-hidden />
          </span>
          {visual.paletteLabel}
        </h2>
        <p className="text-sm text-text-muted">
          Alterações aplicam no rascunho ao digitar — salve na barra de publicação.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-label">Rótulo</Label>
        <Input
          id="node-label"
          value={label}
          maxLength={60}
          onChange={(e) => commitLabel(e.target.value)}
        />
        {labelError && <p className="text-xs text-error-fg">{labelError}</p>}
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        {type === "trigger" && (
          <p className="text-sm text-text-muted">
            Início do fluxo — sem configuração adicional. O disparo (manual, mudança de
            etapa, silêncio ou fim de conversa) é definido nas configurações do fluxo.
          </p>
        )}
        {type === "wait" && (
          <WaitForm config={node.data.config as ConfigOf<"wait">} onChange={(config) => onChange({ config })} />
        )}
        {type === "condition" && (
          <ConditionForm
            config={node.data.config as ConfigOf<"condition">}
            onChange={(config) => onChange({ config })}
          />
        )}
        {type === "ai_classify" && (
          <ClassifyForm
            config={node.data.config as ConfigOf<"ai_classify">}
            onChange={(config) => onChange({ config })}
          />
        )}
        {type === "action" && (
          <ActionForm config={node.data.config as ConfigOf<"action">} onChange={(config) => onChange({ config })} />
        )}
        {type === "end" && (
          <EndForm config={node.data.config as ConfigOf<"end">} onChange={(config) => onChange({ config })} />
        )}
      </div>
    </div>
  );
}

// ─── wait ────────────────────────────────────────────────────────────────

function msToMin(ms: number): number {
  return Math.round(ms / 60_000);
}
function minToMs(min: number): number {
  return Math.round(min * 60_000);
}

function WaitForm({
  config,
  onChange,
}: {
  config: ConfigOf<"wait">;
  onChange: (c: ConfigOf<"wait">) => void;
}) {
  const [mode, setMode] = useState<"fixed" | "smart" | "event_relative">(config.mode);
  const [durationMin, setDurationMin] = useState(
    config.mode === "fixed" ? msToMin(config.duration_ms) : 10,
  );
  const [minMin, setMinMin] = useState(config.mode === "smart" ? msToMin(config.min_ms) : 5);
  const [maxMin, setMaxMin] = useState(config.mode === "smart" ? msToMin(config.max_ms) : 60);
  const [offsetMin, setOffsetMin] = useState(config.mode === "event_relative" ? msToMin(config.offset_ms) : 0);
  const [guidance, setGuidance] = useState(config.mode === "smart" ? (config.guidance ?? "") : "");
  const [error, setError] = useState<string | null>(null);

  const commit = (next: {
    mode: "fixed" | "smart" | "event_relative";
    durationMin: number;
    minMin: number;
    maxMin: number;
    offsetMin: number;
    guidance: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candidate: any;
    if (next.mode === "fixed") {
      candidate = { mode: "fixed" as const, duration_ms: minToMs(next.durationMin) };
    } else if (next.mode === "event_relative") {
      candidate = { mode: "event_relative" as const, offset_ms: minToMs(next.offsetMin) };
    } else {
      candidate = {
        mode: "smart" as const,
        min_ms: minToMs(next.minMin),
        max_ms: minToMs(next.maxMin),
        ...(next.guidance.trim() ? { guidance: next.guidance } : {}),
      };
    }
    
    const parsed = waitConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Configuração inválida.");
      return;
    }
    setError(null);
    onChange(parsed.data);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="wait-mode">Modo</Label>
        <Select
          value={mode}
          onValueChange={(v) => {
            const next = v as "fixed" | "smart" | "event_relative";
            setMode(next);
            commit({ mode: next, durationMin, minMin, maxMin, offsetMin, guidance });
          }}
        >
          <SelectTrigger id="wait-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixo</SelectItem>
            <SelectItem value="smart">Adaptativo (min–max)</SelectItem>
            <SelectItem value="event_relative">Relativo a um Evento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "fixed" ? (
        <div className="space-y-2">
          <Label htmlFor="wait-duration">Duração (minutos)</Label>
          <Input
            id="wait-duration"
            type="number"
            min={5}
            value={durationMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDurationMin(v);
              commit({ mode, durationMin: v, minMin, maxMin, offsetMin, guidance });
            }}
          />
        </div>
      ) : mode === "event_relative" ? (
        <div className="space-y-2">
          <Label htmlFor="wait-offset">Minutos relativos ao evento (negativo = antes)</Label>
          <Input
            id="wait-offset"
            type="number"
            value={offsetMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setOffsetMin(v);
              commit({ mode, durationMin, minMin, maxMin, offsetMin: v, guidance });
            }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="wait-min">Mínimo (min)</Label>
              <Input
                id="wait-min"
                type="number"
                min={5}
                value={minMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinMin(v);
                  commit({ mode, durationMin, minMin: v, maxMin, offsetMin, guidance });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wait-max">Máximo (min)</Label>
              <Input
                id="wait-max"
                type="number"
                min={5}
                value={maxMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxMin(v);
                  commit({ mode, durationMin, minMin, maxMin: v, offsetMin, guidance });
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wait-guidance">Orientação (opcional)</Label>
            <Textarea
              id="wait-guidance"
              maxLength={500}
              value={guidance}
              onChange={(e) => {
                setGuidance(e.target.value);
                commit({ mode, durationMin, minMin, maxMin, offsetMin, guidance: e.target.value });
              }}
            />
          </div>
        </>
      )}
      {error && <p className="text-xs text-error-fg">{error}</p>}
    </div>
  );
}

// ─── condition ───────────────────────────────────────────────────────────

const CONDITION_FIELDS = ["lead_stage", "tag", "steps_taken", "last_outcome"] as const;
const CONDITION_OPS = ["eq", "neq", "gte", "lte", "contains"] as const;

const CONDITION_OPS_LABEL: Record<string, string> = {
  eq: "É exatamente?",
  neq: "Não é?",
  gte: "É pelo menos?",
  lte: "É no máximo?",
  contains: "Contém?",
};

function ConditionForm({
  config,
  onChange,
}: {
  config: ConfigOf<"condition">;
  onChange: (c: ConfigOf<"condition">) => void;
}) {
  const isLegacy = !("rules" in config);
  const [rules, setRules] = useState(
    isLegacy
      ? [
          {
            id: "rule-1",
            label: "Regra 1",
            combinator: config.combinator,
            checks: config.checks,
          },
        ]
      : config.rules
  );
  const [fallbackLabel, setFallbackLabel] = useState(
    isLegacy ? "Outros" : config.fallback_label ?? "Outros"
  );
  const [error, setError] = useState<string | null>(null);

  const commit = (nextRules: typeof rules, nextFallback: string) => {
    const candidate = { rules: nextRules, fallback_label: nextFallback };
    const parsed = conditionConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Configuração inválida.");
      return;
    }
    setError(null);
    onChange(parsed.data);
  };

  return (
    <div className="space-y-4">
      {rules.map((rule, rIdx) => (
        <div key={rule.id} className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <Input
              value={rule.label}
              onChange={(e) => {
                const next = [...rules];
                next[rIdx]!.label = e.target.value;
                setRules(next);
                commit(next, fallbackLabel);
              }}
              className="h-8 w-40 text-sm font-medium"
              placeholder="Nome da Saída"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={rules.length <= 1}
              onClick={() => {
                const next = rules.filter((_, i) => i !== rIdx);
                setRules(next);
                commit(next, fallbackLabel);
              }}
            >
              <Trash size={14} aria-hidden />
            </Button>
          </div>
          <Select
            value={rule.combinator}
            onValueChange={(v) => {
              const next = [...rules];
              next[rIdx]!.combinator = v as "and" | "or";
              setRules(next);
              commit(next, fallbackLabel);
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">Avaliar as regras juntas (E)</SelectItem>
              <SelectItem value="or">Uma saída sim e uma não (OU)</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="space-y-2">
            {rule.checks.map((check, cIdx) => (
              <div key={cIdx} className="flex flex-col gap-2 rounded-sm border border-border p-2 bg-background-muted">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Condição {cIdx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={rule.checks.length <= 1}
                    className="h-5 w-5"
                    onClick={() => {
                      const next = [...rules];
                      next[rIdx]!.checks = rule.checks.filter((_, i) => i !== cIdx);
                      setRules(next);
                      commit(next, fallbackLabel);
                    }}
                  >
                    <Trash size={12} aria-hidden />
                  </Button>
                </div>
                <Select
                  value={check.field}
                  onValueChange={(v) => {
                    const next = [...rules];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    next[rIdx]!.checks[cIdx]!.field = v as any;
                    setRules(next);
                    commit(next, fallbackLabel);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={check.op}
                  onValueChange={(v) => {
                    const next = [...rules];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    next[rIdx]!.checks[cIdx]!.op = v as any;
                    setRules(next);
                    commit(next, fallbackLabel);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPS.map((op) => (
                      <SelectItem key={op} value={op}>{CONDITION_OPS_LABEL[op]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 text-xs"
                  placeholder="Valor"
                  value={String(check.value)}
                  onChange={(e) => {
                    const next = [...rules];
                    next[rIdx]!.checks[cIdx]!.value = e.target.value;
                    setRules(next);
                    commit(next, fallbackLabel);
                  }}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full text-xs h-7"
            disabled={rule.checks.length >= 10}
            onClick={() => {
              const next = [...rules];
              next[rIdx]!.checks.push({ field: "steps_taken", op: "gte", value: 0 });
              setRules(next);
              commit(next, fallbackLabel);
            }}
          >
            <Plus size={12} className="mr-1" /> Adicionar condição
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={rules.length >= 10}
        onClick={() => {
          const next = [
            ...rules,
            { id: `rule-${Date.now()}`, label: `Regra ${rules.length + 1}`, combinator: "and" as const, checks: [{ field: "steps_taken" as const, op: "gte" as const, value: 0 }] }
          ];
          setRules(next);
          commit(next, fallbackLabel);
        }}
      >
        <Plus size={14} className="mr-1" /> Nova Regra (Saída)
      </Button>
      <div className="space-y-2 pt-2 border-t border-border">
        <Label htmlFor="cond-fallback">Saída Padrão (Fallback)</Label>
        <Input
          id="cond-fallback"
          value={fallbackLabel}
          onChange={(e) => {
            setFallbackLabel(e.target.value);
            commit(rules, e.target.value);
          }}
          className="h-8 text-sm"
        />
      </div>
      {error && <p className="text-xs text-error-fg">{error}</p>}
    </div>
  );
}

// ─── ai_classify ─────────────────────────────────────────────────────────

function ClassifyForm({
  config,
  onChange,
}: {
  config: ConfigOf<"ai_classify">;
  onChange: (c: ConfigOf<"ai_classify">) => void;
}) {
  const [classesText, setClassesText] = useState(config.classes.join(", "));
  const [graceMin, setGraceMin] = useState(msToMin(config.grace_timeout_ms));
  const [target, setTarget] = useState(config.target);
  const [hint, setHint] = useState(config.hint ?? "");
  const [error, setError] = useState<string | null>(null);

  const commit = (next: { classesText: string; graceMin: number; target: "last_reply" | "summary"; hint: string }) => {
    const classes = next.classesText
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const candidate = {
      classes,
      grace_timeout_ms: minToMs(next.graceMin),
      target: next.target,
      ...(next.hint.trim() ? { hint: next.hint } : {}),
    };
    const parsed = aiClassifyConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Configuração inválida.");
      return;
    }
    setError(null);
    onChange(parsed.data);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="classify-classes">Classes (separadas por vírgula)</Label>
        <Input
          id="classify-classes"
          value={classesText}
          onChange={(e) => {
            setClassesText(e.target.value);
            commit({ classesText: e.target.value, graceMin, target, hint });
          }}
          placeholder="hot, cold, no_reply"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="classify-grace">Esperar a resposta por (minutos, mín. 15)</Label>
        <Input
          id="classify-grace"
          type="number"
          min={15}
          value={graceMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            setGraceMin(v);
            commit({ classesText, graceMin: v, target, hint });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="classify-target">Alvo</Label>
        <Select
          value={target}
          onValueChange={(v) => {
            const next = v as "last_reply" | "summary";
            setTarget(next);
            commit({ classesText, graceMin, target: next, hint });
          }}
        >
          <SelectTrigger id="classify-target">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_reply">Última resposta</SelectItem>
            <SelectItem value="summary">Resumo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="classify-hint">Instrução (opcional)</Label>
        <Textarea
          id="classify-hint"
          maxLength={500}
          value={hint}
          onChange={(e) => {
            setHint(e.target.value);
            commit({ classesText, graceMin, target, hint: e.target.value });
          }}
        />
      </div>
      {error && <p className="text-xs text-error-fg">{error}</p>}
    </div>
  );
}

// ─── action ──────────────────────────────────────────────────────────────

function ActionForm({
  config,
  onChange,
}: {
  config: ConfigOf<"action">;
  onChange: (c: ConfigOf<"action">) => void;
}) {
  const [mode, setMode] = useState(config.mode);
  const [promptHint, setPromptHint] = useState(config.mode === "ai_message" ? config.prompt_hint : "");
  const [fallbackTemplateId, setFallbackTemplateId] = useState(
    config.mode === "ai_message" ? (config.fallback_template_id ?? "") : "",
  );
  const [templateId, setTemplateId] = useState(config.mode === "template" ? config.template_id : "");
  const [templateVars, setTemplateVars] = useState<Array<{ k: string; v: string }>>(
    config.mode === "template" && config.template_variables
      ? Object.entries(config.template_variables).map(([k, v]) => ({ k, v: v as string }))
      : []
  );
  const [error, setError] = useState<string | null>(null);

  const commit = (next: {
    mode: "ai_message" | "template";
    promptHint: string;
    fallbackTemplateId: string;
    templateId: string;
    templateVars: Array<{ k: string; v: string }>;
  }) => {
    const candidate =
      next.mode === "ai_message"
        ? {
            mode: "ai_message" as const,
            prompt_hint: next.promptHint,
            ...(next.fallbackTemplateId.trim() ? { fallback_template_id: next.fallbackTemplateId } : {}),
          }
        : { 
            mode: "template" as const, 
            template_id: next.templateId,
            ...(next.templateVars.length > 0 ? {
              template_variables: next.templateVars.reduce((acc, curr) => {
                if (curr.k.trim()) acc[curr.k.trim()] = curr.v.trim();
                return acc;
              }, {} as Record<string, string>)
            } : {})
          };
    const parsed = actionConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Configuração inválida.");
      return;
    }
    setError(null);
    onChange(parsed.data);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="action-mode">Modo</Label>
        <Select
          value={mode}
          onValueChange={(v) => {
            const next = v as "ai_message" | "template";
            setMode(next);
            commit({ mode: next, promptHint, fallbackTemplateId, templateId, templateVars });
          }}
        >
          <SelectTrigger id="action-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_message">Mensagem gerada por IA</SelectItem>
            <SelectItem value="template">Template fixo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "ai_message" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="action-prompt-hint">Instrução para a IA</Label>
            <Textarea
              id="action-prompt-hint"
              maxLength={1000}
              value={promptHint}
              onChange={(e) => {
                setPromptHint(e.target.value);
                commit({ mode, promptHint: e.target.value, fallbackTemplateId, templateId, templateVars });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-fallback">Template de fallback (UUID, opcional)</Label>
            <Input
              id="action-fallback"
              value={fallbackTemplateId}
              onChange={(e) => {
                setFallbackTemplateId(e.target.value);
                commit({ mode, promptHint, fallbackTemplateId: e.target.value, templateId, templateVars });
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="action-template-id">Nome do Template (ex: agendamento_confirmado)</Label>
          <Input
            id="action-template-id"
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              commit({ mode, promptHint, fallbackTemplateId, templateId: e.target.value, templateVars });
            }}
          />
        </div>
        
        <div className="space-y-2 mt-4">
          <Label>Variáveis do Template (Mapeamento dinâmico)</Label>
          <div className="space-y-2">
            {templateVars.map((tv, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  className="w-20"
                  placeholder="Ex: 1"
                  value={tv.k}
                  onChange={(e) => {
                    const next = [...templateVars];
                    next[idx]!.k = e.target.value;
                    setTemplateVars(next);
                    commit({ mode, promptHint, fallbackTemplateId, templateId, templateVars: next });
                  }}
                />
                <span className="text-muted-fg text-sm">→</span>
                <Input
                  className="flex-1"
                  placeholder="Ex: lead.name"
                  value={tv.v}
                  onChange={(e) => {
                    const next = [...templateVars];
                    next[idx]!.v = e.target.value;
                    setTemplateVars(next);
                    commit({ mode, promptHint, fallbackTemplateId, templateId, templateVars: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-fg hover:text-error-fg shrink-0"
                  onClick={() => {
                    const next = templateVars.filter((_, i) => i !== idx);
                    setTemplateVars(next);
                    commit({ mode, promptHint, fallbackTemplateId, templateId, templateVars: next });
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => {
                const next = [...templateVars, { k: "", v: "" }];
                setTemplateVars(next);
                commit({ mode, promptHint, fallbackTemplateId, templateId, templateVars: next });
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Variável
            </Button>
          </div>
        </div>
      </>
      )}
      {error && <p className="text-xs text-error-fg">{error}</p>}
    </div>
  );
}

// ─── end ─────────────────────────────────────────────────────────────────

function EndForm({ config, onChange }: { config: ConfigOf<"end">; onChange: (c: ConfigOf<"end">) => void }) {
  const [outcome, setOutcome] = useState(config.outcome);
  const [note, setNote] = useState(config.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const commit = (next: { outcome: "converted" | "exhausted" | "custom"; note: string }) => {
    const candidate = { outcome: next.outcome, ...(next.note.trim() ? { note: next.note } : {}) };
    const parsed = endConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Configuração inválida.");
      return;
    }
    setError(null);
    onChange(parsed.data);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="end-outcome">Resultado</Label>
        <Select
          value={outcome}
          onValueChange={(v) => {
            const next = v as "converted" | "exhausted" | "custom";
            setOutcome(next);
            commit({ outcome: next, note });
          }}
        >
          <SelectTrigger id="end-outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="converted">Convertido</SelectItem>
            <SelectItem value="exhausted">Esgotado</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="end-note">Nota (opcional)</Label>
        <Textarea
          id="end-note"
          maxLength={200}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            commit({ outcome, note: e.target.value });
          }}
        />
      </div>
      {error && <p className="text-xs text-error-fg">{error}</p>}
    </div>
  );
}
