"use client";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { useCartStore } from "@/store/useCartStore";
import { Button } from "@/components/ui/button";
export function LogoutButton() {
  return (
    <form action={logout} onSubmit={() => useCartStore.getState().clear()}>
      <Button type="submit" size="icon" variant="outline" aria-label="Keluar">
        <LogOut />
      </Button>
    </form>
  );
}
