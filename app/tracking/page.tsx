import Link from "next/link";
import { DeliveryTracker } from "@/components/orders/delivery-tracker";
export const metadata = {
  title: "Lacak delivery · Teras SB85",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function TrackingPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-4 py-10">
      <Link href="/order" className="font-bold text-primary">
        ← Teras SB85 · Menu
      </Link>
      <h1 className="text-3xl font-bold">Lacak pesanan delivery</h1>
      <p className="text-sm text-muted-foreground">
        Masukkan kode pendek dari halaman pembayaran Anda, tanpa nama atau nomor
        WhatsApp. Simpan kode secara pribadi karena siapa pun yang memilikinya
        dapat melihat status dan tautan kurir.
      </p>
      <DeliveryTracker />
    </main>
  );
}
