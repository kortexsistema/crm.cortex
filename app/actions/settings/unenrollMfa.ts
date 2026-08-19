"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function unenrollMfa() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    return { ok: false, error: error.message };
  }

  const factors = data?.totp ?? [];
  for (const factor of factors) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (unenrollError) {
      return { ok: false, error: unenrollError.message };
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
