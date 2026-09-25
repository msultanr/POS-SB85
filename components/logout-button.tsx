"use client";
import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { logout } from "@/actions/auth";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/button";
function LogoutSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      aria-busy={pending}
      title="Keluar dari akun admin"
    >
      <LogOut aria-hidden="true" />
      {pending ? "Keluar…" : "Logout"}
    </Button>
  );
}
export function LogoutButton() {
  return (
    <form action={logout} onSubmit={() => useCartStore.getState().clear()}>
      <LogoutSubmit />
    </form>
  );
}
