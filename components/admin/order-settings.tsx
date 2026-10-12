"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelfOrderOpen } from "@/actions/order-settings";
import { Button } from "@/components/ui/button";

export function OrderSettings({ open }: { open: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 md:px-8">
      <div className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-semibold">Pemesanan pelanggan</h2>
        <p
          className={
            open
              ? "font-semibold text-primary"
              : "font-semibold text-destructive"
          }
        >
          Status: {open ? "Dibuka" : "Ditutup"}
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Saat ditutup, pelanggan tidak dapat mengakses katalog /order atau
          membuat pesanan baru. Kasir, pembayaran pesanan yang sudah dibuat, dan
          pelacakan tetap tersedia.
        </p>
        <Button
          variant={open ? "destructive" : "default"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMessage("");
              try {
                const result = await setSelfOrderOpen(!open);
                setMessage(
                  result.success
                    ? open
                      ? "Pemesanan pelanggan ditutup."
                      : "Pemesanan pelanggan dibuka."
                    : result.error,
                );
                if (result.success) router.refresh();
              } catch {
                setMessage(
                  "Status belum tersimpan. Periksa koneksi dan coba lagi.",
                );
              }
            })
          }
        >
          {pending ? "Menyimpan…" : open ? "Tutup pemesanan" : "Buka pemesanan"}
        </Button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
