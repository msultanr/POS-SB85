import { AppShell } from "@/components/app-shell";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function PosPage() {
  await requireSession();
  const [products, categories, qris] = await Promise.all([
    db().product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        categoryId: true,
      },
    }),
    db().category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db().setting.findUnique({
      where: { id: "qris" },
      select: { updatedAt: true },
    }),
  ]);
  return (
    <AppShell active="pos">
      <PosTerminal
        products={products}
        categories={categories}
        qrisAvailable={!!qris}
        qrisVersion={qris?.updatedAt.toISOString() ?? null}
      />
    </AppShell>
  );
}
