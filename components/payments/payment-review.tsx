"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPayment } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rupiah } from "@/lib/utils";
export type ReviewOrder = {
  id: string;
  total: number;
  paymentStatus: "UNPAID" | "REVIEW" | "PAID" | "REJECTED" | "EXPIRED";
  source: "CASHIER" | "SELF_SERVICE";
  proofVersion: string | null;
};
export function PaymentReview({
  order,
  onPaid,
  onRejected,
}: {
  order: ReviewOrder;
  onPaid?: () => void;
  onRejected?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviewedOrder, setReviewedOrder] = useState(order);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const allowed =
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "EXPIRED" &&
    (order.source === "CASHIER" || order.paymentStatus === "REVIEW");
  function submit(decision: "APPROVE" | "REJECT") {
    if (
      reviewedOrder.paymentStatus === "PAID" ||
      reviewedOrder.paymentStatus === "EXPIRED"
    )
      return;
    const expectedStatus = reviewedOrder.paymentStatus;
    start(async () => {
      setError("");
      try {
        const result = await reviewPayment({
          id: reviewedOrder.id,
          expectedStatus,
          proofVersion: reviewedOrder.proofVersion,
          decision,
          receivedAmount: Number(amount || 0),
          note,
        });
        if (!result.success) {
          setError(result.error);
          router.refresh();
          return;
        }
        setOpen(false);
        router.refresh();
        if (decision === "APPROVE") onPaid?.();
        else onRejected?.();
      } catch {
        setError(
          "Verifikasi belum dapat disimpan. Periksa koneksi dan coba lagi.",
        );
      }
    });
  }
  return (
    <>
      <Button
        className="w-full"
        variant="outline"
        disabled={!allowed}
        onClick={() => {
          setReviewedOrder(order);
          setOpen(true);
          setError("");
          setAmount("");
          setConfirmed(false);
          setNote("");
        }}
      >
        {allowed
          ? "Verifikasi pembayaran"
          : order.paymentStatus === "PAID"
            ? "Sudah dibayar"
            : order.paymentStatus === "EXPIRED"
              ? "Pesanan kedaluwarsa"
              : "Menunggu bukti pelanggan"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi pembayaran QRIS</DialogTitle>
            <DialogDescription>
              Cocokkan dengan dana masuk di aplikasi merchant. Screenshot bukan
              konfirmasi otomatis.
            </DialogDescription>
          </DialogHeader>
          <p className="font-semibold">
            Total pesanan: {rupiah(reviewedOrder.total)}
          </p>
          {reviewedOrder.proofVersion && (
            <>
              <a
                href={`/api/payment-proofs/${reviewedOrder.id}?v=${reviewedOrder.proofVersion}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                Buka bukti ukuran penuh
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/payment-proofs/${reviewedOrder.id}?v=${reviewedOrder.proofVersion}`}
                alt="Bukti pembayaran pelanggan"
                className="max-h-72 w-full rounded-xl border object-contain"
              />
            </>
          )}
          <label className="space-y-2 text-sm font-medium">
            <span>Nominal dana masuk (Rp)</span>
            <Input
              aria-label="Nominal dana masuk (Rp)"
              type="number"
              min={0}
              max={1000000000}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-primary"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={busy}
            />
            Saya sudah memeriksa dana masuk ke merchant.
          </label>
          <Button
            disabled={
              busy || !confirmed || Number(amount) !== reviewedOrder.total
            }
            onClick={() => submit("APPROVE")}
          >
            {busy ? "Menyimpan…" : "Konfirmasi dana diterima"}
          </Button>
          <label className="space-y-2 text-sm font-medium">
            <span>Alasan jika ditolak</span>
            <Input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: nominal tidak sesuai"
              disabled={busy}
            />
          </label>
          <Button
            variant="destructive"
            disabled={busy || note.trim().length < 3}
            onClick={() => submit("REJECT")}
          >
            Tolak pembayaran
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
