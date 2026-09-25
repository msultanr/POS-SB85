"use client";
import { useState, useTransition } from "react";
import { Plus, Search, Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { createCategory, deleteProduct, saveProduct } from "@/actions/menu";
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
import type { CategoryView, ProductView } from "@/lib/types";
import { cn, rupiah } from "@/lib/utils";

export function MenuManager({
  products,
  categories,
}: {
  products: ProductView[];
  categories: CategoryView[];
}) {
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ProductView | "new" | null>(null);
  const [removing, setRemoving] = useState<ProductView | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, start] = useTransition();
  const shown = products.filter((p) =>
    p.name.toLocaleLowerCase("id").includes(query.toLocaleLowerCase("id")),
  );
  return (
    <main className="mx-auto max-w-[1400px] p-4 md:p-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Administrasi
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Kelola menu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Atur menu, harga, dan ketersediaan dalam satu tempat.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setError("");
              setCategoryOpen(true);
            }}
          >
            Kategori baru
          </Button>
          <Button onClick={() => setEditor("new")}>
            <Plus />
            Tambah menu
          </Button>
        </div>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-secondary p-3 text-sm text-primary"
        >
          {notice}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <h2 className="font-semibold">
            Katalog menu{" "}
            <span className="ml-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {products.length}
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-4 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama menu…"
              aria-label="Cari nama menu"
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                {[
                  "Menu",
                  "Gambar (URL)",
                  "Kategori",
                  "Harga",
                  "Status",
                  "Aksi",
                ].map((h) => (
                  <th key={h} className="px-5 py-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={p.imageUrl}
                        name={p.name}
                        className="size-12 shrink-0 rounded-xl"
                      />
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="max-w-44 px-5 py-4">
                    <span
                      title={p.imageUrl || "Tanpa gambar"}
                      className="block truncate text-xs text-muted-foreground"
                    >
                      {p.imageUrl || "Tanpa gambar"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {categories.find((c) => c.id === p.categoryId)?.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold">
                    {rupiah(p.price)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold",
                        p.isAvailable
                          ? "bg-secondary text-primary"
                          : "bg-red-50 text-red-700",
                      )}
                    >
                      {p.isAvailable ? "Tersedia" : "Habis"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditor(p)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label={`Hapus ${p.name}`}
                        onClick={() => {
                          setError("");
                          setRemoving(p);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <div className="p-12 text-center">
              <UtensilsCrossed className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-semibold">
                {query ? "Menu tidak ditemukan" : "Katalog masih kosong"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {query
                  ? "Coba kata kunci lain."
                  : "Buat kategori, lalu tambahkan menu pertama toko Anda."}
              </p>
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor === "new" ? "Tambah menu" : "Edit menu"}
            </DialogTitle>
            <DialogDescription>
              Perubahan akan langsung muncul di halaman kasir.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <MenuForm
              key={editor === "new" ? "new" : editor.id}
              product={editor === "new" ? null : editor}
              categories={categories}
              done={() => {
                setEditor(null);
                setNotice("Menu berhasil disimpan.");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus menu?</DialogTitle>
            <DialogDescription>
              {removing?.name} akan dihapus dari katalog. Riwayat pesanan tetap
              tersimpan.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  if (!removing) return;
                  try {
                    const result = await deleteProduct(removing.id);
                    if (result.success) {
                      setRemoving(null);
                      setNotice("Menu berhasil dihapus.");
                    } else setError(result.error);
                  } catch {
                    setError("Koneksi terputus. Silakan coba lagi.");
                  }
                })
              }
            >
              {busy ? "Menghapus…" : "Hapus menu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={categoryOpen}
        onOpenChange={(open) => {
          if (!busy) setCategoryOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategori baru</DialogTitle>
            <DialogDescription>
              Kelompokkan menu agar mudah ditemukan kasir.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(form) =>
              start(async () => {
                setError("");
                try {
                  const result = await createCategory(
                    String(form.get("name") || ""),
                  );
                  if (result.success) {
                    setCategoryOpen(false);
                    setNotice("Kategori berhasil disimpan.");
                  } else setError(result.error);
                } catch {
                  setError("Koneksi terputus. Silakan coba lagi.");
                }
              })
            }
            className="space-y-4"
          >
            <label className="block space-y-2 text-sm font-medium">
              <span>Nama kategori</span>
              <Input
                name="name"
                placeholder="Contoh: Makanan utama"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Menyimpan…" : "Simpan kategori"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
function MenuForm({
  product,
  categories,
  done,
}: {
  product: ProductView | null;
  categories: CategoryView[];
  done: () => void;
}) {
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      action={(form) =>
        start(async () => {
          setError("");
          try {
            const result = await saveProduct(product?.id ?? null, {
              name: String(form.get("name")),
              categoryId: String(form.get("categoryId")),
              price: Number(form.get("price")),
              imageUrl: String(form.get("imageUrl") || ""),
              isAvailable: form.get("isAvailable") === "on",
            });
            if (result.success) done();
            else setError(result.error);
          } catch {
            setError("Menu belum tersimpan. Periksa koneksi dan coba lagi.");
          }
        })
      }
      className="space-y-4"
    >
      <fieldset disabled={busy} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">
          <span>Nama menu</span>
          <Input
            name="name"
            defaultValue={product?.name}
            placeholder="Contoh: Nasi goreng kampung"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2 text-sm font-medium">
            <span>Kategori</span>
            <select
              aria-label="Kategori"
              name="categoryId"
              defaultValue={product?.categoryId || ""}
              required
              className="h-12 w-full rounded-xl border bg-background px-3"
            >
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Harga (Rp)</span>
            <Input
              type="number"
              name="price"
              defaultValue={product?.price}
              min={1}
              max={10000000}
              step={1}
              required
              placeholder="25000"
            />
          </label>
        </div>
        {!categories.length && (
          <p className="text-xs text-destructive">
            Buat kategori terlebih dahulu melalui tombol Kategori baru.
          </p>
        )}
        <label className="block space-y-2 text-sm font-medium">
          <span>
            URL gambar{" "}
            <span className="font-normal text-muted-foreground">
              (opsional)
            </span>
          </span>
          <Input
            name="imageUrl"
            type="url"
            defaultValue={product?.imageUrl || ""}
            maxLength={2048}
            placeholder="https://…"
          />
          <span className="block text-xs font-normal text-muted-foreground">
            Gunakan tautan HTTPS langsung ke gambar.
          </span>
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-muted px-3 text-sm font-medium">
          <input
            name="isAvailable"
            type="checkbox"
            defaultChecked={product?.isAvailable ?? true}
            className="size-5 accent-primary"
          />
          Menu tersedia untuk dipesan
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={busy || !categories.length}
      >
        {busy ? "Menyimpan…" : "Simpan menu"}
      </Button>
    </form>
  );
}
