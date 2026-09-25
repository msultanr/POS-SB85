import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const qris = await db().setting.findUnique({ where: { id: "qris" } });
  if (!qris) return new Response("QRIS belum tersedia", { status: 404 });
  return new Response(new Uint8Array(qris.image), {
    headers: {
      "Content-Type": qris.mimeType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
