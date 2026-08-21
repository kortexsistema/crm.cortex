import { describe, expect, it } from "vitest";

import { createDefaultRegistry } from "@/lib/agent-engine/edge/llm/providers";

describe("createDefaultRegistry", () => {
  it("registra apenas o OpenRouter conforme a migração", () => {
    const reg = createDefaultRegistry();
    expect(Object.keys(reg).sort()).toEqual(["openrouter"]);
  });
  it("a factory produz um LanguageModel (não lança ao instanciar)", () => {
    const reg = createDefaultRegistry();
    expect(() => reg.openrouter!("k", "google/gemini-2.0-flash-exp:free")).not.toThrow();
  });
});
