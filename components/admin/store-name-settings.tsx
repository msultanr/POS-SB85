"use client";
import { useState, useTransition } from "react";
import { saveStoreName } from "@/actions/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StoreNameSettings({ name }: { name: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto mt-6 max-w-[1400px] px-4 md:px-8">
      <form
        className="space-y-4 rounded-2xl border bg-white p-5"
        action={(form) =>
          start(async () => {
            setMessage("");
            try {
              const result = await saveStoreName(form);
              setMessage(
                result.success
                  ? "Nama toko berhasil diperbarui."
                  : result.error,
              );
            } catch {
              setMessage(
                "Nama toko belum tersimpan. Periksa koneksi dan coba lagi.",
              );
            }
          })
        }
      >
        <h2 className="text-lg font-semibold">Identitas toko</h2>
        <label className="block max-w-xl space-y-2 text-sm">
          <span>Nama toko</span>
          <Input
            key={name}
            name="storeName"
            defaultValue={name}
            minLength={2}
            maxLength={120}
            required
            disabled={pending}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Digunakan pada tampilan web. Tidak mengubah kode pesanan atau nama
          penerima QRIS di bank.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan nama toko"}
        </Button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
