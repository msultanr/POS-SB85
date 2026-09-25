import Link from "next/link";
import { StoreLogo } from "@/components/store-logo";
import { getLogoVersion } from "@/lib/branding";
export const metadata = {
  title: "Pesan sendiri · Teras SB85",
  referrer: "no-referrer" as const,
};
export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoVersion = await getLogoVersion();
  return (
    <>
      <header className="flex min-h-20 items-center justify-between border-b bg-white px-4 md:px-8">
        <Link
          href="/order"
          className="flex items-center gap-3 text-xl font-bold"
        >
          <StoreLogo version={logoVersion} />
          Teras SB85
        </Link>
        <Link
          href="/tracking"
          className="p-3 text-sm font-semibold text-primary underline"
        >
          Lacak delivery
        </Link>
      </header>
      {children}
    </>
  );
}
