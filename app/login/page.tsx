import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { getLogoVersion, getStoreName } from "@/lib/branding";
export default async function LoginPage() {
  if (await session()) redirect("/pos");
  return (
    <LoginForm
      logoVersion={await getLogoVersion()}
      storeName={await getStoreName()}
    />
  );
}
