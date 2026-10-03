import {
  LayoutDashboard, FolderKanban, FileText, KeyRound, Inbox, Fingerprint, Package,
  ScrollText, Settings2, ShieldCheck, Network, GitBranch, type LucideIcon,
} from "lucide-react";
import type { Persona } from "@/lib/types";
import { canApprove, canAudit, roleGroup } from "@/lib/policy";

export interface NavItem { href: string; label: string; icon: LucideIcon; badgeKey?: "approvals" | "requests" }
export interface NavSection { title: string; items: NavItem[] }

export function navFor(p: Persona): NavSection[] {
  const g = roleGroup(p);
  const work: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: g === "customer" ? "Programmes" : "Projects", icon: FolderKanban },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/requests", label: "My Access Requests", icon: KeyRound, badgeKey: "requests" },
  ];
  if (canApprove(p)) work.push({ href: "/approvals", label: "Approvals", icon: Inbox, badgeKey: "approvals" });

  const chain: NavItem[] = [
    { href: "/identity", label: "My Identity (DID)", icon: Fingerprint },
    { href: "/assets", label: g === "customer" ? "Deliveries" : "Assets", icon: Package },
  ];
  if (canAudit(p)) chain.push({ href: "/audit", label: "Audit Trail", icon: ScrollText });

  const sections: NavSection[] = [{ title: "Workspace", items: work }, { title: "Trust layer", items: chain }];
  if (g === "admin") sections.push({ title: "Administration", items: [{ href: "/admin", label: "Admin Console", icon: Settings2 }] });
  sections.push({
    title: "Explore",
    items: [
      { href: "/verify", label: "Public Verify", icon: ShieldCheck },
      { href: "/architecture", label: "Architecture", icon: Network },
      { href: "/hierarchy", label: "Org Hierarchy", icon: GitBranch },
    ],
  });
  return sections;
}
