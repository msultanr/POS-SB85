"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadPaymentProof } from "@/actions/self-order";
import { QrisDisplay } from "@/components/payments/qris-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orderNumber, rupiah } from "@/lib/utils";
import type { FulfillmentView } from "@/lib/fulfillment";
import { FulfillmentDetails } from "@/components/orders/fulfillment-details";
import { usePaymentExpiry } from "@/components/payments/use-payment-expiry";
type Order = FulfillmentView & {
  number: number;
  total: number;
  customerName: string | null;
  paymentStatus: "UNPAID" | "REVIEW" | "PAID" | "REJECTED" | "EXPIRED";
  paymentExpiresAt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED";
  paymentNote: string | null;
  items: { id: string; name: string; quantity: number; subtotal: number }[];
};
const statusLabels = {
  UNPAID: "Menunggu pembayaran",
  REVIEW: "Bukti terkirim — menunggu verifikasi",
  PAID: "Pembayaran terverifikasi",
  REJECTED: "Bukti pembayaran ditolak",
  EXPIRED: "Pesanan kedaluwarsa",
};
export function CustomerPayment({
  token,
  order,
  qrisVersion,
}: {
  token: string;
  order: Order;
  qrisVersion: string | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const expired = usePaymentExpiry(order.paymentExpiresAt, order.paymentStatus);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [router]);
  const canUpload =
    !expired &&
    (order.paymentStatus === "UNPAID" || order.paymentStatus === "REJECTED");
  return (
    <main className="mx-auto grid max-w-4xl gap-6 p-4 md:grid-cols-2 md:p-8">
      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-primary">
            {orderNumber(order.number)}
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {statusLabels[expired ? "EXPIRED" : order.paymentStatus]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.customerName}
          </p>
        </div>
        <FulfillmentDetails order={order} />
        <p className="text-xs text-muted-foreground">
          Simpan kode pesanan di atas secara pribadi. Kode tetap sama setelah
          pembayaran terverifikasi.
        </p>
        {order.fulfillment === "DELIVERY" && (
          <Link
            href="/tracking"
            className="block rounded-xl border p-3 text-center font-semibold text-primary"
          >
            Lacak delivery dengan kode pesanan
          </Link>
        )}
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 font-semibold">Pesanan Anda</h2>
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 text-sm">
                <span>
                  {i.quantity}× {i.name}
                </span>
                <span className="shrink-0">{rupiah(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t pt-4 font-bold">
            <span>Total</span>
            <span>{rupiah(order.total)}</span>
          </div>
        </div>
        {order.paymentStatus === "REVIEW" && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Bukti sudah diterima. Admin akan memeriksa dana masuk dan
            nominalnya. Jangan melakukan pembayaran ulang. Status diperbarui
            otomatis.
          </p>
        )}
        {order.paymentStatus === "PAID" && (
          <p className="rounded-xl bg-secondary p-4 text-sm text-primary">
            {order.status === "COMPLETED"
              ? order.fulfillment === "DELIVERY"
                ? "Pesanan siap dikirim. Ikuti status perjalanan melalui tautan kurir jika tersedia."
                : "Pesanan selesai. Silakan ambil pesanan Anda."
              : order.status === "PROCESSING"
                ? "Pesanan sedang disiapkan oleh dapur."
                : "Pembayaran diterima. Pesanan sudah masuk antrean dapur."}
          </p>
        )}
        {order.paymentStatus === "REJECTED" && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Alasan: {order.paymentNote}</p>
            <p className="mt-2">
              Periksa bukti dan unggah kembali, atau hubungi kasir sebelum
              membayar lagi.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Simpan tautan halaman ini untuk melihat status. Tautan bersifat
          pribadi; jangan bagikan kepada orang lain.
        </p>
        <Button variant="outline" onClick={() => router.refresh()}>
          Perbarui status
        </Button>
        <Link
          href="/order"
          className="ml-4 text-sm font-semibold text-primary underline"
        >
          Kembali ke menu
        </Link>
      </section>
      <section className="space-y-5">
        {expired && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            Batas pembayaran 10 menit sudah habis. Jangan membayar pesanan ini.
            Silakan buat pesanan baru. Jika dana sudah terkirim tetapi bukti
            belum diunggah, hubungi admin dengan kode pesanan dan bukti
            pembayaran.
          </p>
        )}
        {canUpload && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Bayar dan unggah bukti dalam 10 menit sejak pesanan dibuat, sebelum{" "}
            {new Date(order.paymentExpiresAt).toLocaleTimeString("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            WIB.
          </p>
        )}
        {canUpload && <QrisDisplay total={order.total} version={qrisVersion} />}
        {canUpload && (
          <form
            ref={formRef}
            className="space-y-4 rounded-2xl border bg-white p-5"
            action={(form) =>
              start(async () => {
                setError("");
                const file = form.get("proof");
                if (
                  !(file instanceof File) ||
                  !file.size ||
                  file.size > 2 * 1024 * 1024
                ) {
                  setError(
                    "Pilih screenshot JPG, PNG, atau WebP maksimal 2 MB.",
                  );
                  return;
                }
                try {
                  const result = await uploadPaymentProof(token, form);
                  if (!result.success) setError(result.error);
                  else {
                    formRef.current?.reset();
                    router.refresh();
                  }
                } catch {
                  setError(
                    "Bukti belum terkirim. Periksa koneksi dan ukuran file, lalu coba lagi.",
                  );
                }
              })
            }
          >
            <h2 className="font-semibold">Unggah bukti pembayaran</h2>
            <p className="text-sm text-muted-foreground">
              Pastikan screenshot menunjukkan pembayaran berhasil, nominal{" "}
              {rupiah(order.total)}, penerima, dan waktu transaksi.
            </p>
            <label className="block space-y-2 text-sm">
              <span>Screenshot pembayaran (maksimal 2 MB)</span>
              <Input
                type="file"
                name="proof"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={busy}
              />
            </label>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Mengunggah…" : "Kirim bukti pembayaran"}
            </Button>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
