import { rupiah } from "@/lib/utils";
export function QrisDisplay({
  total,
  version,
}: {
  total: number;
  version?: string | null;
}) {
  const src = version
    ? `/api/qris?v=${encodeURIComponent(version)}`
    : "/api/qris";
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 text-center">
      <div>
        <p className="text-sm text-muted-foreground">Bayar tepat sebesar</p>
        <p className="mt-1 text-3xl font-bold text-primary">{rupiah(total)}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="QRIS pembayaran Teras SB85"
        className="mx-auto max-h-[420px] w-full max-w-sm rounded-xl object-contain"
      />
      <p className="text-sm font-semibold">Pastikan penerima: TERAS SB 85.</p>
      <p className="text-xs text-muted-foreground">
        QRIS statis: masukkan nominal sesuai total di aplikasi pembayaran Anda.
        Jangan bayar lagi jika sudah berhasil.
      </p>
      <a
        href={src}
        download="QRIS-Teras-SB85"
        className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold text-primary"
      >
        Unduh QRIS
      </a>
    </div>
  );
}
