"use client";
import { useState, useTransition } from "react";
import { saveCourierLink } from "@/actions/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function CourierForm({
  id,
  initialUrl,
}: {
  id: string;
  initialUrl: string | null;
}) {
  const [busy, start] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form
      className="mt-4 space-y-3 border-t pt-4"
      action={(form) =>
        start(async () => {
          setMessage("");
          try {
            const result = await saveCourierLink(
              id,
              String(form.get("url") ?? "").trim(),
            );
            setMessage(
              result.success ? "Tautan kurir tersimpan." : result.error,
            );
          } catch {
            setMessage("Koneksi terputus. Coba lagi.");
          }
        })
      }
    >
      <label className="block space-y-2 text-sm font-medium">
        <span>Link GoSend / GrabExpress</span>
        <Input
          key={initialUrl}
          name="url"
          type="url"
          required
          maxLength={2048}
          defaultValue={initialUrl ?? ""}
          placeholder="https://…"
          disabled={busy}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Tempel tautan pelacakan resmi dari aplikasi kurir. Tautan akan terlihat
        oleh pelanggan.
      </p>
      <Button className="w-full" variant="outline" disabled={busy}>
        {busy ? "Menyimpan…" : "Simpan link kurir"}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
