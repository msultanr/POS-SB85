# Teras SB85

Aplikasi POS Next.js App Router + TypeScript, Tailwind CSS 4, komponen shadcn/ui (Radix), Zustand, MySQL, dan Prisma 7. Antarmuka berbahasa Indonesia, nominal rupiah bulat, pembayaran tunai dan QRIS, serta pemesanan mandiri pelanggan.

## Batas pembayaran QRIS

Pesanan QRIS kasir maupun self-service memiliki batas 10 menit sejak `createdAt`.
Status `UNPAID` atau `REJECTED` yang melewati batas menjadi `EXPIRED`, termasuk
pesanan lama. Pesanan `PAID` dan bukti yang sudah masuk `REVIEW` tidak kedaluwarsa.
Penolakan bukti tidak memperpanjang batas waktu asli; bila batas sudah lewat,
pesanan akan kedaluwarsa pada pemeriksaan berikutnya.

Server menolak upload/konfirmasi yang terlambat, meskipun halaman browser belum
diperbarui. Pelanggan harus membayar **dan mengirim bukti** sebelum batas waktu.
Jika dana sudah terkirim tetapi pesanan kedaluwarsa, pelanggan diarahkan menghubungi
admin untuk rekonsiliasi; jangan meminta pembayaran ulang tanpa mengecek dana.
Kasir wajib memverifikasi QRIS dalam batas tersebut.

Pembaruan status memakai lazy reconciliation saat checkout, pembacaan status,
notifikasi, antrean, atau reporting, tanpa cron/timer persisten. Ketika tidak ada
request, penulisan `EXPIRED` tertunda hingga request berikutnya; batas pembayaran
tetap diperiksa di server. Polling halaman aktif memperbarui tampilan. Data tidak
dihapus; pesanan kedaluwarsa dikeluarkan dari antrean aktif dan dihitung di reporting.
Jalankan `npm run db:migrate` sebelum menjalankan versi ini.

## Struktur folder

```text
app/
  layout.tsx                 # Metadata, CSS global
  page.tsx                   # Redirect ke /pos
  login/page.tsx             # Login admin dengan username/password
  pos/page.tsx               # Server Component: katalog untuk kasir
  orders/page.tsx            # Antrean dapur
  order/page.tsx             # Menu publik / self service tanpa login
  order/[token]/page.tsx     # QRIS, upload bukti, status pesanan pelanggan
  api/qris/route.ts          # Gambar QRIS merchant
  api/logo/route.ts          # Logo toko dari database
  api/payment-proofs/[id]/   # Gambar bukti, hanya untuk admin
  admin/menu/page.tsx        # Katalog khusus admin
  admin/settings/page.tsx    # Logo dan QRIS toko
  admin/reporting/page.tsx   # Statistik dan visualisasi penjualan
  tracking/page.tsx          # Pelacakan delivery berdasarkan kode pendek
  error.tsx, loading.tsx
actions/
  auth.ts                    # Login/logout
  transaction.ts             # Checkout atomik, transisi status
  menu.ts                    # Create/update/delete menu, kategori baru
  self-order.ts              # Checkout pelanggan + upload bukti
  payment.ts                 # Konfigurasi QRIS dan verifikasi admin
  branding.ts                # Ganti logo (khusus admin)
  delivery.ts                # Tautan kurir + pelacakan delivery
  notifications.ts           # Inbox admin + tandai dibaca
components/
  ui/                        # Button, Input, Dialog shadcn/ui
  pos/pos-terminal.tsx       # Grid 70% + keranjang 30%
  orders/order-board.tsx     # Status pesanan + polling
  admin/menu-manager.tsx     # Tabel + modal CRUD
  admin/qris-settings.tsx    # Unggah gambar QRIS asli toko
  admin/logo-settings.tsx    # Ganti logo dan pratinjau
  admin/order-notifications.tsx # Lonceng, badge, dialog, pemberitahuan
  reporting/                # Grafik harian, distribusi, peringkat menu
  store-logo.tsx             # Logo di login/header admin/pelanggan
  payments/                 # QRIS, bukti pembayaran, verifikasi
  app-shell.tsx
  login-form.tsx
  product-image.tsx
store/useCartStore.ts        # Item, kuantitas, pembayaran, idempotency key
lib/
  auth.ts                    # Sesi JWT httpOnly, validasi akun admin
  password.ts                # Hash password scrypt + salt acak
  checkout.ts                # Transaksi bersama kasir/pelanggan
  payment-access.ts          # Token privat pesanan pelanggan
  public-rate-limit.ts       # Pembatasan request atomik berbasis MySQL
  upload.ts                  # Validasi gambar (magic format + decode)
  db.ts                      # Prisma singleton + adapter MySQL/MariaDB
  mysql-adapter.ts           # Parsing DATABASE_URL, UTC, pool, TLS
  generate-order-code.ts     # Kode pendek acak dengan Node crypto
  reporting.ts               # Agregasi MySQL dalam snapshot konsisten
  report-period.ts           # Validasi periode dan batas hari WIB
  validation.ts              # Validasi Zod + perhitungan transaksi
  types.ts, utils.ts
prisma/
  schema.prisma              # Admin, katalog, order, QRIS, bukti, rate limit
  mysql-migrations/          # Migrasi aktif MySQL + SQL constraints
  migrations/                # Arsip migrasi PostgreSQL (tidak dijalankan)
  seed.ts                    # Akun admin, 3 kategori, 9 menu contoh
tests/                       # Pengujian keranjang, validasi, transaksi
prisma.config.ts             # URL migrasi + perintah seed Prisma 7
```

