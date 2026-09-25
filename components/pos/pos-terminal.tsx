"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { processTransaction } from "@/actions/transaction";
import { checkoutSelfOrder } from "@/actions/self-order";
import {
  useCartStore,
  useCustomerCartStore,
  cartTotal,
} from "@/store/useCartStore";
import { QrisDisplay } from "@/components/payments/qris-display";
import { PaymentReview } from "@/components/payments/payment-review";
import { usePaymentExpiry } from "@/components/payments/use-payment-expiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/product-image";
import type { CategoryView, ProductView, Receipt } from "@/lib/types";
import { cn, orderNumber, rupiah } from "@/lib/utils";
import { MAX_MONEY } from "@/lib/validation";

export function PosTerminal({
  products,
  categories,
  selfService = false,
  qrisAvailable = false,
  qrisVersion = null,
}: {
  products: ProductView[];
  categories: CategoryView[];
  selfService?: boolean;
  qrisAvailable?: boolean;
  qrisVersion?: string | null;
}) {
  const router = useRouter();
  const cashierCart = useCartStore();
  const customerCart = useCustomerCartStore();
  const cart = selfService ? customerCart : cashierCart;
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">(
    selfService ? "QRIS" : "CASH",
  );
  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">(
    "PICKUP",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const receiptExpired = usePaymentExpiry(
    receipt?.paymentExpiresAt ?? null,
    receipt?.paymentStatus ?? "",
  );
  const total = cartTotal(cart.items);
  const paid = Number(cart.paid || 0);
  const count = cart.items.reduce((n, item) => n + item.quantity, 0);
  const canPay =
    cart.items.length > 0 &&
    total <= MAX_MONEY &&
    (paymentMethod === "QRIS"
      ? qrisAvailable
      : paid >= total && paid <= MAX_MONEY) &&
    (!selfService ||
      (customerName.trim().length >= 2 &&
        whatsapp.trim().length >= 9 &&
        !!scheduledAt &&
        (fulfillment === "PICKUP" || deliveryAddress.trim().length >= 10)));
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "all" || p.categoryId === category) &&
          p.name
            .toLocaleLowerCase("id")
            .includes(query.toLocaleLowerCase("id")),
      ),
    [products, category, query],
  );
  async function pay() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const input = {
        idempotencyKey: cart.checkoutKey(),
        paid: paymentMethod === "CASH" ? paid : 0,
        paymentMethod,
        items: cart.items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          expectedPrice: i.price,
        })),
      };
      const result = selfService
        ? await checkoutSelfOrder({
            idempotencyKey: input.idempotencyKey,
            items: input.items,
            customerName,
            whatsapp,
            fulfillment,
            deliveryAddress,
            scheduledAt: `${scheduledAt}:00+07:00`,
          })
        : await processTransaction(input);
      if (result.success) {
        if (
          selfService &&
          "accessToken" in result.data &&
          typeof result.data.accessToken === "string"
        ) {
          const url = `/order/${result.data.accessToken}`;
          setPaymentUrl(url);
          router.push(url);
        } else setReceipt(result.data);
        cart.clear();
      } else {
        setError(result.error);
        router.refresh();
      }
    } catch {
      setError(
        "Koneksi terputus. Coba bayar kembali dengan keranjang yang sama agar transaksi tidak ganda.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto grid max-w-[1800px] items-start lg:h-[calc(100dvh-81px)] lg:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)]">
      <section className="min-w-0 p-4 md:p-7 lg:h-full lg:overflow-y-auto lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {selfService ? "Selamat datang di Teras SB85" : "Ruang kasir"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Ada pesanan apa?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {selfService
                ? "Pilih menu, bayar QRIS, lalu unggah bukti pembayaran."
                : "Pilih menu favorit, lalu proses pembayaran."}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.refresh()}
            aria-label="Perbarui menu"
            disabled={busy}
          >
            <RefreshCw />
          </Button>
        </div>
        <div className="relative mb-5">
          <Search className="absolute left-4 top-4 size-4 text-muted-foreground" />
          <Input
            aria-label="Cari menu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari makanan atau minuman…"
            className="h-13 border-transparent bg-white pl-11 shadow-xs"
          />
        </div>
        <div
          aria-label="Filter kategori"
          className="mb-7 flex gap-2 overflow-x-auto pb-1"
        >
          {[{ id: "all", name: "Semua menu" }, ...categories].map((c) => (
            <Button
              key={c.id}
              variant={category === c.id ? "default" : "outline"}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className="rounded-full whitespace-nowrap px-5"
            >
              {c.name}
            </Button>
          ))}
        </div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {category === "all"
              ? "Semua menu"
              : categories.find((c) => c.id === category)?.name}
          </h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} menu
          </span>
        </div>
        {filtered.length ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((product) => {
              const qty =
                cart.items.find((i) => i.id === product.id)?.quantity ?? 0;
              return (
                <button
                  key={product.id}
                  disabled={
                    !product.isAvailable ||
                    busy ||
                    qty >= 99 ||
                    (cart.items.length >= 100 && !qty)
                  }
                  onClick={() => {
                    cart.addItem(product);
                    setError("");
                  }}
                  aria-label={`Tambah ${product.name}, ${rupiah(product.price)}`}
                  className={cn(
                    "group overflow-hidden rounded-2xl border bg-white text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed",
                    product.isAvailable
                      ? "hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
                      : "opacity-55",
                  )}
                >
                  <div className="relative">
                    <ProductImage
                      src={product.imageUrl}
                      name={product.name}
                      className="aspect-[4/3] w-full"
                    />
                    {qty > 0 && (
                      <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {qty}
                      </span>
                    )}
                    {!product.isAvailable && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-sm">
                          Habis
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="p-3 md:p-4">
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      {
                        categories.find((c) => c.id === product.categoryId)
                          ?.name
                      }
                    </p>
                    <h3 className="min-h-10 text-sm font-semibold leading-5">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary">
                        {rupiah(product.price)}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                        <Plus className="size-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <ShoppingBag className="mx-auto mb-3 size-8 text-muted-foreground" />
            <h3 className="font-semibold">
              {products.length ? "Menu tidak ditemukan" : "Menu belum tersedia"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {products.length
                ? "Coba kata kunci atau kategori lain."
                : selfService
                  ? "Silakan hubungi kasir."
                  : "Tambahkan menu melalui halaman Kelola menu."}
            </p>
          </div>
        )}
        <p className="mt-7 text-center text-xs text-muted-foreground">
          Dibuat dengan hangat, disajikan sepenuh hati.
        </p>
      </section>
      <aside
        id="cart"
        aria-label="Keranjang pesanan"
        className={cn(
          "flex flex-col border-t bg-white lg:h-full lg:border-l lg:border-t-0",
          selfService && "pb-20 lg:pb-0",
        )}
      >
        <div className="flex items-center justify-between border-b p-5 lg:p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Pesanan saat ini
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {count} item ·{" "}
              {paymentMethod === "CASH"
                ? "Pembayaran tunai"
                : "Pembayaran QRIS"}
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <ShoppingBag className="size-5" />
          </span>
        </div>
        <div className="min-h-52 flex-1 overflow-y-auto p-5 lg:p-6">
          {cart.items.length === 0 ? (
            <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
              <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="size-7 text-muted-foreground" />
              </span>
              <p className="font-semibold">Keranjang masih kosong</p>
              <p className="mt-2 max-w-52 text-sm text-muted-foreground">
                Ketuk menu di sebelah kiri untuk mulai memesan.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {cart.items.map((item) => (
                <li key={item.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <span className="whitespace-nowrap text-sm font-semibold">
                      {rupiah(item.price * item.quantity)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {rupiah(item.price)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Hapus ${item.name}`}
                        onClick={() => cart.removeItem(item.id)}
                      >
                        <Trash2 className="!size-3.5" />
                      </Button>
                      <div className="flex items-center rounded-xl border">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label={`Kurangi ${item.name}`}
                          onClick={() => cart.changeQuantity(item.id, -1)}
                        >
                          <Minus />
                        </Button>
                        <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy || item.quantity >= 99}
                          aria-label={`Tambah jumlah ${item.name}`}
                          onClick={() => cart.changeQuantity(item.id, 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4 border-t p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total pembayaran</span>
            <strong className="text-2xl tracking-tight" aria-live="polite">
              {rupiah(total)}
            </strong>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canPay) void pay();
            }}
            className="space-y-4"
          >
            {!selfService && (
              <div
                className="grid grid-cols-2 gap-2"
                aria-label="Metode pembayaran"
              >
                {(["CASH", "QRIS"] as const).map((method) => (
                  <Button
                    key={method}
                    type="button"
                    disabled={busy || (method === "QRIS" && !qrisAvailable)}
                    variant={paymentMethod === method ? "default" : "outline"}
                    aria-pressed={paymentMethod === method}
                    onClick={() => {
                      if (method !== paymentMethod) {
                        setPaymentMethod(method);
                        cart.resetCheckoutKey();
                      }
                      setError("");
                    }}
                  >
                    {method === "CASH" ? "Tunai" : "QRIS"}
                  </Button>
                ))}
              </div>
            )}
            {!qrisAvailable && (
              <p className="text-xs text-amber-800">
                {selfService
                  ? "QRIS belum tersedia. Silakan pesan melalui kasir."
                  : "Unggah QRIS toko di Settings untuk mengaktifkan pembayaran QRIS."}
              </p>
            )}
            {selfService && (
              <>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Nama pemesan</span>
                  <Input
                    required
                    minLength={2}
                    maxLength={80}
                    value={customerName}
                    disabled={busy}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      cart.resetCheckoutKey();
                    }}
                    autoComplete="name"
                    placeholder="Nama Anda"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Nomor WhatsApp</span>
                  <Input
                    maxLength={20}
                    required
                    type="tel"
                    autoComplete="tel"
                    value={whatsapp}
                    disabled={busy}
                    onChange={(e) => {
                      setWhatsapp(e.target.value);
                      cart.resetCheckoutKey();
                    }}
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
              </>
            )}
            {selfService && (
              <>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Metode penerimaan</span>
                  <select
                    className="min-h-12 w-full rounded-xl border bg-white px-3"
                    value={fulfillment}
                    disabled={busy}
                    onChange={(e) => {
                      setFulfillment(e.target.value as "PICKUP" | "DELIVERY");
                      cart.resetCheckoutKey();
                    }}
                  >
                    <option value="PICKUP">Pick up · ambil di toko</option>
                    <option value="DELIVERY">Delivery · kirim ke alamat</option>
                  </select>
                </label>
                {fulfillment === "DELIVERY" && (
                  <>
                    <label className="block space-y-2 text-sm font-medium">
                      <span>Alamat pengiriman</span>
                      <textarea
                        required
                        minLength={10}
                        maxLength={500}
                        disabled={busy}
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          cart.resetCheckoutKey();
                        }}
                        className="min-h-24 w-full rounded-xl border p-3"
                        placeholder="Jalan, nomor rumah, kelurahan, kecamatan, kota, dan patokan"
                      />
                    </label>
                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      Pengiriman ditanggung pembeli (COD dengan kurir). Total
                      QRIS belum termasuk ongkir.
                    </p>
                  </>
                )}
                <label className="block space-y-2 text-sm font-medium">
                  <span>
                    {fulfillment === "DELIVERY"
                      ? "Jadwal pengiriman (WIB)"
                      : "Jadwal pengambilan (WIB)"}
                  </span>
                  <Input
                    required
                    type="datetime-local"
                    disabled={busy}
                    value={scheduledAt}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      cart.resetCheckoutKey();
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Pilih tanggal dan jam yang diinginkan, maksimal 30 hari ke
                  depan. Waktu tiba delivery mengikuti perjalanan kurir.
                </p>
              </>
            )}
            {paymentMethod === "CASH" && (
              <>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Uang diterima</span>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      aria-label="Uang diterima"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={cart.paid}
                      disabled={busy || !cart.items.length}
                      onChange={(e) => {
                        cart.setPaid(
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        );
                        setError("");
                      }}
                      placeholder="0"
                      className="pl-10 text-right text-lg font-semibold"
                    />
                  </div>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[total, Math.max(total, 50000), Math.max(total, 100000)].map(
                    (amount, i) => (
                      <Button
                        key={i}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || !cart.items.length}
                        className="px-1 text-xs"
                        onClick={() => cart.setPaid(String(amount))}
                      >
                        {i === 0 ? "Uang pas" : rupiah(amount)}
                      </Button>
                    ),
                  )}
                </div>
                <div className="flex justify-between rounded-xl bg-muted px-3 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {paid > 0 && paid < total ? "Kurang bayar" : "Kembalian"}
                  </span>
                  <span
                    aria-live="polite"
                    className={cn(
                      "font-semibold",
                      paid > 0 && paid < total
                        ? "text-destructive"
                        : "text-primary",
                    )}
                  >
                    {rupiah(
                      paid > 0 && paid < total
                        ? total - paid
                        : Math.max(0, paid - total),
                    )}
                  </span>
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {paymentMethod === "CASH" && paid > MAX_MONEY && (
              <p role="alert" className="text-sm text-destructive">
                Nominal pembayaran maksimal {rupiah(MAX_MONEY)}.
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || !canPay}
            >
              {busy
                ? "Memproses…"
                : paymentMethod === "QRIS"
                  ? "Checkout & tampilkan QRIS"
                  : "Bayar & Proses"}
              <ArrowRight />
            </Button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground">
            {paymentMethod === "CASH"
              ? "Pesanan langsung diteruskan ke dapur."
              : "Pesanan masuk dapur setelah pembayaran diverifikasi admin."}
          </p>
          {paymentUrl && (
            <Link
              href={paymentUrl}
              className="block text-center text-sm font-semibold text-primary underline"
            >
              Lanjut ke pembayaran pesanan Anda
            </Link>
          )}
        </div>
      </aside>
      <Dialog
        open={!!receipt}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <CheckCircle2 className="mb-2 size-10 text-primary" />
            <DialogTitle>
              {receipt?.paymentStatus === "PAID"
                ? "Pembayaran berhasil"
                : receiptExpired
                  ? "Pesanan kedaluwarsa"
                  : "Pesanan QRIS dibuat"}
            </DialogTitle>
            <DialogDescription>
              {receipt && orderNumber(receipt.number)}{" "}
              {receipt?.paymentStatus === "PAID"
                ? "sudah masuk ke antrean dapur."
                : receiptExpired
                  ? "melewati batas pembayaran 10 menit. Jangan bayar; buat pesanan baru. Jika dana sudah masuk, hubungi admin."
                  : "menunggu dana masuk. Konfirmasi pembayaran dalam 10 menit sejak pesanan dibuat."}
            </DialogDescription>
            {receipt && (
              <p className="text-sm">
                Kode pesanan:{" "}
                <span className="select-all font-mono font-semibold">
                  {receipt.code}
                </span>
              </p>
            )}
          </DialogHeader>
          {receipt?.paymentMethod === "QRIS" &&
            receipt.paymentStatus !== "PAID" &&
            !receiptExpired && (
              <>
                <QrisDisplay total={receipt.total} version={qrisVersion} />
                <PaymentReview
                  order={{ ...receipt, source: "CASHIER", proofVersion: null }}
                  onRejected={() =>
                    setReceipt({ ...receipt, paymentStatus: "REJECTED" })
                  }
                  onPaid={() =>
                    setReceipt({
                      ...receipt,
                      paid: receipt.total,
                      change: 0,
                      paymentStatus: "PAID",
                    })
                  }
                />
              </>
            )}
          {receipt?.paymentStatus === "PAID" && (
            <dl className="space-y-3 rounded-xl bg-muted p-4">
              {[
                ["Total", receipt.total],
                ["Uang diterima", receipt.paid],
                ["Kembalian", receipt.change],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt>{label}</dt>
                  <dd className="font-bold">{rupiah(Number(value))}</dd>
                </div>
              ))}
            </dl>
          )}
          <Button size="lg" onClick={() => setReceipt(null)}>
            {receipt?.paymentStatus === "PAID"
              ? "Pesanan berikutnya"
              : "Tutup — lanjutkan nanti di Pesanan"}
            <ArrowRight />
          </Button>
        </DialogContent>
      </Dialog>
      {selfService && count > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-20 lg:hidden">
          <Button
            className="w-full shadow-lg"
            size="lg"
            onClick={() =>
              document
                .getElementById("cart")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Lihat keranjang · {count} item · {rupiah(total)}
          </Button>
        </div>
      )}
    </main>
  );
}
