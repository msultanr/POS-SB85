"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="text-sm font-semibold text-primary">TERAS SB85</p>
      <h1 className="text-2xl font-semibold">Data belum dapat dimuat</h1>
      <p className="text-muted-foreground">
        Periksa koneksi internet dan coba lagi. Jika berlanjut, hubungi
        pengelola untuk memeriksa koneksi database.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