## Menjalankan lokal

Konversi MySQL menggunakan migrasi baru di `prisma/mysql-migrations`; `prisma/migrations` hanya arsip PostgreSQL. Migrasi/seed membuat skema dan data awal MySQL, **tidak menyalin transaksi atau katalog kustom dari PostgreSQL lokal**. Jangan menjalankan `migrate reset` pada database operasional. Siapkan backup sebelum setiap perubahan skema selanjutnya.

Gunakan Node.js **24 LTS** (atau Node 22.12+) dan MySQL **8.0.16+**, dengan engine InnoDB. Migrasi telah dijalankan pada MySQL 8.0.44. Waktu disimpan/dibaca dalam UTC dan ditampilkan dalam WIB. Jangan menggunakan MySQL lama yang mengabaikan CHECK constraints.

1. Salin `.env.example` ke `.env`.
2. Isi `DATABASE_URL` dengan `mysql://USER:PASSWORD@HOST:3306/DATABASE`. URL-encode karakter khusus pada username/password. `DIRECT_URL` opsional untuk akun migrasi; hapus URL PostgreSQL lama jika masih ada. Jangan commit `.env` atau menggunakan akun root saat produksi.
3. Isi `SESSION_SECRET` dengan output `openssl rand -hex 32`. Username dan hash password admin disimpan di tabel `Admin`, bukan environment.
4. Jalankan:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Buka http://localhost:3000 dan masuk dengan username `administrator`, password `sabang85`. Hanya ada akses admin, yang dapat menggunakan kasir, dapur, dan manajemen menu. Seed membuat akun awal dan katalog contoh tanpa menimpa akun maupun produk yang sudah ada. Password disimpan sebagai hash scrypt dengan salt acak. Gambar seed adalah foto ilustrasi dari Unsplash; ganti dengan foto menu toko melalui admin.

## Deploy Vercel

1. Push repository ke GitHub dan import sebagai project Next.js di Vercel.
2. Gunakan Node.js 24.x. Install command: `npm ci`. Build command: `npm run build`. Output directory: default Next.js.
3. Hubungkan server MySQL yang dapat diakses dari Vercel. Isi `DATABASE_URL` dengan URL MySQL dan, jika perlu akun khusus migrasi, isi `DIRECT_URL`. Gunakan TLS dengan sertifikat tepercaya; adapter mendukung `?sslaccept=strict` (atau `?ssl=true` untuk runtime). Jangan gunakan `accept_invalid_certs`. Batasi akses jaringan dan gunakan akun aplikasi khusus, bukan root. Setiap instance menggunakan pool maksimal 5 koneksi; sesuaikan kapasitas server untuk skala Vercel. Perubahan kode ini tidak otomatis mengaktifkan TLS pada server database.
4. Tambahkan `DATABASE_URL`, `DIRECT_URL`, dan `SESSION_SECRET` ke environment Vercel; jangan memakai awalan `NEXT_PUBLIC_`. Gunakan database dan secret terpisah untuk Preview dan Production.
5. Dari terminal/CI tepercaya yang memakai environment database tujuan, jalankan `npm ci`, `npm run db:migrate`, lalu `npm run db:seed` untuk membuat akun admin dan katalog contoh.
6. Deploy. Migrasi sengaja dipisahkan dari build agar build Preview tidak mengubah database Production.

