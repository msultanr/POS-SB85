import { AppShell } from "@/components/app-shell";
import { QrisSettings } from "@/components/admin/qris-settings";
import { LogoSettings } from "@/components/admin/logo-settings";
import { getLogoVersion, getStoreName } from "@/lib/branding";
import { StoreNameSettings } from "@/components/admin/store-name-settings";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSelfOrderOpen } from "@/lib/order-availability";
import { OrderSettings } from "@/components/admin/order-settings";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  await requireSession();
  const [qris, logoVersion] = await Promise.all([
    db().setting.findUnique({
      where: { id: "qris" },
      select: { updatedAt: true },
    }),
    getLogoVersion(),
  ]);
  return (
    <AppShell active="settings">
      <main className="pb-10">
        <div className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Preferensi toko
          </p>
          <h1 className="mt-2 text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola identitas toko dan QRIS pembayaran. Perubahan langsung
            berlaku tanpa deploy ulang.
          </p>
        </div>
        <StoreNameSettings name={await getStoreName()} />
        <OrderSettings open={await isSelfOrderOpen()} />
        <LogoSettings updatedAt={logoVersion} />
        <QrisSettings updatedAt={qris?.updatedAt.toISOString() ?? null} />
      </main>
    </AppShell>
  );
}
