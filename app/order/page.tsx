import { db } from "@/lib/db";
import { PosTerminal } from "@/components/pos/pos-terminal";
export const dynamic = "force-dynamic";
export default async function SelfOrderPage() {
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
      select: { id: true },
    }),
  ]);
  return (
    <PosTerminal
      products={products}
      categories={categories}
      selfService
      qrisAvailable={!!qris}
    />
  );
}