`prisma generate` otomatis dijalankan saat install/build; build tidak perlu terhubung ke database. Halaman data bersifat dinamis dan memakai Node runtime. Tidak membutuhkan disk persisten atau WebSocket. Dapur memperbarui data setiap 15 detik selama tab aktif.

## Perilaku aplikasi

- `/pos`: klik produk untuk menambah, tombol +/- dengan area sentuh minimal 44px, pencarian, filter kategori, input tunai, uang pas, kembalian, dan konfirmasi nomor pesanan. Pada desktop/tablet landscape layout 70:30, layar kecil ditumpuk vertikal.
- `/orders`: panel verifikasi pembayaran QRIS, antrean dapur pesanan lunas, dan 50 pesanan selesai terbaru. Transisi dapur hanya `PENDING → PROCESSING → COMPLETED` dan wajib sudah `PAID`.
- `/admin/menu`: tambah/edit melalui dialog, URL gambar opsional, kategori baru, ketersediaan, dan hapus dengan konfirmasi. Penghapusan adalah soft delete agar riwayat transaksi utuh.
- `/admin/settings`: pengaturan logo dan QRIS, terpisah dari katalog menu. Tersedia melalui navbar Settings dan hanya untuk admin.
- `/admin/reporting`: filter periode dalam WIB, ringkasan penjualan, grafik pendapatan/pesanan harian, peringkat menu (termasuk nol penjualan), serta distribusi metode pembayaran, sumber pesanan, pickup/delivery, dan status dapur. Hanya admin yang dapat mengakses data.
- `/orders?view=cards|list|details`: pilih Kartu, Daftar ringkas yang bisa dibuka, atau Detail satu kolom. Pilihan tersimpan pada URL dan bertahan saat refresh. Tindakan verifikasi, proses dapur, dan tautan kurir tetap tersedia pada semua tampilan (buka baris terlebih dahulu dalam mode Daftar).
- Server memvalidasi sesi dan keberadaan akun admin di database pada setiap action dan halaman yang dilindungi. Semua akun memiliki akses admin; tidak ada pilihan peran lain.
- Total dihitung ulang dari database; harga berubah, menu habis/dihapus, pembayaran kurang, kuantitas tidak valid, dan nilai berlebihan ditolak. Seluruh order beserta item dibuat dalam transaksi serializable dengan retry terbatas.
- Nama dan harga item disalin ke `OrderItem`; perubahan katalog tidak mengubah struk lama. Pesanan QRIS baru berstatus `UNPAID`, sedangkan transaksi tunai langsung `PAID`.
- Kunci checkout unik + hash payload mencegah duplikasi untuk pengiriman ulang payload yang sama. Saat koneksi gagal, ulangi pembayaran tanpa mengubah keranjang. Jika terlanjur reload/menutup tab, periksa antrean pesanan sebelum membuat transaksi baru.
- Keranjang kasir dan pelanggan terpisah di memori tab; reload mengosongkan keranjang. Tidak ada stok kuantitatif, pajak, diskon, refund, payment gateway, atau cetak struk dalam cakupan ini.

## Self service dan QRIS

Logo dan QRIS disimpan dalam satu tabel **`settings`**, masing-masing dengan `id = logo` dan `id = qris`. Model Prisma adalah `Setting` (`prisma.setting`). Setiap baris menyimpan gambar asli, MIME type, dan waktu pembaruan sendiri sehingga mengganti logo tidak menimpa QRIS, dan sebaliknya. Migrasi menyalin byte gambar serta timestamp dari tabel lama sebelum tabel lama dihapus. Keduanya ditampilkan lewat endpoint gambar dari database; perubahan admin tidak membutuhkan deploy ulang. Form menerima JPG/PNG/WebP maksimal 2 MB. Versi URL gambar diperbarui setelah perubahan agar browser tidak mempertahankan gambar lama.

`npm run db:seed` hanya mengisi gambar yang belum ada dan tidak menimpa penggantian dari admin. Sertakan `logo.jpeg` dan `QR Teras SB85.png` saat memindahkan repository. Untuk sengaja mengganti kedua gambar database dengan file bawaan, jalankan `npx tsx prisma/seed.ts --replace-assets` pada environment database tujuan.

