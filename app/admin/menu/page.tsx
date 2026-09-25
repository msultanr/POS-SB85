import { AppShell } from "@/components/app-shell";
import { MenuManager } from "@/components/admin/menu-manager";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function AdminMenuPage() {
  await requireSession();
  const [products, categories] = await Promise.all([
    db().product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        categoryId: true,
        isAvailable: true,
      },
    }),
    db().category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <AppShell active="menu">
      <MenuManager products={products} categories={categories} />
    </AppShell>
  );
}
