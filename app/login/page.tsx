import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { getLogoVersion } from "@/lib/branding";
export default async function LoginPage() {
  if (await session()) redirect("/pos");
  return <LoginForm logoVersion={await getLogoVersion()} />;
}
