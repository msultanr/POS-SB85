"use client";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { StoreLogo } from "@/components/store-logo";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function LoginForm({ logoVersion }: { logoVersion: string | null }) {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <StoreLogo version={logoVersion} className="size-28 rounded-2xl" />
          <h1 className="text-3xl font-bold tracking-tight">Teras SB85</h1>
          <p className="text-muted-foreground">
            Siap menyambut pesanan hari ini?
          </p>
        </div>
        <form
          action={action}
          className="space-y-5 rounded-3xl border bg-white p-7 shadow-sm"
        >
          <div>
            <h2 className="text-xl font-semibold">Masuk ke toko</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk menggunakan akun administrator toko.
            </p>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            <span>Username</span>
            <Input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={80}
              placeholder="Masukkan username"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Kata sandi</span>
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={256}
              placeholder="Masukkan kata sandi"
            />
          </label>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button disabled={pending} className="w-full" size="lg">
            {pending ? "Memeriksa…" : "Masuk"}
            <ArrowRight />
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ruang kerja kasir · Teras SB85
        </p>
      </div>
    </main>
  );
}