1. Seed menyimpan `logo.jpeg` dan `QR Teras SB85.png` dari root repository ke MySQL sebagai gambar awal. Untuk mengganti gambar, login admin dan buka **Settings** (`/admin/settings`): bagian **Logo toko** untuk logo dan **QRIS & pemesanan pelanggan** untuk QRIS. Gambar asli dipertahankan tanpa digambar ulang. Verifikasi bahwa QRIS dapat dipindai dan tujuan pembayaran sesuai toko sebelum digunakan pelanggan.
2. Bagikan URL `/order` kepada pelanggan. Halaman ini tidak memerlukan login. Pelanggan memilih menu, mengisi nama, nomor WhatsApp Indonesia, pickup/delivery, serta tanggal dan jam pengambilan/pengiriman dalam WIB. Delivery wajib mengisi alamat lengkap. Jadwal harus setelah waktu sekarang dan maksimal 30 hari ke depan.
3. Pelanggan diarahkan ke `/order/[token]` yang menampilkan QRIS dan **total yang dihitung server**. Karena memakai QRIS statis, pelanggan harus memasukkan nominal persis di aplikasi pembayaran, kemudian mengunggah screenshot berhasil bayar. Tombol unduh QRIS tersedia untuk pembayaran dari satu ponsel.
4. Screenshot yang valid tersimpan dan status berubah `UNPAID → REVIEW`. Screenshot **bukan bukti otomatis dana sudah masuk**. Admin membuka `/orders`, memeriksa bukti dan transaksi di aplikasi merchant, memasukkan nominal yang diterima, lalu mengonfirmasi. Server menolak konfirmasi jika nominal berbeda dari total.
5. Setelah disetujui (`PAID`), pesanan masuk dapur. Jika ditolak (`REJECTED`), alasan ditampilkan pada halaman pelanggan dan pelanggan dapat unggah ulang. Versi bukti diperiksa supaya admin tidak menyetujui bukti lama yang sudah diganti.
6. Di kasir `/pos`, pilih Tunai atau QRIS. QRIS menampilkan kode dan total setelah checkout. Admin dapat mengonfirmasi dana masuk dari dialog kasir atau halaman `/orders`; screenshot tidak wajib untuk transaksi yang ditangani kasir.

Gambar QRIS dan screenshot disimpan sebagai `LONGBLOB` di MySQL agar tetap tersedia di Vercel tanpa disk persisten atau akun object storage tambahan. Input hanya JPG/PNG/WebP valid, maksimal **2 MB** dan 20 megapiksel; SVG dan gambar rusak ditolak. Pastikan `max_allowed_packet` server lebih besar dari 3 MB. Byte gambar asli dipertahankan. Screenshot hanya disajikan melalui endpoint berautentikasi admin dengan `Cache-Control: private, no-store`; tidak ada URL publik bukti pembayaran. Pada volume besar, pertimbangkan object storage privat dan kebijakan retensi bukti untuk mengendalikan ukuran database.

Halaman pembayaran pelanggan memakai token acak-semu HMAC 256-bit; database menyimpan hash token. Tautan ini adalah akses privat ke status pesanan, sehingga jangan dibagikan. Pelanggan tidak dapat membaca daftar pesanan lain atau mengubah status bayar. Rate limit checkout 30 percobaan/10 menit per IP dan unggah 10 percobaan/10 menit per IP/pesanan disimpan di database. Di produksi, gunakan proxy tepercaya yang mengatur `X-Forwarded-For` dan WAF untuk perlindungan spam tambahan. Order belum dibayar tetap disimpan untuk rekonsiliasi; tidak ada pembayaran otomatis atau penghapusan pesanan kedaluwarsa.

