import "dotenv/config";
import { mysqlAdapter } from "../lib/mysql-adapter";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/password";
import { seedStoreAssets } from "./store-assets";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before seeding.");
const prisma = new PrismaClient({
  adapter: mysqlAdapter(process.env.DATABASE_URL),
  transactionOptions: { maxWait: 15000, timeout: 15000 },
});
const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;
async function main() {
  await seedStoreAssets(prisma, process.argv.includes("--replace-assets"));
  await prisma.admin.upsert({
    where: { username: "administrator" },
    update: {},
    create: {
      username: "administrator",
      passwordHash: await hashPassword("sabang85"),
    },
  });
  const categories = ["Makanan utama", "Camilan", "Minuman"];
  for (const name of categories)
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  const categoryRows = await prisma.category.findMany();
  const products = [
    {
      id: "seed-nasi-goreng",
      name: "Nasi Goreng Kampung",
      price: 25000,
      category: "Makanan utama",
      imageUrl: photo("photo-1603133872878-684f208fb84b"),
    },
    {
      id: "seed-ayam-bakar",
      name: "Ayam Bakar Teras",
      price: 32000,
      category: "Makanan utama",
      imageUrl: photo("photo-1532550907401-a500c9a57435"),
    },
    {
      id: "seed-mie-goreng",
      name: "Mie Goreng Spesial",
      price: 24000,
      category: "Makanan utama",
      imageUrl: photo("photo-1512058564366-18510be2db19"),
    },
    {
      id: "seed-kentang",
      name: "Kentang Goreng",
      price: 18000,
      category: "Camilan",
      imageUrl: photo("photo-1573080496219-bb080dd4f877"),
    },
    {
      id: "seed-roti",
      name: "Roti Bakar Cokelat",
      price: 16000,
      category: "Camilan",
      imageUrl: photo("photo-1484723091739-30a097e8f929"),
    },
    {
      id: "seed-pisang",
      name: "Pisang Goreng",
      price: 15000,
      category: "Camilan",
      imageUrl: null,
    },
    {
      id: "seed-kopi",
      name: "Es Kopi Susu SB85",
      price: 20000,
      category: "Minuman",
      imageUrl: photo("photo-1461023058943-07fcbe16d735"),
    },
    {
      id: "seed-teh",
      name: "Es Teh Manis",
      price: 8000,
      category: "Minuman",
      imageUrl: photo("photo-1556679343-c7306c1976bc"),
    },
    {
      id: "seed-jeruk",
      name: "Es Jeruk Segar",
      price: 12000,
      category: "Minuman",
      imageUrl: photo("photo-1613478223719-2ab802602423"),
    },
  ];
  for (const { category, ...product } of products) {
    const categoryId = categoryRows.find((c) => c.name === category)!.id;
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: { ...product, categoryId },
    });
  }
  console.log(
    "Seed selesai: logo, QRIS, akun administrator, 3 kategori dan 9 menu contoh. Data lama dipertahankan; gambar hanya diganti jika --replace-assets digunakan.",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
