"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  History,
  ChartNoAxesColumn,
  Flag,
  Plus,
  Wallet,
  CreditCard,
  ChevronRight,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/components/finance-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
const navigation = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/transactions", label: "Histórico", icon: History },
  { href: "/statistics", label: "Estatísticas", icon: ChartNoAxesColumn },
  { href: "/goals", label: "Metas", icon: Flag },
];
const bottomNavigation = [
  ...navigation.slice(0, 3),
  { href: "/accounts", label: "Minhas contas", icon: Wallet },
  navigation[3],
];
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <ArrowUpRight size={24} strokeWidth={2.6} />
      </span>
      fluxo<span className="brand-dot">.</span>
    </span>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const { openTransaction, setEditor, configured, userName } = useFinance();
  const initials =
    userName
      .split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "F";
  async function logout() {
    const result = await authClient.signOut();
    if (result.error) {
      toast.error("Não foi possível sair. Tente novamente.");
      return;
    }
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/dashboard" aria-label="Fluxo, início">
          <Brand />
        </Link>
        <p className="sidebar-caption">SUAS FINANÇAS, EM MOVIMENTO</p>
        <div className="sidebar-nav">
          {navigation.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("sidebar-link", path === n.href && "active")}
            >
              <n.icon size={20} />
              {n.label}
              {path === n.href && <span className="active-dot" />}
            </Link>
          ))}
          <div className="nav-divider" />
          <span className="sidebar-section-label">ORGANIZAÇÃO</span>
          <Link
            href="/accounts"
            className={cn("sidebar-link", path === "/accounts" && "active")}
          >
            <Wallet size={20} />
            Minhas contas
          </Link>
          <Link
            href="/cards"
            className={cn("sidebar-link", path === "/cards" && "active")}
          >
            <CreditCard size={20} />
            Meus cartões
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={21} />
            <div>
              Seu dinheiro, mais claro.<small>Um passo de cada vez.</small>
            </div>
          </div>
          <button
            className="profile-row"
            onClick={() =>
              setEditor({ type: configured ? "profile" : "setup" })
            }
          >
            <span className="avatar">{initials}</span>
            <span>
              {configured ? userName : "Seu espaço pessoal"}
              <small>
                {configured ? "Gerenciar perfil" : "Configurar aplicativo"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
          {configured && (
            <button className="logout-link" onClick={logout}>
              <LogOut size={16} />
              Sair da conta
            </button>
          )}
        </div>
      </aside>
      <div className="workspace">
        <div className="desktop-topbar">
          <span>Bem-vindo ao seu espaço financeiro.</span>
          <div className="connection-status">
            <span />
            {configured ? "Conectado ao seu Fluxo" : "Pronto para começar"}
          </div>
        </div>
        <main className="page-content">{children}</main>
        <nav className="bottom-navigation" aria-label="Navegação principal">
          <div className="nav-capsule">
            {bottomNavigation.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                title={n.label}
                aria-label={n.label}
                aria-current={path === n.href ? "page" : undefined}
                className={cn("bottom-link", path === n.href && "active")}
              >
                <n.icon size={19} strokeWidth={1.5} />
                <span className="bottom-active-dot" />
              </Link>
            ))}
          </div>
          <button
            className="nav-add"
            onClick={() => openTransaction()}
            aria-label="Adicionar transação"
          >
            <Plus size={24} strokeWidth={1.6} />
          </button>
        </nav>
      </div>
    </div>
  );
}
