"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Bell, RefreshCw, X } from "lucide-react";
import {
  getOrderNotifications,
  markNotificationsRead,
  type NotificationFeed,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { orderNumber, rupiah } from "@/lib/utils";

const paymentLabels = {
  UNPAID: "Belum dibayar",
  REVIEW: "Bukti menunggu verifikasi",
  REJECTED: "Bukti ditolak",
  PAID: "Sudah lunas",
  EXPIRED: "Kedaluwarsa",
};
export function OrderNotifications() {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, start] = useTransition();
  const latestId = useRef<string | null | undefined>(undefined);
  const fetching = useRef(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (fetching.current || document.visibilityState !== "visible") return;
      fetching.current = true;
      try {
        const next = await getOrderNotifications();
        if (!active) return;
        if (
          latestId.current !== undefined &&
          next.latest &&
          next.latest.id !== latestId.current &&
          next.unreadCount > 0
        ) {
          setToast(
            `Pesanan ${next.latest.order.fulfillment === "DELIVERY" ? "delivery" : "pickup"} baru ${orderNumber(next.latest.order.number)}. Periksa status pembayaran di Pesanan.`,
          );
        }
        latestId.current = next.latest?.id ?? null;
        setFeed(next);
        setError("");
      } catch {
        if (active)
          setError(
            "Notifikasi belum diperbarui. Periksa koneksi atau login kembali.",
          );
      } finally {
        fetching.current = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  function refreshNow() {
    start(async () => {
      try {
        setFeed(await getOrderNotifications());
        setError("");
      } catch {
        setError("Notifikasi belum diperbarui. Coba lagi.");
      }
    });
  }
  function markRead(ids: string[]) {
    start(async () => {
      try {
        const result = await markNotificationsRead(ids);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setFeed(await getOrderNotifications());
        setError("");
      } catch {
        setError("Notifikasi belum ditandai dibaca. Coba lagi.");
      }
    });
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) refreshNow();
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="relative shrink-0"
            aria-label={`Notifikasi pesanan${feed?.unreadCount ? `, ${feed.unreadCount} belum dibaca` : ""}`}
          >
            <Bell />
            {!!feed?.unreadCount && (
              <span
                data-testid="notification-count"
                className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
              >
                {feed.unreadCount > 99 ? "99+" : feed.unreadCount}
              </span>
            )}
            {error && (
              <span
                className="size-2 rounded-full bg-amber-500"
                aria-label="Pembaruan notifikasi gagal"
              />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifikasi pesanan</DialogTitle>
            <DialogDescription>
              Pesanan pickup/delivery baru dari pelanggan. Diperbarui setiap 15
              detik saat halaman admin aktif. Verifikasi pembayaran sebelum
              memproses.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={refreshNow}>
              <RefreshCw />
              Perbarui notifikasi
            </Button>
            <Button
              variant="outline"
              disabled={busy || !feed?.items.some((n) => !n.readAt)}
              onClick={() =>
                markRead(feed!.items.filter((n) => !n.readAt).map((n) => n.id))
              }
            >
              Tandai daftar dibaca
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!feed && !error && <p className="text-sm">Memuat notifikasi…</p>}
          {feed && (
            <p className="text-xs text-muted-foreground">
              {feed.unreadCount} belum dibaca · Maksimal 20 notifikasi per
              tampilan, yang belum dibaca didahulukan.
            </p>
          )}
          {feed?.items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada notifikasi pesanan baru.
            </p>
          )}
          <ul className="space-y-3">
            {feed?.items.map((n) => (
              <li
                key={n.id}
                className={`space-y-2 rounded-xl border p-4 ${n.readAt ? "bg-white" : "border-primary/30 bg-secondary/40"}`}
              >
                <div className="flex justify-between gap-2">
                  <strong className="text-sm">
                    {orderNumber(n.order.number)} ·{" "}
                    {n.order.fulfillment === "DELIVERY"
                      ? "Delivery"
                      : "Pick up"}
                  </strong>
                  {!n.readAt && (
                    <span className="text-xs font-semibold text-primary">
                      Baru
                    </span>
                  )}
                </div>
                <p className="break-words text-sm">
                  {n.order.customerName || "Pelanggan"} ·{" "}
                  {rupiah(n.order.total)}
                </p>
                <p className="text-sm">
                  {paymentLabels[n.order.paymentStatus]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(n.createdAt))}{" "}
                  WIB
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/orders"
                    onClick={() => {
                      setOpen(false);
                      setToast("");
                    }}
                    className="flex min-h-11 items-center text-sm font-semibold text-primary underline"
                  >
                    Buka Pesanan
                  </Link>
                  {!n.readAt && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => markRead([n.id])}
                    >
                      Tandai dibaca
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
      {toast &&
        createPortal(
          <aside
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm space-y-3 rounded-2xl border border-primary/30 bg-white p-4 shadow-lg"
          >
            <div className="flex gap-2">
              <p className="flex-1 text-sm font-medium">{toast}</p>
              <button
                className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted"
                aria-label="Tutup pemberitahuan"
                onClick={() => setToast("")}
              >
                <X className="size-4" />
              </button>
            </div>
            <Button
              onClick={() => {
                setOpen(true);
                setToast("");
                refreshNow();
              }}
            >
              Lihat notifikasi
            </Button>
          </aside>,
          document.body,
        )}
    </>
  );
}
