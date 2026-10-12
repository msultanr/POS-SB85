import { db } from "@/lib/db";
import { sortCatalog } from "@/lib/catalog-order";
import { getStoreName } from "@/lib/branding";
import { PosTerminal } from "@/components/pos/pos-terminal";
import Link from "next/link";
import {
  isSelfOrderOpen,
  ORDER_CLOSED_MESSAGE,
} from "@/lib/order-availability";
import { OrderAvailabilityRefresh } from "@/components/order-availability-refresh";
export const dynamic = "force-dynamic";
export default async function SelfOrderPage() {
  if (!(await isSelfOrderOpen()))
    return (
      <main className="mx-auto max-w-xl space-y-5 px-4 py-16 text-center">
        <OrderAvailabilityRefresh />
        <h1 className="text-3xl font-bold">Pemesanan sedang ditutup</h1>
        <p className="text-muted-foreground">{ORDER_CLOSED_MESSAGE}</p>
        <p className="text-sm text-muted-foreground">
          Sudah memiliki pesanan? Gunakan tautan pembayaran yang telah disimpan
          atau lacak delivery Anda.
        </p>
        <Link
          href="/tracking"
          className="inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold text-primary"
        >
          Lacak pesanan delivery
        </Link>
      </main>
    );
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
    <>
      <OrderAvailabilityRefresh />
      <PosTerminal
        {...sortCatalog(products, categories)}
        storeName={await getStoreName()}
        selfService
        qrisAvailable={!!qris}
      />
    </>
  );
}
