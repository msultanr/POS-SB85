"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChefHat,
  ClipboardList,
  RefreshCw,
  ArrowRight,
  LayoutGrid,
  List,
  Rows3,
} from "lucide-react";
import { advanceOrder } from "@/actions/transaction";
import type { FulfillmentView } from "@/lib/fulfillment";
import { FulfillmentDetails } from "@/components/orders/fulfillment-details";
import { CourierForm } from "@/components/orders/courier-form";
import { Button } from "@/components/ui/button";
import {
  PaymentReview,
  type ReviewOrder,
} from "@/components/payments/payment-review";
import { cn, orderNumber, rupiah } from "@/lib/utils";
type Status = "PENDING" | "PROCESSING" | "COMPLETED";
type View = "cards" | "list" | "details";
type OrderView = ReviewOrder &
  FulfillmentView & {
    id: string;
    number: number;
    total: number;
    status: Status;
    createdAt: string;
    paymentMethod: "CASH" | "QRIS";
    customerName: string | null;
    paymentNote: string | null;
    items: { id: string; name: string; quantity: number; subtotal: number }[];
  };
const labels = {
  PENDING: "Pending",
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
};
const colors = {
  PENDING: "bg-amber-50 text-amber-800",
  PROCESSING: "bg-blue-50 text-blue-800",
  COMPLETED: "bg-secondary text-primary",
};
export function OrderBoard({ orders }: { orders: OrderView[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const view: View =
    params.get("view") === "list"
      ? "list"
      : params.get("view") === "details"
        ? "details"
        : "cards";
  function changeView(value: View) {
    const next = new URLSearchParams(params.toString());
    next.set("view", value);
    router.replace(`/orders?${next}`, { scroll: false });
  }
  const [filter, setFilter] = useState<Status | "ACTIVE">("ACTIVE");
  const [refreshing, startRefresh] = useTransition();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        startRefresh(() => router.refresh());
    }, 15000);
    return () => clearInterval(timer);
  }, [router]);
  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
  const paymentOrders = orders.filter((o) => o.paymentStatus !== "PAID");
  const shown = paidOrders.filter((o) =>
    filter === "ACTIVE" ? o.status !== "COMPLETED" : o.status === filter,
  );
  return (
    <main className="mx-auto max-w-[1600px] p-4 md:p-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Ruang dapur
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Antrean pesanan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifikasi QRIS terlebih dahulu. Hanya pesanan lunas yang masuk
            antrean dapur.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
        >
          <RefreshCw className={cn(refreshing && "animate-spin")} />
          Perbarui
        </Button>
      </div>
      <div
        role="group"
        aria-label="Tampilan pesanan"
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <span className="mr-2 text-sm text-muted-foreground">Tampilan</span>
        {(
          [
            { value: "cards", label: "Kartu", Icon: LayoutGrid },
            { value: "list", label: "Daftar", Icon: List },
            { value: "details", label: "Detail", Icon: Rows3 },
          ] as const
        ).map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={view === value ? "default" : "outline"}
            aria-pressed={view === value}
            onClick={() => changeView(value)}
          >
            <Icon />
            {label}
          </Button>
        ))}
        <span className="basis-full text-xs text-muted-foreground">
          {view === "list"
            ? "Klik baris untuk membuka item, detail pelanggan, dan tindakan pesanan."
            : view === "details"
              ? "Semua informasi ditampilkan lengkap dalam satu kolom."
              : "Kartu pesanan untuk memantau beberapa order sekaligus."}
        </span>
      </div>
      {paymentOrders.length > 0 && (
        <section aria-label="Verifikasi pembayaran" className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">
            Pembayaran QRIS{" "}
            <span className="text-sm text-muted-foreground">
              ({paymentOrders.length})
            </span>
          </h2>
          <div
            className={cn(
              "grid gap-4",
              view === "cards" && "md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {paymentOrders.map((o) => (
              <OrderPresentation key={`${view}-${o.id}`} order={o} view={view}>
                <article className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">{orderNumber(o.number)}</h3>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900">
                      {o.paymentStatus === "REVIEW"
                        ? "Bukti menunggu verifikasi"
                        : o.paymentStatus === "REJECTED"
                          ? "Ditolak — tunggu perbaikan"
                          : "Belum dibayar"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {o.source === "SELF_SERVICE"
                      ? `Pelanggan: ${o.customerName}`
                      : "Pesanan kasir"}
                  </p>
                  <FulfillmentDetails order={o} />
                  <ul className="space-y-1 text-sm">
                    {o.items.map((i) => (
                      <li key={i.id}>
                        {i.quantity}× {i.name}
                      </li>
                    ))}
                  </ul>
                  <p className="font-semibold">Total: {rupiah(o.total)}</p>
                  {o.paymentNote && (
                    <p className="text-sm text-destructive">{o.paymentNote}</p>
                  )}
                  <PaymentReview order={o} />
                </article>
              </OrderPresentation>
            ))}
          </div>
        </section>
      )}
      <h2 className="mb-4 text-xl font-semibold">Dapur · pesanan lunas</h2>
      <div className="mb-7 grid grid-cols-3 gap-3">
        {(["PENDING", "PROCESSING", "COMPLETED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={cn(
              "rounded-2xl border bg-white p-4 text-left md:p-5",
              filter === s && "border-primary ring-1 ring-primary",
            )}
          >
            <span className="text-xs text-muted-foreground">
              {s === "COMPLETED" ? "Selesai (50 terbaru)" : labels[s]}
            </span>
            <strong className="mt-2 block text-3xl font-semibold">
              {paidOrders.filter((o) => o.status === s).length}
            </strong>
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["ACTIVE", "PENDING", "PROCESSING", "COMPLETED"] as const).map(
            (s) => (
              <Button
                key={s}
                variant={filter === s ? "default" : "outline"}
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
              >
                {s === "ACTIVE" ? "Semua aktif" : labels[s]}
              </Button>
            ),
          )}
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Pembaruan otomatis setiap 15 detik
        </span>
      </div>
      {shown.length ? (
        <div
          className={cn(
            "grid gap-4",
            view === "cards" && "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
          )}
        >
          {shown.map((o) => (
            <OrderPresentation key={`${view}-${o.id}`} order={o} view={view}>
              <OrderCard order={o} />
            </OrderPresentation>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-white p-16 text-center">
          <ClipboardList className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Belum ada pesanan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pesanan yang sesuai status akan muncul di sini.
          </p>
        </div>
      )}
    </main>
  );
}
function OrderPresentation({
  order,
  view,
  children,
}: {
  order: OrderView;
  view: View;
  children: React.ReactNode;
}) {
  if (view !== "list") return children;
  return (
    <details className="min-w-0 rounded-2xl border bg-white">
      <summary className="min-h-16 cursor-pointer rounded-2xl p-4 focus-visible:outline-2 focus-visible:outline-primary">
        <span className="ml-2 inline-flex w-[calc(100%-2rem)] flex-wrap items-center justify-between gap-3 align-middle text-sm">
          <strong>{orderNumber(order.number)}</strong>
          <span className="max-w-full break-words">
            {order.customerName || "Kasir"} ·{" "}
            {order.fulfillment === "DELIVERY" ? "Delivery" : "Pick up"}
          </span>
          <span>
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} item
          </span>
          <span className="rounded-full bg-muted px-3 py-1">
            {order.paymentStatus === "PAID"
              ? labels[order.status]
              : order.paymentStatus === "REVIEW"
                ? "Verifikasi pembayaran"
                : order.paymentStatus === "REJECTED"
                  ? "Bukti ditolak"
                  : "Belum dibayar"}
          </span>
          <strong>{rupiah(order.total)}</strong>
        </span>
      </summary>
      <div className="border-t p-3">{children}</div>
    </details>
  );
}
function OrderCard({ order }: { order: OrderView }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  function advance() {
    if (order.status === "COMPLETED") return;
    const status = order.status;
    start(async () => {
      setError("");
      try {
        const result = await advanceOrder(order.id, status);
        if (!result.success) setError(result.error);
      } catch {
        setError("Koneksi terputus. Silakan coba lagi.");
      }
    });
  }
  return (
    <article className="flex flex-col rounded-2xl border bg-white p-5">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{orderNumber(order.number)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            }).format(new Date(order.createdAt))}{" "}
            WIB
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            colors[order.status],
          )}
        >
          {labels[order.status]}
        </span>
      </div>
      <FulfillmentDetails order={order} />
      <ul className="mb-5 flex-1 space-y-3 border-t pt-4">
        <li className="text-xs text-muted-foreground">
          {order.paymentMethod === "QRIS" ? "QRIS" : "Tunai"} ·{" "}
          {order.source === "SELF_SERVICE" ? order.customerName : "Kasir"}
        </li>
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-3 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold">
              {i.quantity}×
            </span>
            <span className="flex-1 pt-1">{i.name}</span>
          </li>
        ))}
      </ul>
      <div className="mb-4 flex items-center justify-between border-t pt-4 text-sm">
        <span className="text-muted-foreground">Total dibayar</span>
        <strong>{rupiah(order.total)}</strong>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        onClick={advance}
        disabled={busy || order.status === "COMPLETED"}
        variant={order.status === "COMPLETED" ? "secondary" : "default"}
      >
        {order.status === "PENDING" ? <ChefHat /> : <Check />}
        {busy
          ? "Memperbarui…"
          : order.status === "PENDING"
            ? "Mulai proses"
            : order.status === "PROCESSING"
              ? "Tandai selesai"
              : "Pesanan selesai"}
        {order.status !== "COMPLETED" && <ArrowRight className="ml-auto" />}
      </Button>
      {order.fulfillment === "DELIVERY" && order.status !== "PENDING" && (
        <CourierForm id={order.id} initialUrl={order.courierUrl} />
      )}
    </article>
  );
}