Ukuran Server Action dibatasi 3 MB agar file 2 MB beserta multipart berada di bawah [batas payload Vercel 4,5 MB](https://vercel.com/docs/errors/function_payload_too_large). Konfigurasi mengikuti [Server Actions bodySizeLimit](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

## Pickup, delivery, dan pelacakan

Development: `npm run dev` otomatis menjalankan `prisma generate`. Setelah mengubah skema, jalankan migrasi dan generate kembali. Cache memakai signature stabil model/field/enum dan URL koneksi, bukan identitas constructor antar-bundle Next.js; ini mencegah pool ditutup saat permintaan lain berjalan. Penambahan field terdeteksi pada hot reload. Untuk perubahan tipe/native attribute, atau jika server tidak mendeteksi hasil generate, hentikan lalu jalankan kembali `npm run dev`; tidak perlu menghapus database atau seed ulang.

- Checkout menghasilkan **kode pesanan pendek acak**, misalnya `SB85-K7M4Q9X2`. Delapan karakter acak dibuat dengan `node:crypto.randomBytes` (40 bit), tanpa I/O/0/1, dan dijamin unik oleh indeks database. Collision saat checkout dicoba ulang dengan kode baru. `Order.id` tetap dipakai internal; nomor antrean `SB-0001` bukan kode pelacakan. Kode ditampilkan pada halaman pembayaran, struk kasir, dan panel admin, serta tetap sama setelah verifikasi QRIS. Penulisan Order di luar checkout harus menyertakan `generateOrderCode()`; tidak ada fungsi PostgreSQL `generate_order_code()` di MySQL.
- `/tracking` mengecek delivery menggunakan **kode saja**, tanpa nama atau nomor WhatsApp. Huruf kecil, kode tanpa awalan `SB85-`, dan spasi/tanda hubung diterima. ID panjang lama tidak dipakai lagi untuk pencarian; pelanggan dengan pesanan lama dapat membuka tautan pembayaran pribadinya untuk melihat kode baru. Hanya kode, status pembayaran, status dapur, jadwal, dan tautan kurir yang dikirim ke browser; nama, WhatsApp, alamat, item, dan bukti pembayaran tidak disertakan. Kode berfungsi sebagai kunci akses terbatas, bukan autentikasi identitas: jangan bagikan sembarangan. Pencarian dibatasi 120 permintaan/10 menit/IP dan diperbarui setiap 15 detik saat halaman terlihat. Tetap gunakan WAF di produksi untuk membatasi percobaan terdistribusi. Nama dan WhatsApp pada formulir checkout tetap diperlukan untuk operasional pengiriman.
- Biaya pengiriman **ditanggung pembeli, COD langsung dengan kurir**. Total QRIS hanya mencakup makanan/minuman, tidak termasuk ongkir. Jadwal adalah waktu pengiriman yang diminta, bukan jaminan waktu tiba.
- Admin melihat WhatsApp, alamat, jadwal, serta kode pesanan pada `/orders`. Untuk delivery lunas, setelah menekan **Mulai proses**, form **Link GoSend / GrabExpress** tersedia. Form tetap tersedia di tab Selesai. Tautan HTTPS dapat diganti dan muncul pada halaman pembayaran serta pelacakan pelanggan. Admin harus menyalin tautan resmi dari aplikasi kurir; sistem tidak memesan kurir, menghitung ongkir, memvalidasi provider, atau menyinkronkan status perjalanan otomatis.
- `COMPLETED` berarti persiapan dapur selesai: delivery ditampilkan kepada pelanggan sebagai **Pesanan siap dikirim**, bukan sudah diterima. Status perjalanan aktual mengikuti tautan kurir.
- Transaksi walk-in melalui `/pos` tetap pickup segera tanpa form pelanggan wajib. Kolom `tableNumber` lama dipertahankan hanya untuk riwayat; formulir baru menggunakan `whatsapp`. Migrasi delivery bersifat aditif dan tidak mengubah data pesanan lama.

## Definisi Reporting

Periode default adalah tanggal 1 sampai hari ini dalam WIB; filter mendukung maksimal 366 hari, termasuk tanggal akhir. Dasar periode adalah **tanggal pesanan dibuat**, bukan waktu verifikasi QRIS. Karena itu, pesanan yang diverifikasi belakangan memperbarui pendapatan pada periode pembuatan pesanan tersebut. Laporan ini adalah laporan penjualan menurut kelompok tanggal pesanan, bukan laporan arus kas berdasarkan tanggal penerimaan uang.

Total pesanan mencakup semua status pembayaran. Pendapatan, item terjual, peringkat menu, rata-rata transaksi, dan distribusi hanya menghitung `PAID`. Pendapatan memakai `Order.total` dan detail penjualan memakai harga snapshot `OrderItem.subtotal`; tidak termasuk kembalian atau ongkir COD. Tidak ada perhitungan laba, biaya modal, maupun refund. Nama menu mengikuti katalog terkini; menu yang diarsipkan tetap muncul jika terjual pada periode terpilih. Menu aktif tanpa penjualan ditampilkan sebagai nol. Grafik mengisi hari kosong dengan nol dan menyediakan tabel harian untuk membaca angka tepat. Agregasi dilakukan di MySQL dalam snapshot transaksi konsisten; nilai BigInt/Decimal dinormalisasi sebelum dikirim ke browser. Detail pribadi pelanggan tidak dikirim ke halaman laporan.

## Notifikasi admin

Lonceng pada navbar memberi badge dan pemberitahuan untuk pesanan `SELF_SERVICE` pickup/delivery yang baru dibuat. Polling berjalan setiap 15 detik saat tab terlihat, dan diperbarui saat kembali ke tab atau membuka lonceng. Pembayaran belum lunas tetap diberi notifikasi dengan label status yang jelas; verifikasi QRIS tetap wajib sebelum masuk dapur. Order kasir tidak membuat notifikasi karena dibuat oleh admin sendiri.

Notifikasi dibuat untuk setiap admin yang ada saat checkout, di dalam transaksi database yang sama dengan pesanan. Retry checkout tidak membuat duplikat. `OrderNotification` menyimpan status dibaca per admin; menandai notifikasi admin lain tidak diperbolehkan. Daftar mengutamakan maksimal 20 notifikasi belum dibaca, lalu notifikasi terbaru yang sudah dibaca. **Tandai daftar dibaca** hanya menandai notifikasi yang sedang ditampilkan; notifikasi baru yang masuk bersamaan tidak ikut hilang. Notifikasi lama sebelum fitur ini aktif tidak diisi ulang. Ini adalah notifikasi **in-app**, tanpa suara, izin browser, layanan push, atau pengiriman WhatsApp; pemberitahuan tidak muncul saat browser ditutup.

## Login admin

Login memakai akun admin di tabel `Admin` dengan username unik dan hash password scrypt. Seed awal: `administrator` / `sabang85`. Seed ulang tidak mereset password akun yang sudah ada. Sesi ditandatangani, mengacu ke ID admin, dan berlaku 12 jam. Sesi versi lama otomatis tidak diterima. Rotasi `SESSION_SECRET` membatalkan semua sesi; mengganti password saja tidak membatalkan sesi aktif. Untuk operasional publik, atur rate limit login di Vercel Firewall atau identity provider. Audit per karyawan dan reset password memerlukan fitur tersendiri.

## Verifikasi

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Pengujian integrasi database bersifat opt-in: gunakan database tes kosong yang terpisah, jalankan migrasi pada database tersebut, lalu set `TEST_DATABASE_URL` ketika menjalankan `npm test`. Jangan gunakan database produksi untuk pengujian.

Pengujian browser (sesudah `npm run build` dan migrasi database tes):

```sh
npx playwright install chromium
E2E_DATABASE_URL="mysql://.../database_tes" npm run test:e2e
```

Jika Chrome sudah terpasang, gunakan `PLAYWRIGHT_CHANNEL=chrome` tanpa mengunduh Chromium. Tes browser membuat akun admin sementara di database tes dan memeriksa penolakan password salah, login, CRUD, checkout, kembalian, status dapur, logout, serta overflow layar ponsel. Screenshot desktop/mobile disimpan di `test-results/`. Format kode: `npm run format`.

Build memakai Webpack (`next build --webpack`), yang didukung Next.js 16, untuk menghindari kebutuhan proses PostCSS Turbopack di lingkungan sandbox.

Jalankan `npm audit` sebelum deployment produksi. Saat konversi MySQL, npm masih melaporkan temuan dependensi (1 moderate, 5 high). Perbaikan otomatis yang mengganti major tidak diterapkan tanpa verifikasi kompatibilitas. Runtime database menggunakan `@prisma/adapter-mariadb`; jangan menganggap seluruh temuan hanya berkaitan dengan PostgreSQL atau otomatis tidak relevan.

Referensi implementasi: [Server Actions Next.js](https://nextjs.org/docs/app/getting-started/mutating-data), [upgrade Prisma 7](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7), dan [shadcn/ui dengan Tailwind 4](https://ui.shadcn.com/docs/tailwind-v4).
