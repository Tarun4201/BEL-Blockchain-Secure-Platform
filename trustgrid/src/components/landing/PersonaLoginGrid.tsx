"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, ChevronRight, Users, Building2, ShoppingCart, UserCheck } from "lucide-react";
import { FEATURED_PERSONAS } from "@/lib/personas";
import { cn } from "@/lib/utils";
import type { Persona } from "@/lib/types";

const TYPE_ICONS = {
  employee: Users,
  erp_admin: Building2,
  vendor: ShoppingCart,
  customer: UserCheck,
};

const TYPE_LABELS = {
  employee: "Employee",
  erp_admin: "ERP Admin",
  vendor: "Vendor",
  customer: "Customer",
};

interface PersonaCardProps {
  persona: Persona;
  onSelect: (id: string) => void;
  loading: boolean;
  selected: string | null;
}

function PersonaCard({ persona, onSelect, loading, selected }: PersonaCardProps) {
  const Icon = TYPE_ICONS[persona.accountType];
  const isLoading = loading && selected === persona.id;

  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(6,27,46,0.12)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(persona.id)}
      disabled={loading}
      className={cn(
        "group relative w-full text-left rounded-lg border border-[#D6E2EA] bg-white p-4",
        "transition-all duration-150 cursor-pointer",
        "hover:border-blue-600/40 hover:bg-sky-50",
        isLoading && "opacity-70 cursor-wait",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      )}
      aria-label={`Log in as ${persona.name}, ${persona.role}`}
    >
      {/* Tier indicator */}
      <div
        className="absolute top-3 right-3 text-xs text-ink-400 font-mono"
        aria-hidden="true"
      >
        T{persona.tier === 9 ? "Ext" : persona.tier}
      </div>

      {/* Avatar */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 w-10 h-10 rounded-md flex items-center justify-center",
            "text-white text-sm font-bold",
            persona.color
          )}
          aria-hidden="true"
        >
          {persona.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Icon className="w-3.5 h-3.5 text-ink-400 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-ink-400">
              {TYPE_LABELS[persona.accountType]}
            </span>
          </div>
          <p className="text-sm font-semibold text-ink-900 truncate">{persona.name}</p>
          <p className="text-xs text-ink-600 mt-0.5 line-clamp-1">{persona.role}</p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2.5 text-xs text-ink-400 line-clamp-2 leading-relaxed">
        {persona.description}
      </p>

      {/* CTA */}
      <div
        className={cn(
          "mt-3 flex items-center gap-1 text-xs font-semibold",
          "text-blue-600 group-hover:gap-2 transition-all"
        )}
      >
        {isLoading ? (
          <>
            <span className="animate-pulse">Signing in…</span>
          </>
        ) : (
          <>
            <LogIn className="w-3.5 h-3.5" />
            <span>Log in as this persona</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
      </div>
    </motion.button>
  );
}

export function PersonaLoginGrid() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);

  async function handlePersonaLogin(personaId: string) {
    setSelected(personaId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/persona-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personaId }),
        });
        if (res.ok) {
          router.push("/dashboard");
        } else {
          // Fallback to login page with persona pre-selected
          router.push(`/login?persona=${personaId}`);
        }
      } catch {
        router.push(`/login?persona=${personaId}`);
      }
    });
  }

  return (
    <section
      id="try-demo"
      className="py-20 px-4"
      aria-labelledby="try-demo-heading"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-semibold mb-4 border border-blue-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            One-click demo access
          </span>
          <h2 className="text-2xl font-bold text-navy-800 mb-3" id="try-demo-heading">
            Try the demo as…
          </h2>
          <p className="text-ink-600 max-w-xl mx-auto text-sm leading-relaxed">
            No installation needed. Select any persona to instantly explore their
            role-specific workspace, blockchain identity, and access controls.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_PERSONAS.map((persona, i) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <PersonaCard
                persona={persona}
                onSelect={handlePersonaLogin}
                loading={isPending}
                selected={selected}
              />
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          All data is fictional demonstration data · Not an official BEL product
        </p>
      </div>
    </section>
  );
}
