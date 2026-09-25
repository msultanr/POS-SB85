import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Teras SB85 · Point of Sale",
  description: "Kasir, pesanan, dan katalog menu Teras SB85.",
  icons: {
    icon: "/api/logo",
  },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
