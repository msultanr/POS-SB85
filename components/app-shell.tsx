import Link from "next/link";
import {
  LayoutGrid,
  ClipboardList,
  UtensilsCrossed,
  Settings,
  ChartColumn,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { requireSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { StoreLogo } from "@/components/store-logo";
import { getLogoVersion } from "@/lib/branding";
import { OrderNotifications } from "@/components/admin/order-notifications";
export async function AppShell({
  active,
  children,
}: {
  active: "pos" | "orders" | "menu" | "settings" | "reporting";
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const logoVersion = await getLogoVersion();
  const links = [
    { id: "pos", label: "Kasir", href: "/pos", Icon: LayoutGrid },
    { id: "orders", label: "Pesanan", href: "/orders", Icon: ClipboardList },
    {
      id: "menu",
      label: "Kelola menu",
      href: "/admin/menu",
      Icon: UtensilsCrossed,
    },
    {
      id: "reporting",
      label: "Reporting",
      href: "/admin/reporting",
      Icon: ChartColumn,
    },
    {
      id: "settings",
      label: "Settings",
      href: "/admin/settings",
      Icon: Settings,
    },
  ];
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-[1800px] flex-wrap items-center justify-between gap-2 px-4 py-3 lg:px-8">
          <Link href="/pos" className="flex items-center gap-3">
            <StoreLogo version={logoVersion} />
            <span>
              <span className="block text-xl font-bold tracking-tight">
                Teras <span className="text-primary">SB85</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.22em] text-muted-foreground">
                GOOD FOOD, GOOD MOOD
              </span>
            </span>
          </Link>
          <nav
            aria-label="Navigasi utama"
            className="order-3 flex w-full flex-wrap gap-1 xl:order-none xl:w-auto"
          >
            {links.map(({ id, label, href, Icon }) => (
              <Link
                key={id}
                href={href}
                aria-current={active === id ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                  active === id
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <OrderNotifications />
            <span className="hidden text-right text-xs sm:block">
              <span className="block font-semibold">{user.username}</span>
              <span className="text-muted-foreground">Teras SB85</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
