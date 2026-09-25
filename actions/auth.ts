"use server";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
const dummyHash = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
export async function login(_previous: { error: string }, form: FormData) {
  const username = form.get("username");
  const password = form.get("password");
  if (
    typeof username !== "string" ||
    !username.trim() ||
    username.trim().length > 80 ||
    typeof password !== "string" ||
    !password ||
    password.length > 256
  )
    return { error: "Username atau kata sandi tidak sesuai." };
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    return { error: "Login belum dikonfigurasi. Hubungi pengelola toko." };
  try {
    const admin = await db().admin.findUnique({
      where: { username: username.trim() },
    });
    const valid = await verifyPassword(
      password,
      admin?.passwordHash ?? dummyHash,
    );
    if (!admin || !valid)
      return { error: "Username atau kata sandi tidak sesuai." };
    await createSession(admin.id);
  } catch (error) {
    console.error("login", error);
    return { error: "Login belum dapat diproses. Silakan coba lagi." };
  }
  redirect("/pos");
}
export async function logout() {
  await deleteSession();
  redirect("/login");
}
