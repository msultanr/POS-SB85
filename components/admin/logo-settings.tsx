"use client";
import { useRef, useState, useTransition } from "react";
import { saveLogoImage } from "@/actions/branding";
import { StoreLogo } from "@/components/store-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function LogoSettings({ updatedAt }: { updatedAt: string | null }) {
  const [busy, start] = useTransition();
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 md:px-8">
      <div className="grid gap-5 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_140px]">
        <div>
          <h2 className="text-lg font-semibold">Logo toko</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Logo tampil di halaman login, kasir, pesanan, admin, dan pemesanan
            pelanggan.
          </p>
          <form
            ref={formRef}
            action={(form) =>
              start(async () => {
                setMessage("");
                const file = form.get("logo");
                if (
                  !(file instanceof File) ||
                  !file.size ||
                  file.size > 2 * 1024 * 1024
                ) {
                  setMessage("Pilih gambar JPG, PNG, atau WebP maksimal 2 MB.");
                  return;
                }
                try {
                  const result = await saveLogoImage(form);
                  setMessage(
                    result.success ? "Logo berhasil diperbarui." : result.error,
                  );
                  if (result.success) formRef.current?.reset();
                } catch {
                  setMessage(
                    "Logo belum tersimpan. Periksa ukuran file dan koneksi.",
                  );
                }
              })
            }
            className="mt-4 space-y-3"
          >
            <label className="block space-y-2 text-sm">
              <span>Logo toko (maksimal 2 MB)</span>
              <Input
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                disabled={busy}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan logo"}
            </Button>
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
          </form>
        </div>
        <StoreLogo
          version={updatedAt}
          className="size-32 self-center justify-self-center"
        />
      </div>
    </section>
  );
}
