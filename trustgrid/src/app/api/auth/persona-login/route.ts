import { NextResponse } from "next/server";
import { z } from "zod";
import { PERSONA_MAP } from "@/lib/personas";
import { SESSION_COOKIE, isSupabaseConfigured } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ personaId: z.string().min(1).max(64) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const persona = PERSONA_MAP.get(parsed.data.personaId);
  if (!persona) return NextResponse.json({ error: "Unknown persona" }, { status: 404 });

  // Live mode: sign in the persona's Supabase account with the server-held demo password.
  if (isSupabaseConfigured() && process.env.DEMO_PERSONA_PASSWORD) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: `${persona.id}@trustgrid.demo`,
      password: process.env.DEMO_PERSONA_PASSWORD,
    });
    if (error) return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, persona: persona.id });
  res.cookies.set(SESSION_COOKIE, persona.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
