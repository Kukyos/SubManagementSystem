import type { PostgrestError } from "@supabase/supabase-js";

export const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export const today = () => new Date().toISOString().slice(0, 10);

// The lifecycle triggers raise check_violation with a sentence meant for people
// ("Plan … needs a minimum quantity of 3"); show those, hide everything else.
export function dbMessage(error: PostgrestError, fallback: string) {
  return error.code === "23514" ? `${error.message}.` : fallback;
}

// PostgREST's or() filter splits on commas and brackets, so keep them out of search terms.
export const orSafe = (s: string) => s.replace(/[,()"\\]/g, " ").trim();
