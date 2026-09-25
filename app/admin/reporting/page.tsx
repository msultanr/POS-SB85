import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { reportPeriod } from "@/lib/report-period";
import { getReport } from "@/lib/reporting";
import { ReportDashboard } from "@/components/reporting/report-dashboard";
export const dynamic = "force-dynamic";
export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  let period;
  try {
    period = reportPeriod(params.from, params.to);
  } catch (error) {
    return (
      <AppShell active="reporting">
        <main className="mx-auto max-w-3xl p-8">
          <h1 className="text-3xl font-bold">Reporting</h1>
          <p role="alert" className="my-5 text-destructive">
            {error instanceof Error ? error.message : "Periode tidak valid."}
          </p>
          <Link href="/admin/reporting" className="underline">
            Kembali ke laporan bulan ini
          </Link>
        </main>
      </AppShell>
    );
  }
  const report = await getReport(period);
  return (
    <AppShell active="reporting">
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Ringkasan usaha
          </p>
          <h1 className="mt-2 text-3xl font-bold">Reporting</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Statistik berdasarkan tanggal pesanan dibuat (WIB). Pendapatan dan
            penjualan menu hanya menghitung pesanan lunas; bukan laba bersih dan
            tidak termasuk ongkir COD.
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"
          action="/admin/reporting"
        >
          <label className="space-y-2 text-sm font-medium">
            <span className="block">Dari tanggal</span>
            <input
              type="date"
              name="from"
              defaultValue={period.from}
              required
              className="min-h-12 rounded-xl border px-3"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span className="block">Sampai tanggal</span>
            <input
              type="date"
              name="to"
              defaultValue={period.to}
              required
              className="min-h-12 rounded-xl border px-3"
            />
          </label>
          <button className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
            Terapkan periode
          </button>
          <Link
            href="/admin/reporting"
            className="flex min-h-12 items-center px-3 text-sm font-semibold text-primary underline"
          >
            Bulan ini
          </Link>
          <p className="basis-full text-xs text-muted-foreground">
            Tanggal akhir termasuk. Maksimal 366 hari. Tekan Terapkan periode
            untuk memperbarui data terbaru.
          </p>
        </form>
        <ReportDashboard report={report} />
      </main>
    </AppShell>
  );
}
