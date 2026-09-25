import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db";
const cookieName = "teras-session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("SESSION_SECRET harus minimal 32 karakter.");
  return new TextEncoder().encode(value);
}
export async function session(): Promise<{
  id: string;
  username: string;
} | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  let id: string;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "teras-sb85",
      audience: "teras-admin",
    });
    if (!payload.sub) return null;
    id = payload.sub;
  } catch {
    return null;
  }
  return db().admin.findUnique({
    where: { id },
    select: { id: true, username: true },
  });
}
export async function requireSession() {
  const user = await session();
  if (!user) redirect("/login");
  return user;
}
export async function createSession(adminId: string) {
  const token = await new SignJWT({})
    .setSubject(adminId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("teras-sb85")
    .setAudience("teras-admin")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}
export async function deleteSession() {
  (await cookies()).delete(cookieName);
}
