"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveQrisImage } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function QrisSettings({ updatedAt }: { updatedAt: string | null }) {
  const [busy, start] = useTransition();
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 md:px-8">
      <div className="grid gap-5 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_140px]">
        <div>
          <h2 className="text-lg font-semibold">QRIS & pemesanan pelanggan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah gambar QRIS asli milik Teras SB85. Pelanggan memesan tanpa
            login di{" "}
            <Link
              href="/order"
              target="_blank"
              className="font-semibold text-primary underline"
            >
              /order
            </Link>
            .
          </p>
          <form
            ref={formRef}
            action={(form) =>
              start(async () => {
                setMessage("");
                const file = form.get("qris");
                if (
                  !(file instanceof File) ||
                  !file.size ||
                  file.size > 2 * 1024 * 1024
                ) {
                  setMessage("Pilih gambar JPG, PNG, atau WebP maksimal 2 MB.");
                  return;
                }
                try {
                  const result = await saveQrisImage(form);
                  setMessage(
                    result.success
                      ? "QRIS berhasil disimpan. Pembayaran QRIS siap digunakan."
                      : result.error,
                  );
                  if (result.success) formRef.current?.reset();
                } catch {
                  setMessage(
                    "QRIS belum tersimpan. Periksa ukuran file dan koneksi.",
                  );
                }
              })
            }
            className="mt-4 space-y-3"
          >
            <label className="block space-y-2 text-sm">
              <span>Gambar QRIS toko (maksimal 2 MB)</span>
              <Input
                type="file"
                name="qris"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={busy}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan gambar QRIS"}
            </Button>
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
          </form>
        </div>
        {updatedAt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/qris?v=${encodeURIComponent(updatedAt)}`}
            alt="QRIS toko saat ini"
            className="max-h-48 w-full rounded-xl object-contain"
          />
        ) : (
          <p className="self-center rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            QRIS belum diatur. Unggah gambar agar checkout QRIS aktif.
          </p>
        )}
      </div>
    </section>
  );
}
