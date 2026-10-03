import { NextResponse } from "next/server";
import { z } from "zod";
import { PERSONA_MAP } from "@/lib/personas";
import { SESSION_COOKIE, isSupabaseConfigured } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().email().max(200), password: z.string().min(6).max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password (min 6 chars)" }, { status: 400 });
  const { email, password } = parsed.data;

  // Demo accounts follow the pattern <persona-id>@trustgrid.demo
  const personaId = email.toLowerCase().split("@")[0];
  const persona = PERSONA_MAP.get(personaId);
  if (!persona) return NextResponse.json({ error: "No account found for that email" }, { status: 401 });

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  } else if (password !== (process.env.DEMO_PERSONA_PASSWORD ?? "Demo@TrustGrid2026!")) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, persona.id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8,
  });
  return res;
}
