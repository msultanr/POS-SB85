import { session } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await session()))
    return new Response("Tidak diizinkan", { status: 401 });
  const { id } = await params;
  const proof = await db().paymentProof.findUnique({ where: { orderId: id } });
  if (!proof) return new Response("Bukti tidak ditemukan", { status: 404 });
  const version = new URL(request.url).searchParams.get("v");
  if (version && proof.version !== version)
    return new Response("Bukti sudah berubah. Perbarui halaman.", {
      status: 409,
    });
  return new Response(new Uint8Array(proof.image), {
    headers: {
      "Content-Type": proof.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Referrer-Policy": "no-referrer",
    },
  });
}
