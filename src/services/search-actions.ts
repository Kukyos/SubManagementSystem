"use server";

import { getCurrentUser } from "@/services/auth";
import { search, type SearchHit } from "@/services/reports";

// For the ⌘K palette. Staff only; customers have nothing to search across.
export async function quickSearch(term: string): Promise<SearchHit[]> {
  const user = await getCurrentUser();
  if (!user || user.role === "customer") return [];
  return search(String(term ?? ""));
}
