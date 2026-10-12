import type { Metadata } from "next";
import { getStoreName } from "@/lib/branding";
import "./globals.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const name = await getStoreName();
  return {
    title: { default: `${name} · Point of Sale`, template: `%s · ${name}` },
    description: `Kasir, pesanan, dan katalog menu ${name}.`,
    icons: {
      icon: "/api/logo",
    },
    robots: { index: false, follow: false },
  };
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
