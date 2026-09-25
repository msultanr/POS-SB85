import { test, expect } from "@playwright/test";
import { mysqlAdapter } from "../lib/mysql-adapter";
import { generateOrderCode } from "../lib/generate-order-code";
import { PrismaClient } from "../generated/prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../lib/password";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { seedStoreAssets } from "../prisma/store-assets";
const prisma = new PrismaClient({
  adapter: mysqlAdapter(process.env.E2E_DATABASE_URL!),
});
const suffix = randomUUID().slice(0, 8);
const categoryName = `Tes ${suffix}`;
const productName = `Kopi Tes ${suffix}`;
let categoryId: string;
let adminId: string;
const username = `e2e-admin-${suffix}`;
let originalQris: Awaited<ReturnType<typeof prisma.setting.findUnique>>;
let originalLogo: Awaited<ReturnType<typeof prisma.setting.findUnique>>;
test.beforeAll(async () => {
  originalLogo = await prisma.setting.findUnique({
    where: { id: "logo" },
  });
  originalQris = await prisma.setting.findUnique({
    where: { id: "qris" },
  });
  await seedStoreAssets(prisma);
  adminId = (
    await prisma.admin.create({
      data: {
        username,
        passwordHash: await hashPassword("e2e-only-admin-password"),
      },
    })
  ).id;
  categoryId = (await prisma.category.create({ data: { name: categoryName } }))
    .id;
});
test.afterAll(async () => {
  if (categoryId) {
    const products = await prisma.product.findMany({
      where: { categoryId },
      select: { id: true },
    });
    await prisma.order.deleteMany({
      where: {
        items: { some: { productId: { in: products.map((p) => p.id) } } },
      },
    });
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.category.delete({ where: { id: categoryId } });
  }
  if (adminId) await prisma.admin.delete({ where: { id: adminId } });
  if (originalQris)
    await prisma.setting.upsert({
      where: { id: "qris" },
      create: originalQris,
      update: { image: originalQris.image, mimeType: originalQris.mimeType },
    });
  else await prisma.setting.deleteMany({ where: { id: "qris" } });
  if (originalLogo)
    await prisma.setting.upsert({
      where: { id: "logo" },
      create: originalLogo,
      update: { image: originalLogo.image, mimeType: originalLogo.mimeType },
    });
  else await prisma.setting.deleteMany({ where: { id: "logo" } });
  await prisma.$disconnect();
});

