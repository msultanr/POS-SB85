import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const logo = await db().setting.findUnique({ where: { id: "logo" } });
  if (!logo) return new Response("Logo belum tersedia", { status: 404 });
  return new Response(new Uint8Array(logo.image), {
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
