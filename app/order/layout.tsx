import Link from "next/link";
import { StoreLogo } from "@/components/store-logo";
import { getLogoVersion, getStoreName } from "@/lib/branding";
export const metadata = {
  title: "Pesan sendiri",
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
          <span className="max-w-[240px] break-words">
            {await getStoreName()}
          </span>
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
