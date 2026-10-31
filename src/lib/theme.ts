import "server-only";
import { cookies } from "next/headers";

export type Theme = "dark" | "light";

// Read on the server so the first paint is already in the right theme.
export async function getTheme(): Promise<Theme> {
  return (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
}