test("admin replaces the database logo across public pages without seed overwriting it", async ({
  page,
  browser,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Kata sandi").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("link", { name: "Kelola menu" }).click();
  const logo = page.locator("header").getByAltText("Logo Teras SB85");
  await expect(page.getByLabel("Logo toko (maksimal 2 MB)")).toHaveCount(0);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const previousSrc = await logo.getAttribute("src");
  const replacement = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#122b45" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Logo toko (maksimal 2 MB)").setInputFiles({
    name: "logo-test.png",
    mimeType: "image/png",
    buffer: replacement,
  });
  await page.getByRole("button", { name: "Simpan logo", exact: true }).click();
  await expect(page.getByText("Logo berhasil diperbarui.")).toBeVisible();
  await expect(logo).not.toHaveAttribute("src", previousSrc!);
  expect(await (await page.request.get("/api/logo")).body()).toEqual(
    replacement,
  );
  await seedStoreAssets(prisma);
  expect(await (await page.request.get("/api/logo")).body()).toEqual(
    replacement,
  );
  const supplied = await readFile(new URL("../logo.jpeg", import.meta.url));
  await page.getByLabel("Logo toko (maksimal 2 MB)").setInputFiles({
    name: "logo.jpeg",
    mimeType: "image/jpeg",
    buffer: supplied,
  });
  await page.getByRole("button", { name: "Simpan logo", exact: true }).click();
  await expect
    .poll(async () =>
      (await (await page.request.get("/api/logo")).body()).equals(supplied),
    )
    .toBe(true);
  const context = await browser.newContext();
  try {
    const publicPage = await context.newPage();
    for (const route of ["/order", "/login"]) {
      await publicPage.goto(`http://localhost:3100${route}`);
      await expect(publicPage.getByAltText("Logo Teras SB85")).toBeVisible();
      await expect
        .poll(() =>
          publicPage
            .getByAltText("Logo Teras SB85")
            .evaluate((img) => (img as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    }
    await publicPage.screenshot({
      path: testInfo.outputPath("login-logo.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("self-service proof upload, admin verification, and cashier QRIS", async ({
  page,
  browser,
}) => {
  const menuName = `QRIS Tes ${suffix}`;
  const product = await prisma.product.create({
    data: { name: menuName, categoryId, price: 18000 },
  });
  const image = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#eeeeee" },
  })
    .png()
    .toBuffer();
  const fixture = {
    name: "test-only.png",
    mimeType: "image/png",
    buffer: image,
  };
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Kata sandi").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Gambar QRIS toko (maksimal 2 MB)")
    .setInputFiles("QR Teras SB85.png");
  await page.getByRole("button", { name: "Simpan gambar QRIS" }).click();
  await expect(
    page.getByText("QRIS berhasil disimpan. Pembayaran QRIS siap digunakan."),
  ).toBeVisible();
  expect(await (await page.request.get("/api/qris")).body()).toEqual(
    await readFile(new URL("../QR Teras SB85.png", import.meta.url)),
  );

  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  try {
    await customer.goto("http://localhost:3100/order");
    await customer.getByLabel("Cari menu").fill(menuName);
    await customer
      .getByRole("button", { name: `Tambah ${menuName},`, exact: false })
      .click();
    await customer
      .getByLabel("Nama pemesan", { exact: true })
      .fill("Pelanggan Browser");
    await customer.getByLabel("Nomor WhatsApp").fill("081234567890");
    await customer.getByLabel("Metode penerimaan").selectOption("DELIVERY");
    await customer
      .getByLabel("Alamat pengiriman")
      .fill("Jalan Pengujian nomor 85, Jakarta Selatan");
    const requestedTime = new Date(Date.now() + 86400000 + 7 * 3600000)
      .toISOString()
      .slice(0, 16);
    await customer.getByLabel("Jadwal pengiriman (WIB)").fill(requestedTime);
    await expect(
      customer.getByText(
        "Pengiriman ditanggung pembeli (COD dengan kurir). Total QRIS belum termasuk ongkir.",
      ),
    ).toBeVisible();
    await customer
      .getByRole("button", { name: "Checkout & tampilkan QRIS" })
      .click();
    await expect(customer).toHaveURL(/\/order\/[a-f0-9]{64}$/);
    await expect(
      customer.getByRole("heading", {
        name: "Menunggu pembayaran",
        exact: true,
      }),
    ).toBeVisible();
    const order = await prisma.order.findFirstOrThrow({
      where: {
        source: "SELF_SERVICE",
        items: { some: { productId: product.id } },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(order).toMatchObject({
      total: 18000,
      paid: 0,
      paymentStatus: "UNPAID",
      whatsapp: "6281234567890",
      fulfillment: "DELIVERY",
      deliveryAddress: "Jalan Pengujian nomor 85, Jakarta Selatan",
    });
    expect(order.code).toMatch(/^SB85-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    await expect(customer.getByText(order.code, { exact: true })).toBeVisible();
    await page.bringToFront();
    await expect(page.getByTestId("notification-count")).toHaveText("1", {
      timeout: 20000,
    });
    await page.getByRole("button", { name: /^Notifikasi pesanan/ }).click();
    const inbox = page.getByRole("dialog", {
      name: "Notifikasi pesanan",
      exact: true,
    });
    await expect(
      inbox.getByText("Belum dibayar", { exact: true }),
    ).toBeVisible();
    await expect(inbox).toContainText("Delivery");
    await inbox.getByRole("button", { name: "Tandai daftar dibaca" }).click();
    await expect(inbox.getByText(/0 belum dibaca/)).toBeVisible();
    await inbox.getByRole("button", { name: "Tutup", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: /^Notifikasi pesanan/ }).click();
    await expect(inbox.getByText(/0 belum dibaca/)).toBeVisible();
    await inbox
      .getByRole("link", { name: "Buka Pesanan", exact: true })
      .click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(inbox).toBeHidden();
    expect(
      (
        await customer.request.get(
          `http://localhost:3100/api/payment-proofs/${order.id}`,
        )
      ).status(),
    ).toBe(401);
    await customer
      .getByLabel("Screenshot pembayaran (maksimal 2 MB)")
      .setInputFiles(fixture);
    await customer
      .getByRole("button", { name: "Kirim bukti pembayaran" })
      .click();
    await expect(
      customer.getByRole("heading", {
        name: "Bukti terkirim — menunggu verifikasi",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto("/orders");
    const card = page
      .locator("article")
      .filter({ hasText: `SB-${String(order.number).padStart(4, "0")}` });
    await expect(
      card.getByRole("button", { name: "Mulai proses" }),
    ).toHaveCount(0);
    await card
      .getByRole("button", { name: "Verifikasi pembayaran", exact: true })
      .click();
    const review = page.getByRole("dialog", {
      name: "Verifikasi pembayaran QRIS",
    });
    await expect(
      review.getByAltText("Bukti pembayaran pelanggan"),
    ).toBeVisible();
    expect(
      (await page.request.get(`/api/payment-proofs/${order.id}`)).status(),
    ).toBe(200);
    await review.getByLabel("Nominal dana masuk (Rp)").fill("17000");
    await review.getByRole("checkbox").check();
    await expect(
      review.getByRole("button", { name: "Konfirmasi dana diterima" }),
    ).toBeDisabled();
    await review.getByLabel("Nominal dana masuk (Rp)").fill("18000");
    await review
      .getByRole("button", { name: "Konfirmasi dana diterima" })
      .click();
    await expect(review).toBeHidden();
    await expect(
      card.getByRole("button", { name: "Mulai proses" }),
    ).toBeVisible();
    await customer.getByRole("button", { name: "Perbarui status" }).click();
    await expect(
      customer.getByRole("heading", { name: "Pembayaran terverifikasi" }),
    ).toBeVisible();

    await expect(card.getByLabel("Link GoSend / GrabExpress")).toHaveCount(0);
    await card.getByRole("button", { name: "Mulai proses" }).click();
    await card
      .getByLabel("Link GoSend / GrabExpress")
      .fill("https://example.com/courier-test");
    await card.getByRole("button", { name: "Simpan link kurir" }).click();
    await expect(card.getByText("Tautan kurir tersimpan.")).toBeVisible();
    await customer.goto("http://localhost:3100/tracking");
    await customer
      .getByLabel("Kode pesanan", { exact: true })
      .fill(order.code.toLowerCase());
    await customer.getByRole("button", { name: "Cek status pesanan" }).click();
    await expect(customer.getByText(order.code, { exact: true })).toBeVisible();
    await expect(
      customer.getByRole("heading", { name: "Pesanan sedang disiapkan" }),
    ).toBeVisible();
    await expect(
      customer.getByLabel("Kode pesanan", { exact: true }),
    ).toHaveValue(order.code.toLowerCase());
    await expect(
      customer.getByRole("link", { name: "Lacak GoSend / GrabExpress" }),
    ).toHaveAttribute("href", "https://example.com/courier-test");
    await expect(
      customer.getByText("Jalan Pengujian nomor 85, Jakarta Selatan"),
    ).toHaveCount(0);
    await card.getByRole("button", { name: "Tandai selesai" }).click();
    await expect(card).toBeHidden();
    await customer.getByRole("button", { name: "Cek status pesanan" }).click();
    await expect(
      customer.getByRole("heading", { name: "Pesanan siap dikirim" }),
    ).toBeVisible();

    await page.goto("/pos");
    await page.getByLabel("Cari menu").fill(menuName);
    await page
      .getByRole("button", { name: `Tambah ${menuName},`, exact: false })
      .click();
    await page.getByRole("button", { name: "QRIS", exact: true }).click();
    await expect(page.getByLabel("Uang diterima")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Checkout & tampilkan QRIS" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pesanan QRIS dibuat" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Verifikasi pembayaran", exact: true })
      .click();
    await review.getByLabel("Nominal dana masuk (Rp)").fill("18000");
    await review.getByRole("checkbox").check();
    await review
      .getByRole("button", { name: "Konfirmasi dana diterima" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pembayaran berhasil" }),
    ).toBeVisible();
  } finally {
    await customerContext.close();
  }
});
test("settings, reporting filters and rankings, and switchable order views", async ({
  page,
}, testInfo) => {
  for (const path of ["/admin/settings", "/admin/reporting"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  const menu = await prisma.product.create({
    data: { name: `Report menu ${suffix}`, categoryId, price: 12000 },
  });
  const order = await prisma.order.create({
    data: {
      idempotencyKey: randomUUID(),
      code: generateOrderCode(),
      requestHash: "0".repeat(64),
      total: 24000,
      paid: 24000,
      change: 0,
      createdAt: new Date("2002-03-01T17:00:00Z"),
      items: {
        create: {
          productId: menu.id,
          productName: menu.name,
          unitPrice: 12000,
          quantity: 2,
          subtotal: 24000,
        },
      },
    },
  });
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Kata sandi").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("link", { name: "Reporting", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reporting", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Dari tanggal").fill("2002-03-02");
  await page.getByLabel("Sampai tanggal").fill("2002-03-02");
  await page.getByRole("button", { name: "Terapkan periode" }).click();
  await expect(page).toHaveURL(/from=2002-03-02/);
  const revenue = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Pendapatan lunas", exact: true }),
  });
  await expect(revenue).toContainText(/24.000/);
  const ranking = page.getByRole("region", { name: "Peringkat menu" });
  await expect(
    ranking.getByRole("row").filter({ hasText: menu.name }),
  ).toContainText("24.000");
  await ranking.getByRole("button", { name: "Terbanyak → tersedikit" }).click();
  await expect(
    ranking.getByRole("button", { name: "Tersedikit → terbanyak" }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Metrik grafik" })
    .getByRole("button", { name: "Pesanan", exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: "Total pesanan per hari (semua status pembayaran)",
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("reporting-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("reporting-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Pesanan", exact: true }).click();
  const views = page.getByRole("group", { name: "Tampilan pesanan" });
  await views.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(page).toHaveURL(/view=list/);
  const orderNumber = `SB-${String(order.number).padStart(4, "0")}`;
  const row = page.locator("details").filter({ hasText: orderNumber });
  await expect(row.locator("summary")).toContainText("2 item");
  await expect(row.getByRole("button", { name: "Mulai proses" })).toBeHidden();
  await row.locator("summary").click();
  await expect(row.getByRole("button", { name: "Mulai proses" })).toBeVisible();
  await row.getByRole("button", { name: "Mulai proses" }).click();
  await expect(
    row.getByRole("button", { name: "Tandai selesai" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    views.getByRole("button", { name: "Daftar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await views.getByRole("button", { name: "Detail", exact: true }).click();
  await expect(page).toHaveURL(/view=details/);
  await expect(
    page
      .locator("article")
      .filter({ hasText: orderNumber })
      .getByRole("button", { name: "Tandai selesai" }),
  ).toBeVisible();
  await views.getByRole("button", { name: "Kartu", exact: true }).click();
  await expect(page).toHaveURL(/view=cards/);
  await page.goto("/admin/reporting?from=invalid&to=2002-03-02");
  await expect(
    page.getByText("Tanggal tidak valid. Gunakan format YYYY-MM-DD.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("database admin login, CRUD, checkout, kitchen transitions, and logout", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/menu");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Peran")).toHaveCount(0);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Kata sandi").fill("wrong-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Username atau kata sandi tidak sesuai.",
  );
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Kata sandi").fill("e2e-only-admin-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await page.getByRole("link", { name: "Kelola menu" }).click();
  await expect(
    page.getByRole("heading", { name: "Kelola menu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tambah menu", exact: true }).click();
  await page.getByLabel("Nama menu", { exact: true }).fill(productName);
  await page.getByLabel("Kategori", { exact: true }).selectOption(categoryId);
  await page.getByLabel("Harga (Rp)").fill("20000");
  await page.getByRole("button", { name: "Simpan menu" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("cell", { name: productName, exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Kasir", exact: true }).click();
  await page.getByRole("button", { name: categoryName, exact: true }).click();
  await page
    .getByRole("button", { name: `Tambah ${productName},`, exact: false })
    .click();
  await page
    .getByRole("button", { name: `Tambah jumlah ${productName}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bayar & Proses" }),
  ).toBeDisabled();
  await page.getByLabel("Uang diterima").fill("50000");
  await page.getByRole("button", { name: "Semua menu", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("pos-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Bayar & Proses" }).click();
  await expect(
    page.getByRole("heading", { name: "Pembayaran berhasil" }),
  ).toBeVisible();
  const receiptText = await page.getByRole("dialog").innerText();
  const number = receiptText.match(/SB-\d+/)![0];
  const order = await prisma.order.findUniqueOrThrow({
    where: { number: Number(number.slice(3)) },
  });
  expect(order).toMatchObject({ total: 40000, paid: 50000, change: 10000 });
  await page.getByRole("button", { name: "Pesanan berikutnya" }).click();
  await expect(page.getByText("Keranjang masih kosong")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("pos-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByRole("link", { name: "Pesanan", exact: true }).click();
  const card = page.locator("article").filter({ hasText: number });
  await card.getByRole("button", { name: "Mulai proses" }).click();
  await card.getByRole("button", { name: "Tandai selesai" }).click();
  await expect(card).toBeHidden();
  await page.getByRole("button", { name: "Selesai", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Pesanan selesai" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Kelola menu" }).click();
  await page
    .getByRole("button", { name: `Edit ${productName}`, exact: true })
    .click();
  await page.getByLabel("Harga (Rp)").fill("22000");
  await page.getByRole("button", { name: "Simpan menu" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: `Hapus ${productName}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Hapus menu", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: productName, exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/menu");
  await expect(page).toHaveURL(/\/login$/);
});
