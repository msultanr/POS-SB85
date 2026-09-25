"use client";
import { useState } from "react";
import type { SalesReport } from "@/lib/reporting";
import { rupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const number = (value: number) => new Intl.NumberFormat("id-ID").format(value);
export function ReportDashboard({ report }: { report: SalesReport }) {
  const { summary, products, segments } = report;
  const [ascending, setAscending] = useState(false);
  const sorted = [...products].sort(
    (a, b) =>
      (ascending ? a.quantity - b.quantity : b.quantity - a.quantity) ||
      a.name.localeCompare(b.name, "id") ||
      a.id.localeCompare(b.id),
  );
  const maxQuantity = Math.max(1, ...products.map((p) => p.quantity));
  const cards = [
    ["Pendapatan lunas", rupiah(summary.revenue)],
    ["Total pesanan", number(summary.orders)],
    ["Pesanan lunas", number(summary.paidOrders)],
    ["Rata-rata transaksi lunas", rupiah(summary.average)],
    ["Item terjual", number(summary.items)],
    ["Belum lunas", number(summary.orders - summary.paidOrders)],
  ];
  function breakdown(
    field: "paymentMethod" | "source" | "fulfillment" | "status",
    labels: Record<string, string>,
  ) {
    return Object.entries(labels).map(([key, name]) => ({
      name,
      orders: segments
        .filter((s) => s[field] === key)
        .reduce((n, s) => n + s.orders, 0),
      revenue: segments
        .filter((s) => s[field] === key)
        .reduce((n, s) => n + s.revenue, 0),
    }));
  }
  return (
    <>
      <section
        aria-label="Ringkasan penjualan"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="min-w-0 rounded-2xl border bg-white p-5"
          >
            <h2 className="text-sm text-muted-foreground">{label}</h2>
            <p className="mt-3 break-words text-3xl font-bold tracking-tight">
              {value}
            </p>
          </article>
        ))}
      </section>
      {!summary.orders && (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Belum ada pesanan pada periode ini. Coba pilih tanggal lain.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Belum bayar: {number(summary.pendingPayment)} · Menunggu verifikasi:{" "}
        {number(summary.review)} · Bukti ditolak: {number(summary.rejected)} ·
        Kedaluwarsa: {number(summary.expired)}. Ketiganya tidak masuk
        pendapatan.
      </p>
      <TrendChart trend={report.trend} />
      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Distribusi pesanan lunas"
      >
        <Breakdown
          title="Metode pembayaran"
          rows={breakdown("paymentMethod", { CASH: "Tunai", QRIS: "QRIS" })}
          total={summary.paidOrders}
        />
        <Breakdown
          title="Sumber pesanan"
          rows={breakdown("source", {
            CASHIER: "Kasir",
            SELF_SERVICE: "Self service",
          })}
          total={summary.paidOrders}
        />
        <Breakdown
          title="Pengambilan pesanan"
          rows={breakdown("fulfillment", {
            PICKUP: "Pick up",
            DELIVERY: "Delivery",
          })}
          total={summary.paidOrders}
        />
        <Breakdown
          title="Status dapur · lunas"
          rows={breakdown("status", {
            PENDING: "Pending",
            PROCESSING: "Diproses",
            COMPLETED: "Selesai / siap",
          })}
          total={summary.paidOrders}
        />
      </section>
      <section
        className="min-w-0 rounded-2xl border bg-white p-4 md:p-6"
        aria-label="Peringkat menu"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Peringkat menu</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Urut berdasarkan jumlah item terjual dari pesanan lunas. Menu
              tanpa penjualan tetap ditampilkan.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAscending(!ascending)}>
            {ascending ? "Tersedikit → terbanyak" : "Terbanyak → tersedikit"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <caption className="sr-only">
              Penjualan per menu dalam periode terpilih
            </caption>
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="p-3">Menu</th>
                <th className="p-3 text-right">Item terjual</th>
                <th className="p-3 text-right">Pesanan</th>
                <th className="p-3 text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <th scope="row" className="p-3 font-medium">
                    <span>
                      {p.name}
                      {p.archived && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Diarsipkan
                        </span>
                      )}
                    </span>
                    <div
                      aria-hidden
                      className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(p.quantity / maxQuantity) * 100}%`,
                        }}
                      />
                    </div>
                  </th>
                  <td className="p-3 text-right tabular-nums">
                    {number(p.quantity)}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {number(p.orders)}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {rupiah(p.revenue)}
                  </td>
                </tr>
              ))}
              {!sorted.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Belum ada menu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Nama mengikuti katalog terkini. Pendapatan memakai harga historis pada
          OrderItem; perubahan harga menu tidak mengubah laporan. Menu arsip
          muncul jika terjual pada periode ini.
        </p>
      </section>
    </>
  );
}
function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { name: string; orders: number; revenue: number }[];
  total: number;
}) {
  return (
    <article className="rounded-2xl border bg-white p-5">
      <h2 className="mb-5 font-semibold">{title}</h2>
      <div className="space-y-5">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex justify-between gap-2 text-sm">
              <span>{r.name}</span>
              <strong>
                {number(r.orders)}{" "}
                <span className="font-normal text-muted-foreground">
                  ({total ? Math.round((r.orders / total) * 100) : 0}%)
                </span>
              </strong>
            </div>
            <div aria-hidden className="my-2 h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${total ? (r.orders / total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{rupiah(r.revenue)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
function TrendChart({ trend }: { trend: SalesReport["trend"] }) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const max = Math.max(1, ...trend.map((d) => d[metric]));
  const label =
    metric === "revenue"
      ? "Pendapatan lunas per hari"
      : "Total pesanan per hari (semua status pembayaran)";
  return (
    <section className="min-w-0 rounded-2xl border bg-white p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tren harian</h2>
        <div className="flex gap-2" role="group" aria-label="Metrik grafik">
          <Button
            variant={metric === "revenue" ? "default" : "outline"}
            aria-pressed={metric === "revenue"}
            onClick={() => setMetric("revenue")}
          >
            Pendapatan
          </Button>
          <Button
            variant={metric === "orders" ? "default" : "outline"}
            aria-pressed={metric === "orders"}
            onClick={() => setMetric("orders")}
          >
            Pesanan
          </Button>
        </div>
      </div>
      <p className="mb-2 text-sm text-muted-foreground">
        {label} · Puncak:{" "}
        {metric === "revenue"
          ? rupiah(Math.max(...trend.map((d) => d.revenue)))
          : number(Math.max(...trend.map((d) => d.orders)))}
      </p>
      <svg
        viewBox="0 0 800 220"
        role="img"
        aria-label={label}
        className="h-56 w-full text-primary"
        preserveAspectRatio="none"
      >
        <title>{label}</title>
        <desc>
          Nilai tepat setiap hari tersedia di tabel data harian di bawah grafik.
        </desc>
        {[20, 70, 120, 170, 210].map((y) => (
          <line
            key={y}
            x1="0"
            x2="800"
            y1={y}
            y2={y}
            stroke="currentColor"
            opacity="0.1"
          />
        ))}
        {trend.map((d, i) => {
          const height = (d[metric] / max) * 190;
          const step = 800 / trend.length;
          const width = Math.min(48, step * 0.76);
          return (
            <rect
              key={d.date}
              x={i * step + (step - width) / 2}
              y={210 - height}
              width={width}
              height={height}
              rx={Math.min(3, step * 0.1)}
              fill="currentColor"
            >
              <title>
                {`${d.date}: ${metric === "revenue" ? rupiah(d.revenue) : `${d.orders} pesanan`}`}
              </title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{trend[0]?.date}</span>
        <span>WIB</span>
        <span>{trend.at(-1)?.date}</span>
      </div>
      <details className="mt-5 border-t pt-2">
        <summary className="cursor-pointer py-3 text-sm font-semibold">
          Lihat data harian
        </summary>
        <div className="max-h-80 overflow-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr>
                <th className="p-2">Tanggal (WIB)</th>
                <th className="p-2 text-right">Pendapatan lunas</th>
                <th className="p-2 text-right">Pesanan</th>
                <th className="p-2 text-right">Lunas</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((d) => (
                <tr key={d.date} className="border-t">
                  <td className="p-2">{d.date}</td>
                  <td className="p-2 text-right">{rupiah(d.revenue)}</td>
                  <td className="p-2 text-right">{d.orders}</td>
                  <td className="p-2 text-right">{d.paidOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
