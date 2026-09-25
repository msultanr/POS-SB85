"use client";
import { useEffect, useState, useTransition } from "react";
import { trackDelivery, type DeliveryTracking } from "@/actions/delivery";
import { DELIVERY_NOTICE, scheduleLabel } from "@/lib/fulfillment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function DeliveryTracker() {
  const [busy, start] = useTransition();
  const [order, setOrder] = useState<DeliveryTracking | null>(null);
  const [error, setError] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const code = order?.code;
  useEffect(() => {
    if (!code) return;
    let active = true;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const result = await trackDelivery(code);
        if (active) {
          if (result.success) {
            setOrder(result.data);
            setError("");
          } else setError(result.error);
        }
      } catch {
        if (active) setError("Pembaruan gagal. Coba cek status kembali.");
      }
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [code]);
  return (
    <>
      <form
        className="space-y-3"
        action={(form) =>
          start(async () => {
            setError("");
            setOrder(null);
            try {
              const result = await trackDelivery(
                String(form.get("orderCode") ?? ""),
              );
              if (result.success) setOrder(result.data);
              else setError(result.error);
            } catch {
              setError("Koneksi terputus. Coba lagi.");
            }
          })
        }
      >
        <label className="block space-y-2 text-sm font-medium">
          <span>Kode pesanan</span>
          <Input
            name="orderCode"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            required
            maxLength={24}
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder="Contoh: SB85-K7M4Q9X2"
          />
        </label>
        <Button disabled={busy} className="w-full">
          {busy ? "Mencari…" : "Cek status pesanan"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {order && (
        <section
          aria-label="Status delivery"
          className="space-y-4 rounded-2xl border bg-white p-5"
        >
          <p className="break-all text-sm">
            Kode pesanan:{" "}
            <span className="select-all font-mono font-semibold">
              {order.code}
            </span>
          </p>
          <h2 className="text-xl font-bold">
            {order.paymentStatus !== "PAID"
              ? {
                  UNPAID: "Menunggu pembayaran",
                  REVIEW: "Menunggu verifikasi pembayaran",
                  REJECTED: "Bukti pembayaran perlu diperbaiki",
                  EXPIRED:
                    "Pesanan kedaluwarsa — batas pembayaran 10 menit habis",
                }[order.paymentStatus]
              : {
                  PENDING: "Menunggu diproses",
                  PROCESSING: "Pesanan sedang disiapkan",
                  COMPLETED: "Pesanan siap dikirim",
                }[order.status]}
          </h2>
          <p className="text-sm">
            Jadwal pengiriman: {scheduleLabel(order.scheduledAt)}
          </p>
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {DELIVERY_NOTICE}
          </p>
          {order.courierUrl ? (
            <a
              className="block rounded-xl bg-primary p-3 text-center font-semibold text-primary-foreground"
              href={order.courierUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Lacak GoSend / GrabExpress
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tautan kurir belum tersedia.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Diperbarui setiap 15 detik. Status siap bukan konfirmasi paket sudah
            diterima. Perjalanan kurir dapat dilihat melalui tautan kurir.
          </p>
        </section>
      )}
    </>
  );
}
