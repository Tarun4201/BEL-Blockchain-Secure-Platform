import { cookies } from "next/headers";
import { PERSONA_MAP } from "@/lib/personas";
import type { Persona } from "@/lib/types";

export const SESSION_COOKIE = "tg_persona";

/** True when real Supabase credentials have been provided in .env.local */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return url.startsWith("https://") && !url.includes("YOUR_PROJECT_ID") && key.length > 20 && !key.startsWith("YOUR_");
}

/** True when a relayer key + contract address exist (live chain mode) */
export function isChainConfigured(): boolean {
  const k = process.env.RELAYER_PRIVATE_KEY ?? "";
  const a = process.env.CONTRACT_IDENTITY_REGISTRY_ADDRESS ?? "";
  return k.startsWith("0x") && k.length === 66 && !/^0x0+$/.test(a);
}

/** Read the current persona from the session cookie (server only). */
export async function getSessionPersona(): Promise<Persona | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return PERSONA_MAP.get(id) ?? null;
}
